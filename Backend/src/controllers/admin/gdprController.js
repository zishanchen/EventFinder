import mongoose from 'mongoose';
import Account from '../../models/Account.js';
import Event from '../../models/Event.js';
import Invoice from '../../models/Invoice.js';
import Rating from '../../models/Rating.js';
import Registration from '../../models/Registration.js';

const ANON_USERNAME = '[deleted]';

const anonymizedEmailFor = (userId) => {
    return `deleted+${userId}@eventfinder.invalid`;
};

// Rules applied:
//   Ratings given      → remove author refs (keep value — reputation history stays intact)
//   Ratings received   → hard delete
//   Registrations      → billable history → anonymise participant ref
//                        non-billable history → hard delete
//   Events (Host only) → block if planned events or active registrations exist
//                        otherwise anonymise creator ref + embedded host name
//   Account            → anonymise username/email, clear PII fields, deactivate
//
export const gdprDeleteUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const user = await Account.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'Admin') {
            await session.abortTransaction();
            return res.status(403).json({ message: 'Admin accounts cannot be GDPR-deleted from the admin panel' });
        }

        if (user.role === 'Participant') {
            const blockedInvoiceCount = await Invoice.countDocuments({
                participant: user._id,
                status: { $in: ['Pending', 'Unpaid', 'Failed'] }
            }).session(session);

            const billableRegistrations = await Registration.find({
                participant: user._id,
                status: { $in: ['Attended', 'CancelledLate'] }
            }).select('_id event').session(session);
            const invoicedRegistrationIds = await Invoice.distinct('registration', {
                registration: { $in: billableRegistrations.map((registration) => registration._id) }
            }).session(session);
            const invoicedRegistrationIdSet = new Set(invoicedRegistrationIds.map((id) => id.toString()));
            const uninvoicedRegistrationEventIds = billableRegistrations
                .filter((registration) => !invoicedRegistrationIdSet.has(registration._id.toString()))
                .map((registration) => registration.event);
            let pendingBillCount = 0;
            if (uninvoicedRegistrationEventIds.length) {
                const billableEventIds = await Event.distinct('_id', {
                    _id: { $in: uninvoicedRegistrationEventIds },
                    price: { $gt: 0 },
                    status: 'Happened'
                }).session(session);
                const billableEventIdSet = new Set(billableEventIds.map((id) => id.toString()));
                pendingBillCount = billableRegistrations.filter((registration) => {
                    return (
                        !invoicedRegistrationIdSet.has(registration._id.toString()) &&
                        billableEventIdSet.has(registration.event?.toString())
                    );
                }).length;
            }

            if (blockedInvoiceCount > 0 || pendingBillCount > 0) {
                await session.abortTransaction();
                return res.status(409).json({
                    message: `Cannot delete: this participant has ${blockedInvoiceCount + pendingBillCount} pending, unpaid, or failed bill(s). Resolve bills first.`
                });
            }
        }

        // ── Host guard: block deletion if live hosted activity exists ─────
        if (user.role === 'Host') {
            const hostedEvents = await Event.find({ creator: userId }, '_id').session(session);
            const hostedEventIds = hostedEvents.map(e => e._id);

            const plannedEventCount = await Event.countDocuments({
                _id: { $in: hostedEventIds },
                status: 'Planned'
            }).session(session);

            if (plannedEventCount > 0) {
                await session.abortTransaction();
                return res.status(409).json({
                    message: `Cannot delete: this host has ${plannedEventCount} planned event(s). Cancel those events first.`
                });
            }

            const hostedRegistrationIds = await Registration.distinct('_id', {
                event: { $in: hostedEventIds }
            }).session(session);

            const unresolvedInvoiceCount = await Invoice.countDocuments({
                registration: { $in: hostedRegistrationIds },
                status: { $in: ['Pending', 'Unpaid', 'Failed'] }
            }).session(session);

            if (unresolvedInvoiceCount > 0) {
                await session.abortTransaction();
                return res.status(409).json({
                    message: `Cannot delete: this host has ${unresolvedInvoiceCount} pending, unpaid, or failed invoice(s) on hosted event registrations. Resolve bills first.`
                });
            }

            const ongoingCount = await Registration.countDocuments({
                event: { $in: hostedEventIds },
                status: 'Registered'
            }).session(session);

            if (ongoingCount > 0) {
                await session.abortTransaction();
                return res.status(409).json({
                    message: `Cannot delete: this host has ${ongoingCount} active registration(s) on upcoming events. Cancel those events first.`
                });
            }

            // Anonymise creator ref + embedded host snapshot on all past events
            await Event.updateMany(
                { creator: userId },
                { $set: { creator: null, 'host.name': ANON_USERNAME, 'host.initials': '??' } },
                { session }
            );
        }

        // ── Ratings given → strip author refs ────────────────────────────
        await Rating.updateMany(
            { rater: userId },
            { $set: { rater: null, participant: null } },
            { session }
        );

        // ── Ratings received → hard delete ────────────────────────────────
        await Rating.deleteMany({ rated: userId }, { session });

        // ── Registrations: billable history → anonymise, rest → delete ────
        await Registration.updateMany(
            { participant: userId, status: { $in: ['Attended', 'CancelledLate'] } },
            { $set: { participant: null } },
            { session }
        );
        await Registration.deleteMany(
            { participant: userId, status: { $nin: ['Attended', 'CancelledLate'] } },
            { session }
        );

        // ── Anonymise account fields ──────────────────────────────────────
        user.username = ANON_USERNAME;
        user.email = anonymizedEmailFor(user._id);
        user.password = undefined;
        user.active = false;
        user.gdprDeletedAt = new Date();
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpiry = undefined;
        user.resetPasswordRequestedAt = undefined;

        if (user.role === 'Participant') {
            user.gender = undefined;
            user.age = undefined;
            user.isVerified = false;
            user.verificationToken = undefined;
            user.verificationTokenExpiry = undefined;
        }
        if (user.role === 'Host') {
            user.verified = false;
            user.description = undefined;
            user.socialMedia = {
                platform: 'Instagram',
                username: ANON_USERNAME
            };
            user.verificationToken = undefined;
        }

        await user.save({ session });
        await session.commitTransaction();

        res.json({
            message: 'User data anonymised successfully in compliance with GDPR Art. 17.',
            userId
        });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ message: err.message });
    } finally {
        session.endSession();
    }
};
