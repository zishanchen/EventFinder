import Account from '../models/Account.js';
import HostPayout from '../models/HostPayout.js';
import Invoice from '../models/Invoice.js';
import stripe from '../config/stripe.js';
import {
  buildMonthlyHostPayoutSummary,
  buildMonthlyPaymentSummary,
  collectInvoicesForMonth,
  createInvoicesForMonth,
  HOST_PLATFORM_FEE_PERCENT,
  payHostsForMonth
} from '../services/billingService.js';
import '../models/Host.js';
import '../models/Participant.js';

const requireStripe = () => {
  if (!stripe) {
    const error = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in src/config/appConfig.js.');
    error.statusCode = 503;
    throw error;
  }
};

const toStripeId = (value) => {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.id;
};

const isSeedStripeCustomerId = (customerId) => {
  return typeof customerId === 'string' && customerId.startsWith('cus_seed_');
};

const buildStoredDefaultPaymentMethod = (paymentMethod) => {
  const card = paymentMethod?.card;

  if (!paymentMethod?.id || !card) {
    return null;
  }

  return {
    id: paymentMethod.id,
    type: paymentMethod.type,
    card: {
      brand: card.brand,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      funding: card.funding,
      country: card.country
    },
    billingDetails: {
      name: paymentMethod.billing_details?.name || null,
      email: paymentMethod.billing_details?.email || null
    },
    setAt: new Date()
  };
};

const formatPaymentMethod = (stripeProfile) => {
  const defaultPaymentMethod = stripeProfile?.defaultPaymentMethod;
  const card = defaultPaymentMethod?.card;

  if (!defaultPaymentMethod?.id || !card?.last4) {
    return null;
  }

  return {
    type: defaultPaymentMethod.type,
    brand: card.brand,
    last4: card.last4,
    expMonth: card.expMonth,
    expYear: card.expYear,
    funding: card.funding,
    country: card.country,
    billingName: defaultPaymentMethod.billingDetails?.name,
    billingEmail: defaultPaymentMethod.billingDetails?.email,
    updatedAt: defaultPaymentMethod.setAt
  };
};

const ensureStripeCustomer = async (account) => {
  requireStripe();

  if (account.stripe?.customerId && !isSeedStripeCustomerId(account.stripe.customerId)) {
    return account.stripe.customerId;
  }

  const customer = await stripe.customers.create({
    email: account.email,
    name: account.username,
    metadata: {
      accountId: account._id.toString(),
      role: account.role
    }
  });

  account.stripe = {
    ...(account.stripe?.toObject?.() || account.stripe || {}),
    customerId: customer.id
  };
  await account.save();

  return customer.id;
};

const getPaymentProfile = async (req, res) => {
  try {
    const account = await Account.findById(req.userId).select('stripe role');

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({
      mode: account.role === 'Host' ? 'payout' : 'payment',
      platformFeePercent: account.role === 'Host' ? HOST_PLATFORM_FEE_PERCENT : 0,
      paymentMethod: formatPaymentMethod(account.stripe)
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const createSetupIntent = async (req, res) => {
  try {
    requireStripe();

    const account = await Account.findById(req.userId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const customerId = await ensureStripeCustomer(account);
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const savePaymentMethod = async (req, res) => {
  try {
    requireStripe();

    const { setupIntentId } = req.body || {};

    if (!setupIntentId) {
      return res.status(400).json({ message: 'setupIntentId is required' });
    }

    const account = await Account.findById(req.userId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ['payment_method']
    });
    const customerId = toStripeId(setupIntent.customer);
    const expectedCustomerId = account.stripe?.customerId;

    if (!expectedCustomerId || customerId !== expectedCustomerId) {
      return res.status(403).json({ message: 'This payment setup does not belong to your account' });
    }

    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment method setup has not completed successfully' });
    }

    const paymentMethod = setupIntent.payment_method;
    const card = paymentMethod?.card;

    if (!paymentMethod?.id || !card) {
      return res.status(400).json({ message: 'No card payment method found on the setup intent' });
    }

    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id
      },
      expand: ['invoice_settings.default_payment_method']
    });

    account.stripe = {
      customerId,
      defaultPaymentMethod: buildStoredDefaultPaymentMethod(
        customer.invoice_settings.default_payment_method || paymentMethod
      )
    };
    await account.save();

    res.json({
      message: account.role === 'Host' ? 'Payout method saved' : 'Payment method saved',
      mode: account.role === 'Host' ? 'payout' : 'payment',
      platformFeePercent: account.role === 'Host' ? HOST_PLATFORM_FEE_PERCENT : 0,
      paymentMethod: formatPaymentMethod(account.stripe)
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ participant: req.userId })
      .populate('event', 'title date datetime')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyHostPayouts = async (req, res) => {
  try {
    const payouts = await HostPayout.find({ host: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMonthlyPaymentSummary = async (req, res) => {
  try {
    const summary = req.userRole === 'Host'
      ? await buildMonthlyHostPayoutSummary(req.userId, req.query?.month)
      : await buildMonthlyPaymentSummary(req.userId, req.query?.month);
    res.json(summary);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const createMonthlyInvoices = async (req, res) => {
  try {
    const result = await createInvoicesForMonth(req.body?.month);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const collectMonthlyInvoices = async (req, res) => {
  try {
    const collection = await collectInvoicesForMonth(req.body?.month);
    const payouts = await payHostsForMonth(collection.billingMonth);
    res.json({
      ...collection,
      payouts
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export {
  getPaymentProfile,
  createSetupIntent,
  savePaymentMethod,
  getMyInvoices,
  getMyHostPayouts,
  getMonthlyPaymentSummary,
  createMonthlyInvoices,
  collectMonthlyInvoices
};
