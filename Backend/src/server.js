import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import boostRoutes from './routes/boostRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import boostPurchaseRoutes from './routes/boostPurchaseRoutes.js';
import { PORT } from './config/appConfig.js';
import startMonthlyBillingJob from './jobs/monthlyBillingJob.js';
import stripeWebhookController from './controllers/stripeWebhookController.js';
import startBoostLifecycleJob from './jobs/boostLifecycleJob.js';

const app = express();
const serverPort = PORT;

app.use(cors());

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookController
);

app.use(express.json({ limit: '8mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/boosts', boostRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/boost-purchases', boostPurchaseRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    const isCreateEvent = 
      req.method === 'POST' &&
      req.originalUrl.split('?')[0] === '/api/events';
      
    return res.status(413).json({
      message: isCreateEvent
        ? 'Failed to create event. Please choose an image under 5 MB.'
        : 'Request entity too large. Please choose an image under 5 MB.'
    })
  }
  next(error);
})

const startServer = async () => {
  await connectDB();

  app.listen(serverPort, () => {
    console.log(`Server running on port ${serverPort}`);
  });

  startBoostLifecycleJob();
  startMonthlyBillingJob();
};

startServer();
