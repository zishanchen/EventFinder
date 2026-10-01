import express from 'express';
import { getStats } from '../controllers/admin/statsController.js';
import { getPendingHosts, verifyHost, rejectHost } from '../controllers/admin/hostVerificationController.js';
import { getAllEvents, cancelEvent } from '../controllers/admin/eventOverrideController.js';
import { getAllUsers, deactivateUser } from '../controllers/admin/userController.js';
import { gdprDeleteUser } from '../controllers/admin/gdprController.js';
import { getAdminBills, relieveBill, restoreBill } from '../controllers/admin/billingManagementController.js';
import {
    createBoost,
    createTag,
    getAdminSettings,
    updateBoost,
    updatePlatformSettings,
    updateTag
} from '../controllers/admin/settingsManagementController.js';
import { checkAuthentication, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require a valid JWT AND the Admin role
router.use(checkAuthentication);
router.use(requireRole('Admin'));

// Platform stats
router.get('/stats', getStats);

// Host verification queue
router.get('/hosts/pending', getPendingHosts);
router.post('/hosts/:id/verify', verifyHost);
router.post('/hosts/:id/reject', rejectHost);

// Event management
router.get('/events', getAllEvents);
router.post('/events/:id/cancel', cancelEvent);

// User management
router.get('/users', getAllUsers);
router.post('/users/:id/deactivate', deactivateUser);

// GDPR
router.delete('/users/:id/gdpr-delete', gdprDeleteUser);

// Billing
router.get('/bills', getAdminBills);
router.post('/bills/:id/relieve', relieveBill);
router.post('/bills/:id/restore', restoreBill);

// Platform settings
router.get('/settings', getAdminSettings);
router.patch('/settings', updatePlatformSettings);
router.post('/settings/tags', createTag);
router.patch('/settings/tags/:id', updateTag);
router.post('/settings/boosts', createBoost);
router.patch('/settings/boosts/:id', updateBoost);

export default router;
