import React, { useState } from 'react';
import CreateEventIcon from './create-event/CreateEventIcon.jsx';
import { resetPassword } from '../api/authApi.js';
import { PASSWORD_RULES, validatePassword } from '../utils/authValidation.js';

export default function ResetPasswordModal({ token, onClose }) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validate
        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await resetPassword({ token, password });
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
                    <h2 className="modal__title">
                        <span className="modal__title-icon">
                            <CreateEventIcon name="lock" />
                        </span>
                        Reset Password
                    </h2>
                    <button className="modal__close" onClick={onClose} aria-label="Close reset password dialog">
                        <CreateEventIcon name="close" />
                    </button>
                </div>

                {success ? (
                    /* Success state */
                    <div className="modal__success">
                        <span className="modal__success-icon">
                            <CreateEventIcon name="check" />
                        </span>
                        <p className="modal__success-text">
                            Your password has been reset successfully!
                            You can now log in with your new password.
                        </p>
                        <button className="auth-btn--primary" onClick={onClose}>
                            Back to Login
                        </button>
                    </div>
                ) : (
                    /* Form state */
                    <form onSubmit={handleSubmit}>
                        <p className="modal__subtitle">
                            Enter your new password below.
                        </p>

                        {error && <p className="auth-error">{error}</p>}

                        {/* New Password */}
                        <div className="auth-field">
                            <label className="auth-field__label">New Password</label>
                            <div className="auth-field__input-wrapper">
                                <span className="auth-field__icon">
                                    <CreateEventIcon name="lock" />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="auth-field__input"
                                    placeholder="Create a strong password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="auth-field__toggle"
                                    onClick={() => setShowPassword(prev => !prev)}
                                >
                                    <CreateEventIcon name={showPassword ? 'eyeOff' : 'eye'} />
                                </button>
                            </div>

                            {/* Password rules */}
                            <ul className="auth-field__rules">
                                {PASSWORD_RULES.map((rule) => (
                                    <li
                                        key={rule.key}
                                        className={rule.isMet(password) ? 'auth-field__rule--met' : 'auth-field__rule--unmet'}
                                    >
                                        {rule.label}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Confirm Password */}
                        <div className="auth-field">
                            <label className="auth-field__label">Confirm Password</label>
                            <div className="auth-field__input-wrapper">
                                <span className="auth-field__icon">
                                    <CreateEventIcon name="lock" />
                                </span>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="auth-field__input"
                                    placeholder="Re-enter your new password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="auth-field__toggle"
                                    onClick={() => setShowConfirmPassword(prev => !prev)}
                                >
                                    <CreateEventIcon name={showConfirmPassword ? 'eyeOff' : 'eye'} />
                                </button>
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
                                'Reset Password'
                            )}
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
}
