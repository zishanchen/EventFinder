import React, { useState } from 'react';
import {
    PaymentElement,
    useCheckoutElements
} from '@stripe/react-stripe-js/checkout';
import CreateEventIcon from '../create-event/CreateEventIcon.jsx';

export default function BoostPaymentForm({
    amountLabel,
    onCancel
}) {
    const checkoutState = useCheckoutElements();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (checkoutState.type === 'loading') {
        return (
            <div className="boost-payment boost-payment--loading">
                <p>Loading secure payment form...</p>
            </div>
        );
    }

    if (checkoutState.type === 'error') {
        return (
            <div className="boost-payment">
                <p className="boost-page__error">
                    {checkoutState.error.message}
                </p>
            </div>
        );
    }

    const { checkout } = checkoutState;

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (submitting || !checkout.canConfirm) {
            return;
        }

        setSubmitting(true);
        setError('');

        const result = await checkout.confirm();

        if (result.type === 'error') {
            setError(
                result.error.message || 'Payment could not be confirmed'
            );
            setSubmitting(false);
        }
    };

    return (
        <form className="boost-payment" onSubmit={handleSubmit}>
            <div className="boost-payment__header">
                <span className="boost-payment__eyebrow">
                    Secure payment
                </span>
                <h2>Complete your boost purchase</h2>
                <p>
                    Enter your card details securely through Stripe.
                    EventFinder does not store your card information.
                </p>
            </div>

            <div className="boost-payment__element">
                <PaymentElement
                    options={{
                        wallets: {
                            applePay: 'never',
                            googlePay: 'never',
                            link: 'never'
                        }
                    }}
                />
            </div>

            {error && (
                <p className="boost-payment__error">
                    {error}
                </p>
            )}

            <div className="boost-payment__actions">
                <button
                    type="button"
                    className="boost-payment__cancel"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    <CreateEventIcon name="arrow" />
                    Cancel payment
                </button>

                <button
                    type="submit"
                    className="boost-payment__pay"
                    disabled={submitting || !checkout.canConfirm}
                >
                    <CreateEventIcon name="ticket" />
                    {submitting
                        ? 'Confirming payment...'
                        : `Pay ${amountLabel}`}
                </button>
            </div>
        </form>
    );
}
