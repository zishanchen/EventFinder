import nodemailer from 'nodemailer';
import { FRONTEND_URL } from '../config/appConfig.js';

// Create Ethereal transporter — swap with real SMTP for production
const createTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',    // in Production: e.g., 'Gmail'
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,     // in Production: EventFinder Gmail account
      pass: testAccount.pass      // in Production: Gmail App Password
    }
  });

  return { transporter };
};

// ===== CORE SEND FUNCTION =====
export const sendEmail = async ({ to, subject, html }) => {
  const { transporter } = await createTransporter();

  const mailOptions = {
    from: '"EventFinder" <noreply@eventfinder.com>',
    to,
    subject,
    html
  };

  const info = await transporter.sendMail(mailOptions);

  console.log(`Email sent to ${to}`);
  console.log('Preview URL:', nodemailer.getTestMessageUrl(info));

  return nodemailer.getTestMessageUrl(info);
};

// ===== EMAIL TEMPLATES =====

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// 1. Verification email — on registration
export const sendVerificationEmail = async (email, username, verificationToken) => {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

  return sendEmail({
    to: email,
    subject: 'Verify your EventFinder account',
    html: getVerificationEmailHtml(escapeHtml(username), verificationUrl)
  });
};

// 2. Password reset email — on forgot password
export const sendPasswordResetEmail = async (email, username, resetToken) => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  return sendEmail({
    to: email,
    subject: 'Reset your EventFinder password',
    html: getPasswordResetEmailHtml(escapeHtml(username), resetUrl)
  });
};

// 3. Host verification token email — when an admin reactivates a pending host
export const sendHostVerificationTokenEmail = async (email, username, verificationToken) => {
  return sendEmail({
    to: email,
    subject: 'Your EventFinder host verification token',
    html: getHostVerificationTokenEmailHtml(escapeHtml(username), escapeHtml(verificationToken))
  });
};

// ===== HTML TEMPLATES =====

const getVerificationEmailHtml = (username, verificationUrl) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #7c3aed; margin: 0;">EventFinder</h1>
    </div>
    <div style="background: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
      <h2 style="color: #111827; margin: 0 0 16px;">Welcome, ${username}! 🎉</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Thank you for registering. Please verify your email address to complete your registration and start discovering events.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verificationUrl}" style="
          display: inline-block;
          padding: 14px 32px;
          background: #7c3aed;
          color: #ffffff;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          font-size: 16px;
        ">
          Verify Email Address
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; text-align: center;">
        This link expires in 24 hours.<br/>
        If you did not create an account, please ignore this email.
      </p>
    </div>
  </div>
`;

const getPasswordResetEmailHtml = (username, resetUrl) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #7c3aed; margin: 0;">EventFinder</h1>
    </div>
    <div style="background: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
      <h2 style="color: #111827; margin: 0 0 16px;">Reset your password</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Hi ${username}, we received a request to reset your password. Click the button below to choose a new one.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="
          display: inline-block;
          padding: 14px 32px;
          background: #7c3aed;
          color: #ffffff;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          font-size: 16px;
        ">
          Reset Password
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; text-align: center;">
        This link expires in 1 hour.<br/>
        If you did not request a password reset, please ignore this email.
      </p>
	    </div>
	  </div>
	`;

const getHostVerificationTokenEmailHtml = (username, verificationToken) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #7c3aed; margin: 0;">EventFinder</h1>
    </div>
    <div style="background: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
      <h2 style="color: #111827; margin: 0 0 16px;">Host account reactivated</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Hi ${username}, your host account was reactivated. Please send this verification token to EventFinder from your registered social media account:
      </p>
      <p style="font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #111827; text-align: center;">
        ${verificationToken}
      </p>
    </div>
  </div>
`;
