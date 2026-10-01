
import BoostPurchase from '../models/BoostPurchase.js';
import Event from '../models/Event.js';
import EventBoost from '../models/EventBoost.js';
import {
  calculatePaidWindow,
  getEventStartTime
} from './boostTimeService.js';

const toStripeId = (value) => {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.id;
};

const refundPurchase = async ({
  stripeClient,
  purchase,
  paymentIntentId,
  reason
}) => {
  await BoostPurchase.updateOne(
    { _id: purchase._id },
    {
      $set: {
        paymentStatus: 'requires_refund',
        reservationActive: false,
        stripePaymentIntentId: paymentIntentId,
        failureCode: 'BOOST_REQUIRES_REFUND',
        failureMessage: reason
      }
    }
  );

  if (!paymentIntentId) {
    return null;
  }

  const refund = await stripeClient.refunds.create(
    {
      payment_intent: paymentIntentId
    },
    {
      idempotencyKey: `boost-refund-${purchase._id}`
    }
  );

  await BoostPurchase.updateOne(
    { _id: purchase._id },
    {
      $set: {
        paymentStatus: 'refunded',
        refundedAt: new Date(),
        reservationActive: false,
        failureMessage: `Automatically refunded: ${refund.id}`
      }
    }
  );

  return refund;
};

const fulfillPaidBoostPurchase = async (
  stripeClient,
  checkoutSession,
  paidAt = new Date()
) => {
  const purchaseId =
    checkoutSession.metadata?.boostPurchaseId ||
    checkoutSession.metadata?.purchaseId;

  if (!purchaseId) {
    throw new Error(
      'Checkout Session is missing purchase metadata'
    );
  }

  const purchase = await BoostPurchase.findById(purchaseId);

  if (!purchase) {
    throw new Error(
      `BoostPurchase ${purchaseId} was not found`
    );
  }

  const paymentIntentId = toStripeId(
    checkoutSession.payment_intent
  );

  if (purchase.fulfilledAt) {
    return EventBoost.findOne({
      purchase: purchase._id
    });
  }

  if (['refunded', 'requires_refund'].includes(purchase.paymentStatus)) {
    return EventBoost.findOne({
      purchase: purchase._id
    });
  }

  if (checkoutSession.payment_status !== 'paid') {
    return null;
  }

  if (
    checkoutSession.amount_total !==
    purchase.boostSnapshot.amountCents
  ) {
    await refundPurchase({
      stripeClient,
      purchase,
      paymentIntentId,
      reason:
        'Checkout amount does not match BoostPurchase snapshot'
    });

    return null;
  }

  if (
    checkoutSession.currency !==
    purchase.boostSnapshot.currency
  ) {
    await refundPurchase({
      stripeClient,
      purchase,
      paymentIntentId,
      reason:
        'Checkout currency does not match BoostPurchase snapshot'
    });

    return null;
  }

  const event = await Event.findById(purchase.event);

  if (!event) {
    await refundPurchase({
      stripeClient,
      purchase,
      paymentIntentId,
      reason: 'Event no longer exists'
    });

    return null;
  }

  if (event.status !== 'Planned') {
    await refundPurchase({
      stripeClient,
      purchase,
      paymentIntentId,
      reason: 'Event is no longer planned'
    });

    return null;
  }

  if (event.creator?.toString() !== purchase.host.toString()) {
    await refundPurchase({
      stripeClient,
      purchase,
      paymentIntentId,
      reason: 'Event ownership changed or is invalid'
    });

    return null;
  }

  let startTime;
  let endTime;

  try {
    const eventStart = getEventStartTime(event);

    const window = calculatePaidWindow({
      purchase,
      eventStart,
      paidAt
    });

    startTime = window.startTime;
    endTime = window.endTime;
  } catch (error) {
    await refundPurchase({
      stripeClient,
      purchase,
      paymentIntentId,
      reason: error.message
    });

    return null;
  }

  const status = startTime > paidAt ? 'scheduled' : 'active';
  const active = status === 'active' && endTime > paidAt;

  const eventBoost = await EventBoost.findOneAndUpdate(
    {
      purchase: purchase._id
    },
    {
      $setOnInsert: {
        purchase: purchase._id,
        event: purchase.event,
        boost: purchase.boost,
        host: purchase.host,
        startTime,
        endTime,
        status,
        active,
        slotActive: true,
        activatedAt: active ? paidAt : null
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );

  await Event.updateOne(
    {
      _id: event._id
    },
    {
      $set: {
        boost: {
          eventBoostId: eventBoost._id,
          startTime: eventBoost.startTime,
          endTime: eventBoost.endTime,
          status: eventBoost.status,
          active: eventBoost.active
        }
      }
    }
  );

  await BoostPurchase.updateOne(
    {
      _id: purchase._id,
      fulfilledAt: null
    },
    {
      $set: {
        paymentStatus: 'paid',
        paidAt,
        fulfilledAt: new Date(),
        calculatedEndTime: eventBoost.endTime,
        stripePaymentIntentId: paymentIntentId
      }
    }
  );

  return eventBoost;
};

export {
  fulfillPaidBoostPurchase
};
