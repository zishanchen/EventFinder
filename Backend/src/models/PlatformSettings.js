import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'platform' },
    lateCancellationWindowDays: { type: Number, required: true, min: 0, default: 3 },
    lateCancellationFeePercent: { type: Number, required: true, min: 0, max: 100, default: 50 }
  },
  { timestamps: true }
);

export default mongoose.model('PlatformSettings', platformSettingsSchema);
