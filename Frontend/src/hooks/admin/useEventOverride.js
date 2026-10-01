import { useState, useEffect, useMemo } from 'react';
import { fetchAdminEvents, cancelEvent } from '../../api/adminApi.js';

const sortByLatestEventDate = (items) => {
    return [...items].sort((left, right) => {
        return new Date(right.date || right.datetime || 0).getTime() - new Date(left.date || left.datetime || 0).getTime();
    });
};

export default function useEventOverride(token) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [feedback, setFeedback] = useState({});
    const [showRecommendations, setShowRecommendations] = useState(false);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchAdminEvents(token)
            .then(data => {
                setEvents(sortByLatestEventDate(data));
                setFeedback(p => {
                    const next = { ...p };
                    delete next._g;
                    return next;
                });
            })
            .catch(e => setFeedback(p => ({ ...p, _g: e.message })))
            .finally(() => setLoading(false));
    }, [token]);

    const handleCancel = async (ev) => {
        if (!window.confirm(`Force-cancel "${ev.title}"? This cannot be undone.`)) return;
        try {
            await cancelEvent(token, ev._id);
            setEvents(p => sortByLatestEventDate(p.map(e =>
                e._id === ev._id ? { ...e, status: 'Cancelled' } : e
            )));
            setFeedback(p => ({ ...p, [ev._id]: { msg: '🚫 Cancelled.', ok: true } }));
        } catch (e) {
            setFeedback(p => ({ ...p, [ev._id]: { msg: `❌ ${e.message}`, ok: false } }));
        }
    };

    const query = search.toLowerCase();
    const filtered = events.filter((event) =>
        event.title?.toLowerCase().includes(query) ||
        event.creator?.username?.toLowerCase().includes(query) ||
        event.host?.name?.toLowerCase().includes(query)
    );

    const recommendations = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return [];

        const values = new Map();
        events.forEach((event) => {
            [event.title, event.creator?.username, event.host?.name]
                .filter(Boolean)
                .forEach((value) => {
                    const normalized = value.toLowerCase();
                    if (normalized.includes(keyword)) {
                        values.set(normalized, value);
                    }
                });
        });

        return Array.from(values.values()).slice(0, 6);
    }, [events, search]);

    return {
        filtered,
        loading,
        search,
        setSearch,
        feedback,
        handleCancel,
        recommendations,
        showRecommendations,
        setShowRecommendations
    };
}
