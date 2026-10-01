import mongoose from 'mongoose';
import Rating from '../models/Rating.js';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';

const toId = (value) => value?._id?.toString?.() || value?.toString?.();
const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
const REVIEW_PHOTO_PATTERN = /^data:image\/(png|jpe?g|gif);base64,([A-Za-z0-9+/]+={0,2})$/;

const getBase64ByteLength = (value) => {
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    return (value.length * 3) / 4 - padding;
};

const normalizeReviewPhoto = (photo) => {
    if (!photo) {
        return null;
    }

    if (typeof photo !== 'string') {
        return { error: 'Review photo must be an image data URL' };
    }

    const value = photo.trim();
    const match = REVIEW_PHOTO_PATTERN.exec(value);

    if (!match) {
        return { error: 'Review photo must be a PNG, JPG, or GIF image' };
    }

    if (match[2].length % 4 !== 0) {
        return { error: 'Review photo must contain valid base64 image data' };
    }

    if (getBase64ByteLength(match[2]) > MAX_REVIEW_PHOTO_BYTES) {
        return { error: 'Review photo must be 5 MB or smaller' };
    }

    return value;
};

const buildParticipantRatingList = async (eventId, hostId) => {
    if (!mongoose.isValidObjectId(eventId)) {
        return { status: 400, message: 'Invalid event id' };
    }

    const event = await Event.findById(eventId).select('title name datetime date creator');

    if (!event) {
        return { status: 404, message: 'Event not found' };
    }

    if (toId(event.creator) !== hostId) {
        return { status: 403, message: 'You can only rate participants for your own events' };
    }

    const registrations = await Registration.find({
        event: eventId,
        status: 'Attended'
    })
        .populate('participant', 'username email profilePicture')
        .sort({ updatedAt: -1, createdAt: -1 });

    const registrationIds = registrations.map((registration) => registration._id);
    const ratings = registrationIds.length > 0
        ? await Rating.find({
            rater: hostId,
            registration: { $in: registrationIds },
            ratingType: 'participant',
            active: true
        })
        : [];

    const ratingsByRegistrationId = ratings.reduce((acc, rating) => {
        acc[rating.registration.toString()] = rating;
        return acc;
    }, {});

    return {
        event: {
            _id: event._id,
            title: event.title,
            name: event.name || event.title,
            datetime: event.datetime || event.date
        },
        participants: registrations
            .filter((registration) => registration.participant)
            .map((registration) => {
                const rating = ratingsByRegistrationId[registration._id.toString()];

                return {
                    registration: {
                        _id: registration._id,
                        status: registration.status
                    },
                    participant: {
                        _id: registration.participant._id,
                        username: registration.participant.username,
                        email: registration.participant.email,
                        profilePicture: registration.participant.profilePicture || null
                    },
                    rating: rating
                        ? {
                            _id: rating._id,
                            rating: rating.rating,
                            comment: rating.comment,
                            createdAt: rating.createdAt
                        }
                        : null,
                    hasRated: Boolean(rating)
                };
            })
    };
};

// ===== PARTICIPANT RATES HOST =====
// POST /api/ratings/rate-event
const rateEventAndHost = async (req, res) => {
    try {
        const { registrationId, eventId, hostRating, comment, photo } = req.body;
        const participantId = req.userId;

        if (!mongoose.isValidObjectId(registrationId)) {
            return res.status(400).json({ message: 'Invalid registration id' });
        }

        if (eventId && !mongoose.isValidObjectId(eventId)) {
            return res.status(400).json({ message: 'Invalid event id' });
        }

        const numericRating = Number(hostRating);

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5' });
        }

        const normalizedPhoto = normalizeReviewPhoto(photo);

        if (normalizedPhoto?.error) {
            return res.status(400).json({ message: normalizedPhoto.error });
        }

        // 1. Find and validate registration
        const registration = await Registration.findById(registrationId)
            .populate('event');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // 2. Check this registration belongs to this participant
        if (registration.participant.toString() !== participantId) {
            return res.status(403).json({ message: 'This is not your registration' });
        }

        const registrationEventId = toId(registration.event);

        if (eventId && registrationEventId !== eventId) {
            return res.status(403).json({ message: 'Registration does not belong to this event' });
        }

        // 3. Check participant attended
        if (registration.status !== 'Attended') {
            return res.status(403).json({
                message: 'You can only rate events you have attended'
            });
        }

        // 4. Get host from event
        const event = registration.event;
        const hostId = event.creator;

        // 5. Check not already rated
        const existingRating = await Rating.findOne({
            rater: participantId,
            registration: registrationId,
            ratingType: 'host'
        });

        if (existingRating) {
            existingRating.rating = numericRating;
            existingRating.comment = comment || null;
            existingRating.photo = normalizedPhoto;
            existingRating.active = true;

            await existingRating.save();

            return res.json({
                message: 'Review updated successfully!',
                hostRating: existingRating
            });
        }

        const newHostRating = await Rating.create({
            rater: participantId,
            rated: hostId,
            registration: registrationId,
            event: registrationEventId,
            participant: participantId,
            ratingType: 'host',
            rating: numericRating,
            comment: comment || null,
            photo: normalizedPhoto
        });

        res.status(201).json({
            message: 'Thank you for your feedback!',
            hostRating: newHostRating
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/ratings/rate-event/:registrationId
const deleteEventRating = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const participantId = req.userId;

        if (!mongoose.isValidObjectId(registrationId)) {
            return res.status(400).json({ message: 'Invalid registration id' });
        }

        const registration = await Registration.findById(registrationId);

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (registration.participant.toString() !== participantId) {
            return res.status(403).json({ message: 'This is not your registration' });
        }

        const existingRating = await Rating.findOne({
            rater: participantId,
            registration: registrationId,
            ratingType: 'host',
            active: true
        });

        if (!existingRating) {
            return res.status(404).json({ message: 'Review not found' });
        }

        existingRating.active = false;
        await existingRating.save();

        res.json({ message: 'Review deleted successfully!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== HOST RATES PARTICIPANT =====
// POST /api/ratings/rate-participant
const rateParticipant = async (req, res) => {
    try {
        const { registrationId, rating, comment } = req.body;
        const hostId = req.userId;

        if (!mongoose.isValidObjectId(registrationId)) {
            return res.status(400).json({ message: 'Invalid registration id' });
        }

        const numericRating = Number(rating);

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5' });
        }

        const registration = await Registration.findById(registrationId)
            .populate('event')
            .populate('participant', 'username email profilePicture');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (toId(registration.event?.creator) !== hostId) {
            return res.status(403).json({ message: 'You can only rate participants for your own events' });
        }

        if (registration.status !== 'Attended') {
            return res.status(403).json({ message: 'You can only rate participants who attended the event' });
        }

        const participantId = toId(registration.participant);

        if (!participantId) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const participantRating = await Rating.findOneAndUpdate(
            {
                rater: hostId,
                rated: participantId,
                registration: registrationId,
                ratingType: 'participant'
            },
            {
                $set: {
                    event: toId(registration.event),
                    participant: participantId,
                    rating: numericRating,
                    comment: comment || null,
                    photo: null,
                    active: true
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        res.status(201).json({
            message: 'Participant review saved successfully!',
            participantRating
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/ratings/rate-participant/:registrationId
const deleteParticipantRating = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const hostId = req.userId;

        if (!mongoose.isValidObjectId(registrationId)) {
            return res.status(400).json({ message: 'Invalid registration id' });
        }

        const registration = await Registration.findById(registrationId)
            .populate('event');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (toId(registration.event?.creator) !== hostId) {
            return res.status(403).json({ message: 'You can only delete ratings for your own events' });
        }

        const existingRating = await Rating.findOne({
            rater: hostId,
            registration: registrationId,
            ratingType: 'participant',
            active: true
        });

        if (!existingRating) {
            return res.status(404).json({ message: 'Participant rating not found' });
        }

        existingRating.active = false;
        await existingRating.save();

        res.json({ message: 'Participant review deleted successfully!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/ratings/events/:eventId/participants
const getEventParticipantsForRating = async (req, res) => {
    try {
        const result = await buildParticipantRatingList(req.params.eventId, req.userId);

        if (result.status) {
            return res.status(result.status).json({ message: result.message });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/ratings/events/:eventId/participants/default
const rateRemainingParticipantsDefault = async (req, res) => {
    try {
        const hostId = req.userId;
        const result = await buildParticipantRatingList(req.params.eventId, hostId);

        if (result.status) {
            return res.status(result.status).json({ message: result.message });
        }

        const unratedParticipants = result.participants.filter((item) => !item.hasRated);

        if (unratedParticipants.length > 0) {
            await Rating.bulkWrite(
                unratedParticipants.map((item) => ({
                    updateOne: {
                        filter: {
                            rater: hostId,
                            rated: item.participant._id,
                            registration: item.registration._id,
                            ratingType: 'participant'
                        },
                        update: {
                            $set: {
                                event: req.params.eventId,
                                participant: item.participant._id,
                                rating: 5,
                                comment: null,
                                photo: null,
                                active: true
                            }
                        },
                        upsert: true
                    }
                }))
            );
        }

        const updatedResult = await buildParticipantRatingList(req.params.eventId, hostId);

        res.status(201).json({
            message: unratedParticipants.length > 0
                ? `${unratedParticipants.length} participant rating${unratedParticipants.length === 1 ? '' : 's'} saved.`
                : 'All attended participants are already rated.',
            ratedCount: unratedParticipants.length,
            ...updatedResult
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export {
    rateEventAndHost,
    deleteEventRating,
    rateParticipant,
    deleteParticipantRating,
    getEventParticipantsForRating,
    rateRemainingParticipantsDefault
};
