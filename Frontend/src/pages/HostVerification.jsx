import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import CreateEventIcon from '../components/create-event/CreateEventIcon.jsx';
import '../styles/auth.css';

function HostVerification() {
    const location = useLocation();
    const navigate = useNavigate();

    // Get data passed from registration
    const { hostVerificationToken, socialMedia, username } = location.state || {};

    // If no token — redirect to register
    if (!hostVerificationToken) {
        return <Navigate to="/register" replace />;
    }

    const handleCopyToken = () => {
        navigator.clipboard.writeText(hostVerificationToken);
        alert('Token copied to clipboard!');
    };

    const platformLink = socialMedia?.platform === 'LinkedIn'
        ? 'https://www.linkedin.com/in/eventfinder'
        : 'https://www.instagram.com/eventfinder';

    const platformIcon = socialMedia?.platform === 'LinkedIn' ? 'briefcase' : 'camera';

    return (
        <div className="auth-page">

            {/* Logo */}
            <div className="auth-page__logo">
                <img src="/logo.png" alt="EventFinder" />
            </div>

            <h1 className="auth-page__title">One Last Step!</h1>
            <p className="auth-page__subtitle">
                Verify your identity to activate your host account
            </p>

            <div className="auth-card">

                {/* Welcome message */}
                <div className="verification__welcome">
                    <p className="verification__welcome-text">
                        Hi <strong>{username}</strong>! Your account has been created.
                        To activate your host privileges, please send us your verification token
                        as a DM on {socialMedia?.platform}.
                    </p>
                </div>

                {/* Steps */}
                <div className="verification__steps">

                    {/* Step 1 */}
                    <div className="verification__step">
                        <div className="verification__step-number">1</div>
                        <div className="verification__step-content">
                            <p className="verification__step-title">Copy your verification token</p>
                            <div className="verification__token-wrapper">
                                <code className="verification__token">
                                    {hostVerificationToken}
                                </code>
                                <button
                                    className="verification__copy-btn"
                                    onClick={handleCopyToken}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="verification__step">
                        <div className="verification__step-number">2</div>
                        <div className="verification__step-content">
                            <p className="verification__step-title">
                                Send it as a DM to our {socialMedia?.platform} account
                            </p>

                            <a href={platformLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="verification__platform-btn"
                            >
                                <CreateEventIcon name={platformIcon} />
                                Open EventFinder on {socialMedia?.platform}
                            </a>
                        </div>
                    </div>
                    {/* Step 3 */}
                    <div className="verification__step">
                        <div className="verification__step-number">3</div>
                        <div className="verification__step-content">
                            <p className="verification__step-title">Wait for approval</p>
                            <p className="verification__step-desc">
                                We will verify your account within 7 working days.
                                You will be notified once your host account is activated.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Go to Homepage button */}
                <button
                    className="auth-btn--primary"
                    onClick={() => navigate('/')}
                >
                    <CreateEventIcon name="arrow" />
                    Go to Homepage
                </button>

                <p className="verification__note">
                    You can still browse events while waiting for verification.
                    Host features will be unlocked once verified.
                </p>

            </div>
        </div >
    );
}

export default HostVerification;
