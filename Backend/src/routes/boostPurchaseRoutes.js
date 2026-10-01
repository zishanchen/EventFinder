import express from 'express';
import {
    cancelBoostPurchase,
    createBoostCheckoutSession,
    getBoostPurchase,
    syncBoostPurchase
} from '../controllers/boostPurchaseController.js';
import {
    checkAuthentication,
    requireRole
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
    '/checkout-session',
    checkAuthentication,
    requireRole('Host'),
    createBoostCheckoutSession
);

router.get(
    '/:purchaseId',
    checkAuthentication,
    requireRole(['Host', 'Admin']),
    getBoostPurchase
);

router.post(
    '/:purchaseId/sync',
    checkAuthentication,
    requireRole('Host'),
    syncBoostPurchase
);

router.post(
    '/:purchaseId/cancel',
    checkAuthentication,
    requireRole('Host'),
    cancelBoostPurchase
);

export default router;
