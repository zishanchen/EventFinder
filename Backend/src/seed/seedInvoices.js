import { createInvoicesForMonth, getPreviousBillingMonth } from '../services/billingService.js';

const seedInvoices = async () => {
  const billingMonth = getPreviousBillingMonth();
  const { createdCount } = await createInvoicesForMonth(billingMonth);

  return {
    billingMonth,
    invoiceCount: createdCount
  };
};

export { seedInvoices };
