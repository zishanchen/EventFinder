import React from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import ResetPasswordModal from '../components/ResetPasswordModal.jsx';
import '../styles/auth.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="auth-page">
            <div className="auth-page__logo">
                <img src="/logo.png" alt="EventFinder" />
            </div>
            <h1 className="auth-page__title">Reset Password</h1>
            <p className="auth-page__subtitle">Choose a strong new password to get back in.</p>
            <ResetPasswordModal
                token={token}
                onClose={() => navigate('/login')}
            />
        </div>
    );
}

export default ResetPassword;
