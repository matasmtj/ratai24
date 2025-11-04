import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';
const prisma = new PrismaClient();

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpires });
}

export async function issueRefreshToken(userId) {
  const token = cryptoRandom();
  const expiresAt = new Date(Date.now() + config.refreshExpiresDays * 24*60*60*1000);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

export async function rotateRefreshToken(oldToken) {
  const existing = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!existing || existing.expiresAt < new Date()) return null;
  await prisma.refreshToken.delete({ where: { token: oldToken } });
  const { token, expiresAt } = await issueRefreshToken(existing.userId);
  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  const access = signAccessToken(user);
  return { accessToken: access, refreshToken: token, refreshExpiresAt: expiresAt };
}

export async function revokeRefreshToken(token) {
  try { await prisma.refreshToken.delete({ where: { token } }); } catch {}
}

function cryptoRandom(len=48) {
  return crypto.randomBytes(len).toString('hex');
}
