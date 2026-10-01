import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from './appConfig.js';

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;

export default stripe;
