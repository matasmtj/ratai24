import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../models/db.js';
import { config } from '../config.js';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../services/token.service.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { badRequest } from '../errors.js';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (pw) => typeof pw === 'string' && pw.length >= 8;
const validRoles = ['GUEST', 'USER', 'ADMIN'];

const RESET_MSG = 'We sent a message to that email address.';

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function register(req, res, next) {
  try {
    const { email, password, role } = req.body || {};
    
    // Validate email
    if (!email || !isValidEmail(email)) {
      throw badRequest('Valid email is required');
    }
    
    // Validate password
    if (!password || !isValidPassword(password)) {
      throw badRequest('Password must be at least 8 characters');
    }
    
    // Validate role (if provided)
    if (role && !validRoles.includes(role)) {
      throw badRequest(`Role must be one of: ${validRoles.join(', ')}`);
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ 
      data: { 
        email: email.toLowerCase().trim(), 
        passwordHash, 
        role: role || 'USER' 
      } 
    });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    // Handle duplicate email
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
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const access = signAccessToken(user);
    const { token: refresh, expiresAt } = await issueRefreshToken(user.id);
    res.json({ accessToken: access, refreshToken: refresh, refreshExpiresAt: expiresAt, role: user.role });
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
    const { email } = req.body || {};
    if (!email || !isValidEmail(String(email).trim())) {
      throw badRequest('Valid email is required');
    }

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
        await sendPasswordResetEmail({ to: user.email, resetUrl });
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
    if (!password || !isValidPassword(password)) {
      throw badRequest('Password must be at least 8 characters');
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
