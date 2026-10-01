import express from 'express';
import {
  collectMonthlyInvoices,
  createMonthlyInvoices,
  createSetupIntent,
  getMyInvoices,
  getMyHostPayouts,
  getMonthlyPaymentSummary,
  getPaymentProfile,
  savePaymentMethod
} from '../controllers/paymentController.js';
import { checkAuthentication, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile', checkAuthentication, requireRole(['Participant', 'Host']), getPaymentProfile);
router.post('/setup-intent', checkAuthentication, requireRole(['Participant', 'Host']), createSetupIntent);
router.post('/payment-method', checkAuthentication, requireRole(['Participant', 'Host']), savePaymentMethod);
router.get('/monthly-summary', checkAuthentication, requireRole(['Participant', 'Host']), getMonthlyPaymentSummary);
router.get('/invoices', checkAuthentication, requireRole('Participant'), getMyInvoices);
router.get('/host-payouts', checkAuthentication, requireRole('Host'), getMyHostPayouts);
router.post('/invoices/monthly', checkAuthentication, requireRole('Admin'), createMonthlyInvoices);
router.post('/invoices/monthly/collect', checkAuthentication, requireRole('Admin'), collectMonthlyInvoices);

export default router;
