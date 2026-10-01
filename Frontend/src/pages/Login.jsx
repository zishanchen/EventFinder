import React from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import LoginForm from '../components/LoginForm.jsx';
import ForgotPasswordModal from '../components/ForgotPasswordModal.jsx';
import '../styles/auth.css';

function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const {
    loginForm,
    showPassword,
    loading,
    error,
    loginErrors,
    updateLoginForm,
    handleLogin,
    toggleShowPassword
  } = useAuth();

  const showForgotPassword = searchParams.get('forgot') === 'true';

  // Message passed from Register page after successful registration
  const successMessage = location.state?.message;

  const openForgotPassword = () => setSearchParams({ forgot: 'true' });
  const closeModal = () => setSearchParams({});

  return (
    <div className="auth-page auth-page--login">
      <div className="auth-page__logo">
        <Link to="/">
          <img src="/logo.png" alt="EventFinder" />
        </Link>
      </div>

      {/* Success message from registration */}
      {successMessage && (
        <div className="auth-success">
          ✉ {successMessage}
        </div>
      )}

      <LoginForm
        loginForm={loginForm}
        showPassword={showPassword}
        loading={loading}
        error={error}
        loginErrors={loginErrors}
        onUpdateForm={updateLoginForm}
        onSubmit={handleLogin}
        onTogglePassword={toggleShowPassword}
        onForgotPassword={openForgotPassword}
      />

      {showForgotPassword && <ForgotPasswordModal onClose={closeModal} />}
    </div>
  );
}

export default Login;
