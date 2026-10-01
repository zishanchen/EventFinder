import Account from '../models/Account.js';
import Event from '../models/Event.js';
import EventTag from '../models/EventTag.js';
import Rating from '../models/Rating.js';
import Registration from '../models/Registration.js';
import Boost from '../models/Boost.js';
import EventBoost from '../models/EventBoost.js';
import BoostPurchase from '../models/BoostPurchase.js';
import Invoice from '../models/Invoice.js';
import HostPayout from '../models/HostPayout.js';

const clearSeededData = async () => {
  await HostPayout.deleteMany();
  await Invoice.deleteMany();
  await Rating.deleteMany();
  await Registration.deleteMany();
  await EventTag.deleteMany();
  await EventBoost.deleteMany();
  await BoostPurchase.deleteMany();
  await Event.deleteMany();
  await Boost.deleteMany();

  await Account.collection.deleteMany({
    email: { $regex: '@eventfinder\\.seed$', $options: 'i' }
  });

  await Account.collection.deleteMany({ role: 'Admin' });
};

export { clearSeededData };
