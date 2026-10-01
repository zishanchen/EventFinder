import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, validateParticipantEmail } from '../api/authApi.js';
import { useAuthContext } from '../context/AuthContext.jsx';
import { validatePassword } from '../utils/authValidation.js';

const initialLoginForm = {
    email: '',
    password: '',
    rememberMe: false
};

const initialRegisterForm = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Participant',
    agreeTerms: false,
    socialMedia: {
        platform: '',
        username: ''
    },
    captchaToken: null
};

// ===== VALIDATION HELPERS =====
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
};

const validateRegisterEmail = (email) => {
    const emailError = validateEmail(email);
    if (emailError) return emailError;

    return null;
};

const validateLoginPassword = (password) => {
    if (!password) return 'Password is required';
    return null;
};

function useAuth() {
    const navigate = useNavigate();
    const { login } = useAuthContext();

    const [loginForm, setLoginForm] = useState(initialLoginForm);
    const [registerForm, setRegisterForm] = useState(initialRegisterForm);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loginErrors, setLoginErrors] = useState({});
    const [registerErrors, setRegisterErrors] = useState({});

    const updateLoginForm = (field, value) => {
        setLoginForm(prev => ({ ...prev, [field]: value }));
        setLoginErrors(prev => ({ ...prev, [field]: null }));
    };

    const updateRegisterForm = (field, value) => {
        setRegisterForm(prev => ({ ...prev, [field]: value }));
        setRegisterErrors(prev => {
            const next = { ...prev, [field]: null };

            return next;
        });
    };

    useEffect(() => {
        let cancelled = false;

        const validateParticipantEmailAsync = async () => {
            if (registerForm.role !== 'Participant') {
                setRegisterErrors(prev => ({ ...prev, email: null }));
                return;
            }

            if (!registerForm.email) {
                setRegisterErrors(prev => ({ ...prev, email: null }));
                return;
            }

            const emailError = validateEmail(registerForm.email);
            if (emailError) {
                setRegisterErrors(prev => ({ ...prev, email: emailError }));
                return;
            }

            try {
                await validateParticipantEmail(registerForm.email);
                if (!cancelled) {
                    setRegisterErrors(prev => ({ ...prev, email: null }));
                }
            } catch (err) {
                if (!cancelled) {
                    setRegisterErrors(prev => ({ ...prev, email: err.message }));
                }
            }
        };

        const timer = window.setTimeout(() => {
            validateParticipantEmailAsync();
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [registerForm.email, registerForm.role]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);

        // Validate fields
        const errors = {};
        const emailError = validateEmail(loginForm.email);
        const passwordError = validateLoginPassword(loginForm.password);
        if (emailError) errors.email = emailError;
        if (passwordError) errors.password = passwordError;

        if (Object.keys(errors).length > 0) {
            setLoginErrors(errors);
            return;
        }

        setLoading(true);
        try {
            const data = await loginUser(loginForm);
            // Save user and token to AuthContext
            login(data, data.token, loginForm.rememberMe);
            // Redirect based on role
            if (data.role === 'Admin') {
                navigate('/admin');
            } else if (data.role === 'Host') {
                navigate('/dashboard');
            } else {
                navigate('/discover');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);

        const errors = {};
        if (!registerForm.fullName) errors.fullName = 'Full name is required';
        const emailError = validateRegisterEmail(registerForm.email);
        if (emailError) errors.email = emailError;
        const passwordError = validatePassword(registerForm.password);
        if (passwordError) errors.password = passwordError;
        if (!registerForm.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (registerForm.password !== registerForm.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        if (!registerForm.agreeTerms) errors.agreeTerms = 'Please agree to the Terms of Service';
        if (registerForm.role === 'Host') {
            if (!registerForm.socialMedia?.platform) {
                errors.socialMedia = 'Please select a social media platform';
            } else if (!registerForm.socialMedia?.username) {
                errors.socialMedia = 'Please enter your social media username';
            }
        }
        if (!registerForm.captchaToken) errors.captchaToken = 'Please complete the captcha';
        if (Object.keys(errors).length > 0) { setRegisterErrors(errors); return; }

        if (registerForm.role === 'Participant') {
            try {
                await validateParticipantEmail(registerForm.email);
            } catch (err) {
                setRegisterErrors(prev => ({ ...prev, email: err.message }));
                return;
            }
        }

        setLoading(true);
        try {
            const data = await registerUser(registerForm);

            if (data.role === 'Host') {
                // Redirect to verification page without JWT
                navigate('/host-verification', {
                    state: {
                        hostVerificationToken: data.hostVerificationToken,
                        socialMedia: registerForm.socialMedia,
                        username: data.username
                    }
                });
            } else {
                // Participant — redirect to login with success message
                navigate('/login', {
                    state: {
                        message: 'Registration successful! Please check your email to verify your account before logging in.'
                    }
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        loginForm,
        registerForm,
        showPassword,
        showConfirmPassword,
        loading,
        error,
        loginErrors,
        registerErrors,
        updateLoginForm,
        updateRegisterForm,
        handleLogin,
        handleRegister,
        toggleShowPassword: () => setShowPassword(prev => !prev),
        toggleShowConfirmPassword: () => setShowConfirmPassword(prev => !prev)
    };
}

export default useAuth;
