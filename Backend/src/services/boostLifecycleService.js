import BoostPurchase from '../models/BoostPurchase.js';
import Event from '../models/Event.js';
import EventBoost from '../models/EventBoost.js';

const syncBoostLifecycle = async (now = new Date()) => {
  const toActivate = await EventBoost.find({
    status: 'scheduled',
    startTime: { $lte: now },
    endTime: { $gt: now }
  });

  for (const boost of toActivate) {
    boost.status = 'active';
    boost.active = true;
    boost.activatedAt = boost.activatedAt || now;
    await boost.save();

    await Event.updateOne(
      { _id: boost.event },
      {
        $set: {
          'boost.status': 'active',
          'boost.active': true
        }
      }
    );
  }

  const toExpire = await EventBoost.find({
    status: { $in: ['scheduled', 'active'] },
    endTime: { $lte: now }
  });

  for (const boost of toExpire) {
    boost.status = 'expired';
    boost.active = false;
    boost.slotActive = false;
    boost.expiredAt = boost.expiredAt || now;
    await boost.save();

    await Event.updateOne(
      { _id: boost.event },
      {
        $set: {
          'boost.status': 'expired',
          'boost.active': false
        }
      }
    );

    await BoostPurchase.updateOne(
      { _id: boost.purchase },
      { $set: { reservationActive: false } }
    );
  }

  return {
    activated: toActivate.length,
    expired: toExpire.length
  };
};

export { syncBoostLifecycle };
