import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, requiredRole }) {
    const { isAuthenticated, user, loading } = useAuthContext();

    // Wait for auth to load
    if (loading) {
        return (
            <div className="protected__loading">
                <span className="modal__spinner" />
            </div>
        );
    }

    // Not logged in → redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Wrong role → redirect to home
    if (requiredRole && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
