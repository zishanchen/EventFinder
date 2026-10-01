import { API_BASE_URL } from './index.js';

const readJsonResponse = async (response) => {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Unexpected response from server (${response.status})`);
    }
};

// Participant rates host
export const rateEventAndHost = async (token, { registrationId, eventId, hostRating, comment, photo }) => {
    const response = await fetch(`${API_BASE_URL}/ratings/rate-event`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ registrationId, eventId, hostRating, comment, photo })
    });

    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Failed to submit rating');
    return data;
};

export const deleteEventRating = async (token, registrationId) => {
    const response = await fetch(`${API_BASE_URL}/ratings/rate-event/${registrationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Failed to delete review');
    return data;
};

// Host rates participant
export const rateParticipant = async (token, { registrationId, rating, comment }) => {
    const response = await fetch(`${API_BASE_URL}/ratings/rate-participant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ registrationId, rating, comment })
    });

    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Failed to submit rating');
    return data;
};

export const deleteParticipantRating = async (token, registrationId) => {
    const response = await fetch(`${API_BASE_URL}/ratings/rate-participant/${registrationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Failed to delete rating');
    return data;
};

export const fetchEventParticipantsForRating = async (token, eventId) => {
    const response = await fetch(`${API_BASE_URL}/ratings/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Failed to fetch attended participants');
    return data;
};

export const rateRemainingParticipantsDefault = async (token, eventId) => {
    const response = await fetch(`${API_BASE_URL}/ratings/events/${eventId}/participants/default`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Failed to rate participants');
    return data;
};
