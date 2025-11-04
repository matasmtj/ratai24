import bcrypt from 'bcryptjs';
import prisma from '../models/db.js';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../services/token.service.js';
import { badRequest } from '../errors.js';

export async function register(req, res, next) {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) throw badRequest('email and password are required');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash, role: role || 'USER' } });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e) { next(e); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw badRequest('email and password are required');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const access = signAccessToken(user);
    const { token: refresh, expiresAt } = await issueRefreshToken(user.id);
    res.json({ accessToken: access, refreshToken: refresh, refreshExpiresAt: expiresAt, role: user.role });
  } catch (e) { next(e); }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) throw badRequest('refreshToken is required');
    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) return res.status(401).json({ error: 'Invalid refresh token' });
    res.json(rotated);
  } catch (e) { next(e); }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) throw badRequest('refreshToken is required');
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (e) { next(e); }
}
