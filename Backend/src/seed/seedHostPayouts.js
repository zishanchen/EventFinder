import Invoice from '../models/Invoice.js';
import { payHostsForMonth } from '../services/billingService.js';

const seedHostPayouts = async ({ billingMonth }) => {
  await Invoice.updateMany(
    { billingMonth, status: { $in: ['Unpaid', 'Failed', 'Pending'] } },
    {
      $set: {
        status: 'Paid',
        paymentDate: new Date(),
        lastPaymentError: null
      }
    }
  );

  const payoutResult = await payHostsForMonth(billingMonth);

  return {
    payoutCount: payoutResult.paidCount,
    payoutFailedCount: payoutResult.failedCount,
    payoutSkippedCount: payoutResult.skippedCount,
    grossAmount: payoutResult.grossAmount,
    platformFeeAmount: payoutResult.platformFeeAmount,
    netAmount: payoutResult.netAmount
  };
};

export { seedHostPayouts };
