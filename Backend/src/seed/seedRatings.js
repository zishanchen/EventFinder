import Rating from '../models/Rating.js';
import { PRIMARY_PARTICIPANT_EMAIL, emailForSeedParticipant } from './seedParticipants.js';

const HOST_RATING_SEEDS = [
  {
    eventTitle: 'Tech Meetup: AI & Machine Learning',
    participantEmail: PRIMARY_PARTICIPANT_EMAIL,
    hostRating: 5,
    comment: 'The speaker mix was excellent and the project demos made AI feel very approachable.'
  },
  {
    eventTitle: 'Tech Meetup: AI & Machine Learning',
    participantEmail: emailForSeedParticipant('Mina Weber', 1),
    hostRating: 5,
    comment: 'Great networking after the talks. I left with two concrete ideas for my thesis project.'
  },
  {
    eventTitle: 'Tech Meetup: AI & Machine Learning',
    participantEmail: emailForSeedParticipant('Jonas Keller', 2),
    hostRating: 4,
    comment: 'Very useful intro, but the room was almost full by the time I arrived.'
  },
  {
    eventTitle: 'Tech Meetup: AI & Machine Learning',
    participantEmail: emailForSeedParticipant('Priya Raman', 3),
    hostRating: 5,
    comment: 'Loved that the organizers kept it beginner-friendly without making it shallow.'
  },
  {
    eventTitle: 'Startup Networking Night',
    participantEmail: PRIMARY_PARTICIPANT_EMAIL,
    hostRating: 5,
    comment: 'The matching cards made it easy to find people with similar startup interests.'
  },
  {
    eventTitle: 'Startup Networking Night',
    participantEmail: emailForSeedParticipant('Luis Ortega', 5),
    hostRating: 5,
    comment: 'Good crowd and very useful contacts, though the check-in queue took a while.'
  },
  {
    eventTitle: 'Startup Networking Night',
    participantEmail: emailForSeedParticipant('Hannah Braun', 6),
    hostRating: 5,
    comment: 'It felt welcoming even as someone without a startup yet.'
  },
  {
    eventTitle: 'Study Workshop: Data Science',
    participantEmail: emailForSeedParticipant('Tim Wagner', 8),
    hostRating: 4,
    comment: 'Helpful tutors and clear structure. More time for questions would be nice.'
  },
  {
    eventTitle: 'Board Game Night at Garching',
    participantEmail: PRIMARY_PARTICIPANT_EMAIL,
    hostRating: 5,
    comment: 'Perfect event for meeting people without awkward small talk.'
  },
  {
    eventTitle: 'Board Game Night at Garching',
    participantEmail: emailForSeedParticipant('David Kim', 10),
    hostRating: 5,
    comment: 'The host explained every game quickly and kept mixing tables.'
  },
  {
    eventTitle: 'Board Game Night at Garching',
    participantEmail: emailForSeedParticipant('Lea Novak', 11),
    hostRating: 5,
    comment: 'Cozy atmosphere, good snacks, and a really kind crowd.'
  },
  {
    eventTitle: 'Career Breakfast: Consulting Cases',
    participantEmail: emailForSeedParticipant('Chiara Conti', 13),
    hostRating: 5,
    comment: 'Great format before lectures and the mentors gave practical tips.'
  }
];

const findRegistration = ({ registrationsByEventTitle, eventTitle, participantId }) => {
  return registrationsByEventTitle[eventTitle]?.find((registration) => {
    return registration.participant.toString() === participantId.toString();
  });
};

const seedRatings = async ({ eventsByTitle, participantsByEmail, registrationsByEventTitle }) => {
  const hostRatings = HOST_RATING_SEEDS.map((seed) => {
    const participant = participantsByEmail[seed.participantEmail];
    const event = eventsByTitle[seed.eventTitle];

    if (!participant) {
      throw new Error(`Host rating participant not found: ${seed.participantEmail}`);
    }

    if (!event) {
      throw new Error(`Host rating event not found: ${seed.eventTitle}`);
    }

    const registration = findRegistration({
      registrationsByEventTitle,
      eventTitle: seed.eventTitle,
      participantId: participant._id
    });

    if (!registration) {
      throw new Error(`Registration not found for ${seed.participantEmail} at "${seed.eventTitle}"`);
    }

    return {
      rater: participant._id,
      rated: event.creator,
      registration: registration._id,
      event: registration.event,
      participant: participant._id,
      ratingType: 'host',
      rating: seed.hostRating,
      comment: seed.comment
    };
  });
  const ratings = await Rating.insertMany(hostRatings);

  return {
    hostRatingSeeds: HOST_RATING_SEEDS,
    ratingCount: ratings.length
  };
};

export { HOST_RATING_SEEDS, seedRatings };
