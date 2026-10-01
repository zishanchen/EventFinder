import React, { useState } from 'react';
import { requestPasswordReset } from '../api/authApi.js';

export default function ForgotPasswordModal({ onClose }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await requestPasswordReset(email);
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal__overlay" onClick={onClose}>
            <div className="modal__card" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal__header">
                    <h2 className="modal__title">Forgot Password</h2>
                    <button className="modal__close" onClick={onClose}>✕</button>
                </div>

                {success ? (
                    /* Success state */
                    <div className="modal__success">
                        <span className="modal__success-icon">✉</span>
                        <p className="modal__success-text">
                            If an account exists with this email, a reset link has been sent.
                            Please check your inbox!
                        </p>
                        <button className="auth-btn--primary" onClick={onClose}>
                            Back to Login
                        </button>
                    </div>
                ) : (
                    /* Form state */
                    <form onSubmit={handleSubmit}>
                        <p className="modal__subtitle">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        {error && <p className="auth-error">{error}</p>}

                        <div className="auth-field">
                            <label className="auth-field__label">Email Address</label>
                            <div className="auth-field__input-wrapper">
                                <span className="auth-field__icon">✉</span>
                                <input
                                    type="email"
                                    className="auth-field__input"
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="auth-btn--primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="modal__spinner" />
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
}
