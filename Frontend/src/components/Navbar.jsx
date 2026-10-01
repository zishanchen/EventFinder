import React from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext.jsx';
import GoBackButton from './GoBackButton.jsx';

const NAVBAR_ICONS = {
    discover: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" />
        </>
    ),
    dashboard: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
        </>
    ),
    admin: (
        <>
            <path d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Z" />
            <path d="m9.5 12 1.7 1.7L15 10" />
        </>
    ),
    login: (
        <>
            <path d="M15 3h3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-3" />
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
        </>
    ),
    logout: (
        <>
            <path d="M9 21H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h3" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
        </>
    ),
    register: (
        <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6" />
            <path d="M22 11h-6" />
        </>
    ),
};

function NavbarIcon({ name }) {
    return (
        <svg
            className="navbar__icon"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {NAVBAR_ICONS[name]}
        </svg>
    );
}

function Navbar() {
    const { user, isAuthenticated, isHost, isAdmin, logout } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const accountHref = isAdmin ? '/admin' : isHost ? '/dashboard' : '/profile';
    const showGoBack = location.pathname !== '/'; 

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navLinkClass = ({ isActive }) =>
        isActive ? 'navbar__link navbar__link--active' : 'navbar__link';

    return (
        <header className={`navbar ${isAuthenticated ? 'navbar--authenticated' : 'navbar--guest'}`}>
            <div className="navbar__brand">
                {showGoBack && <GoBackButton />}
                <Link to="/" className="navbar__logo">
                    <img
                        src="/logo.png"
                        alt="EventFinder Logo"
                        className="navbar__logo-img"
                    />
                </Link>
            </div>
           

            <nav className="navbar__links" aria-label="Main navigation">
                <NavLink to="/discover" className={navLinkClass}>
                    <NavbarIcon name="discover" />
                    <span>Discover</span>
                </NavLink>

                {isAuthenticated ? (
                    <>
                        <NavLink
                            to={accountHref}
                            className={({ isActive }) =>
                                isActive
                                    ? 'navbar__account navbar__account--active'
                                    : 'navbar__account'
                            }
                            title={user?.username}
                        >
                            {user?.profilePicture ? (
                                <img
                                    src={user.profilePicture}
                                    alt={`${user?.username || 'User'} profile`}
                                    className="navbar__avatar"
                                />
                            ) : (
                                <span className='navbar__avatar-fallback'>
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            )}
                        </NavLink>
                        <button
                            className="navbar__logout"
                            onClick={handleLogout}
                        >
                            <NavbarIcon name="logout" />
                            <span>Logout</span>
                        </button>

                    </>
                ) : (
                    <>
                        <NavLink to="/login" className={navLinkClass}>
                            <NavbarIcon name="login" />
                            <span>Login</span>
                        </NavLink>
                        <NavLink to="/register" className="navbar__register">
                            <NavbarIcon name="register" />
                            <span>Register</span>
                        </NavLink>
                    </>
                )}
            </nav>
        </header>
    );
}

export default Navbar;
