import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const hashToken = (token) => crypto
  .createHash('sha256')
  .update(String(token))
  .digest('hex');

const accountSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    profilePicture: { type: String, default: null },
    savedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    active: { type: Boolean, default: true },
    failedLoginAttempts: [{ type: Date }],
    temporaryDeactivationUntil: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    gdprDeletedAt: { type: Date, default: null },
    role: {
      type: String,
      required: true,
      enum: ['Participant', 'Host', 'Admin']
    },

    // Password reset
    resetPasswordToken: { type: String },
    resetPasswordTokenExpiry: { type: Date },
    resetPasswordRequestedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    discriminatorKey: 'role'
  }
);

// Hash password before saving
accountSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

accountSchema.methods.matchPassword = async function (enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

accountSchema.statics.hashToken = function (token) {
  return hashToken(token);
};

accountSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = hashToken(token);
  this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

accountSchema.methods.generateResetPasswordToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = hashToken(token);
  this.resetPasswordTokenExpiry = Date.now() + 60 * 60 * 1000;
  return token;
};

export default mongoose.model('Account', accountSchema);
