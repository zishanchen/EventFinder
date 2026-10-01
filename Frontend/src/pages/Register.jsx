import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Navbar from '../components/Navbar.jsx';
import RegisterForm from '../components/RegisterForm.jsx';
import '../styles/auth.css';

function Register() {
    const {
        registerForm,
        showPassword,
        showConfirmPassword,
        loading,
        error,
        registerErrors,
        updateRegisterForm,
        handleRegister,
        toggleShowPassword,
        toggleShowConfirmPassword
    } = useAuth();

    return (
        <div className="auth-page auth-page--register">
            <div className="auth-page__logo">
                <Link to="/">
                    <img src="/logo.png" alt="EventFinder" />
                </Link>
            </div>

            <RegisterForm
                registerForm={registerForm}
                showPassword={showPassword}
                showConfirmPassword={showConfirmPassword}
                loading={loading}
                error={error}
                registerErrors={registerErrors}
                onUpdateForm={updateRegisterForm}
                onSubmit={handleRegister}
                onTogglePassword={toggleShowPassword}
                onToggleConfirmPassword={toggleShowConfirmPassword}
            />
        </div>
    );
}

export default Register;
