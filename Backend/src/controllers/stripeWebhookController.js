import stripe from '../config/stripe.js';
import {
    STRIPE_WEBHOOK_SECRET
} from '../config/appConfig.js';
import BoostPurchase from '../models/BoostPurchase.js';
import {
    fulfillPaidBoostPurchase
} from '../services/boostFulfillmentService.js';

const webhookSecretIsConfigured =
    STRIPE_WEBHOOK_SECRET &&
    !STRIPE_WEBHOOK_SECRET.includes('replace_with');

const stripeWebhookController = async (req, res) => {
    if (!stripe || !webhookSecretIsConfigured) {
        return res.status(503).send(
            'Stripe webhook is not configured'
        )
    }

    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(
            req.body,
            req.headers['stripe-signature'],
            STRIPE_WEBHOOK_SECRET
        )
    } catch (error) {
        return res.status(400).send(
            'Webhook signature verification failed'
        );
    }

    try {
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded': {
                const session = stripeEvent.data.object;

                await fulfillPaidBoostPurchase(
                    stripe,
                    session,
                    new Date()
                );

                break;
            }

            case 'checkout.session.async_payment_failed': {
                const session = stripeEvent.data.object;

                await BoostPurchase.updateOne(
                    { stripeCheckoutSessionId: session.id },
                    {
                        $set: {
                            paymentStatus: 'failed',
                            reservationActive: false,
                            failureCode: 'ASYNC_PAYMENT_FAILED',
                            failureMessage:
                                'Stripe reported an asynchronous payment failure'
                        }
                    }
                );

                break;
            }

            case 'checkout.session.expired': {
                const session = stripeEvent.data.object;

                await BoostPurchase.updateOne(
                    {
                        stripeCheckoutSessionId: session.id,
                        paymentStatus: 'pending'
                    },
                    {
                        $set: {
                            paymentStatus: 'expired',
                            reservationActive: false
                        }
                    }
                );

                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = stripeEvent.data.object;
                const purchaseId =
                    paymentIntent.metadata?.boostPurchaseId;

                await BoostPurchase.updateOne(
                    purchaseId
                        ? { _id: purchaseId }
                        : { stripePaymentIntentId: paymentIntent.id },
                    {
                        $set: {
                            paymentStatus: 'failed',
                            reservationActive: false,
                            stripePaymentIntentId: paymentIntent.id,
                            failureCode:
                                paymentIntent.last_payment_error?.code || null,
                            failureMessage:
                                paymentIntent.last_payment_error?.message ||
                                'Payment failed'
                        }
                    }
                );

                break;
            }

            case 'charge.refunded': {
                const charge = stripeEvent.data.object;

                if (charge.refunded && charge.payment_intent) {
                    await BoostPurchase.updateOne(
                        {
                            stripePaymentIntentId:
                                typeof charge.payment_intent === 'string'
                                    ? charge.payment_intent
                                    : charge.payment_intent.id
                        },
                        {
                            $set: {
                                paymentStatus: 'refunded',
                                refundedAt: new Date(),
                                reservationActive: false
                            }
                        }
                    );
                }

                break;
            }

            default:
                break;
        }

        return res.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook processing failed', {
            eventId: stripeEvent.id,
            type: stripeEvent.type,
            message: error.message
        });

        return res.status(500).json({
            message: 'Webhook processing failed'
        });
    }
};

export default stripeWebhookController;
