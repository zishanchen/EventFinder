import crypto from 'crypto';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Boost from '../models/Boost.js';
import BoostPurchase from '../models/BoostPurchase.js';
import Event from '../models/Event.js';
import EventBoost from '../models/EventBoost.js';
import stripe from '../config/stripe.js';
import {
    fulfillPaidBoostPurchase
} from '../services/boostFulfillmentService.js';
import {
    assertImmediateWindowFits,
    calculateScheduledWindow,
    getEventStartTime
} from '../services/boostTimeService.js';
import { FRONTEND_URL } from '../config/appConfig.js';

const CHECKOUT_TTL_SECONDS = 31 * 60;

const requireStripe = () => {
    if (!stripe) {
        const error = new Error('Stripe is not configured');
        error.statusCode = 503;
        throw error;
    }
    return stripe;
}
const isObjectId = (value) =>
    mongoose.Types.ObjectId.isValid(value);

const toStripeId = (value) => {
    if (!value) return null;
    return typeof value === 'string' ? value : value.id;
};

const serializePurchase = (
    purchase,
    eventBoost = null,
    checkout = null
) => ({
    _id: purchase._id,
    eventId: purchase.event,
    boostId: purchase.boost,
    paymentStatus: purchase.paymentStatus,
    startMode: purchase.startMode,
    requestedStartTime: purchase.requestedStartTime,
    calculatedEndTime: purchase.calculatedEndTime,
    amountCents: purchase.boostSnapshot.amountCents,
    currency: purchase.boostSnapshot.currency,
    checkoutStatus: checkout?.status || null,
    clientSecret:
        checkout?.status === 'open' ? checkout.client_secret : null,
    boostStatus: eventBoost?.status || null,
    boostStartTime: eventBoost?.startTime || null,
    boostEndTime: eventBoost?.endTime || null
});

const serializePurchaseWithBoost = async (
    purchase,
    checkout = null
) => {
    const eventBoost = await EventBoost.findOne({
        purchase: purchase._id
    });

    return serializePurchase(purchase, eventBoost, checkout);
};

const getCheckoutSessionPurchaseId = (checkoutSession) =>
    checkoutSession.metadata?.purchaseId ||
    checkoutSession.metadata?.boostPurchaseId ||
    checkoutSession.client_reference_id ||
    null;

const createBoostCheckoutSession = async (req, res) => {
    let purchase = null;
    // if (purchase && !purchase.stripeCheckoutSessionId) {
    //     await BoostPurchase.updateOne(
    //         { _id: purchase.id },
    //         {
    //             $set: {
    //                 paymentStatus: 'failed',
    //                 reservationActive: false,
    //                 failureCode: 'CHECKOUT_SESSION_CREATE_FAILED',
    //                 failureMessage: 'Could not create Checkout Session'
    //             }
    //         }
    //     ).catch(() => { });
    // }

    try {
        const stripeClient = requireStripe();
        const {
            eventId,
            boostId,
            startMode,
            startTime
        } = req.body || {};
        if (!isObjectId(eventId) || !isObjectId(boostId)) {
            return res.status(400).json({
                message: 'Invalid eventId or boostId'
            });
        }
        if (!['now', 'scheduled'].includes(startMode)) {
            return res.status(400).json({
                message: 'startMode must be now or scheduled'
            });
        }
        if (startMode === 'scheduled' && !startTime) {
            return res.status(400).json({
                message: 'startTime is required for scheduled boosts'
            });
        }
        const [event, boost, host] = await Promise.all([
            Event.findById(eventId),
            Boost.findOne({ _id: boostId, active: true }),
            Account.findById(req.userId).select('email username role')
        ]);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (!boost) {
            return res.status(404).json({
                message: 'Active boost package not found'
            });
        }
        if (!host) {
            return res.status(404).json({
                message: 'Host account not found'
            });
        }
        if (event.creator?.toString() !== req.userId.toString()) {
            return res.status(403).json({
                message: 'You can only boost your own event'
            });
        }
        if (event.status !== 'Planned') {
            return res.status(409).json({
                message: 'Only planned events can be boosted'
            });
        }
        const now = new Date();
        const eventStart = getEventStartTime(event);

        if (eventStart <= now) {
            return res.status(409).json({
                message: 'The event has already started'
            });
        }
        let requestedStartTime = null;
        let calculatedEndTime = null;

        if (startMode === 'now') {
            assertImmediateWindowFits({
                lengthHours: boost.length,
                eventStart,
                now
            });
        } else {
            const window = calculateScheduledWindow({
                startTime,
                lengthHours: boost.length,
                eventStart,
                now
            });

            requestedStartTime = window.startTime;
            calculatedEndTime = window.endTime;
        }
        const idempotencyKey = crypto.randomUUID();
        purchase = await BoostPurchase.create({
            event: event._id,
            boost: boost._id,
            host: host._id,
            startMode,
            requestedStartTime,
            calculatedEndTime,
            boostSnapshot: {
                name: boost.name,
                lengthHours: boost.length,
                amountCents: boost.priceCents,
                currency: boost.currency
            },
            paymentStatus: 'pending',
            idempotencyKey,
            source: 'stripe',
            excludeFromRevenue: false,
            reservationActive: true
        });

        const returnUrl = new URL('/boost-details', FRONTEND_URL);
        returnUrl.searchParams.set('eventId', event._id.toString());
        returnUrl.searchParams.set(
            'purchaseId',
            purchase._id.toString()
        );
        returnUrl.searchParams.set(
            'session_id',
            '{CHECKOUT_SESSION_ID}'
        );
        const checkoutSession =
            await stripeClient.checkout.sessions.create(
                {
                    ui_mode: 'elements',
                    mode: 'payment',
                    customer_creation: 'if_required',
                    customer_email: host.email,
                    payment_method_types: ['card'],
                    line_items: [
                        {
                            price_data: {
                                currency: boost.currency,
                                unit_amount: boost.priceCents,
                                product_data: {
                                    name: boost.name,
                                    description: boost.description || undefined
                                }
                            },
                            quantity: 1
                        }
                    ],
                    return_url: returnUrl.toString(),
                    expires_at:
                        Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
                    client_reference_id: purchase._id.toString(),
                    metadata: {
                        purchaseId: purchase._id.toString(),
                        boostPurchaseId: purchase._id.toString(),
                        eventId: event._id.toString(),
                        hostId: host._id.toString()
                    },
                    payment_intent_data: {
                        metadata: {
                            purchaseId: purchase._id.toString(),
                            boostPurchaseId: purchase._id.toString(),
                            eventId: event._id.toString(),
                            hostId: host._id.toString()
                        }
                    }
                },
                { idempotencyKey }
            );
        purchase.stripeCheckoutSessionId = checkoutSession.id;
        purchase.checkoutExpiresAt = checkoutSession.expires_at
            ? new Date(checkoutSession.expires_at * 1000)
            : null;
        await purchase.save();
        return res.status(201).json({
            purchaseId: purchase._id,
            clientSecret: checkoutSession.client_secret
        });
    }
    catch (error) {
        if (purchase && !purchase.stripeCheckoutSessionId) {
            await BoostPurchase.updateOne(
                { _id: purchase._id },
                {
                    $set: {
                        paymentStatus: 'failed',
                        reservationActive: false,
                        failureCode: 'CHECKOUT_SESSION_CREATE_FAILED',
                        failureMessage: 'Could not create Checkout Session'
                    }
                }
            ).catch(() => { });
        }
        if (error?.code === 11000) {
            return res.status(409).json({
                message:
                    'This event already has a pending, scheduled, or active boost'
            });
        }
        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Could not prepare boost payment'
        });
    }
};

const getBoostPurchase = async (req, res) => {
    try {
        const { purchaseId } = req.params;

        if (!isObjectId(purchaseId)) {
            return res.status(400).json({
                message: 'Invalid purchase id'
            });
        }

        const purchase = await BoostPurchase.findById(purchaseId);

        if (!purchase) {
            return res.status(404).json({
                message: 'Boost purchase not found'
            });
        }

        const ownsPurchase =
            purchase.host.toString() === req.userId.toString();

        if (!ownsPurchase && req.userRole !== 'Admin') {
            return res.status(403).json({
                message: 'You cannot view this purchase'
            });
        }

        let checkout = null;

        if (
            purchase.paymentStatus === 'pending' &&
            purchase.stripeCheckoutSessionId
        ) {
            const stripeClient = requireStripe();

            checkout = await stripeClient.checkout.sessions.retrieve(
                purchase.stripeCheckoutSessionId
            );

            if (checkout.status === 'expired') {
                purchase.paymentStatus = 'expired';
                purchase.reservationActive = false;
                await purchase.save();
            }
        }

        return res.json(
            await serializePurchaseWithBoost(purchase, checkout)
        );
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Could not load boost purchase'
        });
    }
};

const syncBoostPurchase = async (req, res) => {
    try {
        const stripeClient = requireStripe();
        const { purchaseId } = req.params;

        if (!isObjectId(purchaseId)) {
            return res.status(400).json({
                message: 'Invalid purchase id'
            });
        }

        let purchase = await BoostPurchase.findById(purchaseId);

        if (!purchase) {
            return res.status(404).json({
                message: 'Boost purchase not found'
            });
        }

        if (purchase.host.toString() !== req.userId.toString()) {
            return res.status(403).json({
                message: 'You cannot sync this purchase'
            });
        }

        if (purchase.paymentStatus === 'paid' || purchase.fulfilledAt) {
            return res.json(
                await serializePurchaseWithBoost(purchase)
            );
        }

        if (!purchase.stripeCheckoutSessionId) {
            return res.status(409).json({
                message:
                    'This purchase does not have a Stripe Checkout Session'
            });
        }

        const checkout = await stripeClient.checkout.sessions.retrieve(
            purchase.stripeCheckoutSessionId
        );
        const checkoutPurchaseId =
            getCheckoutSessionPurchaseId(checkout);

        if (checkoutPurchaseId !== purchase._id.toString()) {
            return res.status(409).json({
                message:
                    'Stripe Checkout Session does not match this purchase'
            });
        }

        if (checkout.payment_status !== 'paid') {
            return res.json(
                await serializePurchaseWithBoost(purchase, checkout)
            );
        }

        await fulfillPaidBoostPurchase(
            stripeClient,
            checkout,
            new Date()
        );

        purchase = await BoostPurchase.findById(purchaseId);

        if (!purchase) {
            return res.status(404).json({
                message: 'Boost purchase not found'
            });
        }

        return res.json(
            await serializePurchaseWithBoost(purchase, checkout)
        );
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Could not sync boost payment'
        });
    }
};

const cancelBoostPurchase = async (req, res) => {
    try {
        const stripeClient = requireStripe();
        const { purchaseId } = req.params;

        if (!isObjectId(purchaseId)) {
            return res.status(400).json({
                message: 'Invalid purchase id'
            });
        }

        const purchase = await BoostPurchase.findOne({
            _id: purchaseId,
            host: req.userId
        });
        if (!purchase) {
            return res.status(404).json({
                message: 'Boost purchase not found'
            });
        }
        if (purchase.paymentStatus !== 'pending') {
            return res.status(409).json({
                message: 'Only a pending purchase can be cancelled'
            });
        }

        if (purchase.stripeCheckoutSessionId) {
            const checkout = await stripeClient.checkout.sessions.retrieve(
                purchase.stripeCheckoutSessionId
            )
            if (checkout.status === 'open') {
                await stripeClient.checkout.sessions.expire(
                    purchase.stripeCheckoutSessionId
                );
            }
        }

        purchase.paymentStatus = 'cancelled';
        purchase.reservationActive = false;
        purchase.failureCode = 'CANCELLED_BY_HOST';
        await purchase.save();
        return res.json({ message: 'Boost purchase cancelled' });

    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Could not cancel boost purchase'
        });
    }
}

export {
    createBoostCheckoutSession,
    getBoostPurchase,
    syncBoostPurchase,
    cancelBoostPurchase
};
