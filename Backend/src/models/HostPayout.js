import mongoose from 'mongoose';

const payoutMethodSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String, default: null },
    type: { type: String, default: null },
    card: {
      brand: { type: String, default: null },
      last4: { type: String, default: null },
      expMonth: { type: Number, default: null },
      expYear: { type: Number, default: null },
      funding: { type: String, default: null },
      country: { type: String, default: null }
    },
    billingDetails: {
      name: { type: String, default: null },
      email: { type: String, default: null }
    },
    setAt: { type: Date, default: null }
  },
  { _id: false }
);

const hostPayoutSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    billingMonth: {
      type: String,
      required: true,
      trim: true
    },
    invoiceCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0
    },
    platformFeePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 5
    },
    platformFeeAmount: {
      type: Number,
      required: true,
      min: 0
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'eur',
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Skipped'],
      default: 'Pending'
    },
    paidAt: {
      type: Date,
      default: null
    },
    payoutMethod: {
      type: payoutMethodSnapshotSchema,
      default: null
    },
    lastPayoutError: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

hostPayoutSchema.index({ host: 1, billingMonth: 1 }, { unique: true });
hostPayoutSchema.index({ billingMonth: 1, status: 1 });

export default mongoose.model('HostPayout', hostPayoutSchema);
