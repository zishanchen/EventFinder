import Participant from '../models/Participant.js';

const SEEDED_EMAIL_DOMAIN = 'eventfinder.seed';
const PRIMARY_PARTICIPANT_EMAIL = 'alex.mueller@tum.de';
const PRIMARY_PARTICIPANT_PASSWORD = 'Participant@EventFinder!';
const PROFILE_PICTURE_COUNT = 45;
const PROFILE_PICTURE_BASE_PATH = '/profile_pictures';

const PARTICIPANT_NAMES = [
  'Alex Johnson', 'Mina Weber', 'Jonas Keller', 'Priya Raman', 'Sara Meier',
  'Luis Ortega', 'Hannah Braun', 'Nora Fischer', 'Tim Wagner', 'Emma Schmidt',
  'David Kim', 'Lea Novak', 'Oskar Lehmann', 'Chiara Conti', 'Sarah Miller',
  'Michael Chen', 'Lina Bauer', 'Felix Hoffmann', 'Amira Saleh', 'Noah Becker',
  'Eva Schneider', 'Daniel Rossi', 'Sofia Garcia', 'Maximilian Wolf', 'Lara Klein',
  'Yuki Tanaka', 'Mateo Silva', 'Anna Mueller', 'Ben Fischer', 'Clara Vogel',
  'Ibrahim Kaya', 'Julia Richter', 'Theo Hartmann', 'Maya Singh', 'Paul Wagner',
  'Elena Petrova', 'Kaan Yilmaz', 'Laura Neumann', 'Tom Schulz', 'Aisha Khan',
  'Robert Martin', 'Sophie Meyer', 'Niklas Weber', 'Emily Brown', 'Julian Koch',
  'Maria Rossi', 'Felix Meyer', 'Jana Hartwig', 'Leon Brandt', 'Marta Nowak',
  'Sam Wilson', 'Nina Schaefer', 'Patrick Bauer', 'Rina Ito', 'Marco Fuchs',
  'Nadia Ali', 'Simon Kraus', 'Eva Novak', 'Philipp Schmid', 'Greta Lang',
  'Victor Nguyen', 'Isabel Santos', 'Yara Haddad', 'Matteo Bianchi', 'Lukas Stein',
  'Olivia Clark', 'Miriam Weiss', 'Tobias Berg', 'Anika Sommer', 'Jan Richter',
  'Helena Frank', 'Rafael Costa', 'Mika Anders', 'Zoe Keller', 'Elias Roth',
  'Celine Maier', 'Aaron Wolf', 'Paula Stern', 'Milan Horvat', 'Leonie Graf',
  'Iris Wang', 'Kilian Busch', 'Noemi Schwarz', 'Adrian Vogt', 'Alina Ernst',
  'Deniz Arslan', 'Valeria Ruiz', 'Moritz Brand', 'Ella Kaiser', 'Theo Bergmann'
];

const emailForSeedParticipant = (name, index) => {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${index + 1}@${SEEDED_EMAIL_DOMAIN}`;
};

const profilePictureForSeedParticipant = (index) => {
  const pictureNumber = (index % PROFILE_PICTURE_COUNT) + 1;
  return `${PROFILE_PICTURE_BASE_PATH}/profile_${String(pictureNumber).padStart(2, '0')}.png`;
};

const hasStoredStripeProfile = (stripeProfile) => {
  if (!stripeProfile) {
    return false;
  }

  const profile = stripeProfile.toObject?.() || stripeProfile;
  return Boolean(
    profile.customerId ||
    profile.defaultPaymentMethod?.id ||
    profile.defaultPaymentMethod?.card?.last4 ||
    profile.defaultPaymentMethod?.billingDetails?.name ||
    profile.defaultPaymentMethod?.billingDetails?.email
  );
};

const seedParticipants = async () => {
  let primaryParticipant = await Participant.findOne({ email: PRIMARY_PARTICIPANT_EMAIL });

  if (!primaryParticipant) {
    primaryParticipant = await Participant.create({
      username: 'Alex Müller',
      email: PRIMARY_PARTICIPANT_EMAIL,
      password: PRIMARY_PARTICIPANT_PASSWORD,
      role: 'Participant',
      gender: 'Diverse',
      age: 24,
      profilePicture: profilePictureForSeedParticipant(0),
      isVerified: true,
      active: true
    });
  }

  if (!primaryParticipant.isVerified) {
    primaryParticipant.isVerified = true;
  }

  primaryParticipant.username = 'Alex Müller';
  primaryParticipant.gender = 'Diverse';
  primaryParticipant.age = 24;
  primaryParticipant.active = true;

  if (!primaryParticipant.profilePicture) {
    primaryParticipant.profilePicture = profilePictureForSeedParticipant(0);
  }

  if (hasStoredStripeProfile(primaryParticipant.stripe)) {
    primaryParticipant.set('stripe', undefined);
  }

  primaryParticipant.password = PRIMARY_PARTICIPANT_PASSWORD;

  if (primaryParticipant.isModified()) {
    await primaryParticipant.save();
  }

  const dummyParticipants = await Participant.insertMany(
    PARTICIPANT_NAMES.map((name, index) => ({
      username: name,
      email: emailForSeedParticipant(name, index),
      role: 'Participant',
      gender: index % 3 === 0 ? 'Diverse' : index % 2 === 0 ? 'Female' : 'Male',
      age: 20 + (index % 9),
      profilePicture: profilePictureForSeedParticipant(index),
      isVerified: true
    }))
  );
  const participants = [primaryParticipant, ...dummyParticipants];
  const participantsByEmail = participants.reduce((acc, participant) => {
    acc[participant.email] = participant;
    return acc;
  }, {});

  return {
    primaryParticipant,
    primaryParticipantEmail: primaryParticipant.email,
    dummyParticipantCount: dummyParticipants.length,
    participants,
    participantsByEmail
  };
};

export {
  PARTICIPANT_NAMES,
  PRIMARY_PARTICIPANT_EMAIL,
  PRIMARY_PARTICIPANT_PASSWORD,
  SEEDED_EMAIL_DOMAIN,
  emailForSeedParticipant,
  profilePictureForSeedParticipant,
  seedParticipants
};
