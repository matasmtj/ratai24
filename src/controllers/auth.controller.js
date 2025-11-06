import bcrypt from 'bcryptjs';
import prisma from '../models/db.js';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../services/token.service.js';
import { badRequest } from '../errors.js';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (pw) => typeof pw === 'string' && pw.length >= 8;
const validRoles = ['GUEST', 'USER', 'ADMIN'];

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
