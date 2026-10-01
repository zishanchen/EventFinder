import mongoose from 'mongoose';
import Boost from '../../models/Boost.js';
import Event from '../../models/Event.js';
import Tag from '../../models/Tag.js';
import PlatformSettings from '../../models/PlatformSettings.js';
import { getPlatformSettings } from '../../services/platformSettingsService.js';
import { getTagColors, normalizeTagColors, tagDto as buildTagDto } from '../../utils/tagColors.js';

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const TAG_COLOR_KEYS = ['background', 'border', 'text'];

const readTrimmedString = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseTagColors = (value, fallbackTag) => {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Tag colors must be an object');
  }

  const fallbackColors = normalizeTagColors(fallbackTag);

  return TAG_COLOR_KEYS.reduce((colors, key) => {
    const nextColor = readTrimmedString(value[key]) || fallbackColors[key];

    if (!HEX_COLOR_PATTERN.test(nextColor)) {
      throw new Error(`${key} color must be a 6-digit hex color`);
    }

    colors[key] = nextColor.toLowerCase();
    return colors;
  }, {});
};

const parseNonNegativeNumber = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return number;
};

const parseNonNegativeInteger = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative whole number`);
  }
  return number;
};

const parsePercentage = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw new Error(`${fieldName} must be a number between 0 and 100`);
  }
  return number;
};

const parsePositiveInteger = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${fieldName} must be a positive whole number`);
  }
  return number;
};

const boostDto = (boost) => ({
  _id: boost._id,
  name: boost.name,
  description: boost.description,
  length: boost.length,
  price: boost.price,
  priceCents: boost.priceCents,
  currency: boost.currency,
  active: boost.active,
  deletedAt: boost.deletedAt,
  recommended: boost.recommended,
  size: boost.size
});

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const tagDto = (tag) => ({
  ...tag,
  ...buildTagDto(tag)
});

const getAdminSettings = async (req, res) => {
  try {
    const [settings, tags, boosts] = await Promise.all([
      getPlatformSettings(),
      Tag.find().sort({ active: -1, name: 1 }).lean(),
      Boost.find().sort({ active: -1, priceCents: 1, length: 1 })
    ]);

    res.json({
      settings: {
        lateCancellationWindowDays: settings.lateCancellationWindowDays,
        lateCancellationFeePercent: settings.lateCancellationFeePercent
      },
      tags: tags.map(tagDto),
      boosts: boosts.map(boostDto)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePlatformSettings = async (req, res) => {
  try {
    const lateCancellationWindowDays = parseNonNegativeInteger(
      req.body.lateCancellationWindowDays,
      'lateCancellationWindowDays'
    );
    const lateCancellationFeePercent = parsePercentage(
      req.body.lateCancellationFeePercent,
      'lateCancellationFeePercent'
    );

    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'platform' },
      { lateCancellationWindowDays, lateCancellationFeePercent },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({
      lateCancellationWindowDays: settings.lateCancellationWindowDays,
      lateCancellationFeePercent: settings.lateCancellationFeePercent
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createTag = async (req, res) => {
  try {
    const name = readTrimmedString(req.body.name);
    if (!name) {
      return res.status(400).json({ message: 'Tag name is required' });
    }

    const existingTag = await Tag.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
    }).lean();
    if (existingTag) {
      return res.status(409).json({ message: 'A tag with this name already exists.' });
    }

    const defaultColors = getTagColors(name);
    const colors = parseTagColors(req.body.colors, { name, colors: defaultColors }) || defaultColors;

    const tag = await Tag.create({
      name,
      active: req.body.active !== false,
      colors
    });

    res.status(201).json(tagDto(tag.toObject?.() || tag));
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({
      message: error.code === 11000 ? 'A tag with this name already exists.' : error.message
    });
  }
};

const updateTag = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid tag id' });
    }

    const existingTag = await Tag.findById(req.params.id);
    if (!existingTag) return res.status(404).json({ message: 'Tag not found' });

    const updates = {};
    const originalName = existingTag.name;

    if (hasOwn(req.body, 'name')) {
      const name = readTrimmedString(req.body.name);
      if (!name) {
        return res.status(400).json({ message: 'Tag name is required' });
      }

      const duplicateTag = await Tag.findOne({
        _id: { $ne: existingTag._id },
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
      }).lean();
      if (duplicateTag) {
        return res.status(409).json({ message: 'A tag with this name already exists.' });
      }

      updates.name = name;
    }
    if (hasOwn(req.body, 'active')) {
      updates.active = Boolean(req.body.active);
      updates.deletedAt = updates.active ? null : new Date();
    }
    if (hasOwn(req.body, 'colors')) {
      updates.colors = parseTagColors(req.body.colors, existingTag);
    }

    const tag = await Tag.findByIdAndUpdate(existingTag._id, updates, {
      new: true,
      runValidators: true
    }).lean();

    if (updates.name && updates.name !== originalName) {
      await Event.updateMany({ category: originalName }, { category: updates.name });
    }

    res.json(tagDto(tag));
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({
      message: error.code === 11000 ? 'A tag with this name already exists.' : error.message
    });
  }
};

const createBoost = async (req, res) => {
  try {
    const length = parsePositiveInteger(req.body.length, 'length');
    const price = parseNonNegativeNumber(req.body.price, 'price');
    const name = readTrimmedString(req.body.name) || `${length}-Hour Boost`;
    const priceCents = Math.round(price * 100);
    const duplicateBoost = await Boost.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      length,
      priceCents
    }).lean();
    if (duplicateBoost) {
      return res.status(409).json({ message: 'A boost type with this name, length, and price already exists.' });
    }

    const boost = await Boost.create({
      name,
      description: readTrimmedString(req.body.description) || `Boost your event for ${length} hours`,
      length,
      priceCents,
      currency: readTrimmedString(req.body.currency) || 'eur',
      active: req.body.active !== false
    });

    res.status(201).json(boostDto(boost));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateBoost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid boost id' });
    }

    const existingBoost = await Boost.findById(req.params.id);
    if (!existingBoost) return res.status(404).json({ message: 'Boost not found' });

    if (
      hasOwn(req.body, 'name') ||
      hasOwn(req.body, 'description') ||
      hasOwn(req.body, 'length') ||
      hasOwn(req.body, 'price')
    ) {
      return res.status(400).json({ message: 'Existing boost types cannot be edited. Create a new boost type instead.' });
    }

    existingBoost.active = hasOwn(req.body, 'active') ? Boolean(req.body.active) : existingBoost.active;
    if (hasOwn(req.body, 'active')) {
      existingBoost.deletedAt = existingBoost.active ? null : new Date();
    }
    await existingBoost.save();

    res.json(boostDto(existingBoost));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export {
  createBoost,
  createTag,
  getAdminSettings,
  updateBoost,
  updatePlatformSettings,
  updateTag
};
