import Host from '../models/Host.js';

const PRIMARY_HOST_EMAIL = 'minga.minds@gmail.com';
const PRIMARY_HOST_PASSWORD = 'Host@EventFinder!';
const PRIMARY_HOST_PROFILE_PICTURE = '/profile_pictures/profile_45.png';
const SECONDARY_HOST_EMAIL = 'campus.events@eventfinder.seed';
const SECONDARY_HOST_PROFILE_PICTURE = '/profile_pictures/profile_44.png';
const PRIMARY_HOST_USERNAME = 'Minga Minds';

const buildSeedPayoutProfile = (hostName, hostEmail, last4) => ({
  customerId: `cus_seed_${hostName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  defaultPaymentMethod: {
    id: `pm_seed_${hostName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    type: 'card',
    card: {
      brand: 'visa',
      last4,
      expMonth: 12,
      expYear: 2030,
      funding: 'debit',
      country: 'DE'
    },
    billingDetails: {
      name: hostName,
      email: hostEmail
    },
    setAt: new Date()
  }
});

const seedHosts = async () => {
  let host = await Host.findOne({ email: PRIMARY_HOST_EMAIL });

  if (!host) {
    host = await Host.create({ username: PRIMARY_HOST_USERNAME, email: PRIMARY_HOST_EMAIL, password: PRIMARY_HOST_PASSWORD, role: 'Host', verified: true, active: true, description: 'We bring students together through practical campus events, useful conversations, and a welcoming atmosphere.', profilePicture: PRIMARY_HOST_PROFILE_PICTURE, socialMedia: { platform: 'Instagram', username: 'mingaminds' }, stripe: buildSeedPayoutProfile(PRIMARY_HOST_USERNAME, PRIMARY_HOST_EMAIL, '4242') });
  }

  host.username = PRIMARY_HOST_USERNAME;
  host.password = PRIMARY_HOST_PASSWORD;
  host.socialMedia = { platform: 'Instagram', username: 'mingaminds' };
  host.stripe = buildSeedPayoutProfile(PRIMARY_HOST_USERNAME, PRIMARY_HOST_EMAIL, '4242');

  if (!host.verified) {
    host.verified = true;
  }

  if (!host.profilePicture) {
    host.profilePicture = PRIMARY_HOST_PROFILE_PICTURE;
  }

  if (host.isModified()) {
    await host.save();
  }

  const secondaryHost = await Host.create({
    username: 'Campus Events Team',
    email: SECONDARY_HOST_EMAIL,
    password: PRIMARY_HOST_PASSWORD,
    role: 'Host',
    verified: true,
    active: true,
    description: 'We organize student-focused campus events, from creative meetups to active afternoons.',
    profilePicture: SECONDARY_HOST_PROFILE_PICTURE,
    socialMedia: { platform: 'Instagram', username: 'campusevents' },
    stripe: buildSeedPayoutProfile('Campus Events Team', SECONDARY_HOST_EMAIL, '1881')
  });

  return {
    host,
    hostEmail: host.email,
    secondaryHost
  };
};

export {
  PRIMARY_HOST_EMAIL,
  PRIMARY_HOST_PASSWORD,
  PRIMARY_HOST_PROFILE_PICTURE,
  PRIMARY_HOST_USERNAME,
  SECONDARY_HOST_EMAIL,
  SECONDARY_HOST_PROFILE_PICTURE,
  seedHosts
};
