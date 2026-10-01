import mongoose from 'mongoose';
import Account from '../models/Account.js';
import BoostPurchase from '../models/BoostPurchase.js';
import Event from '../models/Event.js';
import EventTag from '../models/EventTag.js';
import HostPayout from '../models/HostPayout.js';
import Invoice from '../models/Invoice.js';
import Rating from '../models/Rating.js';
import Registration from '../models/Registration.js';
import Tag from '../models/Tag.js';
import { cancelEventWithRegistrations } from '../services/eventCancellationService.js';
import { HOST_PLATFORM_FEE_PERCENT } from '../services/billingService.js';
import { getLateCancellationWindowMs, getPlatformSettings } from '../services/platformSettingsService.js';
import { calculateAverageRating } from '../utils/rating.js';
import { tagDto } from '../utils/tagColors.js';
import { isBoostEffectiveAt } from '../services/boostTimeService.js';

const EVENT_FORMATS = ['Online', 'Onsite'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOCKED_EVENT_UPDATE_FIELDS = ['date', 'datetime', 'startTime', 'endTime', 'price'];
const ACTIVE_REGISTRATION_STATUSES = ['Registered', 'Attended'];
const HOST_REMOVABLE_REGISTRATION_STATUSES = ['Registered'];
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MIN_LENGTH = 20;
const DESCRIPTION_MAX_LENGTH = 2000;
const LOCATION_MIN_LENGTH = 3;
const MAX_CAPACITY = 10000;
const MAX_PRICE = 10000;
const ACCEPTED_IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp);base64,/i;

const readString = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const parseQueryList = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  const values = Array.isArray(value) ? value : String(value).split(',');

  return values
    .map((item) => readString(item))
    .filter(Boolean);
};

const buildInitials = (name) => {
  const initial = String(name || '')
    .trim()
    .split(/\s+/)
    .find(Boolean)?.[0]
    ?.toUpperCase();

  return initial || 'H';
};

const parseRequiredDate = (value, fieldName, errors, { dateOnly = false } = {}) => {
  if (!value) {
    errors.push(`${fieldName} is required`);
    return null;
  }

  if (dateOnly && typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${fieldName} must use YYYY-MM-DD format`);
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${fieldName} must be a valid date`);
    return null;
  }

  if (dateOnly && typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number);

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      errors.push(`${fieldName} must be a valid date`);
      return null;
    }
  }

  return date;
};

const parseRequiredNumber = (value, fieldName, errors, { integer = false, min = 0 } = {}) => {
  if (value === undefined || value === null || value === '') {
    errors.push(`${fieldName} is required`);
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    errors.push(`${fieldName} must be a number`);
    return null;
  }

  if (integer && !Number.isInteger(number)) {
    errors.push(`${fieldName} must be a whole number`);
  }

  if (number < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }

  return number;
};

const validateTextLength = (value, fieldName, errors, { min, max }) => {
  if (value.length < min) {
    errors.push(`${fieldName} must be at least ${min} characters`);
  }

  if (value.length > max) {
    errors.push(`${fieldName} must be ${max} characters or fewer`);
  }
};

const validateLocationCoordinates = (location, errors) => {
  const hasLatitude = location.latitude !== undefined && location.latitude !== null && location.latitude !== '';
  const hasLongitude = location.longitude !== undefined && location.longitude !== null && location.longitude !== '';

  if (hasLatitude !== hasLongitude) {
    errors.push('location latitude and longitude must be provided together');
    return;
  }

  if (!hasLatitude && !hasLongitude) {
    return;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push('location.latitude must be a number between -90 and 90');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push('location.longitude must be a number between -180 and 180');
  }
};

const validateImageUrl = (imageUrl, errors) => {
  if (!imageUrl) {
    errors.push('imageUrl is required');
    return;
  }

  if (imageUrl.startsWith('data:image/') && !ACCEPTED_IMAGE_DATA_URL_PATTERN.test(imageUrl)) {
    errors.push('imageUrl must be a PNG, JPEG, or WebP image');
  }
};

const buildDateTime = (date, startTime) => {
  if (!date || !TIME_PATTERN.test(startTime)) {
    return undefined;
  }

  const [hours, minutes] = startTime.split(':').map(Number);
  const datetime = new Date(date);
  datetime.setHours(hours, minutes, 0, 0);
  return datetime;
};

const getEventStartDate = (event) => {
  const startValue = event?.datetime || event?.date;
  const startDate = startValue ? new Date(startValue) : null;

  return startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
};

const hasEventStarted = (event, referenceDate = new Date()) => {
  const startDate = getEventStartDate(event);

  return Boolean(startDate && startDate <= referenceDate);
};

const buildBillingMonth = (date) => {
  const value = new Date(date);
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${value.getFullYear()}-${month}`;
};

const calculateLateCancellationFee = (price, feePercent) => {
  return Number(price || 0) * (Number(feePercent ?? 50) / 100);
};

const isLatePaidCancellation = async (event, referenceDate = new Date()) => {
  const startDate = getEventStartDate(event);
  const price = Number(event?.price) || 0;

  if (!startDate || price <= 0 || startDate <= referenceDate) {
    return false;
  }

  const lateCancellationWindowMs = await getLateCancellationWindowMs();
  return startDate.getTime() - referenceDate.getTime() <= lateCancellationWindowMs;
};

const normalizeTagNames = (tags, errors) => {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    errors.push('tags must be an array of tag names');
    return [];
  }

  const normalized = [];
  const seen = new Set();

  tags.forEach((tag, index) => {
    const name = typeof tag === 'string' ? readString(tag) : readString(tag?.name);

    if (!name) {
      errors.push(`tags[${index}] must be a non-empty tag name`);
      return;
    }

    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(name);
    }
  });

  return normalized;
};

const resolveExistingTags = async (tagNames) => {
  if (tagNames.length === 0) {
    return { tags: [], missingTagNames: [] };
  }

  const tags = await Tag.find({
    $or: tagNames.map((name) => ({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
    })),
    active: { $ne: false },
    deletedAt: null
  });
  const tagsByName = tags.reduce((acc, tag) => {
    acc[tag.name.toLowerCase()] = tag;
    return acc;
  }, {});
  const missingTagNames = tagNames.filter((name) => !tagsByName[name.toLowerCase()]);

  return {
    tags: tagNames.map((name) => tagsByName[name.toLowerCase()]).filter(Boolean),
    missingTagNames
  };
};

const getDocumentId = (value) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const attachComputedEventData = async (events, { includeAttendees = false } = {}) => {
  const eventList = Array.isArray(events) ? events : [events];
  const eventIds = eventList.map((event) => event._id);
  const eventTags = await EventTag.find({
    event: { $in: eventIds },
    active: true
  }).populate('tag', 'name colors');
  const registrations = await Registration.find({
    event: { $in: eventIds },
    status: { $in: ACTIVE_REGISTRATION_STATUSES }
  }).populate('participant', 'username profilePicture');
  const registrationIds = registrations.map((registration) => registration._id);
  const ratings = registrationIds.length > 0
    ? await Rating.find({
      registration: { $in: registrationIds },
      ratingType: 'host',
      active: true
    })
      .populate('rater', 'username')
      .populate('registration', 'event createdAt')
      .sort({ createdAt: -1 })
    : [];
  const participantRatings = registrationIds.length > 0
    ? await Rating.find({
      registration: { $in: registrationIds },
      ratingType: 'participant',
      active: true
    }).select('event registration')
    : [];
  const creatorIds = [
    ...new Set(
      eventList
        .map((event) => getDocumentId(event.creator))
        .filter(Boolean)
    )
  ];
  const hostRatings = creatorIds.length > 0
    ? await Rating.find({
      rated: { $in: creatorIds },
      ratingType: 'host',
      active: true
    })
      .populate('rater', 'username profilePicture')
      .sort({ createdAt: -1 })
    : [];
  const hostedEventCounts = creatorIds.length > 0
    ? await Event.aggregate([
      { $match: { creator: { $in: creatorIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: '$creator', count: { $sum: 1 } } }
    ])
    : [];
  const creators = creatorIds.length > 0
    ? await Account.find({ _id: { $in: creatorIds } })
      .select('username verified description profilePicture')
    : [];

  const tagDetailsByEventId = eventTags.reduce((acc, eventTag) => {
    if (!eventTag.tag) {
      return acc;
    }

    const eventId = eventTag.event.toString();
    if (!acc[eventId]) {
      acc[eventId] = [];
    }

    acc[eventId].push(tagDto(eventTag.tag));
    return acc;
  }, {});
  const registrationsByEventId = registrations.reduce((acc, registration) => {
    const eventId = registration.event.toString();
    if (!acc[eventId]) {
      acc[eventId] = [];
    }

    acc[eventId].push(registration);
    return acc;
  }, {});
  const attendedRegistrationsByEventId = registrations.reduce((acc, registration) => {
    if (registration.status !== 'Attended') {
      return acc;
    }

    const eventId = registration.event.toString();
    acc[eventId] = (acc[eventId] || 0) + 1;
    return acc;
  }, {});
  const participantRatingRegistrationIdsByEventId = participantRatings.reduce((acc, rating) => {
    const eventId = getDocumentId(rating.event);
    const registrationId = getDocumentId(rating.registration);

    if (!eventId || !registrationId) {
      return acc;
    }

    if (!acc[eventId]) {
      acc[eventId] = new Set();
    }

    acc[eventId].add(registrationId);
    return acc;
  }, {});
  const ratingsByEventId = ratings.reduce((acc, rating) => {
    if (!rating.registration?.event) {
      return acc;
    }

    const eventId = rating.registration.event.toString();
    if (!acc[eventId]) {
      acc[eventId] = [];
    }

    acc[eventId].push(rating);
    return acc;
  }, {});
  const hostRatingsByAccountId = hostRatings.reduce((acc, rating) => {
    const accountId = rating.rated.toString();
    if (!acc[accountId]) {
      acc[accountId] = [];
    }

    acc[accountId].push(rating);
    return acc;
  }, {});
  const hostedEventCountByAccountId = hostedEventCounts.reduce((acc, item) => {
    acc[item._id.toString()] = item.count;
    return acc;
  }, {});
  const creatorByAccountId = creators.reduce((acc, creator) => {
    acc[creator._id.toString()] = creator;
    return acc;
  }, {});

  const now = new Date();

  const result = eventList.map((event) => {
    const eventObject = event.toObject ? event.toObject() : event;
    const { category: _category, ...eventResponse } = eventObject;
    const eventId = eventObject._id.toString();
    const eventHostRatings = ratingsByEventId[eventId] || [];
    const creatorId = getDocumentId(eventObject.creator);
    const hostRatingList = creatorId ? hostRatingsByAccountId[creatorId] || [] : [];
    const hostAverageRating = calculateAverageRating(hostRatingList);
    const creator = creatorId ? creatorByAccountId[creatorId] : null;
    const hostName = creator?.username || eventObject.host?.name || 'Event host';
    const latestRatings = hostRatingList
      .filter((rating) => rating.comment)
      .slice(0, 5)
      .map((rating) => ({
        _id: rating._id,
        userName: rating.rater?.username || 'EventFinder member',
        profilePicture: rating.rater?.profilePicture || null,
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.createdAt
      }));

    return {
      ...eventResponse,
      isBoostedNow: isBoostEffectiveAt(eventObject.boost, now),
      attendeesCount: registrationsByEventId[eventId]?.length || 0,
      ...(includeAttendees && {
        attendees: (registrationsByEventId[eventId] || [])
          .filter((registration) => registration.participant)
          .map((registration) => ({
            id: registration.participant._id,
            username: registration.participant.username,
            profilePicture: registration.participant.profilePicture || null
          }))
      }),
      attendedParticipantsCount: attendedRegistrationsByEventId[eventId] || 0,
      unratedParticipantsCount: Math.max(
        0,
        (attendedRegistrationsByEventId[eventId] || 0) -
        (participantRatingRegistrationIdsByEventId[eventId]?.size || 0)
      ),
      rating: hostAverageRating,
      totalRatings: hostRatingList.length,
      eventRatingAverage: calculateAverageRating(eventHostRatings),
      eventRatingCount: eventHostRatings.length,
      reviews: eventHostRatings
        .filter((rating) => rating.comment)
        .map((rating) => ({
          _id: rating._id,
          raterId: rating.rater?._id,
          userName: rating.rater?.username || 'EventFinder member',
          rating: rating.rating,
          comment: rating.comment,
          photo: rating.photo || null,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt
        })),
      isFeatured: hostAverageRating >= 4.5 && hostRatingList.length >= 3,
      host: {
        ...eventObject.host,
        name: hostName,
        initials: buildInitials(hostName),
        verified: Boolean(creator?.verified ?? eventObject.host?.verified),
        description: creator?.description || null,
        profilePicture: creator?.profilePicture || null,
        rating: hostAverageRating,
        eventsHosted: creatorId ? hostedEventCountByAccountId[creatorId] || 0 : 0,
        latestRatings
      },
      tagDetails: tagDetailsByEventId[eventId] || [],
      tags: (tagDetailsByEventId[eventId] || []).map((tag) => tag.name)
    };
  });

  return Array.isArray(events) ? result : result[0];
};

const createEvent = async (req, res) => {
  try {
    const errors = [];
    const body = req.body || {};
    const {
      description,
      format = 'Onsite',
      status = 'Planned'
    } = body;
    const location = body.location && typeof body.location === 'object' ? body.location : {};

    const title = readString(body.title) || readString(body.name);
    const name = readString(body.name) || title;
    const startTime = readString(body.startTime);
    const endTime = readString(body.endTime);
    const locationName = readString(body.locationName) || readString(location.venueName);
    const address = readString(body.address) || readString(location.address);
    const imageUrl = readString(body.imageUrl) || readString(body.image);
    const eventFormat = readString(format) || 'Onsite';
    const eventStatus = readString(status) || 'Planned';
    const tagNames = normalizeTagNames(body.tags, errors);

    if (!title) {
      errors.push('title is required');
    } else {
      validateTextLength(title, 'title', errors, {
        min: TITLE_MIN_LENGTH,
        max: TITLE_MAX_LENGTH
      });
    }

    const normalizedDescription = readString(description);

    if (!normalizedDescription) {
      errors.push('description is required');
    } else {
      validateTextLength(normalizedDescription, 'description', errors, {
        min: DESCRIPTION_MIN_LENGTH,
        max: DESCRIPTION_MAX_LENGTH
      });
    }

    if (tagNames.length === 0) {
      errors.push('at least one tag is required');
    }

    if (!TIME_PATTERN.test(startTime)) {
      errors.push('startTime must use HH:mm format');
    }

    if (!TIME_PATTERN.test(endTime)) {
      errors.push('endTime must use HH:mm format');
    }

    if (TIME_PATTERN.test(startTime) && TIME_PATTERN.test(endTime)) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      if (endTotalMinutes <= startTotalMinutes) {
        errors.push('endTime must be after startTime');
      }
    }

    if (!locationName) {
      errors.push('locationName is required');
    } else {
      validateTextLength(locationName, 'locationName', errors, {
        min: LOCATION_MIN_LENGTH,
        max: TITLE_MAX_LENGTH
      });
    }

    if (!address) {
      errors.push('address is required');
    }

    validateImageUrl(imageUrl, errors);
    validateLocationCoordinates(location, errors);

    if (!EVENT_FORMATS.includes(eventFormat)) {
      errors.push(`format must be one of: ${EVENT_FORMATS.join(', ')}`);
    }

    if (eventStatus !== 'Planned') {
      errors.push('status must be Planned when creating an event');
    }

    const date = parseRequiredDate(body.date || body.datetime, 'date', errors, { dateOnly: Boolean(body.date) });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (date && date < today) {
      errors.push('date cannot be in the past');
    }
    const explicitDateTime = body.datetime
      ? parseRequiredDate(body.datetime, 'datetime', errors)
      : null;
    const eventStartDateTime = explicitDateTime || buildDateTime(date, startTime);
    if (eventStartDateTime && eventStartDateTime <= new Date()) {
      errors.push('date and startTime must be in the future');
    }

    const price = parseRequiredNumber(body.price, 'price', errors, { min: 0 });
    if (price !== null && price > MAX_PRICE) {
      errors.push(`price must be at most ${MAX_PRICE}`);
    }

    const capacity = parseRequiredNumber(body.capacity, 'capacity', errors, {
      integer: true,
      min: 1
    });
    if (capacity !== null && capacity > MAX_CAPACITY) {
      errors.push(`capacity must be at most ${MAX_CAPACITY}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Invalid event data',
        errors
      });
    }

    const { tags, missingTagNames } = await resolveExistingTags(tagNames);

    if (missingTagNames.length > 0) {
      return res.status(400).json({
        message: 'Invalid event data',
        errors: missingTagNames.map((name) => `Unknown tag: ${name}`)
      });
    }

    const hostAccount = await Account.findById(req.userId).select('username verified stripe');
    if (!hostAccount) {
      return res.status(404).json({ message: 'Host account not found' });
    }

    if (price > 0 && !hostAccount.stripe?.defaultPaymentMethod?.id) {
      return res.status(402).json({
        code: 'PAYOUT_METHOD_REQUIRED',
        message: 'Add a payout method in your dashboard before creating paid events'
      });
    }

    const event = await Event.create({
      title,
      name,
      description: normalizedDescription,
      descriptions: [{ description: normalizedDescription }],
      category: tags[0].name,
      date,
      datetime: eventStartDateTime,
      startTime,
      endTime,
      locationName,
      address,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        venueName: locationName,
        address
      },
      format: eventFormat,
      status: eventStatus,
      price,
      capacity,
      memberLimits: [{ limit: capacity }],
      imageUrl,
      image: imageUrl,
      host: {
        name: hostAccount.username,
        initials: buildInitials(hostAccount.username),
        verified: Boolean(hostAccount.verified)
      },
      creator: req.userId
    });

    if (tags.length > 0) {
      await EventTag.insertMany(
        tags.map((tag) => ({
          event: event._id,
          tag: tag._id
        })),
        { ordered: false }
      );
    }

    const eventWithTags = await attachComputedEventData(event);
    res.status(201).json(eventWithTags);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const body = req.body || {};
    const lockedUpdates = LOCKED_EVENT_UPDATE_FIELDS.filter((field) =>
      Object.prototype.hasOwnProperty.call(body, field)
    );

    if (lockedUpdates.length > 0) {
      return res.status(400).json({
        message: 'Invalid event data',
        errors: lockedUpdates.map((field) => `${field} cannot be changed after event creation`)
      });
    }

    const eventQuery = { _id: eventId };

    if (req.userRole !== 'Admin') {
      eventQuery.creator = req.userId;
    }

    const event = await Event.findOne(eventQuery);

    if (!event) {
      return res.status(404).json({ message: 'Event not found or not editable by this account' });
    }

    if (hasEventStarted(event)) {
      return res.status(409).json({ message: 'Past events cannot be edited' });
    }

    if (event.status === 'Cancelled') {
      return res.status(409).json({ message: 'Cancelled events cannot be edited' });
    }

    const errors = [];
    const location = body.location && typeof body.location === 'object' ? body.location : {};
    const title = Object.prototype.hasOwnProperty.call(body, 'title')
      ? readString(body.title)
      : undefined;
    const name = Object.prototype.hasOwnProperty.call(body, 'name')
      ? readString(body.name)
      : undefined;
    const description = Object.prototype.hasOwnProperty.call(body, 'description')
      ? readString(body.description)
      : undefined;
    const locationName = Object.prototype.hasOwnProperty.call(body, 'locationName') || location.venueName !== undefined
      ? readString(body.locationName) || readString(location.venueName)
      : undefined;
    const address = Object.prototype.hasOwnProperty.call(body, 'address') || location.address !== undefined
      ? readString(body.address) || readString(location.address)
      : undefined;
    const imageUrl = Object.prototype.hasOwnProperty.call(body, 'imageUrl') || Object.prototype.hasOwnProperty.call(body, 'image')
      ? readString(body.imageUrl) || readString(body.image)
      : undefined;
    const eventFormat = Object.prototype.hasOwnProperty.call(body, 'format')
      ? readString(body.format)
      : undefined;
    const eventStatus = Object.prototype.hasOwnProperty.call(body, 'status')
      ? readString(body.status)
      : undefined;
    const capacity = Object.prototype.hasOwnProperty.call(body, 'capacity')
      ? parseRequiredNumber(body.capacity, 'capacity', errors, { integer: true, min: 1 })
      : undefined;
    const tagNames = Object.prototype.hasOwnProperty.call(body, 'tags')
      ? normalizeTagNames(body.tags, errors)
      : undefined;

    if (title !== undefined && !title) {
      errors.push('title is required');
    } else if (title !== undefined) {
      validateTextLength(title, 'title', errors, {
        min: TITLE_MIN_LENGTH,
        max: TITLE_MAX_LENGTH
      });
    }

    if (description !== undefined && !description) {
      errors.push('description is required');
    } else if (description !== undefined) {
      validateTextLength(description, 'description', errors, {
        min: DESCRIPTION_MIN_LENGTH,
        max: DESCRIPTION_MAX_LENGTH
      });
    }

    if (tagNames !== undefined && tagNames.length === 0) {
      errors.push('at least one tag is required');
    }

    if (locationName !== undefined && !locationName) {
      errors.push('locationName is required');
    } else if (locationName !== undefined) {
      validateTextLength(locationName, 'locationName', errors, {
        min: LOCATION_MIN_LENGTH,
        max: TITLE_MAX_LENGTH
      });
    }

    if (address !== undefined && !address) {
      errors.push('address is required');
    }

    if (imageUrl !== undefined && !imageUrl) {
      errors.push('imageUrl is required');
    } else if (imageUrl !== undefined) {
      validateImageUrl(imageUrl, errors);
    }

    validateLocationCoordinates(location, errors);

    if (eventFormat !== undefined && !EVENT_FORMATS.includes(eventFormat)) {
      errors.push(`format must be one of: ${EVENT_FORMATS.join(', ')}`);
    }

    if (eventStatus !== undefined && eventStatus !== 'Cancelled') {
      errors.push('status can only be set to Cancelled through event editing');
    }

    if (capacity !== undefined) {
      if (capacity > MAX_CAPACITY) {
        errors.push(`capacity must be at most ${MAX_CAPACITY}`);
      }

      const activeRegistrationCount = await Registration.countDocuments({
        event: event._id,
        status: { $in: ACTIVE_REGISTRATION_STATUSES }
      });

      if (capacity < activeRegistrationCount) {
        errors.push(`capacity cannot be lower than the current active registration count (${activeRegistrationCount})`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Invalid event data',
        errors
      });
    }

    let tags = [];
    if (tagNames !== undefined) {
      const tagResult = await resolveExistingTags(tagNames);
      tags = tagResult.tags;

      if (tagResult.missingTagNames.length > 0) {
        return res.status(400).json({
          message: 'Invalid event data',
          errors: tagResult.missingTagNames.map((tagName) => `Unknown tag: ${tagName}`)
        });
      }
    }

    if (title !== undefined) {
      event.title = title;
      event.name = name || title;
    } else if (name !== undefined) {
      event.name = name;
    }

    if (description !== undefined) {
      event.description = description;
      if (event.descriptions.at(-1)?.description !== description) {
        event.descriptions.push({ description });
      }
    }

    if (locationName !== undefined) {
      event.locationName = locationName;
    }

    if (address !== undefined) {
      event.address = address;
    }

    if (locationName !== undefined || address !== undefined || body.location) {
      const hasLocationLatitude = Object.prototype.hasOwnProperty.call(location, 'latitude');
      const hasLocationLongitude = Object.prototype.hasOwnProperty.call(location, 'longitude');

      event.location = {
        latitude: hasLocationLatitude ? location.latitude : event.location?.latitude,
        longitude: hasLocationLongitude ? location.longitude : event.location?.longitude,
        venueName: locationName ?? event.locationName,
        address: address ?? event.address
      };
    }

    if (eventFormat !== undefined) {
      event.format = eventFormat;
    }

    if (eventStatus !== undefined) {
      event.status = eventStatus;
    }

    if (capacity !== undefined) {
      if (event.capacity !== capacity) {
        event.memberLimits.push({ limit: capacity });
      }
      event.capacity = capacity;
    }

    if (imageUrl !== undefined) {
      event.imageUrl = imageUrl;
      event.image = imageUrl;
    }

    if (tagNames !== undefined) {
      event.category = tags[0].name;
    }

    if (eventStatus === 'Cancelled') {
      await cancelEventWithRegistrations(event);
    } else {
      await event.save();
    }

    if (tagNames !== undefined) {
      await EventTag.updateMany({ event: event._id }, { active: false });

      if (tags.length > 0) {
        await EventTag.bulkWrite(
          tags.map((tag) => ({
            updateOne: {
              filter: { event: event._id, tag: tag._id },
              update: { $set: { active: true } },
              upsert: true
            }
          }))
        );
      }
    }

    res.json(await attachComputedEventData(event, { includeAttendees: true }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEvents = async (req, res) => {
  try {
    const { search, date, price, maxPrice, format, status, eventType } = req.query;
    const query = {};
    const now = new Date();
    const selectedDates = parseQueryList(date);
    const selectedPrices = parseQueryList(price);

    query.$and = [
      {
        $or: [
          { datetime: { $gte: now } },
          { datetime: { $exists: false }, date: { $gte: now } }
        ]
      }
    ];

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'Cancelled' };
    }

    if (search) {

      const escapedSearch = escapeRegex(search.trim());
      const searchRegex = { $regex: `\\b${escapedSearch}`, $options: 'i' };

      query.$and.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { 'descriptions.description': searchRegex },
        ]
      });
    }

    if (selectedDates.length > 0) {
      const dateFilters = [];

      if (selectedDates.includes('Today')) {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        dateFilters.push({
          $or: [
            { date: { $gte: now, $lte: endOfDay } },
            { datetime: { $gte: now, $lte: endOfDay } }
          ]
        });
      }

      if (selectedDates.includes('This Week')) {
        const endOfWeek = new Date();
        endOfWeek.setDate(now.getDate() + 7);
        dateFilters.push({
          $or: [
            { date: { $gte: now, $lte: endOfWeek } },
            { datetime: { $gte: now, $lte: endOfWeek } }
          ]
        });
      }

      if (selectedDates.includes('This Month')) {
        const endOfMonth = new Date(now);
        endOfMonth.setMonth(now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        dateFilters.push({
          $or: [
            { date: { $gte: now, $lte: endOfMonth } },
            { datetime: { $gte: now, $lte: endOfMonth } }
          ]
        });
      }

      if (dateFilters.length > 0) {
        query.$and.push({ $or: dateFilters });
      }
    }

    const parsedMaxPrice = maxPrice !== undefined && maxPrice !== null && maxPrice !== ''
      ? Number(maxPrice)
      : null;

    if (Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0) {
      query.price = { $gte: 0, $lte: parsedMaxPrice };
    } else if (selectedPrices.length > 0 && !selectedPrices.includes('Any Price')) {
      const priceFilters = [];

      if (selectedPrices.includes('Free')) {
        priceFilters.push({ price: 0 });
      }

      if (selectedPrices.includes('Under €10') || selectedPrices.includes('< €10')) {
        priceFilters.push({ price: { $gte: 0, $lte: 10 } });
      }

      if (selectedPrices.includes('Under €20') || selectedPrices.includes('< €20')) {
        priceFilters.push({ price: { $gte: 0, $lte: 20 } });
      }

      if (priceFilters.length === 1) {
        Object.assign(query, priceFilters[0]);
      } else if (priceFilters.length > 1) {
        query.$and.push({ $or: priceFilters });
      }
    }

    if (format) {
      query.format = format;
    }

    if (eventType) {
      const selectedTags = parseQueryList(eventType);
      const { tags } = await resolveExistingTags(selectedTags);

      const eventTags = await EventTag.find({
        tag: { $in: tags.map((tag) => tag._id) },
        active: true
      });

      query._id = {
        $in: eventTags.map((eventTag) => eventTag.event)
      };

    }

    const events = await Event.find(query)
      .populate('creator', 'username')
      .sort({ datetime: 1, date: 1, createdAt: -1 });

    const result = await attachComputedEventData(events);

    result.sort((a, b) => {
      const boostOrder =
        Number(b.isBoostedNow) - Number(a.isBoostedNow);

      if (boostOrder !== 0) return boostOrder;

      const aStart = new Date(a.datetime || a.date).getTime();
      const bStart = new Date(b.datetime || b.date).getTime();

      return (
        aStart - bStart ||
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getHostDashboardEvents = async (req, res) => {
  try {
    const host = await Account.findById(req.userId)
      .select('username email profilePicture verified description createdAt');
    const events = await Event.find({
      creator: req.userId,
      status: { $ne: 'Cancelled' }
    })
      .populate('creator', 'username')
      .sort({ datetime: -1, date: -1, createdAt: -1 });
    const dashboardEvents = await attachComputedEventData(events);
    const activeBoostPurchases = dashboardEvents.length > 0
      ? await BoostPurchase.find({
        event: { $in: dashboardEvents.map((event) => event._id) },
        reservationActive: true
      }).select('event paymentStatus')
      : [];
    const activeBoostPurchaseByEventId = activeBoostPurchases.reduce(
      (acc, purchase) => {
        acc[purchase.event.toString()] = purchase;
        return acc;
      },
      {}
    );
    const dashboardEventsWithBoostAvailability = dashboardEvents.map((event) => {
      const activePurchase = activeBoostPurchaseByEventId[event._id.toString()];

      return {
        ...event,
        boostPurchaseStatus: activePurchase?.paymentStatus || null,
        canPurchaseBoost: !activePurchase
      };
    });
    const now = new Date();
    const ratingSummary = dashboardEvents.reduce((acc, event) => {
      const count = Number(event.eventRatingCount) || 0;
      const average = Number(event.eventRatingAverage);

      if (!count || !Number.isFinite(average)) {
        return acc;
      }

      acc.count += count;
      acc.sum += average * count;
      return acc;
    }, { count: 0, sum: 0 });
    const completedEvents = dashboardEvents.filter((event) => {
      const eventDate = new Date(event.datetime || event.date);
      return event.status === 'Happened' || (!Number.isNaN(eventDate.getTime()) && eventDate <= now);
    });
    const currentBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const hostPayouts = await HostPayout.find({ host: req.userId }).lean();
    const sumPayouts = (predicate, field) => {
      return Number(hostPayouts.reduce((sum, payout) => {
        return predicate(payout) ? sum + (Number(payout[field]) || 0) : sum;
      }, 0).toFixed(2));
    };
    const isPreviousPayout = (payout) => String(payout.billingMonth || '') < currentBillingMonth;
    const isCurrentPayout = (payout) => payout.billingMonth === currentBillingMonth;
    const previousMonthsRevenue = sumPayouts(isPreviousPayout, 'netAmount');
    const currentMonthPastRevenue = sumPayouts(isCurrentPayout, 'netAmount');
    const previousMonthsPlatformFee = sumPayouts(isPreviousPayout, 'platformFeeAmount');
    const currentMonthPlatformFee = sumPayouts(isCurrentPayout, 'platformFeeAmount');
    const allTimeBookedRevenue = sumPayouts(() => true, 'netAmount');
    const allTimeBookedPlatformFee = sumPayouts(() => true, 'platformFeeAmount');

    res.json({
      host: {
        id: host?._id || req.userId,
        username: host?.username || 'Host',
        email: host?.email || null,
        profilePicture: host?.profilePicture || null,
        initials: buildInitials(host?.username || 'Host'),
        verified: Boolean(host?.verified),
        description: host?.description || null,
        createdAt: host?.createdAt || null
      },
      stats: {
        totalEvents: dashboardEvents.length,
        plannedEvents: dashboardEvents.filter((event) => event.status === 'Planned').length,
        completedEvents: completedEvents.length,
        registeredParticipants: dashboardEvents.reduce(
          (sum, event) => sum + (Number(event.attendeesCount) || 0),
          0
        ),
        attendedParticipants: dashboardEvents.reduce(
          (sum, event) => sum + (Number(event.attendedParticipantsCount) || 0),
          0
        ),
        previousMonthsRevenue,
        currentMonthPastRevenue,
        allTimeBookedRevenue,
        totalRevenue: previousMonthsRevenue + currentMonthPastRevenue,
        hostPlatformFeePercent: HOST_PLATFORM_FEE_PERCENT,
        previousMonthsPlatformFee,
        currentMonthPlatformFee,
        allTimeBookedPlatformFee,
        ratingCount: ratingSummary.count,
        averageRating: ratingSummary.count
          ? Math.round((ratingSummary.sum / ratingSummary.count) * 10) / 10
          : null,
        unratedParticipants: dashboardEvents.reduce(
          (sum, event) => sum + (Number(event.unratedParticipantsCount) || 0),
          0
        )
      },
      events: dashboardEventsWithBoostAvailability
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const event = await Event.findById(eventId).populate(
      'creator',
      'username email profilePicture'
    );

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(await attachComputedEventData(event, { includeAttendees: true }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSavedEventIds = async (req, res) => {
  try {
    const account = await Account.findById(req.userId).select('savedEvents');

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({
      savedEventIds: (account.savedEvents || []).map((eventId) => eventId.toString())
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const event = await Event.findById(eventId).select('_id');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const account = await Account.findByIdAndUpdate(
      req.userId,
      { $addToSet: { savedEvents: event._id } },
      { new: true }
    ).select('savedEvents');

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.status(201).json({ message: 'Event saved.', saved: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unsaveEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const account = await Account.findByIdAndUpdate(
      req.userId,
      { $pull: { savedEvents: eventId } },
      { new: true }
    ).select('savedEvents');

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'Event removed from saved events.', saved: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSavedEvents = async (req, res) => {
  try {
    const account = await Account.findById(req.userId)
      .populate("savedEvents");
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.json({
      savedEvents: account.savedEvents || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const attachParticipantRatingsToRegistrations = async (registrations = []) => {
  const participantIds = registrations
    .map((registration) => registration.participant?._id || registration.participant)
    .filter(Boolean);
  const uniqueParticipantIds = [...new Set(
    participantIds
      .filter(Boolean)
      .map((participantId) => participantId.toString())
  )];

  if (uniqueParticipantIds.length === 0) {
    return registrations.map((registration) => (
      typeof registration.toObject === 'function' ? registration.toObject() : registration
    ));
  }

  const participantRatings = await Rating.find({
    rated: { $in: uniqueParticipantIds },
    ratingType: 'participant',
    active: true
  }).select('rated rating');

  const groupedRatingsByParticipantId = participantRatings.reduce((acc, rating) => {
    const participantId = rating.rated.toString();

    if (!acc.has(participantId)) {
      acc.set(participantId, []);
    }

    acc.get(participantId).push(rating);
    return acc;
  }, new Map());

  const ratingsByParticipantId = uniqueParticipantIds.reduce((acc, participantId) => {
    const ratings = groupedRatingsByParticipantId.get(participantId) || [];

    acc.set(participantId, {
      average: calculateAverageRating(ratings),
      total: ratings.length
    });

    return acc;
  }, new Map());

  return registrations.map((registration) => {
    const registrationObject = typeof registration.toObject === 'function'
      ? registration.toObject()
      : registration;
    const participantId = registrationObject.participant?._id?.toString();

    if (!participantId || !registrationObject.participant) {
      return registrationObject;
    }

    return {
      ...registrationObject,
      participant: {
        ...registrationObject.participant,
        rating: ratingsByParticipantId.get(participantId) || {
          average: calculateAverageRating([]),
          total: 0
        }
      }
    };
  });
};



const getHostEventRegistrations = async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const eventQuery = { _id: eventId };

    if (req.userRole !== 'Admin') {
      eventQuery.creator = req.userId;
    }

    const event = await Event.findOne(eventQuery).select('_id title creator');

    if (!event) {
      return res.status(404).json({ message: 'Event not found or not editable by this account' });
    }

    const registrations = await Registration.find({ event: event._id })
      .populate('participant', 'username email')
      .populate('removedBy', 'username email')
      .sort({ createdAt: -1 });
    const registrationsWithRatings = await attachParticipantRatingsToRegistrations(registrations);

    res.json({
      event: {
        _id: event._id,
        title: event.title
      },
      registrations: registrationsWithRatings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyEventRegistration = async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const registration = await Registration.findOne({
      event: eventId,
      participant: req.userId,
      status: { $nin: ['Denied', 'Cancelled', 'CancelledLate'] }
    }).select('status createdAt updatedAt');

    res.json({ registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status !== 'Planned') {
      return res.status(409).json({ message: 'Registration is only available for planned events' });
    }

    if (hasEventStarted(event)) {
      return res.status(409).json({ message: 'Registration is closed because this event has already started' });
    }

    const participant = await Account.findById(req.userId).select('stripe role');
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    if (Number(event.price) > 0 && !participant.stripe?.defaultPaymentMethod?.id) {
      return res.status(402).json({
        code: 'PAYMENT_METHOD_REQUIRED',
        message: 'Add a payment method in your profile before registering for paid events'
      });
    }

    const removedRegistration = await Registration.findOne({
      event: event._id,
      participant: req.userId,
      status: 'Removed'
    });

    if (removedRegistration) {
      return res.status(403).json({
        code: 'REGISTRATION_BLOCKED_BY_HOST',
        message: 'You were removed from this event by the host and cannot register again'
      });
    }

    const existingRegistration = await Registration.findOne({
      event: event._id,
      participant: req.userId,
      status: { $in: ACTIVE_REGISTRATION_STATUSES }
    });

    if (existingRegistration) {
      return res.status(409).json({
        message: 'You are already registered for this event',
        registration: existingRegistration
      });
    }

    const lateCancelledRegistration = await Registration.findOne({
      event: event._id,
      participant: req.userId,
      status: 'CancelledLate'
    });

    const activeRegistrationCount = await Registration.countDocuments({
      event: event._id,
      status: { $in: ACTIVE_REGISTRATION_STATUSES }
    });

    if (activeRegistrationCount >= event.capacity) {
      return res.status(409).json({ message: 'This event is already full' });
    }

    if (lateCancelledRegistration) {
      const existingInvoices = await Invoice.find({
        registration: lateCancelledRegistration._id
      }).select('status');
      const hasPaidInvoice = existingInvoices.some((invoice) => invoice.status === 'Paid');

      if (hasPaidInvoice) {
        return res.status(409).json({
          message: 'This late-cancelled registration already has a paid invoice. Please contact support before registering again.'
        });
      }

      lateCancelledRegistration.status = 'Registered';
      await lateCancelledRegistration.save();
      await Invoice.deleteMany({
        registration: lateCancelledRegistration._id,
        status: { $in: ['Pending', 'Unpaid', 'Failed', 'Cancelled', 'Relieved'] }
      });

      return res.status(200).json({
        message: Number(event.price) > 0
          ? 'Registration restored. You will only be charged the normal event price if attendance is confirmed.'
          : 'Registration restored.',
        registration: lateCancelledRegistration
      });
    }

    const registration = await Registration.create({
      event: event._id,
      participant: req.userId,
      status: 'Registered'
    });

    res.status(201).json({
      message: Number(event.price) > 0
        ? 'Registration created. You will be charged after attendance is confirmed.'
        : 'Registration created.',
      registration
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deregisterFromEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { confirmLateFee = false } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const event = await Event.findById(eventId).select('status price date datetime');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const registration = await Registration.findOne({
      event: event._id,
      participant: req.userId,
      status: 'Registered'
    });

    if (!registration) {
      return res.status(404).json({ message: 'Active registration not found for this event' });
    }

    if (registration.status === 'Attended') {
      return res.status(409).json({ message: 'You cannot deregister from an event you already attended' });
    }

    if (event.status !== 'Planned') {
      return res.status(409).json({ message: 'You can only deregister from planned events' });
    }

    if (hasEventStarted(event)) {
      return res.status(409).json({ message: 'You can no longer deregister because this event has already started' });
    }

    const [lateCancellation, settings] = await Promise.all([
      isLatePaidCancellation(event),
      getPlatformSettings()
    ]);
    const lateCancellationFeePercent = Number(settings.lateCancellationFeePercent ?? 50);
    const feeAmount = lateCancellation
      ? calculateLateCancellationFee(event.price, lateCancellationFeePercent)
      : 0;
    const lateCancellationWindowDays = settings.lateCancellationWindowDays;

    if (lateCancellation && confirmLateFee !== true) {
      return res.status(409).json({
        code: 'LATE_CANCELLATION_CONFIRMATION_REQUIRED',
        lateCancellation: true,
        cancellationFeeAmount: feeAmount,
        lateCancellationFeePercent,
        lateCancellationWindowDays,
        message: `This event starts within ${lateCancellationWindowDays} day(s). If you cancel now, you will still be charged ${lateCancellationFeePercent}% of the event price.`
      });
    }

    registration.status = lateCancellation ? 'CancelledLate' : 'Cancelled';
    await registration.save();

    if (lateCancellation) {
      await Invoice.findOneAndUpdate(
        { registration: registration._id },
        {
          $setOnInsert: {
            participant: registration.participant,
            event: event._id,
            registration: registration._id,
            amount: feeAmount,
            billingMonth: buildBillingMonth(event.datetime || event.date),
            status: 'Unpaid'
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({
      message: lateCancellation
        ? `Registration cancelled. Because this is within ${lateCancellationWindowDays} day(s) of the event, you will be charged ${lateCancellationFeePercent}% of the event price.`
        : 'Registration cancelled.',
      lateCancellation,
      cancellationFeeAmount: feeAmount,
      lateCancellationFeePercent,
      lateCancellationWindowDays,
      registration
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeEventParticipant = async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const eventQuery = { _id: eventId };

    if (req.userRole !== 'Admin') {
      eventQuery.creator = req.userId;
    }

    const event = await Event.findOne(eventQuery).select('_id status');

    if (!event) {
      return res.status(404).json({ message: 'Event not found or not editable by this account' });
    }

    if (event.status !== 'Planned') {
      return res.status(409).json({ message: 'Participants can only be removed from planned events' });
    }

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      event: event._id
    });

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found for this event' });
    }

    if (!HOST_REMOVABLE_REGISTRATION_STATUSES.includes(registration.status)) {
      return res.status(409).json({
        message: `Cannot remove a participant with registration status ${registration.status}`
      });
    }

    registration.status = 'Removed';
    registration.removedBy = req.userId;
    registration.removedAt = new Date();
    await registration.save();

    const populatedRegistration = await Registration.findById(registration._id)
      .populate('participant', 'username email')
      .populate('removedBy', 'username email');
    const [registrationWithRating] = await attachParticipantRatingsToRegistrations([populatedRegistration]);

    res.json({
      message: 'Participant removed and blocked from registering again.',
      registration: registrationWithRating
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeaturedEvents = async (req, res) => {
  try {
    const now = new Date();

    const events = await Event.find({
      status: 'Planned',
      $or: [
        { datetime: { $gt: now } },
        {
          datetime: { $exists: false },
          date: { $gt: now }
        }
      ]
    }).sort({ createdAt: -1 });

    const enriched = await attachComputedEventData(events);

    const availableEvents = enriched
      .filter((event) => event.attendeesCount < event.capacity);

    const compareHomepageEvents = (a, b) => (
      Number(b.isBoostedNow) - Number(a.isBoostedNow) ||
      Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
      new Date(a.datetime || a.date) - new Date(b.datetime || b.date) ||
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    const promotedEvents = availableEvents
      .filter((event) => event.isFeatured || event.isBoostedNow)
      .sort(compareHomepageEvents);

    const promotedEventIds = new Set(
      promotedEvents.map((event) => event._id.toString())
    );

    const fallbackEvents = availableEvents
      .filter((event) => !promotedEventIds.has(event._id.toString()))
      .sort(compareHomepageEvents);

    const featured = [...promotedEvents, ...fallbackEvents].slice(0, 6);

    res.json(featured);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeaturedEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(await attachComputedEventData(event, { includeAttendees: true }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addReview = async (req, res) => {
  try {
    res.status(410).json({
      message: 'Host reviews are stored through registrations and host ratings. Use /api/ratings/rate-event instead.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  createEvent,
  updateEvent,
  getEvents,
  getHostDashboardEvents,
  getHostEventRegistrations,
  getEventById,
  getSavedEventIds,
  getSavedEvents,
  saveEvent,
  unsaveEvent,
  getFeaturedEvents,
  getFeaturedEventById,
  getMyEventRegistration,
  registerForEvent,
  deregisterFromEvent,
  removeEventParticipant,
  addReview
};
