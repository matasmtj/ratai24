import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';
import bcrypt from 'bcryptjs';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) => typeof password === 'string' && password.length >= 8;

// GET /users/me - Get current user profile
export const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) throw notFound('User not found');

    res.json(user);
  } catch (e) {
    next(e);
  }
};

// PUT /users/me - Update current user profile
export const updateMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = { ...(req.body ?? {}) };
    if (typeof data !== 'object' || Array.isArray(data)) throw badRequest('body must be an object');

    const updates = {};

    // Email update
    if (data.email !== undefined) {
      const email = String(data.email).trim().toLowerCase();
      if (!isValidEmail(email)) throw badRequest('Invalid email format');
      updates.email = email;
    }

    // Password update
    if (data.password !== undefined) {
      if (!isValidPassword(data.password)) {
        throw badRequest('Password must be at least 8 characters');
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.passwordHash = hashedPassword;
      
      // If password changed, revoke all refresh tokens for security
      await prisma.refreshToken.deleteMany({
        where: { userId: req.user.id }
      });
    }

    // Don't allow role changes via this endpoint (security)
    if (data.role !== undefined) {
      throw badRequest('Cannot change role via this endpoint');
    }

    if (Object.keys(updates).length === 0) {
      throw badRequest('No valid fields to update');
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updates,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updated);
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(e);
  }
};
