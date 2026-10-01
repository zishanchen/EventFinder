import React, { createContext, useState, useEffect, useContext } from 'react';
import { getMe } from '../api/authApi.js';

const AuthContext = createContext(null);
const REMEMBER_ME_DURATION_MS = 24 * 60 * 60 * 1000;

const getStoredToken = () => {
    const rememberedToken = localStorage.getItem('token');
    const rememberedTokenExpiresAt = Number(localStorage.getItem('tokenExpiresAt'));

    if (rememberedToken) {
        if (rememberedTokenExpiresAt && rememberedTokenExpiresAt > Date.now()) {
            return rememberedToken;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiresAt');
    }

    return sessionStorage.getItem('token') || null;
};

const clearStoredToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiresAt');
    sessionStorage.removeItem('token');
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(getStoredToken);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                try {
                    const data = await getMe(token);
                    setUser(data);
                } catch (err) {
                    console.error('Failed to restore session:', err.message);
                    if (err.status === 401 || err.status === 403) {
                        setToken(null);
                        setUser(null);
                        clearStoredToken();
                    }
                }
            }
            setLoading(false);
        };

        loadUser();
    }, [token]);

    const login = (userData, jwtToken, rememberMe = false) => {
        setUser(userData);
        setToken(jwtToken);

        clearStoredToken();
        if (rememberMe) {
            localStorage.setItem('token', jwtToken);
            localStorage.setItem('tokenExpiresAt', String(Date.now() + REMEMBER_ME_DURATION_MS));
        } else {
            sessionStorage.setItem('token', jwtToken);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        clearStoredToken();
    };

    const updateUser = (updates) => {
        setUser((currentUser) => currentUser ? { ...currentUser, ...updates } : currentUser);
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            logout,
            updateUser,
            isAuthenticated: !!user,
            isParticipant: user?.role === 'Participant',
            isHost: user?.role === 'Host',
            isAdmin: user?.role === 'Admin'
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used inside AuthProvider');
    }
    return context;
}

export default AuthContext;
