import { API_BASE_URL } from "./index.js";

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

export const fetchEvents = async (filters = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim() !== '') {
            params.append(key, value.trim());
        }
        else if (Array.isArray(value) && value.length > 0) {
            params.append(key, value.join(','));
        }
    });

    const response = await fetch(`${API_BASE_URL}/events?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to fetch events');
    }

    return response.json();
};

export const fetchEventById = async (id) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`);

    if (!response.ok) {
        throw new Error('Failed to fetch event');
    }

    return response.json();
};

export const fetchFeaturedEvents = async () => {
    const response = await fetch(`${API_BASE_URL}/events/featured`);

    if (!response.ok) {
        throw new Error('Failed to fetch featured events');
    }

    return response.json();
};

export const fetchTags = async () => {
    const response = await fetch(`${API_BASE_URL}/tags`);

    if (!response.ok) {
        throw new Error('Failed to fetch tags');
    }

    return response.json();
};

export const fetchSavedEventIds = async (token) => {
    const response = await fetch(`${API_BASE_URL}/events/saved/ids`, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch saved events');
    }

    return data.savedEventIds || [];
};

export const fetchSavedEvents = async (token) => {
    const response = await fetch(`${API_BASE_URL}/events/saved`, {
        method: 'GET',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || "Failed to load saved Events")
    }

    return data.savedEvents || [];
}

export const saveEvent = async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/save`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to save event');
    }

    return data;
};

export const unsaveEvent = async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/save`, {
        method: 'DELETE',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to remove saved event');
    }

    return data;
};

export const fetchHostDashboardEvents = async (token) => {
    const response = await fetch(`${API_BASE_URL}/events/host/dashboard`, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch host dashboard events');
    }

    return data;
};

export const fetchHostEventRegistrations = async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations`, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch event registrations');
    }

    return data;
};

export const removeEventParticipant = async (eventId, registrationId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations/${registrationId}/remove`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        const error = new Error(data.message || 'Failed to remove participant');
        error.code = data.code;
        error.status = response.status;
        throw error;
    }

    return data;
};

export const createEvent = async (eventData, token) => {
    const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(eventData)
    });

    if (response.status === 413) {
        throw new Error('Failed to create event. Please choose an image under 5 MB.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const validationMessage = Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors.join(', ')
            : data.message;
        const error = new Error(validationMessage || 'Failed to create event');
        error.code = data.code;
        error.status = response.status;
        throw error;
    }

    return data;
};

export const updateEvent = async (eventId, eventData, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(eventData)
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
        const validationMessage = Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors.join(', ')
            : data.message;
        const error = new Error(validationMessage || 'Failed to update event');
        error.status = response.status;
        throw error;
    }

    return data;
};

export const fetchMyEventRegistration = async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/registration`, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch registration');
    }

    return data;
};

export const registerForEvent = async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        const error = new Error(data.message || 'Failed to register for event');
        error.code = data.code;
        error.status = response.status;
        throw error;
    }

    return data;
};

export const deregisterFromEvent = async (eventId, token, { confirmLateFee = false } = {}) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/deregister`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(confirmLateFee ? { body: JSON.stringify({ confirmLateFee: true }) } : {})
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        const error = new Error(data.message || 'Failed to cancel registration');
        error.code = data.code;
        error.status = response.status;
        error.lateCancellation = data.lateCancellation;
        error.cancellationFeeAmount = data.cancellationFeeAmount;
        error.lateCancellationFeePercent = data.lateCancellationFeePercent;
        error.lateCancellationWindowDays = data.lateCancellationWindowDays;
        throw error;
    }

    return data;
};
