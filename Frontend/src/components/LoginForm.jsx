import React from 'react';

export default function LoginForm({
    loginForm,
    showPassword,
    loading,
    error,
    loginErrors,
    onUpdateForm,
    onSubmit,
    onTogglePassword,
    onForgotPassword
}) {
    return (
        <>
            <h1 className="auth-page__title">Welcome Back</h1>
            <p className="auth-page__subtitle">Sign in to discover amazing events</p>

            <div className="auth-card">
                {error && <p className="auth-error">{error}</p>}

                <form onSubmit={onSubmit}>

                    {/* Email */}
                    <div className="auth-field">
                        <label className="auth-field__label">Email Address</label>
                        <div className="auth-field__input-wrapper">
                            <span className="auth-field__icon">✉</span>
                            <input
                                type="email"
                                className={`auth-field__input ${loginErrors.email ? 'auth-field__input--error' : ''}`}
                                placeholder="Enter your email address"
                                value={loginForm.email}
                                onChange={e => onUpdateForm('email', e.target.value)}
                            />
                        </div>
                        {loginErrors.email && <p className="auth-field__error">{loginErrors.email}</p>}
                    </div>

                    {/* Password */}
                    <div className="auth-field">
                        <label className="auth-field__label">Password</label>
                        <div className="auth-field__input-wrapper">
                            <span className="auth-field__icon">🔒</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className={`auth-field__input ${loginErrors.password ? 'auth-field__input--error' : ''}`}
                                placeholder="Enter your password"
                                value={loginForm.password}
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
                        {loginErrors.password && <p className="auth-field__error">{loginErrors.password}</p>}
                    </div>

                    {/* Remember me + Forgot password */}
                    <div className="auth-row">
                        <label className="auth-row__remember">
                            <input
                                type="checkbox"
                                checked={loginForm.rememberMe}
                                onChange={e => onUpdateForm('rememberMe', e.target.checked)}
                            />
                            Remember me
                        </label>
                        <button
                            type="button"
                            className="auth-row__forgot"
                            onClick={onForgotPassword}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button type="submit" className="auth-btn--primary" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                    </button>

                </form>
            </div>

            <p className="auth-footer">
                Don't have an account? <a href="/register">Sign up</a>
            </p>
        </>
    );
}
