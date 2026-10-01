import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        active: { type: Boolean, default: true },
        colors: {
            background: { type: String, trim: true },
            border: { type: String, trim: true },
            text: { type: String, trim: true }
        },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

export default mongoose.model('Tag', tagSchema);
