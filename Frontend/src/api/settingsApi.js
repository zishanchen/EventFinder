import { API_BASE_URL } from './index.js';

export const fetchPublicSettings = async () => {
    const response = await fetch(`${API_BASE_URL}/settings`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch settings');
    }

    return data;
};
