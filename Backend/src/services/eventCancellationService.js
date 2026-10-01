import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Registration from '../models/Registration.js';

const CANCELLABLE_INVOICE_STATUSES = ['Unpaid', 'Failed'];
const CANCELLABLE_REGISTRATION_STATUSES = [
  'Registered',
  'Denied',
  'CancelledLate',
  'Attended',
  'Removed'
];

/**
 * Cancels an event and every registration belonging to it as one database
 * transaction. Any unpaid or failed invoice is also cancelled so a scheduled
 * billing run cannot charge a participant after the event is gone.
 */
const cancelEventWithRegistrations = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      event.status = 'Cancelled';
      await event.save({ session });

      const registrationResult = await Registration.updateMany(
        {
          event: event._id,
          status: { $in: CANCELLABLE_REGISTRATION_STATUSES }
        },
        {
          $set: {
            status: 'Cancelled',
            removedBy: null,
            removedAt: null
          }
        },
        { session }
      );

      const invoiceResult = await Invoice.updateMany(
        {
          event: event._id,
          status: { $in: CANCELLABLE_INVOICE_STATUSES }
        },
        {
          $set: {
            status: 'Cancelled',
            lastPaymentError: 'Event cancelled'
          }
        },
        { session }
      );

      result = {
        cancelledRegistrations: registrationResult.modifiedCount,
        cancelledInvoices: invoiceResult.modifiedCount
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};

export { cancelEventWithRegistrations };
