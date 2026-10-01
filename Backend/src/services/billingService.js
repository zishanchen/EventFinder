import Account from '../models/Account.js';
import Event from '../models/Event.js';
import HostPayout from '../models/HostPayout.js';
import Invoice from '../models/Invoice.js';
import Registration from '../models/Registration.js';
import stripe from '../config/stripe.js';
import { getPlatformSettings } from './platformSettingsService.js';
import '../models/Host.js';
import '../models/Participant.js';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const HOST_PLATFORM_FEE_PERCENT = 5;

const requireStripe = () => {
  if (!stripe) {
    const error = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in src/config/appConfig.js.');
    error.statusCode = 503;
    throw error;
  }
};

const buildBillingMonth = (date) => {
  const value = new Date(date);
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${value.getFullYear()}-${month}`;
};

const getPreviousBillingMonth = (date = new Date()) => {
  const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return buildBillingMonth(previousMonth);
};

const buildInvoiceAmount = (registration, event, settings) => {
  if (registration.status === 'CancelledLate') {
    return Number(event.price) * (Number(settings?.lateCancellationFeePercent ?? 50) / 100);
  }

  return Number(event.price);
};

const roundMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const calculateHostPayoutAmounts = (grossAmount) => {
  const gross = roundMoney(grossAmount);
  const platformFeeAmount = roundMoney(gross * (HOST_PLATFORM_FEE_PERCENT / 100));
  const netAmount = roundMoney(gross - platformFeeAmount);

  return {
    grossAmount: gross,
    platformFeePercent: HOST_PLATFORM_FEE_PERCENT,
    platformFeeAmount,
    netAmount
  };
};

const resolveBillingWindow = (month) => {
  const billingMonth = month || buildBillingMonth(new Date());

  if (!MONTH_PATTERN.test(billingMonth)) {
    const error = new Error('month must use YYYY-MM format');
    error.statusCode = 400;
    throw error;
  }

  const [year, monthNumber] = billingMonth.split('-').map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 1);

  return { billingMonth, start, end };
};

const createInvoicesForMonth = async (month) => {
  const { billingMonth, start, end } = resolveBillingWindow(month);
  const settings = await getPlatformSettings();
  const paidEvents = await Event.find({
    price: { $gt: 0 },
    status: { $ne: 'Cancelled' },
    $or: [
      { date: { $gte: start, $lt: end } },
      { datetime: { $gte: start, $lt: end } }
    ]
  }).select('_id price date datetime');
  const paidEventById = paidEvents.reduce((acc, event) => {
    acc[event._id.toString()] = event;
    return acc;
  }, {});
  const registrations = await Registration.find({
    status: { $in: ['Attended', 'CancelledLate'] },
    participant: { $ne: null },
    event: { $in: paidEvents.map((event) => event._id) }
  }).select('participant event status');
  const existingInvoices = await Invoice.find({
    registration: { $in: registrations.map((registration) => registration._id) }
  }).select('registration');
  const invoicedRegistrationIds = new Set(
    existingInvoices.map((invoice) => invoice.registration.toString())
  );
  const invoiceDocs = registrations
    .filter((registration) => !invoicedRegistrationIds.has(registration._id.toString()))
    .map((registration) => ({
      participant: registration.participant,
      event: registration.event,
      registration: registration._id,
      amount: buildInvoiceAmount(registration, paidEventById[registration.event.toString()], settings),
      billingMonth,
      status: 'Unpaid'
    }));

  const createdInvoices = invoiceDocs.length > 0
    ? await Invoice.insertMany(invoiceDocs, { ordered: false })
    : [];

  return {
    billingMonth,
    createdCount: createdInvoices.length,
    skippedCount: registrations.length - createdInvoices.length
  };
};

const buildMonthlyPaymentSummary = async (participantId, month) => {
  const { billingMonth, start, end } = resolveBillingWindow(month);
  const settings = await getPlatformSettings();
  const paidEvents = await Event.find({
    price: { $gt: 0 },
    $or: [
      { date: { $gte: start, $lt: end } },
      { datetime: { $gte: start, $lt: end } }
    ]
  }).select('_id title name price date datetime');
  const paidEventById = paidEvents.reduce((acc, event) => {
    acc[event._id.toString()] = event;
    return acc;
  }, {});
  const registrations = await Registration.find({
    participant: participantId,
    status: { $in: ['Attended', 'CancelledLate'] },
    event: { $in: paidEvents.map((event) => event._id) }
  }).select('event status');
  const invoices = await Invoice.find({
    registration: { $in: registrations.map((registration) => registration._id) }
  }).select('_id registration status paymentDate');
  const invoiceByRegistrationId = invoices.reduce((acc, invoice) => {
    acc[invoice.registration.toString()] = invoice;
    return acc;
  }, {});
  const items = registrations
    .map((registration) => {
      const event = paidEventById[registration.event.toString()];

      if (!event) {
        return null;
      }

      const amount = buildInvoiceAmount(registration, event, settings);
      const invoice = invoiceByRegistrationId[registration._id.toString()];
      const relieved = invoice?.status === 'Relieved' || invoice?.status === 'Cancelled';

      return {
        eventId: event._id,
        title: event.title || event.name || 'Event',
        date: event.date,
        datetime: event.datetime,
        registrationStatus: registration.status,
        amount: relieved ? 0 : amount,
        originalAmount: amount,
        currency: 'eur',
        paymentState: invoice?.status || 'PendingInvoice',
        ...(invoice ? { invoiceId: invoice._id, invoiceStatus: invoice.status } : {}),
        ...(invoice?.paymentDate ? { paymentDate: invoice.paymentDate } : {})
      };
    })
    .filter(Boolean);
  const estimatedTotal = items.reduce((sum, item) => sum + item.amount, 0);

  return {
    billingMonth,
    estimatedTotal,
    items
  };
};

const buildMonthlyHostPayoutSummary = async (hostId, month) => {
  const { billingMonth, start, end } = resolveBillingWindow(month);
  const settings = await getPlatformSettings();
  const paidEvents = await Event.find({
    creator: hostId,
    price: { $gt: 0 },
    status: { $ne: 'Cancelled' },
    $or: [
      { date: { $gte: start, $lt: end } },
      { datetime: { $gte: start, $lt: end } }
    ]
  }).select('_id title name price date datetime');
  const paidEventById = paidEvents.reduce((acc, event) => {
    acc[event._id.toString()] = event;
    return acc;
  }, {});
  const registrations = await Registration.find({
    status: { $in: ['Attended', 'CancelledLate'] },
    participant: { $ne: null },
    event: { $in: paidEvents.map((event) => event._id) }
  }).select('event status');
  const invoices = await Invoice.find({
    registration: { $in: registrations.map((registration) => registration._id) }
  }).select('_id registration status paymentDate');
  const invoiceByRegistrationId = invoices.reduce((acc, invoice) => {
    acc[invoice.registration.toString()] = invoice;
    return acc;
  }, {});
  const payout = await HostPayout.findOne({ host: hostId, billingMonth }).lean();
  const itemByEventId = registrations.reduce((acc, registration) => {
    const event = paidEventById[registration.event.toString()];

    if (!event) {
      return acc;
    }

    const eventId = event._id.toString();
    const amount = buildInvoiceAmount(registration, event, settings);
    const invoice = invoiceByRegistrationId[registration._id.toString()];

    if (!acc[eventId]) {
      acc[eventId] = {
        eventId: event._id,
        title: event.title || event.name || 'Event',
        date: event.date,
        datetime: event.datetime,
        attendedCount: 0,
        cancelledLateCount: 0,
        grossAmount: 0,
        platformFeeAmount: 0,
        netAmount: 0,
        currency: 'eur',
        invoiceStates: {}
      };
    }

    if (registration.status === 'CancelledLate') {
      acc[eventId].cancelledLateCount += 1;
    } else {
      acc[eventId].attendedCount += 1;
    }

    acc[eventId].grossAmount = roundMoney(acc[eventId].grossAmount + amount);
    const invoiceState = invoice?.status || 'PendingInvoice';
    acc[eventId].invoiceStates[invoiceState] = (acc[eventId].invoiceStates[invoiceState] || 0) + 1;

    return acc;
  }, {});
  const items = Object.values(itemByEventId)
    .map((item) => {
      const payoutAmounts = calculateHostPayoutAmounts(item.grossAmount);

      return {
        ...item,
        grossAmount: payoutAmounts.grossAmount,
        platformFeePercent: payoutAmounts.platformFeePercent,
        platformFeeAmount: payoutAmounts.platformFeeAmount,
        netAmount: payoutAmounts.netAmount,
        payoutState: payout?.status || 'PendingPayout'
      };
    })
    .sort((first, second) => new Date(first.datetime || first.date) - new Date(second.datetime || second.date));
  const grossTotal = roundMoney(items.reduce((sum, item) => sum + item.grossAmount, 0));
  const payoutTotals = calculateHostPayoutAmounts(grossTotal);

  return {
    billingMonth,
    platformFeePercent: HOST_PLATFORM_FEE_PERCENT,
    grossTotal: payoutTotals.grossAmount,
    platformFeeTotal: payoutTotals.platformFeeAmount,
    estimatedNetTotal: payoutTotals.netAmount,
    payoutState: payout?.status || 'PendingPayout',
    ...(payout?._id ? { payoutId: payout._id } : {}),
    ...(payout?.paidAt ? { paidAt: payout.paidAt } : {}),
    ...(payout?.lastPayoutError ? { lastPayoutError: payout.lastPayoutError } : {}),
    items
  };
};

const collectInvoicesForMonth = async (month) => {
  requireStripe();

  const { billingMonth } = resolveBillingWindow(month);
  const invoices = await Invoice.find({
    billingMonth,
    status: { $in: ['Unpaid', 'Failed'] }
  }).populate('participant', 'stripe email username');
  const results = {
    billingMonth,
    paidCount: 0,
    failedCount: 0,
    skippedCount: 0
  };

  for (const invoice of invoices) {
    const participant = invoice.participant;
    const stripeProfile = participant?.stripe;
    const customerId = stripeProfile?.customerId;
    const paymentMethodId = stripeProfile?.defaultPaymentMethod?.id;

    if (!customerId || !paymentMethodId) {
      results.skippedCount += 1;
      invoice.status = 'Failed';
      invoice.lastPaymentError = 'No active payment method';
      await invoice.save();
      continue;
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.amount * 100),
        currency: invoice.currency,
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          invoiceId: invoice._id.toString(),
          registrationId: invoice.registration.toString(),
          eventId: invoice.event.toString()
        }
      });

      invoice.status = 'Paid';
      invoice.paymentDate = new Date();
      invoice.stripePaymentIntentId = paymentIntent.id;
      invoice.lastPaymentError = null;
      await invoice.save();
      results.paidCount += 1;
    } catch (stripeError) {
      invoice.status = 'Failed';
      invoice.lastPaymentError = stripeError.message;
      await invoice.save();
      results.failedCount += 1;
    }
  }

  return results;
};

const buildHostPayoutGroups = async (billingMonth) => {
  const invoices = await Invoice.find({
    billingMonth,
    status: 'Paid',
    amount: { $gt: 0 }
  })
    .populate({
      path: 'event',
      select: 'creator title name',
      populate: { path: 'creator', select: 'username email role stripe' }
    })
    .select('amount currency event');

  return invoices.reduce((acc, invoice) => {
    const host = invoice.event?.creator;
    const hostId = host?._id?.toString?.();

    if (!hostId) {
      return acc;
    }

    if (!acc[hostId]) {
      acc[hostId] = {
        host,
        invoiceCount: 0,
        grossAmount: 0,
        currency: invoice.currency || 'eur'
      };
    }

    acc[hostId].invoiceCount += 1;
    acc[hostId].grossAmount = roundMoney(acc[hostId].grossAmount + Number(invoice.amount || 0));

    return acc;
  }, {});
};

const payHostsForMonth = async (month) => {
  const { billingMonth } = resolveBillingWindow(month);
  const payoutGroups = await buildHostPayoutGroups(billingMonth);
  const results = {
    billingMonth,
    paidCount: 0,
    failedCount: 0,
    skippedCount: 0,
    grossAmount: 0,
    platformFeeAmount: 0,
    netAmount: 0,
    platformFeePercent: HOST_PLATFORM_FEE_PERCENT
  };

  for (const [hostId, group] of Object.entries(payoutGroups)) {
    const payoutAmounts = calculateHostPayoutAmounts(group.grossAmount);
    results.grossAmount = roundMoney(results.grossAmount + payoutAmounts.grossAmount);
    results.platformFeeAmount = roundMoney(results.platformFeeAmount + payoutAmounts.platformFeeAmount);
    results.netAmount = roundMoney(results.netAmount + payoutAmounts.netAmount);

    const existingPayout = await HostPayout.findOne({ host: hostId, billingMonth });

    if (existingPayout?.status === 'Paid') {
      results.skippedCount += 1;
      continue;
    }

    const host = group.host?.stripe ? group.host : await Account.findById(hostId).select('stripe username email role');
    const payoutMethod = host?.stripe?.defaultPaymentMethod;
    const payoutMethodSnapshot = payoutMethod?.toObject?.() || payoutMethod || null;
    const payoutData = {
      host: hostId,
      billingMonth,
      invoiceCount: group.invoiceCount,
      grossAmount: payoutAmounts.grossAmount,
      platformFeePercent: payoutAmounts.platformFeePercent,
      platformFeeAmount: payoutAmounts.platformFeeAmount,
      netAmount: payoutAmounts.netAmount,
      currency: group.currency || 'eur'
    };

    if (!payoutMethod?.id) {
      await HostPayout.findOneAndUpdate(
        { host: hostId, billingMonth },
        {
          ...payoutData,
          status: 'Failed',
          paidAt: null,
          payoutMethod: null,
          lastPayoutError: 'No active host payout method'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.failedCount += 1;
      continue;
    }

    await HostPayout.findOneAndUpdate(
      { host: hostId, billingMonth },
      {
        ...payoutData,
        status: 'Paid',
        paidAt: new Date(),
        payoutMethod: payoutMethodSnapshot,
        lastPayoutError: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    results.paidCount += 1;
  }

  return results;
};

const runMonthlyBilling = async (month) => {
  const invoiceResult = await createInvoicesForMonth(month);
  const collectionResult = await collectInvoicesForMonth(invoiceResult.billingMonth);
  const payoutResult = await payHostsForMonth(invoiceResult.billingMonth);

  return {
    billingMonth: invoiceResult.billingMonth,
    invoices: invoiceResult,
    collection: collectionResult,
    payouts: payoutResult
  };
};

export {
  HOST_PLATFORM_FEE_PERCENT,
  buildMonthlyPaymentSummary,
  buildMonthlyHostPayoutSummary,
  calculateHostPayoutAmounts,
  collectInvoicesForMonth,
  createInvoicesForMonth,
  getPreviousBillingMonth,
  payHostsForMonth,
  resolveBillingWindow,
  runMonthlyBilling
};
