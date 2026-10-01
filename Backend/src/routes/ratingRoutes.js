import express from 'express';
import {
    rateEventAndHost,
    deleteEventRating,
    rateParticipant,
    deleteParticipantRating,
    getEventParticipantsForRating,
    rateRemainingParticipantsDefault
} from '../controllers/ratingController.js';
import { checkAuthentication, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Participant rates event + host — Participant only
router.post(
    '/rate-event',
    checkAuthentication,
    requireRole('Participant'),
    rateEventAndHost
);

router.delete(
    '/rate-event/:registrationId',
    checkAuthentication,
    requireRole('Participant'),
    deleteEventRating
);

// Host rates participant — Host only
router.get(
    '/events/:eventId/participants',
    checkAuthentication,
    requireRole('Host'),
    getEventParticipantsForRating
);

router.post(
    '/rate-participant',
    checkAuthentication,
    requireRole('Host'),
    rateParticipant
);

router.post(
    '/events/:eventId/participants/default',
    checkAuthentication,
    requireRole('Host'),
    rateRemainingParticipantsDefault
);

router.delete(
    '/rate-participant/:registrationId',
    checkAuthentication,
    requireRole('Host'),
    deleteParticipantRating
);

export default router;
