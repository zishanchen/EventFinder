import Registration from '../models/Registration.js';

const buildRegistrationStatus = (eventStatus) => {
  if (eventStatus === 'Happened') {
    return 'Attended';
  }

  return 'Registered';
};

const seedRegistrations = async ({
  eventSeeds,
  eventsByTitle,
  hostRatingSeeds,
  participants,
  participantsByEmail,
  primaryParticipant
}) => {
  const registrationsByEventTitle = {};
  let participantOffset = 0;

  for (const eventSeed of eventSeeds) {
    const event = eventsByTitle[eventSeed.title];
    const includePrimaryParticipant = eventSeed.primaryParticipantRegistered !== false;
    const ratingParticipants = hostRatingSeeds
      .filter((ratingSeed) => ratingSeed.eventTitle === eventSeed.title)
      .map((ratingSeed) => participantsByEmail[ratingSeed.participantEmail])
      .filter(Boolean)
      .filter((participant) => {
        return participant._id.toString() !== primaryParticipant._id.toString();
      });
    const rotatingParticipants = participants.filter((participant) => {
        return participant._id.toString() !== primaryParticipant._id.toString() &&
          !ratingParticipants.some((ratingParticipant) => {
            return ratingParticipant._id.toString() === participant._id.toString();
          });
      });
    const registrationDocs = Array.from({ length: eventSeed.registrationCount }, (_, index) => {
      const participantIndex = includePrimaryParticipant ? index - 1 : index;
      const participant = includePrimaryParticipant && index === 0
        ? primaryParticipant
        : ratingParticipants[participantIndex] ||
          rotatingParticipants[(participantOffset + participantIndex - ratingParticipants.length) % rotatingParticipants.length];

      return {
        participant: participant._id,
        event: event._id,
        status: buildRegistrationStatus(eventSeed.status)
      };
    });

    registrationsByEventTitle[eventSeed.title] = await Registration.insertMany(registrationDocs);
    participantOffset = (participantOffset + eventSeed.registrationCount) % participants.length;
  }

  const registrationCount = Object.values(registrationsByEventTitle)
    .reduce((sum, registrations) => sum + registrations.length, 0);

  return {
    registrationCount,
    registrationsByEventTitle
  };
};

export { seedRegistrations };
