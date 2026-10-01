import mongoose from 'mongoose';

const boostSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: null, trim: true },
        length: { type: Number, required: true },
        priceCents: { type: Number, required: true, min: 0 },
        currency: { type: String, required: true, default: 'eur', lowercase: true, trim: true },
        recommended:{ type: Boolean, default:false},
        size: { type: String, default: null },
        active: { type: Boolean, default: true },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true ,
        toJSON:{virtuals:true},
        toObject:{virtuals:true}
    }
);

boostSchema.virtual('price').get(function() {
    return this.priceCents/100;
});

boostSchema.index({ active: 1, priceCents: 1 });

export default mongoose.model('Boost', boostSchema);
