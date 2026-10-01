import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema(
    {
        rater: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            default: null
        },
        rated: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: true
        },
        registration: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Registration',
            required: true
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            default: null
        },

        ratingType: {
            type: String,
            enum: ['host', 'participant'],
            required: true
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: 500,
            default: null
        },
        photo: {
            type: String,
            default: null
        },
        active: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Prevent duplicate ratings per rater/rated/registration/type
ratingSchema.index({ rater: 1, rated: 1, registration: 1, ratingType: 1 }, { unique: true });
ratingSchema.index({ event: 1, participant: 1, registration: 1, ratingType: 1 });

export default mongoose.model('Rating', ratingSchema);
