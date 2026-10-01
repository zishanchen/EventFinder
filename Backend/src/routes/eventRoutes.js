import express from 'express';
import {
  createEvent,
  updateEvent,
  getEventById,
  getEvents,
  getFeaturedEventById,
  getFeaturedEvents,
  getHostDashboardEvents,
  getHostEventRegistrations,
  getSavedEventIds,
  getSavedEvents,
  saveEvent,
  unsaveEvent,
  getMyEventRegistration,
  registerForEvent,
  deregisterFromEvent,
  removeEventParticipant,
  addReview
} from '../controllers/eventController.js';
import { checkAuthentication, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getEvents);
router.post('/', checkAuthentication, requireRole('Host'), createEvent);
router.get('/host/dashboard', checkAuthentication, requireRole('Host'), getHostDashboardEvents);
router.get('/saved/ids', checkAuthentication, getSavedEventIds);
router.get('/saved',checkAuthentication,getSavedEvents);
router.get('/featured', getFeaturedEvents);
router.get('/featured/:id', getFeaturedEventById);
router.patch('/:id', checkAuthentication, requireRole(['Host', 'Admin']), updateEvent);
router.get('/:id/registrations', checkAuthentication, requireRole(['Host', 'Admin']), getHostEventRegistrations);
router.post('/:id/registrations/:registrationId/remove', checkAuthentication, requireRole(['Host', 'Admin']), removeEventParticipant);
router.get('/:id/registration', checkAuthentication, requireRole('Participant'), getMyEventRegistration);
router.post('/:id/register', checkAuthentication, requireRole('Participant'), registerForEvent);
router.post('/:id/deregister', checkAuthentication, requireRole('Participant'), deregisterFromEvent);
router.post('/:id/save', checkAuthentication, saveEvent);
router.delete('/:id/save', checkAuthentication, unsaveEvent);
router.get('/:id', getEventById);
router.post('/:id/reviews', addReview);
 
export default router;
