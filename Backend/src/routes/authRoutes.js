import express from 'express';
import {
    loginUser,
    registerUser,
    getMe,
    verifyEmail,
    validateParticipantEmail,
    forgotPassword,
    resetPassword
} from '../controllers/authController.js';
import { checkAuthentication } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify-email', verifyEmail);
router.get('/validate-participant-email', validateParticipantEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', checkAuthentication, getMe);

export default router;
