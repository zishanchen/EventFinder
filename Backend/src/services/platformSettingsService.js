import PlatformSettings from '../models/PlatformSettings.js';

const DEFAULT_LATE_CANCELLATION_WINDOW_DAYS = 3;
const DEFAULT_LATE_CANCELLATION_FEE_PERCENT = 50;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getPlatformSettings = async () => {
  const settings = await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    {
      $setOnInsert: {
        lateCancellationWindowDays: DEFAULT_LATE_CANCELLATION_WINDOW_DAYS,
        lateCancellationFeePercent: DEFAULT_LATE_CANCELLATION_FEE_PERCENT
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  if (settings.lateCancellationFeePercent === undefined || settings.lateCancellationFeePercent === null) {
    await PlatformSettings.updateOne(
      { key: 'platform' },
      { lateCancellationFeePercent: DEFAULT_LATE_CANCELLATION_FEE_PERCENT }
    );
    return {
      ...settings,
      lateCancellationFeePercent: DEFAULT_LATE_CANCELLATION_FEE_PERCENT
    };
  }

  return settings;
};

const getLateCancellationWindowMs = async () => {
  const settings = await getPlatformSettings();
  return Number(settings.lateCancellationWindowDays) * MS_PER_DAY;
};

const getLateCancellationFeeRate = async () => {
  const settings = await getPlatformSettings();
  return Number(settings.lateCancellationFeePercent) / 100;
};

export {
  DEFAULT_LATE_CANCELLATION_FEE_PERCENT,
  DEFAULT_LATE_CANCELLATION_WINDOW_DAYS,
  getLateCancellationFeeRate,
  getLateCancellationWindowMs,
  getPlatformSettings
};
