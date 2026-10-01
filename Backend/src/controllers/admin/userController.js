import crypto from 'crypto';
import mongoose from 'mongoose';
import Account from '../../models/Account.js';
import { sendHostVerificationTokenEmail } from '../../utils/emailService.js';

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
    try {
        const users = await Account.find({
            role: { $in: ['Participant', 'Host'] }
        })
            .select('username email role active createdAt gdprDeletedAt verified isVerified')
            .sort({ createdAt: -1 })
            .lean();

        users.forEach(u => {
            if (u.role === 'Host') u.verified = u.verified ?? false;
            if (u.role === 'Participant') u.isVerified = u.isVerified ?? false;
        });

        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/admin/users/:id/deactivate  (toggle)
export const deactivateUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const user = await Account.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'Admin') {
            return res.status(403).json({ message: 'Admin accounts cannot be deactivated from the admin panel' });
        }
        if (user.gdprDeletedAt) {
            return res.status(400).json({ message: 'GDPR-deleted accounts cannot be reactivated' });
        }

        const reactivating = !user.active;
        user.active = !user.active;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        if (user.active) {
            user.temporaryDeactivationUntil = null;
            user.failedLoginAttempts = [];
        }
        if (reactivating && user.role === 'Host' && !user.verified) {
            user.verificationToken = crypto.randomBytes(16).toString('hex').toUpperCase();
        }
        await user.save();

        if (reactivating && user.role === 'Host' && !user.verified) {
            await sendHostVerificationTokenEmail(user.email, user.username, user.verificationToken);
        }

        const state = user.active ? 'reactivated' : 'deactivated';
        res.json({
            message: user.role === 'Host' && user.active && !user.verified
                ? 'Account reactivated successfully. A new host verification token was emailed to the host.'
                : `Account ${state} successfully`,
            active: user.active
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
