import { API_BASE_URL } from './index.js';



const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
});


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
};

export const createBoostCheckoutSession = async (
    token,
    payload
) => {
    const response = await fetch(`${API_BASE_URL}/boost-purchases/checkout-session`,
        {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(payload)
        }
    );
    const data = await readJson(response);
    if (!response.ok) {
        const error = new Error(
            data.message || 'Could not prepare boost payment'
        );
        error.status = response.status;
        throw error;
    }
    return data;
}

export const fetchBoostPurchase = async (token,
    purchaseId
) => {
    const response = await fetch(`${API_BASE_URL}/boost-purchases/${purchaseId}`,
        { headers: authHeaders(token) }
    );

    const data = await readJson(response);
    if (!response.ok) {
        throw new Error(
            data.message || ' Could not load purchase stutas'
        );
    }
    return data;
}


export const syncBoostPurchase = async (
    token,
    purchaseId
) => {
    const response = await fetch(
        `${API_BASE_URL}/boost-purchases/${purchaseId}/sync`,
        {
            method: 'POST',
            headers: authHeaders(token)
        }
    );

    const data = await readJson(response);
    if (!response.ok) {
        throw new Error(
            data.message || 'Could not sync purchase status'
        );
    }
    return data;
};


export const cancelBoostPurchase = async (
    token,
    purchaseId
) => {
    const response = await fetch(
        `${API_BASE_URL}/boost-purchases/${purchaseId}/cancel`,
        {
            method: 'POST',
            headers: authHeaders(token)
        }
    );
    const data = await readJson(response);
    if (!response.ok) {
        throw new Error(
            data.message || 'Could not cancel purchase'
        );
    }
    return data;
};
