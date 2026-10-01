import Account from '../models/Account.js';
import EventTag from '../models/EventTag.js';
import Rating from '../models/Rating.js';
import Registration from '../models/Registration.js';
import { calculateAverageRating } from '../utils/rating.js';
import { tagDto } from '../utils/tagColors.js';

const UPCOMING_REGISTRATION_STATUSES = ['Registered'];
const ATTENDED_REGISTRATION_STATUS = 'Attended';
const INTEREST_LIMIT = 6;
const RECENT_RATING_LIMIT = 10;
const RECENT_EVENT_WEIGHT_DECAY = 0.78;

export const toId = (value) => value?._id?.toString?.() || value?.toString?.();

export const buildInitials = (name = '') => {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
};

export const formatMonthYear = (value) => {
  if (!value) return 'Unknown';

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(value));
};

export const formatUniversityFromEmail = (email = '') => {
  const domain = email.split('@')[1] || '';
  const universityDomain = domain
    .split('.')
    .filter((part) => !['de', 'edu', 'com', 'org', 'net'].includes(part))
    .join('.');

  return universityDomain || 'University member';
};

export const buildProfileEvent = (registration, ratingByRegistrationId = {}) => {
  const event = registration.event;
  const registrationId = registration._id.toString();
  const rating = ratingByRegistrationId[registrationId];

  return {
    registrationId,
    eventId: toId(event),
    title: event?.title || event?.name || 'Untitled event',
    date: event?.datetime || event?.date || null,
    imageUrl: event?.imageUrl || event?.image || '',
    price: event?.price || 0,
    status: registration.status,
    review: rating
      ? {
        _id: rating._id,
        rating: rating.rating,
        comment: rating.comment,
        photo: rating.photo,
        createdAt: rating.createdAt
      }
      : null,
    rating: rating?.rating || null,
    hasReviewed: Boolean(rating)
  };
};

export const buildReceivedRating = (rating) => ({
  _id: rating._id,
  rating: rating.rating,
  comment: rating.comment,
  createdAt: rating.createdAt,
  host: {
    _id: toId(rating.rater),
    username: rating.rater?.username || 'Event host',
    profilePicture: rating.rater?.profilePicture || null,
    initials: buildInitials(rating.rater?.username || 'Event host')
  },
  event: {
    _id: toId(rating.event),
    title: rating.event?.title || rating.event?.name || 'Untitled event',
    date: rating.event?.datetime || rating.event?.date || null
  }
});

export const buildAchievements = ({
  createdAt,
  eventsAttended = 0,
  reviewsGiven = 0,
  interests = [],
  categoriesExplored = 0,
  reviewsReceived = 0,
  averageRating = 0
}) => {
  return [
    {
      key: 'member',
      track: 'community',
      rank: 1,
      title: 'Community Member',
      description: `Joined in ${formatMonthYear(createdAt)}`,
      unlocked: true
    },
    {
      key: 'communityStar',
      track: 'community',
      rank: 2,
      title: 'Community Star',
      description: 'Earn a 4.5+ average from at least 3 hosts',
      unlocked: reviewsReceived >= 3 && averageRating >= 4.5
    },
    {
      key: 'firstEvent',
      track: 'events',
      rank: 1,
      title: 'First Step',
      description: 'Attend your first event',
      unlocked: eventsAttended >= 1
    },
    {
      key: 'explorer',
      track: 'events',
      rank: 2,
      title: 'Event Explorer',
      description: 'Attend 5 or more events',
      unlocked: eventsAttended >= 5
    },
    {
      key: 'regular',
      track: 'events',
      rank: 3,
      title: 'Event Regular',
      description: 'Attend 10 or more events',
      unlocked: eventsAttended >= 10
    },
    {
      key: 'veteran',
      track: 'events',
      rank: 4,
      title: 'Event Veteran',
      description: 'Attend 25 or more events',
      unlocked: eventsAttended >= 25
    },
    {
      key: 'firstReview',
      track: 'reviews',
      rank: 1,
      title: 'First Review',
      description: 'Review your first host',
      unlocked: reviewsGiven >= 1
    },
    {
      key: 'reviewer',
      track: 'reviews',
      rank: 2,
      title: 'Helpful Reviewer',
      description: 'Review 3 or more hosts',
      unlocked: reviewsGiven >= 3
    },
    {
      key: 'trustedVoice',
      track: 'reviews',
      rank: 3,
      title: 'Trusted Voice',
      description: 'Review 10 or more hosts',
      unlocked: reviewsGiven >= 10
    },
    {
      key: 'variety',
      track: 'discovery',
      rank: 1,
      title: 'Interest Collector',
      description: 'Build 3 or more interests',
      unlocked: interests.length >= 3
    },
    {
      key: 'curiousMind',
      track: 'discovery',
      rank: 2,
      title: 'Curious Mind',
      description: 'Build 5 or more interests',
      unlocked: interests.length >= 5
    },
    {
      key: 'categoryExplorer',
      track: 'discovery',
      rank: 3,
      title: 'Category Explorer',
      description: 'Build 5 interests across 3 event categories',
      unlocked: interests.length >= 5 && categoriesExplored >= 3
    }
  ];
};

const getEventTimestamp = (registration) => {
  const eventDate = registration.event?.datetime || registration.event?.date;
  const eventTime = eventDate ? new Date(eventDate).getTime() : Number.NaN;

  if (!Number.isNaN(eventTime)) {
    return eventTime;
  }

  return new Date(registration.updatedAt || registration.createdAt || 0).getTime();
};

const buildWeightedInterests = async (attendedRegistrations = []) => {
  if (attendedRegistrations.length === 0) {
    return [];
  }

  const orderedRegistrations = [...attendedRegistrations].sort((first, second) => {
    return getEventTimestamp(second) - getEventTimestamp(first);
  });
  const eventWeightById = orderedRegistrations.reduce((acc, registration, index) => {
    const eventId = toId(registration.event);

    if (!eventId) {
      return acc;
    }

    acc[eventId] = Math.pow(RECENT_EVENT_WEIGHT_DECAY, index);
    return acc;
  }, {});
  const eventIds = Object.keys(eventWeightById);
  const totalWeight = Object.values(eventWeightById).reduce((sum, weight) => sum + weight, 0);

  if (eventIds.length === 0 || totalWeight === 0) {
    return [];
  }

  const eventTags = await EventTag.find({
    event: { $in: eventIds },
    active: true
  }).populate('tag', 'name colors active deletedAt');

  const interestByTagId = eventTags.reduce((acc, eventTag) => {
    if (!eventTag.tag || eventTag.tag.active === false || eventTag.tag.deletedAt) {
      return acc;
    }

    const tag = tagDto(eventTag.tag);
    const tagId = toId(tag);
    const eventId = toId(eventTag.event);
    const eventWeight = eventWeightById[eventId] || 0;

    if (!tagId || eventWeight === 0) {
      return acc;
    }

    if (!acc[tagId]) {
      acc[tagId] = {
        ...tag,
        score: 0
      };
    }

    acc[tagId].score += eventWeight;
    return acc;
  }, {});

  return Object.values(interestByTagId)
    .sort((first, second) => {
      const scoreDifference = second.score - first.score;

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return first.name.localeCompare(second.name);
    })
    .slice(0, INTEREST_LIMIT)
    .map(({ score, ...interest }) => ({
      ...interest,
      percentage: Math.round((score / totalWeight) * 100)
    }));
};

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const buildParticipantProfile = async (userId) => {
  const user = await Account.findById(userId).select('username email profilePicture role createdAt');

  if (!user) {
    throw createHttpError('User not found', 404);
  }

  const registrations = await Registration.find({ participant: userId })
    .populate('event')
    .sort({ updatedAt: -1, createdAt: -1 });

  const registrationIds = registrations.map((registration) => registration._id);
  const ratingsGiven = registrationIds.length > 0
    ? await Rating.find({
      rater: userId,
      registration: { $in: registrationIds },
      ratingType: 'host',
      active: true
    })
    : [];
  const ratingsReceived = await Rating.find({
    rated: userId,
    ratingType: 'participant',
    active: true
  })
    .populate('rater', 'username profilePicture')
    .populate('event', 'title name datetime date')
    .sort({ createdAt: -1 });
  const ratingByRegistrationId = ratingsGiven.reduce((acc, rating) => {
    acc[rating.registration.toString()] = rating;
    return acc;
  }, {});
  const attendedRegistrations = registrations.filter((registration) => {
    return registration.status === ATTENDED_REGISTRATION_STATUS;
  });
  const upcomingRegistrations =
    registrations.filter((registration) => {
      return registration.status === "Registered";
    });
  const interests = await buildWeightedInterests(attendedRegistrations);
  const averageRating = calculateAverageRating(ratingsReceived);
  const categoriesExplored = new Set(
    attendedRegistrations
      .map((registration) => registration.event?.category?.trim().toLowerCase())
      .filter(Boolean)
  ).size;

  return {
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      role: user.role,
      university: formatUniversityFromEmail(user.email),
      memberSince: formatMonthYear(user.createdAt),
      initials: buildInitials(user.username),
      eventsAttended: attendedRegistrations.length,
      averageRating,
      ratingsReceivedCount: ratingsReceived.length,
      latestRatingsReceived: ratingsReceived
        .slice(0, RECENT_RATING_LIMIT)
        .map(buildReceivedRating),
      reviewsGiven: ratingsGiven.length,
      interests,
      achievements: buildAchievements({
        createdAt: user.createdAt,
        eventsAttended: attendedRegistrations.length,
        reviewsGiven: ratingsGiven.length,
        interests,
        categoriesExplored,
        reviewsReceived: ratingsReceived.length,
        averageRating
      })
    },
    events: {
      upcoming: upcomingRegistrations
        .slice(0, 6)
        .map((registration) => buildProfileEvent(registration, ratingByRegistrationId)),
      attended: attendedRegistrations
        .slice(0, 6)
        .map((registration) => buildProfileEvent(registration, ratingByRegistrationId))
    }
  };
};
