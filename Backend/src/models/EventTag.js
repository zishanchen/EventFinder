import mongoose from 'mongoose';

const eventTagSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true
        },
        tag: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tag',
            required: true
        },
        active: { type: Boolean, default: true }
    },
    { timestamps: true }
);

eventTagSchema.index({ event: 1, tag: 1 }, { unique: true });

export default mongoose.model('EventTag', eventTagSchema);