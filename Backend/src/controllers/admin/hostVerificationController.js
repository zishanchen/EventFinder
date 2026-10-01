import mongoose from 'mongoose';
import Host from '../../models/Host.js';

// GET /api/admin/hosts/pending
export const getPendingHosts = async (req, res) => {
    try {
        const hosts = await Host.find({ verified: false, active: true })
            .select('username email socialMedia createdAt')
            .sort({ createdAt: 1 }); // oldest first — FIFO queue
        res.json(hosts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/admin/hosts/:id/verify
// Body: { token: "TOKEN_ENTERED_BY_ADMIN" }
export const verifyHost = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid host id' });
        }

        const host = await Host.findById(req.params.id);
        if (!host) return res.status(404).json({ message: 'Host not found' });
        if (host.verified) return res.status(400).json({ message: 'Host is already verified' });

        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        if (token.trim().toUpperCase() !== host.verificationToken?.toUpperCase()) {
            return res.status(400).json({ message: 'Token does not match. Verification failed.' });
        }

        host.verified = true;
        host.verificationToken = undefined; // clear token after use
        await host.save();

        res.json({ message: 'Host verified successfully', hostId: host._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/admin/hosts/:id/reject
export const rejectHost = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid host id' });
        }

        const host = await Host.findById(req.params.id);
        if (!host) return res.status(404).json({ message: 'Host not found' });
        if (host.verified) return res.status(400).json({ message: 'Host is already verified' });

        host.active = false;
        host.verificationToken = undefined;
        await host.save();

        res.json({ message: 'Host rejected and deactivated', hostId: host._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
