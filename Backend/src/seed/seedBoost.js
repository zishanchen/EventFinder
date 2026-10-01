import Boost from '../models/Boost.js';

const BOOST_SEEDS = [
  {
    name: '6-Hour Boost',
    description: 'Boost your event for 6 hours',
    length: 6,
    priceCents: 99,
    currency: 'eur',
    recommended: false,
    size: 'small',
    active: true
  },
  {
    name: '12-Hour Boost',
    description: 'Boost your event for 12 hours',
    length: 12,
    priceCents: 199,
    currency: 'eur',
    recommended: true,
    size: 'medium',
    active: true
  },
  {
    name: '24-Hour Boost',
    description: 'Boost your event for 24 hours',
    length: 24,
    priceCents: 299,
    currency: 'eur',
    recommended: false,
    size: 'large',
    active: true
  }
];

export const seedBoosts = async () => {
  const operations = BOOST_SEEDS.map((boost) => ({
    updateOne: {
      filter: { name: boost.name },
      update: { $set: boost },
      upsert: true
    }
  }));

  const result = await Boost.bulkWrite(operations);
  return {
    boostCount: BOOST_SEEDS.length,
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount
  };
};
