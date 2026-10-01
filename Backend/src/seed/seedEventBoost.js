import Boost from '../models/Boost.js';
import BoostPurchase from '../models/BoostPurchase.js';
import EventBoost from '../models/EventBoost.js';

const BOOSTED_EVENT_TITLES = [
  'Women in Tech Picnic',
  'FinTech Product Sprint'
];

const seedEventBoosts = async ({ eventsByTitle }) => {
  await EventBoost.deleteMany({});
  await BoostPurchase.deleteMany();

  const boost = await Boost.findOne({
    name: '24-Hour Boost',
    active: true
  });

  if (!boost) {
    return {
      eventBoostCount: 0,
      purchaseCount: 0,
      warning: '24-Hour Boost package was not found'
    };
  }

  const now = new Date();
  const boostedEvents = BOOSTED_EVENT_TITLES
    .map((title) => eventsByTitle[title])
    .filter(Boolean);

  let eventBoostCount = 0;
  let purchaseCount = 0;

  for (const event of boostedEvents) {
    const endTime = new Date(now.getTime() + boost.length * 60 * 60 * 1000);

    const purchase = await BoostPurchase.create({
      event: event._id,
      boost: boost._id,
      host: event.creator,
      startMode: 'scheduled',
      requestedStartTime: now,
      calculatedEndTime: endTime,
      boostSnapshot: {
        name: boost.name,
        lengthHours: boost.length,
        amountCents: boost.priceCents,
        currency: boost.currency
      },
      paymentStatus: 'paid',
      idempotencyKey: `seed-boost-${event._id}`,
      paidAt: now,
      fulfilledAt: now,
      source: 'seed',
      excludeFromRevenue: false,
      reservationActive: true
    });

    purchaseCount += 1;

    const eventBoost = await EventBoost.create({
      purchase: purchase._id,
      event: event._id,
      boost: boost._id,
      host: event.creator,
      startTime: now,
      endTime,
      status: 'active',
      active: true,
      slotActive: true,
      activatedAt: now
    });

    eventBoostCount += 1;

    event.boost = {
      eventBoostId: eventBoost._id,
      startTime: now,
      endTime,
      status: 'active',
      active: true
    };

    await event.save();
  }

  return {
    eventBoostCount,
    purchaseCount,
    boostId: boost._id
  };
};

export { seedEventBoosts };
