import mongoose from 'mongoose';
import Account from './Account.js';

const adminSchema = new mongoose.Schema({}, { timestamps: true });

export default Account.discriminator('Admin', adminSchema);
