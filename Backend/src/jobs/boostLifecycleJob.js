import cron from 'node-cron';
import {
  syncBoostLifecycle
} from '../services/boostLifecycleService.js';

const startBoostLifecycleJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      await syncBoostLifecycle(new Date());
    } catch (error) {
      console.error(
        'Boost lifecycle job failed:',
        error.message
      );
    }
  }, {
    timezone: 'Europe/Berlin'
  });
};

export default startBoostLifecycleJob;
