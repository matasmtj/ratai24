import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../models/db.js';
import { config } from '../config.js';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../services/token.service.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email.service.js';
import { verifyGoogleIdToken } from '../services/googleAuth.service.js';
import { validatePasswordStrength } from '../lib/passwordValidation.js';
import { badRequest } from '../errors.js';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const RESET_MSG = 'We sent a message to that email address.';
const VERIFICATION_MSG = 'If the address is registered and unverified, a verification email has been sent.';
const SUPPORTED_RESET_LANGUAGES = new Set(['lt', 'en', 'ru']);

function normalizeResetLanguage(value) {
  if (typeof value !== 'string') return 'lt';
  const normalized = value.trim().toLowerCase();
  return SUPPORTED_RESET_LANGUAGES.has(normalized) ? normalized : 'lt';
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verification tokens use the same primitives as reset tokens. Aliased for clarity.
const hashVerificationToken = hashResetToken;
const generateVerificationToken = generateResetToken;

function userNeedsPhone(user) {
  return user.role === 'USER' && !String(user.phoneNumber || '').trim();
}

async function issueAuthTokens(user, res) {
  const access = signAccessToken(user);
  const { token: refresh, expiresAt } = await issueRefreshToken(user.id);
  res.json({
    accessToken: access,
    refreshToken: refresh,
    refreshExpiresAt: expiresAt,
    role: user.role,
    needsPhone: userNeedsPhone(user),
  });
}

async function issueVerificationEmail(user, language) {
  const plainToken = generateVerificationToken();
  const tokenHash = hashVerificationToken(plainToken);
  const expiresAt = new Date(
    Date.now() + config.emailVerificationExpiresHours * 60 * 60 * 1000
  );

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
    prisma.emailVerificationToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    }),
  ]);

  const verifyUrl = `${config.frontendUrl}/verify-email?token=${encodeURIComponent(plainToken)}`;

  await sendVerificationEmail({ to: user.email, verifyUrl, language });
}

export async function register(req, res, next) {
  try {
    const { email, password, language } = req.body || {};

    if (!email || !isValidEmail(email)) {
      throw badRequest('Valid email is required');
    }

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.ok) {
      throw badRequest(pwCheck.error);
    }

    // Public registration always creates a USER. Elevated roles must be
    // created via the admin-only POST /users endpoint.
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'USER',
        emailVerified: false,
      },
    });

    try {
      await issueVerificationEmail(user, language);
    } catch (e) {
      console.error('[auth] verification email failed on register:', e);
    }

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      message: 'VERIFICATION_EMAIL_SENT',
    });
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !isValidEmail(email)) {
      throw badRequest('Valid email is required');
    }

    if (!password || typeof password !== 'string') {
      throw badRequest('Password is required');
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'USE_GOOGLE_SIGNIN' });
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Admins are exempt from email verification (defense-in-depth against a
    // stale DB state where the grandfather migration hasn't run yet).
    if (user.role !== 'ADMIN' && !user.emailVerified) {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before signing in.',
      });
    }

    await issueAuthTokens(user, res);
  } catch (e) {
    next(e);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw badRequest('refreshToken is required');
    }
    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    res.json(rotated);
  } catch (e) { 
    next(e); 
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw badRequest('refreshToken is required');
    }
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (e) { 
    next(e); 
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email, language } = req.body || {};
    if (!email || !isValidEmail(String(email).trim())) {
      throw badRequest('Valid email is required');
    }
    const preferredLanguage = normalizeResetLanguage(language);

    const normalized = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (user) {
      const plainToken = generateResetToken();
      const tokenHash = hashResetToken(plainToken);
      const expiresAt = new Date(
        Date.now() + config.passwordResetExpiresHours * 60 * 60 * 1000
      );

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: { tokenHash, userId: user.id, expiresAt },
        }),
      ]);

      const resetUrl = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(plainToken)}`;

      try {
        await sendPasswordResetEmail({ to: user.email, resetUrl, language });

      } catch (e) {
        console.error('[auth] forgot-password email failed:', e);
      }
    }

    res.status(200).json({ message: RESET_MSG });
  } catch (e) {
    next(e);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};
    if (!token || typeof token !== 'string' || token.length < 32) {
      throw badRequest('Invalid or missing reset token');
    }
    const pwReset = validatePasswordStrength(password);
    if (!pwReset.ok) {
      throw badRequest(pwReset.error);
    }

    const tokenHash = hashResetToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
      prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({ error: 'INVALID_TOKEN' });
    }

    const tokenHash = hashVerificationToken(token);
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return res.status(400).json({ error: 'INVALID_TOKEN' });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'EXPIRED_TOKEN' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { email, language } = req.body || {};
    if (!email || !isValidEmail(String(email).trim())) {
      throw badRequest('Valid email is required');
    }

    const normalized = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (user && !user.emailVerified) {
      try {
        await issueVerificationEmail(user, language);
      } catch (e) {
        console.error('[auth] resend-verification email failed:', e);
      }
    }

    res.status(200).json({ message: VERIFICATION_MSG });
  } catch (e) {
    next(e);
  }
}

export async function googleAuth(req, res, next) {
  try {
    const { credential } = req.body || {};
    if (!credential || typeof credential !== 'string') {
      throw badRequest('Google credential is required');
    }
    if (!config.googleClientId) {
      return res.status(503).json({ error: 'Google sign-in is not configured' });
    }

    let profile;
    try {
      profile = await verifyGoogleIdToken(credential);
    } catch (e) {
      console.error('[auth] Google token verification failed:', e);
      return res.status(401).json({ error: 'Invalid Google credential' });
    }

    if (!profile.emailVerified) {
      return res.status(403).json({ error: 'GOOGLE_EMAIL_NOT_VERIFIED' });
    }

    let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: profile.email } });
    }

    if (user) {
      if (user.googleId && user.googleId !== profile.googleId) {
        return res.status(409).json({ error: 'Email linked to a different Google account' });
      }

      const updates = {
        googleId: profile.googleId,
        emailVerified: true,
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
      };
      if (!user.firstName && profile.firstName) updates.firstName = profile.firstName;
      if (!user.lastName && profile.lastName) updates.lastName = profile.lastName;

      user = await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: 'USER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    await issueAuthTokens(user, res);
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'Account conflict — try another sign-in method' });
    }
    next(e);
  }
}
