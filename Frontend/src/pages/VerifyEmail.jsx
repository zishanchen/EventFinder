import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail as verifyEmailToken } from '../api/authApi.js';
import CreateEventIcon from '../components/create-event/CreateEventIcon.jsx';
import '../styles/auth.css';

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');
    const verificationStarted = useRef(false);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) { setStatus('error'); setMessage('No token found.'); return; }

        const verify = async () => {
            if (verificationStarted.current) return;
            verificationStarted.current = true;
            try {
                const data = await verifyEmailToken(token);
                setStatus('success');
                setMessage(data.message);
            } catch (err) {
                setStatus('error');
                setMessage(err.message);
            }
        };
        verify();
    }, [searchParams]);

    return (
        <div className="auth-page">
            <div className="auth-page__logo">
                <img src="/logo.png" alt="EventFinder" />
            </div>
            <h1 className="auth-page__title">Verify Email</h1>
            <p className="auth-page__subtitle">Confirm your address to unlock your account.</p>

            <div className="auth-card verify-email__card">
                {status === 'loading' && (
                    <div className="verify-email__state">
                        <span className="modal__spinner verify-email__spinner" />
                        <p className="verify-email__text">Verifying your email address...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="verify-email__state">
                        <span className="verify-email__icon">
                            <CreateEventIcon name="check" />
                        </span>
                        <h2 className="verify-email__title">Email Verified!</h2>
                        <p className="verify-email__text">{message}</p>
                        <button
                            className="auth-btn--primary"
                            onClick={() => navigate('/login')}
                        >
                            Start Discovering Events
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="verify-email__state">
                        <span className="verify-email__icon">
                            <CreateEventIcon name="close" />
                        </span>
                        <h2 className="verify-email__title">Verification Failed</h2>
                        <p className="verify-email__text">{message}</p>
                        <button
                            className="auth-btn--primary"
                            onClick={() => navigate('/login')}
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VerifyEmail;
