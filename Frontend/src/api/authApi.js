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

export const registerUser = async (registerForm) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: registerForm.fullName,
                email: registerForm.email,
                password: registerForm.password,
                role: registerForm.role,
                socialMedia: registerForm.socialMedia,
                captchaToken: registerForm.captchaToken
            })
        });

        const data = await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            throw new Error('Unable to connect to server. Please try again later.');
        }
        throw err;
    }
};

export const loginUser = async (loginForm) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: loginForm.email,
                password: loginForm.password,
                rememberMe: loginForm.rememberMe
            })
        });

        if (!response.ok) {
            const data = await readJsonResponse(response);
            throw new Error(data.message || 'Login failed');
        }

        return readJsonResponse(response);
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            throw new Error('Unable to connect to server. Please try again later.');
        }
        throw err;
    }
};

export const getMe = async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const data = await readJsonResponse(response);
        const error = new Error(data.message || 'Failed to get user');
        error.status = response.status;
        throw error;
    }

    return readJsonResponse(response);
};

export const validateParticipantEmail = async (email) => {
    const params = new URLSearchParams({ email });
    const response = await fetch(`${API_BASE_URL}/auth/validate-participant-email?${params.toString()}`);
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to validate email');
    }

    return data;
};

export const verifyEmail = async (token) => {
    const params = new URLSearchParams({ token });
    const response = await fetch(`${API_BASE_URL}/auth/verify-email?${params.toString()}`);
    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Email verification failed');
    }

    return data;
};

export const requestPasswordReset = async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};

export const resetPassword = async ({ token, password }) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};
