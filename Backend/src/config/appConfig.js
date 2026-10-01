const NODE_ENV = 'development';
const PORT = 5001;
const FRONTEND_URL = 'http://localhost:5173';
const JWT_SECRET = 'eventfinder_secret_key';
const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://zishan:AQvGQzZI5f5Z7RUA@cluster0.jwzcu6f.mongodb.net/EventFinder?appName=Cluster0';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET =
  'whsec_replace_with_your_local_cli_secret';

const BILLING_CRON = {
  enabled: true,
  schedule: '0 3 1 * *',
  timezone: 'Europe/Berlin'
};

export {
  BILLING_CRON,
  FRONTEND_URL,
  JWT_SECRET,
  MONGO_URI,
  NODE_ENV,
  PORT,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET
};
