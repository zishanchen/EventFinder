import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { clearSeededData } from './seedCleanup.js';
import { seedEventTags } from './seedEventTags.js';
import { seedEvents } from './seedEvents.js';
import { seedHosts } from './seedHosts.js';
import { seedParticipants } from './seedParticipants.js';
import { HOST_RATING_SEEDS, seedRatings } from './seedRatings.js';
import { seedRegistrations } from './seedRegistrations.js';
import { seedFixedTags } from './seedTags.js';
import { seedAdmin } from './seedAdmin.js';
import { seedBoosts } from './seedBoost.js';
import { seedEventBoosts } from './seedEventBoost.js';
import { seedInvoices } from './seedInvoices.js';
import { seedHostPayouts } from './seedHostPayouts.js';

const seedDatabase = async () => {
  await connectDB();
  await clearSeededData();

  const { boostCount } = await seedBoosts();

  const tags = await seedFixedTags();
  const { host, hostEmail, secondaryHost } = await seedHosts();
  const {
    primaryParticipant,
    primaryParticipantEmail,
    dummyParticipantCount,
    participants,
    participantsByEmail
  } = await seedParticipants();
  const { eventSeeds, events, eventsByTitle } = await seedEvents({
    primaryHost: host,
    secondaryHost
  });
  const { eventTagCount } = await seedEventTags({ eventSeeds, eventsByTitle, tags });
  const {
    eventBoostCount,
    purchaseCount: boostPurchaseCount
  } = await seedEventBoosts({ eventsByTitle });
  const { registrationCount, registrationsByEventTitle } = await seedRegistrations({
    eventSeeds,
    eventsByTitle,
    hostRatingSeeds: HOST_RATING_SEEDS,
    participants,
    participantsByEmail,
    primaryParticipant
  });
  const { ratingCount } = await seedRatings({
    eventsByTitle,
    participantsByEmail,
    registrationsByEventTitle
  });
  const { billingMonth, invoiceCount } = await seedInvoices();
  const {
    payoutCount,
    payoutFailedCount,
    payoutSkippedCount,
    grossAmount: payoutGrossAmount,
    platformFeeAmount: payoutPlatformFeeAmount,
    netAmount: payoutNetAmount
  } = await seedHostPayouts({ billingMonth });

  const { adminEmail, created: adminCreated } = await seedAdmin();

  return {
    tagCount: tags.length,
    hostEmail,
    primaryParticipantEmail,
    dummyParticipantCount,
    eventCount: events.length,
    eventTagCount,
    registrationCount,
    ratingCount,
    billingMonth,
    invoiceCount,
    payoutCount,
    payoutFailedCount,
    payoutSkippedCount,
    payoutGrossAmount,
    payoutPlatformFeeAmount,
    payoutNetAmount,
    firstEventId: events[0]._id,
    adminEmail,
    adminCreated,
    boostCount,
    boostPurchaseCount,
    eventBoostCount
  };
};

try {
  const summary = await seedDatabase();

  console.log('Seed data inserted');
  console.log(`Seeded ${summary.tagCount} fixed tags`);
  console.log(`Used host account: ${summary.hostEmail}`);
  console.log(`Used primary participant account: ${summary.primaryParticipantEmail}`);
  console.log(`Created ${summary.dummyParticipantCount} dummy participants`);
  console.log(`Created ${summary.eventCount} events`);
  console.log(`Created ${summary.eventTagCount} event tag links`);
  console.log(`Created ${summary.registrationCount} registrations`);
  console.log(`Created ${summary.ratingCount} ratings`);
  console.log(`Created ${summary.invoiceCount} invoice(s) for ${summary.billingMonth}`);
  console.log(
    `Created ${summary.payoutCount} host payout(s) for ${summary.billingMonth} ` +
    `(${summary.payoutPlatformFeeAmount} retained, ${summary.payoutNetAmount} net)`
  );
  if (summary.payoutFailedCount || summary.payoutSkippedCount) {
    console.log(
      `Host payout generation had ${summary.payoutFailedCount} failed and ` +
      `${summary.payoutSkippedCount} skipped payout(s)`
    );
  }
  console.log(`First event id: ${summary.firstEventId}`);
  console.log(`Seeded ${summary.boostCount} boost(s)`);
  console.log(`Seeded ${summary.boostPurchaseCount} boost purchase(s)`);
  console.log(`Seeded ${summary.eventBoostCount} event boost(s)`);
  if (summary.adminCreated) {
    console.log(`Created admin account: ${summary.adminEmail}`);
  } else {
    console.log(`Admin account already existed: ${summary.adminEmail}`);
  }

  await mongoose.connection.close();
  process.exit(0);
} catch (error) {
  console.error('Seed error:', error.message);
  await mongoose.connection.close().catch(() => { });
  process.exit(1);
}

export { seedDatabase };
