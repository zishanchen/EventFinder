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

const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export const fetchPaymentProfile = async (token) => {
    const response = await fetch(`${API_BASE_URL}/payments/profile`, {
        headers: authHeaders(token)
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to load payment profile');
    }

    return data;
};

export const createSetupIntent = async (token) => {
    const response = await fetch(`${API_BASE_URL}/payments/setup-intent`, {
        method: 'POST',
        headers: authHeaders(token)
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to prepare payment setup');
    }

    return data;
};

export const savePaymentMethod = async (token, setupIntentId) => {
    const response = await fetch(`${API_BASE_URL}/payments/payment-method`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ setupIntentId })
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to save payment method');
    }

    return data;
};

export const fetchInvoices = async (token) => {
    const response = await fetch(`${API_BASE_URL}/payments/invoices`, {
        headers: authHeaders(token)
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to load invoices');
    }

    return data;
};

export const fetchHostPayouts = async (token) => {
    const response = await fetch(`${API_BASE_URL}/payments/host-payouts`, {
        headers: authHeaders(token)
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to load host payouts');
    }

    return data;
};

export const fetchMonthlyPaymentSummary = async (token, month) => {
    const params = new URLSearchParams();

    if (month) {
        params.set('month', month);
    }

    const queryString = params.toString();
    const response = await fetch(
        `${API_BASE_URL}/payments/monthly-summary${queryString ? `?${queryString}` : ''}`,
        {
            headers: authHeaders(token)
        }
    );
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to load monthly payment summary');
    }

    return data;
};
