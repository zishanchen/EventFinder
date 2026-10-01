import { getPlatformSettings } from '../services/platformSettingsService.js';

const getPublicSettings = async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    res.json({
      lateCancellationWindowDays: settings.lateCancellationWindowDays,
      lateCancellationFeePercent: settings.lateCancellationFeePercent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getPublicSettings };
