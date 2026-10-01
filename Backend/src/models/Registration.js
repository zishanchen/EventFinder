import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    status: {
      type: String,
      enum: ['Registered', 'Denied', 'Cancelled', 'CancelledLate', 'Attended', 'Removed'],
      default: 'Registered'
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    removedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model('Registration', registrationSchema);
