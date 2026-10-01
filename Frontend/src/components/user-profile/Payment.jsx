import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createSetupIntent, fetchPaymentProfile, savePaymentMethod } from "../../api/paymentApi.js";
import { STRIPE_PUBLISHABLE_KEY } from "../../config.js";
import { useAuthContext } from "../../context/AuthContext.jsx";

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const formatBrand = (brand) => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
};

function PaymentMethodForm({ mode, paymentMethod, platformFeePercent, onPaymentMethodSaved, onSetupIntentConsumed }) {
    const stripe = useStripe();
    const elements = useElements();
    const { token, user } = useAuthContext();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!stripe || !elements) {
            setError("Stripe is still loading. Please try again in a moment.");
            return;
        }

        try {
            setSaving(true);
            const result = await stripe.confirmSetup({
                elements,
                confirmParams: {
                    return_url: window.location.href,
                    payment_method_data: {
                        billing_details: {
                            name: user?.username || "",
                            email: user?.email || ""
                        }
                    }
                },
                redirect: "if_required"
            });

            if (result.error) {
                throw new Error(result.error.message || "Could not save this payment method");
            }

            if (!result.setupIntent?.id) {
                throw new Error("Stripe did not return a completed setup intent.");
            }

            const saved = await savePaymentMethod(token, result.setupIntent.id);
            onPaymentMethodSaved(saved.paymentMethod);
            setMessage("Payment method saved.");
            onSetupIntentConsumed();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="profile-payment__form" onSubmit={handleSubmit}>
            <div>
                <label className="profile-payment__label">
                    {mode === "payout"
                        ? paymentMethod ? "Replace payout destination" : "Add payout destination"
                        : paymentMethod ? "Replace default payment method" : "Add default payment method"}
                </label>
                <p className="profile-payment__hint">
                    {mode === "payout"
                        ? `Stripe stores the destination details. EventFinder keeps 5% and sends hosts the remaining ${100 - Number(platformFeePercent || 5)}%.`
                        : "Stripe stores the payment details. EventFinder only keeps the Stripe customer and default payment method references."}
                </p>
            </div>
            <div className="profile-payment__stripe-element">
                <PaymentElement
                    options={{
                        wallets: {
                            link: "never"
                        },
                        defaultValues: {
                            billingDetails: {
                                name: user?.username || "",
                                email: user?.email || ""
                            }
                        }
                    }}
                />
            </div>
            {error && <p className="profile-payment__error">{error}</p>}
            {message && <p className="profile-payment__success">{message}</p>}
            <button className="profile-payment__manage-button" type="submit" disabled={saving || !stripe || !elements}>
                {saving
                    ? "Saving..."
                    : mode === "payout"
                        ? paymentMethod ? "Update Payout Destination" : "Save Payout Destination"
                        : paymentMethod ? "Update Payment Method" : "Save Payment Method"}
            </button>
        </form>
    );
}

function Payment() {
    const { token, user } = useAuthContext();
    const [mode, setMode] = useState(user?.role === "Host" ? "payout" : "payment");
    const [platformFeePercent, setPlatformFeePercent] = useState(5);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [clientSecret, setClientSecret] = useState("");
    const [setupKey, setSetupKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [setupLoading, setSetupLoading] = useState(false);
    const [error, setError] = useState("");
    const [setupError, setSetupError] = useState("");
    const [message, setMessage] = useState("");

    const loadSetupIntent = useCallback(async () => {
        if (!token || !stripePromise) {
            return;
        }

        try {
            setSetupLoading(true);
            setSetupError("");
            setMessage("");
            const data = await createSetupIntent(token);
            setClientSecret(data.clientSecret);
            setSetupKey((currentKey) => currentKey + 1);
        } catch (err) {
            setClientSecret("");
            setSetupError(err.message);
        } finally {
            setSetupLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const loadPaymentProfile = async () => {
            try {
                setLoading(true);
                const data = await fetchPaymentProfile(token);
                setMode(data.mode || (user?.role === "Host" ? "payout" : "payment"));
                setPlatformFeePercent(Number(data.platformFeePercent ?? 5));
                setPaymentMethod(data.paymentMethod);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            loadPaymentProfile();
        }
    }, [token, user?.role]);

    const handlePaymentMethodSaved = (nextPaymentMethod) => {
        setPaymentMethod(nextPaymentMethod);
        setSetupError("");
        setMessage("Payment method saved.");
    };

    const handleSetupIntentConsumed = () => {
        setClientSecret("");
        setSetupKey((currentKey) => currentKey + 1);
    };

    const stripeOptions = useMemo(() => ({
        clientSecret,
        locale: "en",
        appearance: {
            theme: "stripe",
            variables: {
                colorPrimary: "#8b22f4",
                borderRadius: "12px",
                fontFamily: "Inter, system-ui, sans-serif"
            }
        }
    }), [clientSecret]);

    return (
        <section className="profile-card profile-payment">
            <h2>{mode === "payout" ? "Payout Information" : "Payment Information"}</h2>

            {loading ? (
                <p className="profile-payment__hint">
                    {mode === "payout" ? "Loading payout details..." : "Loading payment details..."}
                </p>
            ) : error ? (
                <p className="profile-payment__error">{error}</p>
            ) : paymentMethod ? (
                <div className="profile-payment__method">
                    <div className="profile-payment__icon-wrap">
                        <div className="profile-payment__icon">Card</div>
                    </div>
                    <div className="profile-payment__detail">
                        <h4>{formatBrand(paymentMethod.brand)} ending in {paymentMethod.last4}</h4>
                        <p>Expires {String(paymentMethod.expMonth).padStart(2, "0")}/{paymentMethod.expYear}</p>
                        {mode === "payout" && (
                            <p>Host payout destination. EventFinder keeps {platformFeePercent}%.</p>
                        )}
                    </div>
                    <div className="profile-payment__badge">
                        {mode === "payout" ? "Payout" : "Default"}
                    </div>
                </div>
            ) : (
                <div className="profile-payment__empty">
                    <h4>{mode === "payout" ? "No payout destination yet" : "No payment method yet"}</h4>
                    <p>
                        {mode === "payout"
                            ? `Add a payout destination before creating paid events. EventFinder keeps ${platformFeePercent}% and pays the remainder after monthly billing.`
                            : "Add a default payment method before registering for paid events. Event fees are charged after attendance is confirmed."}
                    </p>
                </div>
            )}

            {!loading && !error && message && <p className="profile-payment__success">{message}</p>}

            {!loading && !error && (
                !stripePromise ? (
                    <p className="profile-payment__hint">
                        Stripe is not configured yet. Add STRIPE_PUBLISHABLE_KEY to src/config.js.
                    </p>
                ) : setupLoading && !clientSecret ? (
                    <p className="profile-payment__hint">Preparing secure payment form...</p>
                ) : setupError ? (
                    <div className="profile-payment__empty">
                        <h4>Payment setup is unavailable</h4>
                        <p>{setupError}</p>
                        <button className="profile-payment__manage-button" type="button" onClick={loadSetupIntent}>
                            Retry
                        </button>
                    </div>
                ) : clientSecret ? (
                    <Elements key={setupKey} stripe={stripePromise} options={stripeOptions}>
                        <PaymentMethodForm
                            mode={mode}
                            paymentMethod={paymentMethod}
                            platformFeePercent={platformFeePercent}
                            onPaymentMethodSaved={handlePaymentMethodSaved}
                            onSetupIntentConsumed={handleSetupIntentConsumed}
                        />
                    </Elements>
                ) : (
                    <button
                        className="profile-payment__manage-button"
                        type="button"
                        onClick={loadSetupIntent}
                        disabled={setupLoading}
                    >
                        {mode === "payout"
                            ? paymentMethod ? "Update Payout Destination" : "Add Payout Destination"
                            : paymentMethod ? "Update Payment Method" : "Add Payment Method"}
                    </button>
                )
            )}
        </section>
    );
}

export default Payment;
