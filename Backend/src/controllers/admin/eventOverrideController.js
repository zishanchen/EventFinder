import mongoose from 'mongoose';
import Event from '../../models/Event.js';
import { cancelEventWithRegistrations } from '../../services/eventCancellationService.js';

// GET /api/admin/events
export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .select('title status date datetime startTime locationName host creator capacity price')
            .populate('creator', 'username email')
            .sort({ datetime: -1, date: -1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/admin/events/:id/cancel
export const cancelEvent = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid event id' });
        }

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.status === 'Cancelled') {
            return res.status(400).json({ message: 'Event is already cancelled' });
        }
        if (event.status !== 'Planned') {
            return res.status(400).json({ message: 'Only planned events can be cancelled' });
        }

        await cancelEventWithRegistrations(event);

        res.json({ message: 'Event cancelled successfully', eventId: event._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
