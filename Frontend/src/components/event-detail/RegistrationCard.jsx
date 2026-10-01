import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deregisterFromEvent, fetchMyEventRegistration, registerForEvent } from '../../api/eventApi.js';
import { fetchPublicSettings } from '../../api/settingsApi.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import CreateEventIcon from '../create-event/CreateEventIcon.jsx';

const formatMoney = (price) => {
    const amount = Number(price) || 0;

    if (amount === 0) {
        return 'Free';
    }

    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
};

function RegistrationCard({ event, onRegistered, onDeregistered }) {
    const navigate = useNavigate();
    const { token, isAuthenticated, isParticipant } = useAuthContext();
    const [registration, setRegistration] = useState(null);
    const [loadingRegistration, setLoadingRegistration] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showLateCancelDialog, setShowLateCancelDialog] = useState(false);
    const [lateCancellationWindowDays, setLateCancellationWindowDays] = useState(3);
    const [lateCancellationFeePercent, setLateCancellationFeePercent] = useState(50);

    const spotsLeft = useMemo(() => {
        return Math.max(0, (Number(event.capacity) || 0) - (Number(event.attendeesCount) || 0));
    }, [event.attendeesCount, event.capacity]);
    const isFull = spotsLeft <= 0;
    const isPaidEvent = Number(event.price) > 0;
    const canDeregister = registration?.status === 'Registered';
    const [lateCancellationFee, setLateCancellationFee] = useState(0);

    useEffect(() => {
        const loadRegistration = async () => {
            if (!token || !isParticipant) {
                return;
            }

            try {
                setLoadingRegistration(true);
                const data = await fetchMyEventRegistration(event._id, token);
                setRegistration(data.registration);
            } catch {
                setRegistration(null);
            } finally {
                setLoadingRegistration(false);
            }
        };

        loadRegistration();
    }, [event._id, isParticipant, token]);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await fetchPublicSettings();
                setLateCancellationWindowDays(Number(settings.lateCancellationWindowDays) || 0);
                setLateCancellationFeePercent(Number(settings.lateCancellationFeePercent ?? 50));
            } catch {
                setLateCancellationWindowDays(3);
                setLateCancellationFeePercent(50);
            }
        };

        loadSettings();
    }, []);

    const handleRegister = async () => {
        setError('');
        setMessage('');

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!isParticipant) {
            setError('Only participant accounts can register for events.');
            return;
        }

        try {
            setSubmitting(true);
            const data = await registerForEvent(event._id, token);
            setRegistration(data.registration);
            setMessage(data.message);
            onRegistered?.(data.registration);
        } catch (err) {
            if (err.code === 'PAYMENT_METHOD_REQUIRED') {
                setError('Add a payment method in your profile before registering for this paid event.');
                return;
            }

            if (err.code === 'REGISTRATION_BLOCKED_BY_HOST') {
                setError('The host removed you from this event, so you cannot register again.');
                return;
            }

            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeregister = async ({ confirmLateFee = false } = {}) => {
        setError('');
        setMessage('');

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!isParticipant) {
            setError('Only participant accounts can cancel their own registrations.');
            return;
        }

        try {
            setSubmitting(true);
            const data = await deregisterFromEvent(event._id, token, { confirmLateFee });
            setShowLateCancelDialog(false);
            setRegistration(null);
            setMessage(data.message);
            onDeregistered?.(data.registration);
        } catch (err) {
            if (err.code === 'LATE_CANCELLATION_CONFIRMATION_REQUIRED') {
                setLateCancellationFee(Number(err.cancellationFeeAmount) || 0);
                if (err.lateCancellationWindowDays !== undefined) {
                    setLateCancellationWindowDays(Number(err.lateCancellationWindowDays) || 0);
                }
                if (err.lateCancellationFeePercent !== undefined) {
                    setLateCancellationFeePercent(Number(err.lateCancellationFeePercent ?? 50));
                }
                setShowLateCancelDialog(true);
                return;
            }

            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrimaryAction = () => {
        if (canDeregister) {
            handleDeregister();
            return;
        }

        handleRegister();
    };

    const buttonText = () => {
        if (loadingRegistration) return 'Checking...';
        if (submitting && canDeregister) return 'Cancelling...';
        if (registration?.status === 'Removed') return 'Removed by Host';
        if (registration && canDeregister) return 'Cancel Registration';
        if (registration) return `Registered (${registration.status})`;
        if (isFull) return 'Event Full';
        if (submitting) return 'Registering...';
        return 'Register Now';
    };

    return (
        <section className="event-card registration-card">
            <p className="registration-card__price">{formatMoney(event.price)}</p>

            <p className="registration-card__spots">
                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
            </p>

            {isPaidEvent && (
                <p className="registration-card__billing-note">
                    Charged after attendance is confirmed. Cancelling within {lateCancellationWindowDays} day(s) of the event costs {lateCancellationFeePercent}%.
                </p>
            )}

            <button
                type="button"
                className={`registration-card__primary-button ${canDeregister ? 'registration-card__primary-button--danger' : ''}`}
                onClick={handlePrimaryAction}
                disabled={loadingRegistration || submitting || (Boolean(registration) && !canDeregister) || (!registration && isFull)}
            >
                <CreateEventIcon name={canDeregister ? 'check' : 'ticket'} />
                {buttonText()}
            </button>

            {error && (
                <div className="registration-card__message registration-card__message--error">
                    <p>{error}</p>
                    {isPaidEvent && (
                        <button type="button" onClick={() => navigate('/profile')}>
                            Go to Payment Settings
                        </button>
                    )}
                </div>
            )}
            {message && <p className="registration-card__message registration-card__message--success">{message}</p>}

            {showLateCancelDialog && (
                <div className="registration-card__dialog-overlay" role="presentation">
                    <div className="registration-card__dialog" role="dialog" aria-modal="true" aria-labelledby="late-cancel-title">
                        <h3 id="late-cancel-title">Late cancellation fee</h3>
                        <p>
                            This event starts within {lateCancellationWindowDays} day(s). If you cancel now, you will still be charged {lateCancellationFeePercent}% of the event price:
                            <strong> {formatMoney(lateCancellationFee)}</strong>.
                        </p>
                        <div className="registration-card__dialog-actions">
                            <button
                                type="button"
                                className="registration-card__dialog-secondary"
                                onClick={() => setShowLateCancelDialog(false)}
                                disabled={submitting}
                            >
                                Keep Registration
                            </button>
                            <button
                                type="button"
                                className="registration-card__dialog-danger"
                                onClick={() => handleDeregister({ confirmLateFee: true })}
                                disabled={submitting}
                            >
                                {submitting ? 'Cancelling...' : 'Cancel Anyway'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </section>
    )
}

export default RegistrationCard;
