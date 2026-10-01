import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Account from '../models/Account.js';
import '../models/Admin.js';
import Participant from '../models/Participant.js';
import Host from '../models/Host.js';
import { JWT_SECRET } from '../config/appConfig.js';
import { isGermanUniversityEmail } from '../utils/emailValidator.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';

// Generate JWT token
const generateToken = (user, rememberMe = false) => {
  return jwt.sign(
    { _id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    JWT_SECRET,
    { expiresIn: rememberMe ? '24h' : '30m' }
  );
};

const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase();
};

const normalizeString = (value) => String(value || '').trim();

const isValidEmailFormat = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const buildInitials = (name = '') => {
  const initial = String(name)
    .trim()
    .split(/\s+/)
    .find(Boolean)?.[0]
    ?.toUpperCase();

  return initial || 'H';
};

const buildExactEmailQuery = (email) => ({
  email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
});

const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one capital letter';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
  return null;
};

// Lockout rule: 10 failed login attempts within 1 minute temporarily deactivate the account for 10 minutes.
const FAILED_LOGIN_WINDOW_MS = 60 * 1000;
const FAILED_LOGIN_LIMIT = 10;
const TEMPORARY_DEACTIVATION_MS = 10 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 5 * 60 * 1000;
const GENERIC_PASSWORD_RESET_MESSAGE = 'If an account exists with this email, a reset link has been sent.';

const buildAuthUserDto = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  profilePicture: user.profilePicture,
  initials: buildInitials(user.username),
  role: user.role,
  ...(user.role === 'Participant' && { isVerified: Boolean(user.isVerified) }),
  ...(user.role === 'Host' && { verified: Boolean(user.verified) })
});

const verifyCaptcha = async (token) => {
  if (!token) return false;

  const SECRET_KEY = '6Lfi1BMtAAAAACeIw8auoSDS_iacB_xj3m7YtmFB';
  try {
    const params = new URLSearchParams({
      secret: SECRET_KEY,
      response: token
    });
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?${params.toString()}`,
      { method: 'POST' }
    );
    const data = await response.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
};

// POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { username, email, password, role, gender, age, description, socialMedia, captchaToken } = req.body;
    const normalizedUsername = normalizeString(username);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedUsername) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    if (!['Participant', 'Host'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (role === 'Participant' && !isGermanUniversityEmail(normalizedEmail)) {
      return res.status(400).json({
        message: 'Participants must register with a valid German university email address'
      });
    }

    // Verify captcha
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return res.status(400).json({ message: 'Captcha verification failed. Please try again.' });
    }

    // Check if email already exists
    const existingUser = await Account.findOne(buildExactEmailQuery(normalizedEmail));
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    let user;

    if (role === 'Participant') {
      user = await Participant.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        role: 'Participant',
        gender: gender || null,
        age: age || null
      });

      const verificationToken = user.generateVerificationToken();
      await user.save();
      await sendVerificationEmail(user.email, user.username, verificationToken);

      return res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        initials: buildInitials(user.username),
        role: user.role,
        isVerified: user.isVerified,
        message: 'Registration successful! Please check your email to verify your account.'
      });

    } else if (role === 'Host') {

      if (!socialMedia || !socialMedia.platform || !socialMedia.username) {
        return res.status(400).json({
          message: 'Please provide your social media account for verification'
        });
      }

      const hostVerificationToken = crypto.randomBytes(16).toString('hex').toUpperCase();

      user = await Host.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        role: 'Host',
        description: description || null,
        socialMedia: {
          platform: socialMedia.platform,
          username: socialMedia.username
        },
        verificationToken: hostVerificationToken
      });

      return res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        initials: buildInitials(user.username),
        role: user.role,
        verified: user.verified,
        socialMedia: user.socialMedia,
        hostVerificationToken,
        message: 'Registration successful! Please verify your account by sending us a DM.'
      });

    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !isValidEmailFormat(normalizedEmail) || !password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = await Account.findOne(buildExactEmailQuery(normalizedEmail)).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const now = Date.now();
    const temporaryDeactivationUntil = user.temporaryDeactivationUntil?.getTime?.() || 0;
    if (temporaryDeactivationUntil > now) {
      const minutesRemaining = Math.ceil((temporaryDeactivationUntil - now) / (60 * 1000));
      return res.status(423).json({
        message: `Account temporarily deactivated due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`
      });
    }

    if (temporaryDeactivationUntil && temporaryDeactivationUntil <= now) {
      user.temporaryDeactivationUntil = null;
      user.failedLoginAttempts = [];
      await user.save();
    }

    if (!user.active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const recentFailedAttempts = (user.failedLoginAttempts || []).filter((attemptedAt) => {
        return now - new Date(attemptedAt).getTime() <= FAILED_LOGIN_WINDOW_MS;
      });
      recentFailedAttempts.push(new Date(now));

      if (recentFailedAttempts.length >= FAILED_LOGIN_LIMIT) {
        user.temporaryDeactivationUntil = new Date(now + TEMPORARY_DEACTIVATION_MS);
        user.failedLoginAttempts = [];
        await user.save();

        return res.status(423).json({
          message: 'Account temporarily deactivated for 10 minutes due to too many failed login attempts.'
        });
      }

      user.failedLoginAttempts = recentFailedAttempts;
      await user.save();
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.failedLoginAttempts = [];
    user.temporaryDeactivationUntil = null;
    await user.save();

    // Admin accounts bypass all verification checks and go straight through
    if (user.role === 'Admin') {
      return res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        initials: buildInitials(user.username),
        role: user.role,
        token: generateToken(user, rememberMe)
      });
    }

    // Participant must verify email before login
    if (user.role === 'Participant' && !user.isVerified) {
      return res.status(401).json({
        message: 'Please verify your email address before logging in. Check your inbox!'
      });
    }

    // Host must be manually verified before login
    if (user.role === 'Host' && !user.verified) {
      return res.status(401).json({
        message: 'Your host account is pending verification. Please send your token as a DM to our Instagram or LinkedIn and wait for approval.'
      });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      initials: buildInitials(user.username),
      role: user.role,
      ...(user.role === 'Participant' && { isVerified: user.isVerified }),
      ...(user.role === 'Host' && { verified: user.verified }),
      token: generateToken(user, rememberMe)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await Account.findById(req.userId).select('username email profilePicture role isVerified verified');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(buildAuthUserDto(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/verify-email?token=...
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        message: 'Invalid or expired verification link'
      });
    }

    const hashedToken = Account.hashToken(token);
    const user = await Participant.findOne({
      verificationToken: { $in: [hashedToken, token] },
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification link'
      });
    }

    if (user.isVerified) {
      user.verificationToken = undefined;
      user.verificationTokenExpiry = undefined;
      await user.save();
      return res.json({ message: 'Email verified successfully! You can now log in.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/validate-participant-email?email=...
const validateParticipantEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!isGermanUniversityEmail(email)) {
      return res.status(400).json({
        message: 'Participants must register with a valid German university email address'
      });
    }

    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
      return res.json({
        message: GENERIC_PASSWORD_RESET_MESSAGE
      });
    }

    const user = await Account.findOne(buildExactEmailQuery(normalizedEmail));

    if (!user) {
      return res.json({
        message: GENERIC_PASSWORD_RESET_MESSAGE
      });
    }

    const lastResetRequestAt = user.resetPasswordRequestedAt?.getTime?.() || 0;

    if (lastResetRequestAt && Date.now() - lastResetRequestAt < PASSWORD_RESET_COOLDOWN_MS) {
      return res.json({
        message: GENERIC_PASSWORD_RESET_MESSAGE
      });
    }

    const resetToken = user.generateResetPasswordToken();
    user.resetPasswordRequestedAt = new Date();
    await user.save();
    await sendPasswordResetEmail(user.email, user.username, resetToken);

    res.json({
      message: GENERIC_PASSWORD_RESET_MESSAGE
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({
        message: 'Invalid or expired reset link'
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const hashedToken = Account.hashToken(token);
    const user = await Account.findOne({
      resetPasswordToken: { $in: [hashedToken, token] },
      resetPasswordTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset link'
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpiry = undefined;
    user.resetPasswordRequestedAt = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ message: 'Password reset successful! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, loginUser, getMe, verifyEmail, validateParticipantEmail, forgotPassword, resetPassword };
