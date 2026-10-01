import { useState, useEffect } from 'react';
import { fetchEvents, fetchSavedEventIds, fetchTags } from '../api/eventApi.js';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext.jsx';
import {
    calculateDistanceKm,
    formatDistanceKm,
    getDistanceLimitKm
} from '../utils/distance.js';
import { getTagName } from '../utils/tagPresentation.js';


const initialFilters = {
    search: '',
    eventType: [],
    date: [],
    maxPrice: '',
    maxDistance: '50'
};
const UNRESTRICTED_DISTANCE_KM = 50;

const normalizeTagName = (tagName) => tagName.trim().toLowerCase();

const getPriceLimit = (maxPrice) => {
    if (maxPrice === undefined || maxPrice === null || maxPrice === '') {
        return null;
    }

    const limit = Number(maxPrice);
    return Number.isFinite(limit) && limit >= 0 ? limit : null;
};

const roundPriceLimit = (price) => {
    const value = Math.ceil(Number(price) || 0);

    if (value <= 0) {
        return 0;
    }

    return Math.ceil(value / 5) * 5;
};

const getEventStart = (event) => {
    const value = event?.datetime || event?.date;
    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime()) ? date : null;
};

const matchesDateFilters = (event, selectedDates) => {
    if (!selectedDates.length) {
        return true;
    }

    const eventStart = getEventStart(event);
    if (!eventStart) {
        return false;
    }

    const now = new Date();
    return selectedDates.some((selectedDate) => {
        if (selectedDate === 'Today') {
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);
            return eventStart >= now && eventStart <= endOfDay;
        }

        if (selectedDate === 'This Week') {
            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + 7);
            return eventStart >= now && eventStart <= endOfWeek;
        }

        if (selectedDate === 'This Month') {
            const endOfMonth = new Date(now);
            endOfMonth.setMonth(now.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            return eventStart >= now && eventStart <= endOfMonth;
        }

        return false;
    });
};

const sortDiscoverEvents = (events) => {
    return [...events].sort((firstEvent, secondEvent) => {
        const firstDistance = Number(firstEvent.distanceKm);
        const secondDistance = Number(secondEvent.distanceKm);
        const firstHasDistance = Number.isFinite(firstDistance);
        const secondHasDistance = Number.isFinite(secondDistance);

        if (firstHasDistance && secondHasDistance) {
            return firstDistance - secondDistance;
        }

        if (firstHasDistance) {
            return -1;
        }

        if (secondHasDistance) {
            return 1;
        }

        return 0;
    });
};

function useDiscover() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { token } = useAuthContext();
    const selectedTag = searchParams.get('tag')?.trim() || '';
    const selectedSearch = searchParams.get('search') || '';
    const [mapVisible, setMapVisible] = useState(true);
    const [filters, setFilters] = useState(() => ({
        ...initialFilters,
        search: selectedSearch
    }));

    const [events, setEvents] = useState([]);
    const [loadedEvents, setLoadedEvents] = useState([]);
    const [tags, setTags] = useState([]);
    const [tagStatus, setTagStatus] = useState('loading');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('idle');
    const [locationError, setLocationError] = useState('');


    useEffect(() => {
       setFilters(prev => ({ ...prev, search: selectedSearch }));
    }, [selectedSearch]);

    useEffect(() => {
        if (!selectedTag || tagStatus !== 'ready') {
            return;
        }

        const selectedTagKey = normalizeTagName(selectedTag);
        const matchingTag = tags.find((tag) => (
            normalizeTagName(getTagName(tag)) === selectedTagKey
        ));
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('tag');

        if (matchingTag) {
            const tagName = getTagName(matchingTag);

            setFilters((prev) => (
                prev.eventType.includes(tagName)
                    ? prev
                    : {
                        ...prev,
                        eventType: [...prev.eventType, tagName]
                    }
            ));
        }

        setSearchParams(nextSearchParams, { replace: true });
    }, [selectedTag, tagStatus, tags, searchParams, setSearchParams]);

    useEffect(() => {
        let isMounted = true;

        const loadTags = async () => {
            try {
                const tags = await fetchTags();
                if (!isMounted) {
                    return;
                }

                setTags(
                    tags
                        .filter((tag) => getTagName(tag))
                );
                setTagStatus('ready');
            } catch {
                if (isMounted) {
                    setTagStatus('error');
                }
            }
        };

        loadTags();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const loadEvents = async () => {
            setLoading(true);
            setError(null);
            try {
                const apiQuery = {
                    search: filters.search
                };
                const [data, savedEventIds] = await Promise.all([
                    fetchEvents(apiQuery),
                    token ? fetchSavedEventIds(token).catch(() => []) : Promise.resolve([])
                ]);

                const savedEventIdSet = new Set(savedEventIds);
                setLoadedEvents(data.map((event) => ({
                    ...event,
                    isSaved: savedEventIdSet.has(event._id)
                })));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, [filters.search, token]);

    useEffect(() => {
        const distanceLimitKm = getDistanceLimitKm(filters.maxDistance, UNRESTRICTED_DISTANCE_KM);
        const priceLimit = getPriceLimit(filters.maxPrice);
        const shouldFilterByDistance = distanceLimitKm !== null && Boolean(userLocation);
        const activeTagFilters = filters.eventType;
        const eventsWithDistance = loadedEvents
            .map((event) => {
                const distanceKm = userLocation
                    ? calculateDistanceKm(userLocation, event.location)
                    : null;

                return {
                    ...event,
                    distanceKm,
                    distanceLabel: Number.isFinite(distanceKm) ? formatDistanceKm(distanceKm) : ''
                };
            })
            .filter((event) => (
                activeTagFilters.length === 0 ||
                (event.tags || []).some((tag) => activeTagFilters.includes(getTagName(tag)))
            ))
            .filter((event) => (
                matchesDateFilters(event, filters.date)
            ))
            .filter((event) => (
                !shouldFilterByDistance
                || (Number.isFinite(event.distanceKm) && event.distanceKm <= distanceLimitKm)
            ))
            .filter((event) => (
                priceLimit === null
                || Number(event.price || 0) <= priceLimit
            ));

        setEvents(sortDiscoverEvents(eventsWithDistance));
    }, [loadedEvents, filters.eventType, filters.date, filters.maxDistance, filters.maxPrice, userLocation]);

    const requestUserLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setLocationError('Location is not supported by this browser.');
            return;
        }

        setLocationStatus('loading');
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setLocationStatus('ready');
            },
            () => {
                setUserLocation(null);
                setLocationStatus('error');
                setLocationError('Allow location access to filter by distance.');
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5 * 60 * 1000,
                timeout: 10000
            }
        );
    };


    const toggleFilter = (category, value) => {
        setFilters(prev => {
            const current = prev[category];
            const nextValues = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];

            return {
                ...prev,
                [category]: nextValues
            };
        });
    };

    const updateFilter = (category, value) => {
        const distanceLimitKm = getDistanceLimitKm(value, UNRESTRICTED_DISTANCE_KM);

        if (category === 'maxDistance' && distanceLimitKm !== null && !userLocation && locationStatus !== 'loading') {
            requestUserLocation();
        }

        setFilters(prev => ({ ...prev, [category]: value }));
    };

    const updateSearch = (val) => {
        setFilters(prev => ({ ...prev, search: val }));
    };

    const clearAll = () => {
        setFilters(initialFilters);
        setSearchParams({});
    };

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.eventType.length ||
        filters.date.length ||
        filters.maxPrice ||
        filters.maxDistance !== initialFilters.maxDistance
    );
    const priceMax = roundPriceLimit(
        loadedEvents.reduce((maxPrice, event) => Math.max(maxPrice, Number(event.price) || 0), 0)
    );
    const activeTagFilters = filters.eventType;

    const toggleMap = () => {
        setMapVisible(prev => !prev);
    };

    return {
        mapVisible,
        filters,
        events,
        tags,
        tagStatus,
        userLocation,
        locationStatus,
        locationError,
        hasActiveFilters,
        priceMax,
        activeTagFilters,
        loading,
        error,
        toggleFilter,
        updateFilter,
        updateSearch,
        clearAll,
        toggleMap,
        requestUserLocation
    };
}

export default useDiscover;
