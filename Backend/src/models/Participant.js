import mongoose from 'mongoose';
import Account from './Account.js';

const participantSchema = new mongoose.Schema(
    {
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Diverse'],
            default: null
        },
        age: { type: Number, default: null },

        // Email verification
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String },
        verificationTokenExpiry: { type: Date },

        stripe: {
            customerId: { type: String, default: null },
            defaultPaymentMethod: {
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
            }
        }
    },
    { timestamps: true }
);

export default Account.discriminator('Participant', participantSchema);
