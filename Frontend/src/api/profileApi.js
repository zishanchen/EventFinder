import { API_BASE_URL } from './index.js';

export const getUserProfile = async (token) => {
    const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error('Profile request did not return JSON. Please check that the backend is running on the configured API URL.');
    }

    if (!response.ok) {
        throw new Error(data.message || 'Failed to get profile');
    }

    return data;
};

export const updateProfileAvatar = async (token, profilePicture) => {
    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profilePicture })
    });

    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error('Avatar update did not return JSON. Please check that the backend is running on the configured API URL.');
    }

    if (!response.ok) {
        throw new Error(data.message || 'Failed to update avatar');
    }

    return data;
};


