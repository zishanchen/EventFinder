import { API_BASE_URL } from './index.js';

const readJson = async (response) => {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            `Unexpected response from server (${response.status})`
        );
    }
}


// Get all active boosts
export const getBoosts = async () => {
    const response = await fetch(`${API_BASE_URL}/boosts`);
    const data = await readJson(response);
    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch boosts');
    }
    return data;
};


// Get single boost by ID
export const getBoostById = async (id) => {
    const response = await fetch(`${API_BASE_URL}/boosts/${id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch boost');
    return data;
};
