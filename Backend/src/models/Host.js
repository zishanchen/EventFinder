import mongoose from 'mongoose';
import Account from './Account.js';

const hostSchema = new mongoose.Schema(
    {
        verified: { type: Boolean, default: false },
        description: { type: String, default: null },

        // Social media — at least one required for verification
        socialMedia: {
            platform: {
                type: String,
                enum: ['LinkedIn', 'Instagram'],
                required: true
            },
            username: { type: String, required: true }
        },

        // Random token for manual verification
        verificationToken: { type: String },

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

export default Account.discriminator('Host', hostSchema);
