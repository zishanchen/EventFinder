import mongoose from 'mongoose';

const eventBoostSchema = new mongoose.Schema(
    {
        purchase: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BoostPurchase',
            required: true,
            unique: true,
        },
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
            required: true
        },

        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true }, // startTime + boost.length hours
        status: {
            type: String,
            enum: ['scheduled', 'active', 'expired', 'cancelled'],
            required: true
        },
        active: { type: Boolean, default: false },
        slotActive: { type: Boolean, default: true },
        activatedAt: { type: Date, default: null },
        expiredAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null }
    },
    { timestamps: true }
);

eventBoostSchema.index({ status: 1, startTime: 1, endTime: 1 });
eventBoostSchema.index(
    { event: 1 },
    {
        unique: true,
        partialFilterExpression: { slotActive: true }
    }
);


export default mongoose.model('EventBoost', eventBoostSchema);
