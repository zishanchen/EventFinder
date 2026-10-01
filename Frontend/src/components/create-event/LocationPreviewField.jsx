import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import CreateEventIcon from './CreateEventIcon.jsx';
import '../../styles/map.css';
import { eventPinIcon } from '../../utils/mapIcons.js';

const DEFAULT_MAP_LOCATION = {
    position: [48.1497, 11.5676],
    zoom: 14,
    displayName: 'TUM Main Campus, Munich'
};

const buildLocationSearchQuery = (locationName) => {
    const trimmedLocation = locationName.trim();

    if (!trimmedLocation) {
        return '';
    }

    const normalizedLocation = trimmedLocation.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const alreadyMentionsMunich = /\b(munich|muenchen|munchen)\b/i.test(normalizedLocation);
    return alreadyMentionsMunich ? trimmedLocation : `${trimmedLocation}, Munich`;
};

const hasCoordinates = (location) => {
    return Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));
};

const buildInitialPreview = (initialLocation) => {
    if (!initialLocation) {
        return {
            status: 'idle',
            position: DEFAULT_MAP_LOCATION.position,
            zoom: DEFAULT_MAP_LOCATION.zoom,
            displayName: DEFAULT_MAP_LOCATION.displayName,
            query: ''
        };
    }

    return {
        status: hasCoordinates(initialLocation) ? 'resolved' : 'idle',
        position: hasCoordinates(initialLocation)
            ? [Number(initialLocation.latitude), Number(initialLocation.longitude)]
            : DEFAULT_MAP_LOCATION.position,
        zoom: hasCoordinates(initialLocation) ? 16 : DEFAULT_MAP_LOCATION.zoom,
        displayName: initialLocation.address || initialLocation.venueName || DEFAULT_MAP_LOCATION.displayName,
        query: ''
    };
};

function MapUpdater({ position, zoom }) {
    const map = useMap();

    useEffect(() => {
        map.setView(position, zoom, { animate: true });
    }, [map, position, zoom]);

    return null;
}

function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(event) {
            onMapClick(event.latlng);
        }
    }
    );
    return null;
}

function LocationPreviewField({
    value,
    onChange,
    onBlur,
    onResolvedLocationChange,
    initialLocation = null,
    error = '',
    showError = false
}) {
    const [preview, setPreview] = useState(() => buildInitialPreview(initialLocation));
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        setPreview(buildInitialPreview(initialLocation));
    }, [initialLocation]);

    const handleLocationChange = (event) => {
        onChange(event);
        onResolvedLocationChange(null);
        setPreview(buildInitialPreview(null));
    };

    const handleMapClick = async ({lat, lng}) => {
        setIsResolving(true);

        setPreview((current) => ({
            ...current,
            status: 'loading',
            position: [lat, lng],
            zoom: 16,
            message: ''
        }));
        
        try {
            const params = new URLSearchParams({
                lat: String(lat),
                lon: String(lng),
                format: 'jsonv2',
                addressdetails: '1'
            });
            
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error('Location lookup failed.');
            }

            const result = await response.json();

            const address = result.display_name || '${lat}, ${lng}';

            const resolvedLocation = {
                latitude: lat,
                longitude: lng,
                venueName: address,
                address
            };

            setPreview({
                status: 'resolved',
                position: [lat, lng],
                zoom: 16,
                displayName: address,
                query: ''
            });

            onResolvedLocationChange(resolvedLocation);

            onChange({
                target: {
                    name: 'locationName',
                    value: address
                }
            });
        } catch (error) {
            setPreview((current) => ({
                ...current,
                status: 'error',
                message: error.message || 'Location lookup failed.'
            }));

            onResolvedLocationChange(null);
        } finally {
            setIsResolving(false);
        }
    };


    const resolveLocationPreview = async () => {
        const query = buildLocationSearchQuery(value);

        if (!query) {
            setPreview((current) => ({
                ...current,
                status: 'error',
                query: '',
                message: 'Enter a location first.'
            }));
            onResolvedLocationChange(null);
            return;
        }

        setIsResolving(true);
        setPreview((current) => ({
            ...current,
            status: 'loading',
            query,
            message: ''
        }));

        try {
            const params = new URLSearchParams({
                q: query,
                format: 'jsonv2',
                limit: '1',
                addressdetails: '1',
                countrycodes: 'de',
                viewbox: '11.3607,48.2481,11.7229,48.0616'
            });

            const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Location lookup failed.');
            }

            const results = await response.json();
            const bestMatch = results[0];

            if (!bestMatch) {
                setPreview((current) => ({
                    ...current,
                    status: 'error',
                    message: 'No matching location found. Try adding a street, venue, or city.'
                }));
                onResolvedLocationChange(null);
                return;
            }

            const resolvedLocation = {
                latitude: Number(bestMatch.lat),
                longitude: Number(bestMatch.lon),
                venueName: value.trim(),
                address: bestMatch.display_name
            };

            setPreview({
                status: 'resolved',
                position: [resolvedLocation.latitude, resolvedLocation.longitude],
                zoom: 16,
                displayName: resolvedLocation.address,
                query
            });
            onResolvedLocationChange(resolvedLocation);
        } catch (error) {
            setPreview((current) => ({
                ...current,
                status: 'error',
                message: error.message || 'Location lookup failed.'
            }));
            onResolvedLocationChange(null);
        } finally {
            setIsResolving(false);
        }
    };

    return (
        <>
            <div className="create-event__field">
                <label htmlFor="event-location" className="create-event__icon-label">
                    <CreateEventIcon name="pin" />
                    <span>Location</span>
                </label>
                <div className="create-event__location-row">
                    <input
                        id="event-location"
                        name="locationName"
                        value={value}
                        onChange={handleLocationChange}
                        onBlur={onBlur}
                        className={showError ? 'create-event__input--invalid' : undefined}
                        aria-invalid={showError}
                        aria-describedby={showError ? 'event-locationName-error' : undefined}
                        placeholder="e.g., TUM Main Campus, Building N5, Room 101"
                        required
                    />
                    <button
                        type="button"
                        className="create-event__map-button"
                        onClick={resolveLocationPreview}
                        disabled={isResolving}
                    >
                        {isResolving ? 'Checking...' : 'Preview'}
                    </button>
                </div>
                {showError && (
                    <p id="event-locationName-error" className="create-event__field-error" role="alert">
                        {error}
                    </p>
                )}
            </div>

            <div className="create-event__map" aria-label="Map preview for the event location">
                <MapContainer
                    className="create-event__leaflet"
                    center={preview.position}
                    zoom={preview.zoom}
                    dragging={true}
                    touchZoom={true}
                    doubleClickZoom={false}
                    scrollWheelZoom={true}
                    zoomControl={true}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={preview.position} icon={eventPinIcon} />
                    <MapUpdater position={preview.position} zoom={preview.zoom} />
                    <MapClickHandler onMapClick={handleMapClick} />
                </MapContainer>
                <div className={`create-event__map-card create-event__map-card--${preview.status}`}>
                    <CreateEventIcon name="pin" />
                    <div>
                        <strong>
                            {preview.status === 'resolved'
                                ? 'Matched location'
                                : preview.status === 'loading'
                                    ? 'Looking up location'
                                    : 'Location preview'}
                        </strong>
                        <span>
                            {preview.status === 'error'
                                ? preview.message
                                : preview.displayName}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

export default LocationPreviewField;
