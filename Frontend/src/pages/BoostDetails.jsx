import React, {
    useEffect,
    useMemo,
    useState
} from 'react';
import {
    useNavigate,
    useSearchParams
} from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
    CheckoutElementsProvider
} from '@stripe/react-stripe-js/checkout';
import Navbar from '../components/Navbar.jsx';
import BoostCard from '../components/BoostCard.jsx';
import BoostPaymentForm from
    '../components/boost/BoostPaymentForm.jsx';
import CreateEventIcon from '../components/create-event/CreateEventIcon.jsx';
import { getBoosts } from '../api/boostApi.js';
import {
    cancelBoostPurchase,
    createBoostCheckoutSession,
    fetchBoostPurchase,
    syncBoostPurchase
} from '../api/boostPurchaseApi.js';
import { fetchEventById } from '../api/eventApi.js';
import { STRIPE_PUBLISHABLE_KEY } from '../config.js';
import { useAuthContext } from '../context/AuthContext.jsx';
import '../styles/boost.css';


const stripePromise = STRIPE_PUBLISHABLE_KEY
    ? loadStripe(STRIPE_PUBLISHABLE_KEY)
    : null;

const SYNC_RETRY_LIMIT = 6;
const SYNC_RETRY_DELAY_MS = 2000;
const TERMINAL_PAYMENT_STATUSES = [
    'paid',
    'failed',
    'expired',
    'cancelled',
    'requires_refund',
    'refunded'
];

const addHours = (value, hours) =>
    new Date(
        new Date(value).getTime() + hours * 60 * 60 * 1000
    );

const formatDateTime = (value) => value
    ? new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value))
    : '—';

const money = (cents, currency = 'eur') =>
    new Intl.NumberFormat('en-DE', {
        style: 'currency',
        currency: currency.toUpperCase()
    }).format((cents || 0) / 100);

const toDateTimeLocalValue = (date = new Date()) => {
    const local = new Date(
        date.getTime() - date.getTimezoneOffset() * 60_000
    );
    return local.toISOString().slice(0, 16);
};

export default function BoostDetails() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { token } = useAuthContext();
    const eventId = searchParams.get('eventId');
    const urlPurchaseId = searchParams.get('purchaseId');
    const returnedSessionId = searchParams.get('session_id');
    const [step, setStep] = useState(
        urlPurchaseId ? (returnedSessionId ? 4 : 3) : 1
    );

    const [eventData, setEventData] = useState(null);
    const [boosts, setBoosts] = useState([]);
    const [selectedBoostId, setSelectedBoostId] = useState('');
    const [startMode, setStartMode] = useState('now');
    const [scheduledStart, setScheduledStart] = useState('');
    const [purchaseId, setPurchaseId] = useState(
        urlPurchaseId || ''
    );
    const [clientSecret, setClientSecret] = useState('');
    const [purchaseStatus, setPurchaseStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const selectedBoost = useMemo(
        () => boosts.find(
            (boost) => boost._id === selectedBoostId
        ) || null,
        [boosts, selectedBoostId]
    );

    const eventStart = eventData
        ? new Date(eventData.datetime || eventData.date)
        : null;

    const previewStart = useMemo(() => {
        if (!selectedBoost) return null;
        if (startMode === 'now') return new Date();
        if (!scheduledStart) return null;
        const value = new Date(scheduledStart);
        return Number.isNaN(value.getTime()) ? null : value;
    }, [selectedBoost, startMode, scheduledStart]);

    const previewEnd = previewStart && selectedBoost
        ? addHours(previewStart, selectedBoost.length)
        : null;

    const scheduleValidationMessage = useMemo(() => {
        if (!selectedBoost) return '';

        if (!eventStart || Number.isNaN(eventStart.getTime())) {
            return 'Please add a valid event start time before scheduling a Boost.';
        }

        if (startMode === 'scheduled' && !scheduledStart) {
            return 'Please choose the date and time when you want the Boost to start.';
        }

        if (!previewStart || Number.isNaN(previewStart.getTime())) {
            return 'Please choose a valid Boost start date and time.';
        }

        if (startMode === 'scheduled' && previewStart < new Date()) {
            return 'Please choose a future date and time; a Boost cannot start in the past.';
        }

        if (!previewEnd || Number.isNaN(previewEnd.getTime())) {
            return 'Please choose a valid Boost time window.';
        }

        if (previewEnd > eventStart) {
            const latestStart = addHours(
                eventStart,
                -selectedBoost.length
            );

            if (latestStart < new Date()) {
                return `Please choose a shorter Boost package; there is not enough time before the event for this ${selectedBoost.length}-hour Boost.`;
            }

            return `Please start this Boost no later than ${formatDateTime(latestStart)} so that it ends before the event begins.`;
        }

        return '';
    }, [
        eventStart,
        previewEnd,
        previewStart,
        scheduledStart,
        selectedBoost,
        startMode
    ]);

    const timeWindowValid = Boolean(
        selectedBoost && !scheduleValidationMessage
    );

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!eventId) {
                setError(
                    'Missing eventId. Return to the dashboard and choose an event.'
                );
                setLoading(false);
                return;
            }

            try {
                const [eventResult, boostResult] = await Promise.all([
                    fetchEventById(eventId),
                    getBoosts()
                ]);

                if (!cancelled) {
                    setEventData(eventResult);
                    setBoosts(boostResult);
                }
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [eventId]);

    useEffect(() => {
        if (!urlPurchaseId || !token) return;

        let stopped = false;
        let timer;
        let attempts = 0;

        const loadPurchase = async () => {
            try {
                const data = await fetchBoostPurchase(
                    token,
                    urlPurchaseId
                );
                if (stopped) return;

                setPurchaseStatus(data);
                setPurchaseId(urlPurchaseId);

                if (
                    data.paymentStatus === 'pending' &&
                    data.clientSecret &&
                    !returnedSessionId
                ) {
                    setClientSecret(data.clientSecret);
                    setStep(3);
                    return;
                }

                if (returnedSessionId) {
                    setStep(4);
                }

                const terminal = TERMINAL_PAYMENT_STATUSES.includes(
                    data.paymentStatus
                );

                if (!terminal && !returnedSessionId && attempts < 20) {
                    attempts += 1;
                    timer = window.setTimeout(loadPurchase, 1500);
                }
            } catch (err) {
                if (!stopped) setError(err.message);
            }
        };

        loadPurchase();
        return () => {
            stopped = true;
            window.clearTimeout(timer);
        };
    }, [urlPurchaseId, returnedSessionId, token]);

    useEffect(() => {
        if (!token || !purchaseId || step !== 4) return;

        let stopped = false;
        let timer;
        let attempts = 0;

        const syncAndRefreshPurchase = async () => {
            attempts += 1;

            try {
                await syncBoostPurchase(token, purchaseId);
                const data = await fetchBoostPurchase(token, purchaseId);

                if (stopped) return;

                setPurchaseStatus(data);

                const terminal = TERMINAL_PAYMENT_STATUSES.includes(
                    data.paymentStatus
                );

                if (!terminal && attempts < SYNC_RETRY_LIMIT) {
                    timer = window.setTimeout(
                        syncAndRefreshPurchase,
                        SYNC_RETRY_DELAY_MS
                    );
                }
            } catch (err) {
                if (!stopped) setError(err.message);
            }
        };

        syncAndRefreshPurchase();

        return () => {
            stopped = true;
            window.clearTimeout(timer);
        };
    }, [purchaseId, step, token]);

    const handleCreateCheckout = async () => {
        if (!selectedBoost || submitting) return;

        if (!timeWindowValid) {
            setError(scheduleValidationMessage ||
                'Please choose a valid Boost schedule before continuing.'
            );
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const payload = {
                eventId,
                boostId: selectedBoost._id,
                startMode,
                ...(startMode === 'scheduled'
                    ? {
                        startTime:
                            new Date(scheduledStart).toISOString()
                    }
                    : {})
            };

            const data = await createBoostCheckoutSession(
                token,
                payload
            );

            setPurchaseId(data.purchaseId);
            setClientSecret(data.clientSecret);
            setSearchParams(
                {
                    eventId,
                    purchaseId: data.purchaseId
                },
                { replace: true }
            );
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };


    const handleCancelPayment = async () => {
        if (!purchaseId || submitting) return;

        try {
            setSubmitting(true);
            await cancelBoostPurchase(token, purchaseId);
            setPurchaseId('');
            setClientSecret('');
            setPurchaseStatus(null);
            setSearchParams({ eventId }, { replace: true });
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = () => {
        navigate('/dashboard', { replace: true });
    };

    const resetAfterFailure = () => {
        setPurchaseId('');
        setClientSecret('');
        setPurchaseStatus(null);
        setSearchParams({ eventId }, { replace: true });
        setStep(1);
    };

    if (loading) {
        return <><Navbar /><p>Loading boost options...</p></>;
    }
    return (
        <div className="boost-page">
            <Navbar />
            <main className="boost-page__container">
                <header className="boost-page__header">
                    <span className="boost-page__header-icon">
                        <CreateEventIcon name="boost" />
                    </span>
                    <h1>Boost Your Event</h1>
                    <p>{eventData?.title}</p>
                </header>

                <ol className="boost-steps">
                    {['Package', 'Schedule', 'Payment', 'Complete']
                        .map((label, index) => (
                            <li
                                key={label}
                                className={
                                    step === index + 1 ? 'is-active' : ''
                                }
                            >
                                {index + 1}. {label}
                            </li>
                        ))}
                </ol>

                {error && (
                    <p className="boost-page__error">{error}</p>
                )}

                {step === 1 && (
                    <section>
                        <div className="boost-card-grid">
                            {boosts.map((boost) => (
                                <BoostCard
                                    key={boost._id}
                                    boost={boost}
                                    selected={selectedBoostId === boost._id}
                                    onSelect={(value) => {
                                        setSelectedBoostId(value._id);
                                        setError('');
                                    }}
                                />
                            ))}
                        </div>

                        {boosts.length === 0 && (
                            <p>No boost packages are available.</p>
                        )}

                        <button
                            type="button"
                            onClick={() => selectedBoost && setStep(2)}
                            disabled={!selectedBoost}
                        >
                            <CreateEventIcon name="clock" />
                            Continue to schedule
                        </button>
                    </section>
                )}

                {step === 2 && selectedBoost && (
                    <section className="boost-schedule">
                        <label>
                            <input
                                type="radio"
                                name="startMode"
                                checked={startMode === 'now'}
                                onChange={() => setStartMode('now')}
                            />
                            Start immediately after payment
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="startMode"
                                checked={startMode === 'scheduled'}
                                onChange={() => setStartMode('scheduled')}
                            />
                            Schedule for later
                        </label>

                        {startMode === 'scheduled' && (
                            <input
                                type="datetime-local"
                                lang="en-GB"
                                aria-label="Boost start date and time"
                                value={scheduledStart}
                                min={toDateTimeLocalValue(new Date())}
                                onChange={(event) =>
                                    setScheduledStart(event.target.value)
                                }
                            />
                        )}

                        <dl className="boost-summary">
                            <dt>Starts</dt>
                            <dd>{formatDateTime(previewStart)}</dd>
                            <dt>Ends</dt>
                            <dd>{formatDateTime(previewEnd)}</dd>
                            <dt>Event starts</dt>
                            <dd>{formatDateTime(eventStart)}</dd>
                        </dl>

                        {scheduleValidationMessage && (
                            <p
                                id="boost-schedule-validation"
                                className="boost-schedule__validation"
                                role="alert"
                            >
                                {scheduleValidationMessage}
                            </p>
                        )}

                        <button type="button" onClick={() => setStep(1)}>
                            <CreateEventIcon name="arrow" />
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateCheckout}
                            disabled={!timeWindowValid || submitting}
                            aria-describedby={scheduleValidationMessage
                                ? 'boost-schedule-validation'
                                : undefined}
                        >
                            <CreateEventIcon name="ticket" />
                            {submitting
                                ? 'Preparing payment...'
                                : 'Continue to payment'}
                        </button>
                    </section>
                )}

                {step === 3 && clientSecret && stripePromise && (
                    <CheckoutElementsProvider
                        stripe={stripePromise}
                        options={{
                            clientSecret,
                            elementsOptions: {
                                appearance: {
                                    theme: 'stripe',
                                    variables: {
                                        colorPrimary: '#7c3aed',
                                        borderRadius: '8px'
                                    }
                                }
                            }
                        }}
                    >
                        <BoostPaymentForm
                            amountLabel={money(
                                selectedBoost?.priceCents ||
                                purchaseStatus?.amountCents,
                                selectedBoost?.currency ||
                                purchaseStatus?.currency
                            )}
                            onCancel={handleCancelPayment}
                        />
                    </CheckoutElementsProvider>
                )}

                {step === 4 && (
                    <section className="boost-complete">
                        {!purchaseStatus && (
                            <p>Confirming your payment...</p>
                        )}

                        {['pending', 'processing'].includes(
                            purchaseStatus?.paymentStatus
                        ) && (
                                <p>Confirming your payment...</p>
                            )}

                        {purchaseStatus?.paymentStatus === 'paid' && (
                            <>
                                <h2>Payment confirmed</h2>
                                <p>
                                    Boost status: {purchaseStatus.boostStatus}<br />
                                    Starts: {formatDateTime(
                                        purchaseStatus.boostStartTime
                                    )}<br />
                                    Ends: {formatDateTime(
                                        purchaseStatus.boostEndTime
                                    )}
                                </p>
                                <button
                                    onClick={() =>
                                        navigate('/dashboard', { replace: true })
                                    }
                                >
                                    <CreateEventIcon name="check" />
                                    Go to dashboard
                                </button>
                            </>
                        )}

                        {['failed', 'expired', 'cancelled'].includes(
                            purchaseStatus?.paymentStatus
                        ) && (
                                <>
                                    <p>Payment was not completed.</p>
                                    <button onClick={resetAfterFailure}>
                                        <CreateEventIcon name="boost" />
                                        Try again
                                    </button>
                                </>
                            )}

                        {['requires_refund', 'refunded'].includes(
                            purchaseStatus?.paymentStatus
                        ) && (
                                <p>
                                    The boost could not be scheduled. The payment
                                    is being refunded or has been refunded.
                                </p>
                            )}
                    </section>
                )}

                {step < 3 && (
                    <button
                        type="button"
                        className="boost-page__skip"
                        onClick={handleSkip}
                    >
                        <CreateEventIcon name="arrow" />
                        Skip for now
                    </button>
                )}
            </main>
        </div>
    );
}
