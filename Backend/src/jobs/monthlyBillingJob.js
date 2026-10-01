import cron from 'node-cron';
import { BILLING_CRON } from '../config/appConfig.js';
import { getPreviousBillingMonth, runMonthlyBilling } from '../services/billingService.js';

const startMonthlyBillingJob = () => {
  if (!BILLING_CRON.enabled) {
    console.log('Monthly billing cron disabled in appConfig.js');
    return null;
  }

  const { schedule, timezone } = BILLING_CRON;

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid billing cron schedule: ${schedule}`);
  }

  const task = cron.schedule(
    schedule,
    async () => {
      const billingMonth = getPreviousBillingMonth();
      console.log(`Starting monthly billing for ${billingMonth}`);

      try {
        const result = await runMonthlyBilling(billingMonth);
        console.log(
          `Monthly billing finished for ${result.billingMonth}: ` +
          `${result.invoices.createdCount} invoices created, ` +
          `${result.collection.paidCount} paid, ` +
          `${result.collection.failedCount} failed, ` +
          `${result.collection.skippedCount} skipped, ` +
          `${result.payouts.paidCount} host payout(s) paid, ` +
          `${result.payouts.failedCount} payout(s) failed, ` +
          `${result.payouts.platformFeeAmount} retained`
        );
      } catch (error) {
        console.error(`Monthly billing failed for ${billingMonth}:`, error.message);
      }
    },
    { timezone }
  );

  console.log(`Monthly billing cron scheduled: "${schedule}" (${timezone})`);
  return task;
};

export default startMonthlyBillingJob;
