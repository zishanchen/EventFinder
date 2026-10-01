import mongoose from 'mongoose';

const boostPurchaseSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    boost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boost',
      required: true
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },

    startMode: {
      type: String,
      enum: ['now', 'scheduled'],
      required: true
    },
    requestedStartTime: { type: Date, default: null },
    calculatedEndTime: { type: Date, default: null },

    boostSnapshot: {
      name: { type: String, required: true },
      lengthHours: { type: Number, required: true, min: 1 },
      amountCents: { type: Number, required: true, min: 0 },
      currency: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
      }
    },

    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'processing',
        'paid',
        'failed',
        'expired',
        'cancelled',
        'requires_refund',
        'refunded'
      ],
      default: 'pending',
      index: true
    },

    stripeCheckoutSessionId: { type: String },
    stripePaymentIntentId: { type: String },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true
    },
    checkoutExpiresAt: { type: Date, default: null },

    paidAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    failureCode: { type: String, default: null },
    failureMessage: { type: String, default: null },

    source: {
      type: String,
      enum: ['stripe', 'seed'],
      default: 'stripe',
      index: true
    },
    excludeFromRevenue: { type: Boolean, default: false },

    reservationActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

boostPurchaseSchema.index(
  { stripeCheckoutSessionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripeCheckoutSessionId: { $type: 'string' }
    }
  }
);

boostPurchaseSchema.index(
  { stripePaymentIntentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripePaymentIntentId: { $type: 'string' }
    }
  }
);

boostPurchaseSchema.index(
  { event: 1 },
  {
    unique: true,
    partialFilterExpression: { reservationActive: true }
  }
);

export default mongoose.model('BoostPurchase', boostPurchaseSchema);
