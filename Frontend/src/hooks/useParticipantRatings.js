import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    deleteParticipantRating,
    fetchEventParticipantsForRating,
    rateRemainingParticipantsDefault
} from '../api/ratingApi.js';
import { useAuthContext } from '../context/AuthContext.jsx';

export default function useParticipantRatings(eventId, initialMessage = '') {
    const { token } = useAuthContext();
    const [event, setEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(Boolean(eventId));
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(initialMessage);

    const unratedCount = useMemo(
        () => participants.filter((item) => !item.hasRated).length,
        [participants]
    );

    const loadParticipants = useCallback(async () => {
        if (!eventId) {
            setLoading(false);
            setError('Choose an event first to rate its attended participants.');
            return;
        }

        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchEventParticipantsForRating(token, eventId);
            setEvent(data.event);
            setParticipants(data.participants || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [eventId, token]);

    useEffect(() => {
        loadParticipants();
    }, [loadParticipants]);

    const applyDefaultRatings = useCallback(async () => {
        if (!eventId || unratedCount === 0) {
            return;
        }

        if (!token) {
            setError('You must be signed in to rate participants.');
            return;
        }

        setActionLoading(true);
        setError(null);
        setMessage('');

        try {
            const data = await rateRemainingParticipantsDefault(token, eventId);
            setEvent(data.event);
            setParticipants(data.participants || []);
            setMessage(data.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    }, [eventId, token, unratedCount]);

    const deleteParticipantReview = useCallback(async (registrationId) => {
        if (!registrationId) {
            return;
        }

        if (!token) {
            setError('You must be signed in to delete a participant rating.');
            return;
        }

        setActionLoading(true);
        setError(null);
        setMessage('');

        try {
            const data = await deleteParticipantRating(token, registrationId);
            await loadParticipants();
            setMessage(data.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    }, [token, loadParticipants]);

    return {
        event,
        participants,
        loading,
        actionLoading,
        error,
        message,
        unratedCount,
        setMessage,
        loadParticipants,
        applyDefaultRatings,
        deleteParticipantReview
    };
}
