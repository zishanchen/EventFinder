import express from 'express';
import { getUserProfile, updateProfileAvatar } from '../controllers/profileController.js';
import { checkAuthentication, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', checkAuthentication, requireRole('Participant'), getUserProfile);
router.patch('/avatar', checkAuthentication, updateProfileAvatar);

export default router;
