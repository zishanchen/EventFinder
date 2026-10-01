import Account from '../models/Account.js';
import { buildParticipantProfile } from '../services/profileService.js';

const AVATAR_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp);base64,/i;
const MAX_AVATAR_SOURCE_BYTES = 1.5 * 1024 * 1024;
const MAX_AVATAR_DATA_URL_LENGTH = Math.ceil((MAX_AVATAR_SOURCE_BYTES * 4) / 3) + 128;

const buildInitials = (name = '') => {
  const initial = String(name)
    .trim()
    .split(/\s+/)
    .find(Boolean)?.[0]
    ?.toUpperCase();

  return initial || 'H';
};

const isValidAvatarDataUrl = (value) => {
  if (typeof value !== 'string') return false;
  if (value.length > MAX_AVATAR_DATA_URL_LENGTH) return false;
  if (!AVATAR_DATA_URL_PATTERN.test(value)) return false;

  const base64Payload = value.replace(AVATAR_DATA_URL_PATTERN, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Payload)) return false;

  try {
    const decodedImage = Buffer.from(base64Payload, 'base64');
    return decodedImage.length > 0 && decodedImage.length <= MAX_AVATAR_SOURCE_BYTES;
  } catch {
    return false;
  }
};

// GET /api/profile
const getUserProfile = async (req, res) => {
  try {
    const profile = await buildParticipantProfile(req.userId);
    res.json(profile);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// PATCH /api/profile/avatar
const updateProfileAvatar = async (req, res) => {
  try {
    const { profilePicture } = req.body;

    if (profilePicture !== null && !isValidAvatarDataUrl(profilePicture)) {
      return res.status(400).json({
        message: 'Please upload a PNG, JPG, or WebP image under 1.5 MB.'
      });
    }

    const user = await Account.findByIdAndUpdate(
      req.userId,
      { profilePicture },
      {
        new: true,
        runValidators: true
      }
    ).select('username email profilePicture role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        initials: buildInitials(user.username),
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getUserProfile, updateProfileAvatar };
