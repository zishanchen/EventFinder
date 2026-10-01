import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
      unique: true
    },
    amount: {
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
    billingMonth: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Unpaid', 'Paid', 'Failed', 'Cancelled', 'Relieved'],
      default: 'Unpaid'
    },
    statusBeforeRelief: {
      type: String,
      enum: ['Pending', 'Unpaid', 'Failed', 'Cancelled', null],
      default: null
    },
    paymentDate: {
      type: Date,
      default: null
    },
    stripePaymentIntentId: {
      type: String,
      default: null
    },
    lastPaymentError: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

invoiceSchema.index({ participant: 1, billingMonth: 1, status: 1 });
invoiceSchema.index({ billingMonth: 1, status: 1 });

export default mongoose.model('Invoice', invoiceSchema);
