import Host from '../../models/Host.js';
import Participant from '../../models/Participant.js';
import Event from '../../models/Event.js';
import Rating from '../../models/Rating.js';
import Registration from '../../models/Registration.js';
import BoostPurchase from '../../models/BoostPurchase.js';
import HostPayout from '../../models/HostPayout.js';

// GET /api/admin/stats
export const getStats = async (req, res) => {
    try {
        const totalParticipants = await Participant.countDocuments({ active: true, isVerified: true });
        const totalHosts = await Host.countDocuments({ active: true, verified: true });
        const eventsByStatus = await Event.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const totalRegistrations = await Registration.countDocuments();
        const totalRatings = await Rating.countDocuments({ active: true });
        const boostRevenue = await BoostPurchase.aggregate([
            {
                $match: {
                    paymentStatus: 'paid',
                    excludeFromRevenue: { $ne: true }
                }
            },
            { $group: { _id: null, totalCents: { $sum: '$boostSnapshot.amountCents' } } }
        ]);
        const platformFeeEarnings = await HostPayout.aggregate([
            { $group: { _id: null, total: { $sum: '$platformFeeAmount' } } }
        ]);

        const events = { Planned: 0, Happened: 0, Cancelled: 0, total: 0 };
        eventsByStatus.forEach(({ _id, count }) => {
            if (_id in events) events[_id] = count;
            events.total += count;
        });

        const boostRevenueTotal = Number(((boostRevenue[0]?.totalCents ?? 0) / 100).toFixed(2));
        const platformFeeEarningsTotal = Number((platformFeeEarnings[0]?.total ?? 0).toFixed(2));

        res.json({
            users: {
                participants: totalParticipants,
                hosts: totalHosts,
                total: totalParticipants + totalHosts
            },
            events,
            totalRegistrations,
            totalRatings,
            platformFeeEarnings: platformFeeEarningsTotal,
            boostRevenue: boostRevenueTotal
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
