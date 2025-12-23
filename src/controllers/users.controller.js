import { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../errors.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
        firstName: true,
        lastName: true,
        phoneNumber: true,
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

    // Name updates
    if (data.firstName !== undefined) {
      updates.firstName = data.firstName ? String(data.firstName).trim() : null;
    }
    if (data.lastName !== undefined) {
      updates.lastName = data.lastName ? String(data.lastName).trim() : null;
    }
    if (data.phoneNumber !== undefined) {
      updates.phoneNumber = data.phoneNumber ? String(data.phoneNumber).trim() : null;
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
        firstName: true,
        lastName: true,
        phoneNumber: true,
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

// ========== ADMIN ONLY ENDPOINTS ==========

// GET /users - List all users (Admin only)
export const listUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    
    const where = {};
    
    // Filter by role
    if (role && ['GUEST', 'USER', 'ADMIN'].includes(role)) {
      where.role = role;
    }
    
    // Search by email, firstName, or lastName
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (e) {
    next(e);
  }
};

// GET /users/:id - Get specific user (Admin only)
export const getUserById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw badRequest('Invalid user ID');

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw notFound('User not found');

    res.json(user);
  } catch (e) {
    next(e);
  }
};

// POST /users - Create new user (Admin only)
export const createUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phoneNumber, role } = req.body || {};

    if (!email || !password) {
      throw badRequest('Email and password are required');
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      throw badRequest('Invalid email format');
    }

    if (!isValidPassword(password)) {
      throw badRequest('Password must be at least 8 characters');
    }

    const validRoles = ['GUEST', 'USER', 'ADMIN'];
    const userRole = role && validRoles.includes(role) ? role : 'USER';

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash,
        firstName: firstName ? String(firstName).trim() : null,
        lastName: lastName ? String(lastName).trim() : null,
        phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
        role: userRole,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(user);
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    next(e);
  }
};

// PUT /users/:id - Update user (Admin only)
export const updateUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw badRequest('Invalid user ID');

    const data = { ...(req.body ?? {}) };
    if (typeof data !== 'object' || Array.isArray(data)) {
      throw badRequest('Body must be an object');
    }

    const updates = {};

    // Email update
    if (data.email !== undefined) {
      const email = String(data.email).trim().toLowerCase();
      if (!isValidEmail(email)) throw badRequest('Invalid email format');
      updates.email = email;
    }

    // Name updates
    if (data.firstName !== undefined) {
      updates.firstName = data.firstName ? String(data.firstName).trim() : null;
    }
    if (data.lastName !== undefined) {
      updates.lastName = data.lastName ? String(data.lastName).trim() : null;
    }
    if (data.phoneNumber !== undefined) {
      updates.phoneNumber = data.phoneNumber ? String(data.phoneNumber).trim() : null;
    }

    // Password update
    if (data.password !== undefined) {
      if (!isValidPassword(data.password)) {
        throw badRequest('Password must be at least 8 characters');
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.passwordHash = hashedPassword;

      // Revoke all refresh tokens for security
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    // Role update (admin can change roles)
    if (data.role !== undefined) {
      const validRoles = ['GUEST', 'USER', 'ADMIN'];
      if (!validRoles.includes(data.role)) {
        throw badRequest('Invalid role. Must be GUEST, USER, or ADMIN');
      }
      updates.role = data.role;
    }

    if (Object.keys(updates).length === 0) {
      throw badRequest('No valid fields to update');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
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

// DELETE /users/:id - Delete user (Admin only)
export const deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw badRequest('Invalid user ID');

    // Prevent admin from deleting themselves
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id } });

    res.status(204).send();
  } catch (e) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(e);
  }
};
