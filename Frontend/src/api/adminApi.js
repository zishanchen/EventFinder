import { API_BASE_URL } from './index.js';

const authHeader = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
});

const handle = async (res) => {
    const text = await res.text();
    let data = {};

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Unexpected response from server (${res.status})`);
        }
    }

    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
};

// ── Stats ──────────────────────────────────────────────────────────────────
export const fetchAdminStats = async (token) => {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, { headers: authHeader(token) });
    return handle(res);
};

// ── Host verification ──────────────────────────────────────────────────────
export const fetchPendingHosts = async (token) => {
    const res = await fetch(`${API_BASE_URL}/admin/hosts/pending`, { headers: authHeader(token) });
    return handle(res);
};

export const verifyHost = async (token, hostId, enteredToken) => {
    const res = await fetch(`${API_BASE_URL}/admin/hosts/${hostId}/verify`, {
        method: 'POST',
        headers: authHeader(token),
        body: JSON.stringify({ token: enteredToken })
    });
    return handle(res);
};

export const rejectHost = async (token, hostId) => {
    const res = await fetch(`${API_BASE_URL}/admin/hosts/${hostId}/reject`, {
        method: 'POST',
        headers: authHeader(token)
    });
    return handle(res);
};

// ── Events ─────────────────────────────────────────────────────────────────
export const fetchAdminEvents = async (token) => {
    const res = await fetch(`${API_BASE_URL}/admin/events`, { headers: authHeader(token) });
    return handle(res);
};

export const cancelEvent = async (token, eventId) => {
    const res = await fetch(`${API_BASE_URL}/admin/events/${eventId}/cancel`, {
        method: 'POST',
        headers: authHeader(token)
    });
    return handle(res);
};

// ── Users ──────────────────────────────────────────────────────────────────
export const fetchAdminUsers = async (token) => {
    const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: authHeader(token) });
    return handle(res);
};

export const toggleDeactivateUser = async (token, userId) => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: authHeader(token)
    });
    return handle(res);
};

// ── GDPR ───────────────────────────────────────────────────────────────────
export const gdprDeleteUser = async (token, userId) => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/gdpr-delete`, {
        method: 'DELETE',
        headers: authHeader(token)
    });
    return handle(res);
};

// ── Bills ──────────────────────────────────────────────────────────────────
export const fetchAdminBills = async (token, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            params.append(key, String(value).trim());
        }
    });

    const query = params.toString();
    const res = await fetch(`${API_BASE_URL}/admin/bills${query ? `?${query}` : ''}`, {
        headers: authHeader(token)
    });
    return handle(res);
};

export const relieveAdminBill = async (token, billId) => {
    const res = await fetch(`${API_BASE_URL}/admin/bills/${billId}/relieve`, {
        method: 'POST',
        headers: authHeader(token)
    });
    return handle(res);
};

export const restoreAdminBill = async (token, billId) => {
    const res = await fetch(`${API_BASE_URL}/admin/bills/${billId}/restore`, {
        method: 'POST',
        headers: authHeader(token)
    });
    return handle(res);
};

// ── Settings ───────────────────────────────────────────────────────────────
export const fetchAdminSettings = async (token) => {
    const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers: authHeader(token) });
    return handle(res);
};

export const updateLateCancellationWindow = async (token, lateCancellationWindowDays, lateCancellationFeePercent) => {
    const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PATCH',
        headers: authHeader(token),
        body: JSON.stringify({ lateCancellationWindowDays, lateCancellationFeePercent })
    });
    return handle(res);
};

export const createAdminTag = async (token, tag) => {
    const res = await fetch(`${API_BASE_URL}/admin/settings/tags`, {
        method: 'POST',
        headers: authHeader(token),
        body: JSON.stringify(tag)
    });
    return handle(res);
};

export const updateAdminTag = async (token, tagId, updates) => {
    const res = await fetch(`${API_BASE_URL}/admin/settings/tags/${tagId}`, {
        method: 'PATCH',
        headers: authHeader(token),
        body: JSON.stringify(updates)
    });
    return handle(res);
};

export const createAdminBoost = async (token, boost) => {
    const res = await fetch(`${API_BASE_URL}/admin/settings/boosts`, {
        method: 'POST',
        headers: authHeader(token),
        body: JSON.stringify(boost)
    });
    return handle(res);
};

export const updateAdminBoost = async (token, boostId, updates) => {
    const res = await fetch(`${API_BASE_URL}/admin/settings/boosts/${boostId}`, {
        method: 'PATCH',
        headers: authHeader(token),
        body: JSON.stringify(updates)
    });
    return handle(res);
};
