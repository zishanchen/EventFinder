import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { PASSWORD_RULES } from '../utils/authValidation.js';

const RECAPTCHA_SITE_KEY = '6Lfi1BMtAAAAAC0q-YiBwTPwFMlvLZ8fFO_dNNH9';

export default function RegisterForm({
    registerForm,
    showPassword,
    showConfirmPassword,
    loading,
    error,
    registerErrors,
    onUpdateForm,
    onSubmit,
    onTogglePassword,
    onToggleConfirmPassword
}) {
    return (
        <>
            <h1 className="auth-page__title">Join EventFinder</h1>
            <p className="auth-page__subtitle">Create your account to get started</p>

            <div className="auth-card">
                {error && <p className="auth-error">{error}</p>}

                <form onSubmit={onSubmit}>

                    {/* Full Name */}
                    <div className="auth-field">
                        <label className="auth-field__label">Full Name</label>
                        <div className="auth-field__input-wrapper">
                            <span className="auth-field__icon">👤</span>
                            <input
                                type="text"
                                className={`auth-field__input ${registerErrors.fullName ? 'auth-field__input--error' : ''}`}
                                placeholder="Enter your full name"
                                value={registerForm.fullName}
                                onChange={e => onUpdateForm('fullName', e.target.value)}
                            />
                        </div>
                        {registerErrors.fullName && <p className="auth-field__error">{registerErrors.fullName}</p>}
                    </div>

                    {/* Email */}
                    <div className="auth-field auth-field--email">
                        <label className="auth-field__label">
                            {registerForm.role === 'Participant' ? 'University Email' : 'Email'}
                        </label>
                        <div className="auth-field__input-wrapper">
                            <span className="auth-field__icon">✉</span>
                            <input
                                type="email"
                                className={`auth-field__input ${registerErrors.email ? 'auth-field__input--error' : ''}`}
                                placeholder={registerForm.role === 'Participant'
                                    ? 'Enter your university email address'
                                    : 'Enter your email address'}
                                value={registerForm.email}
                                onChange={e => onUpdateForm('email', e.target.value)}
                            />
                        </div>
                        {registerErrors.email && <p className="auth-field__error">{registerErrors.email}</p>}
                        {registerForm.role === 'Participant' && (
                            <p className="auth-field__hint">
                                Use your German university email address
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="auth-field">
                        <label className="auth-field__label">Password</label>
                        <div className="auth-field__input-wrapper">
                            <span className="auth-field__icon">🔒</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className={`auth-field__input ${registerErrors.password ? 'auth-field__input--error' : ''}`}
                                placeholder="Create a strong password"
                                value={registerForm.password}
                                onChange={e => onUpdateForm('password', e.target.value)}
                            />
                            <button
                                type="button"
                                className="auth-field__toggle"
                                onClick={onTogglePassword}
                            >
                                {showPassword ? "🙈" : "👁"}
                            </button>
                        </div>

                        {/* Password rules */}
                        <ul className="auth-field__rules">
                            {PASSWORD_RULES.map((rule) => (
                                <li
                                    key={rule.key}
                                    className={rule.isMet(registerForm.password) ? 'auth-field__rule--met' : 'auth-field__rule--unmet'}
                                >
                                    {rule.label}
                                </li>
                            ))}
                        </ul>
                        {registerErrors.password && <p className="auth-field__error">{registerErrors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div className="auth-field">
                        <label className="auth-field__label">Confirm Password</label>
                        <div className="auth-field__input-wrapper">
                            <span className="auth-field__icon">🔒</span>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                className={`auth-field__input ${registerErrors.confirmPassword ? 'auth-field__input--error' : ''}`}
                                placeholder="Re-enter your password"
                                value={registerForm.confirmPassword}
                                onChange={e => onUpdateForm('confirmPassword', e.target.value)}
                            />
                            <button
                                type="button"
                                className="auth-field__toggle"
                                onClick={onToggleConfirmPassword}
                            >
                                {showConfirmPassword ? "🙈" : "👁"}
                            </button>
                        </div>
                        {registerErrors.confirmPassword && <p className="auth-field__error">{registerErrors.confirmPassword}</p>}
                    </div>

                    {/* Role Selector */}
                    <div className="auth-field">
                        <label className="auth-field__label">I want to</label>
                        <div className="auth-roles">
                            <button
                                type="button"
                                className={`auth-role ${registerForm.role === 'Participant' ? 'auth-role--active' : ''}`}
                                onClick={() => onUpdateForm('role', 'Participant')}
                            >
                                <span className="auth-role__icon">👤</span>
                                <span className="auth-role__title">Participant</span>
                                <span className="auth-role__subtitle">Join events</span>
                            </button>
                            <button
                                type="button"
                                className={`auth-role ${registerForm.role === 'Host' ? 'auth-role--active' : ''}`}
                                onClick={() => onUpdateForm('role', 'Host')}
                            >
                                <span className="auth-role__icon">📋</span>
                                <span className="auth-role__title">Host</span>
                                <span className="auth-role__subtitle">Create events</span>
                            </button>
                        </div>
                    </div>

                    {/* Social Media — only for Host */}
                    {registerForm.role === 'Host' && (
                        <div className="auth-field auth-field--social">
                            <label className="auth-field__label">Social Media for Verification</label>
                            <p className="auth-field__hint">
                                We will use this to verify your identity as a host
                            </p>

                            {/* Platform selector */}
                            <div className="auth-social__platforms">
                                <button
                                    type="button"
                                    className={`auth-social__platform ${registerForm.socialMedia?.platform === 'LinkedIn' ? 'auth-social__platform--active' : ''}`}
                                    onClick={() => onUpdateForm('socialMedia', {
                                        ...registerForm.socialMedia,
                                        platform: 'LinkedIn'
                                    })}
                                >
                                    💼 LinkedIn
                                </button>
                                <button
                                    type="button"
                                    className={`auth-social__platform ${registerForm.socialMedia?.platform === 'Instagram' ? 'auth-social__platform--active' : ''}`}
                                    onClick={() => onUpdateForm('socialMedia', {
                                        ...registerForm.socialMedia,
                                        platform: 'Instagram'
                                    })}
                                >
                                    📸 Instagram
                                </button>
                            </div>

                            {/* Username input */}
                            {registerForm.socialMedia?.platform && (
                                <div className="auth-field__input-wrapper">
                                    <span className="auth-field__icon">@</span>
                                    <input
                                        type="text"
                                        className={`auth-field__input ${registerErrors.socialMedia ? 'auth-field__input--error' : ''}`}
                                        placeholder={`Your ${registerForm.socialMedia.platform} username`}
                                        value={registerForm.socialMedia?.username || ''}
                                        onChange={e => onUpdateForm('socialMedia', {
                                            ...registerForm.socialMedia,
                                            username: e.target.value
                                        })}
                                    />
                                </div>
                            )}
                            {registerErrors.socialMedia && <p className="auth-field__error">{registerErrors.socialMedia}</p>}
                        </div>
                    )}

                    {/* Social Media — only for Host */}
                    {registerForm.role === 'Host' && (
                        <div className="auth-field auth-field--social-note">
                            <p className="auth-field__hint">
                                Choose your social media platform. After registration, you will receive a unique token.
                                Send it to us as a DM from your account so we can verify your identity as a host.
                            </p>
                        </div>
                    )}

                    {/* Terms */}
                    <label className="auth-terms">
                        <input
                            type="checkbox"
                            checked={registerForm.agreeTerms}
                            onChange={e => onUpdateForm('agreeTerms', e.target.checked)}
                        />
                        I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                    </label>
                    {registerErrors.agreeTerms && <p className="auth-field__error">{registerErrors.agreeTerms}</p>}

                    {/* Captcha */}
                    <div className="auth-captcha">
                        <ReCAPTCHA
                            sitekey={RECAPTCHA_SITE_KEY}
                            onChange={(token) => onUpdateForm('captchaToken', token)}
                            onExpired={() => onUpdateForm('captchaToken', null)}
                        />
                        {registerErrors.captchaToken && (
                            <p className="auth-field__error">{registerErrors.captchaToken}</p>
                        )}
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        className="auth-btn--primary"
                        disabled={loading}
                    >
                        {loading ? <span className="modal__spinner" /> : "Create Account"}
                    </button>

                </form>
            </div>

            <p className="auth-footer">
                Already have an account? <a href="/login">Sign in</a>
            </p>
        </>
    );
}
