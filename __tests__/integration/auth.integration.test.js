/**
 * Integration tests for /auth endpoints.
 *
 * Covers registration, login, refresh, logout and the email verification
 * flow plus the most important validation failures.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { setupTestApp } from './helpers/testApp.js';

let harness;

beforeAll(async () => {
  harness = await setupTestApp();
});

beforeEach(() => {
  harness.reset();
});

describe('POST /auth/register', () => {
  it('creates a user with valid credentials (201) and reports verification email sent', async () => {
    harness.prisma.user.create.mockResolvedValue({
      id: 1,
      email: 'new@example.com',
      role: 'USER',
      emailVerified: false,
    });
    harness.prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    harness.prisma.emailVerificationToken.create.mockResolvedValue({});

    const res = await request(harness.app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'Password1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 1,
      email: 'new@example.com',
      role: 'USER',
      emailVerified: false,
      message: 'VERIFICATION_EMAIL_SENT',
    });
    // The created user is always a USER and starts unverified.
    expect(harness.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          role: 'USER',
          emailVerified: false,
        }),
      })
    );
  });

  it('rejects invalid emails with 400', async () => {
    const res = await request(harness.app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('rejects weak passwords with 400', async () => {
    const res = await request(harness.app)
      .post('/auth/register')
      .send({ email: 'u@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it('ignores client-supplied role and always creates a USER (anti-privilege-escalation)', async () => {
    harness.prisma.user.create.mockResolvedValue({
      id: 2,
      email: 'sneaky@example.com',
      role: 'USER',
      emailVerified: false,
    });
    harness.prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    harness.prisma.emailVerificationToken.create.mockResolvedValue({});

    const res = await request(harness.app)
      .post('/auth/register')
      .send({
        email: 'sneaky@example.com',
        password: 'Password1',
        role: 'ADMIN',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('USER');
    expect(harness.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'USER' }),
      })
    );
  });

  it('returns 409 on duplicate email', async () => {
    harness.prisma.user.create.mockRejectedValue({ code: 'P2002' });
    const res = await request(harness.app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'Password1' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });
});

describe('POST /auth/login', () => {
  it('returns access + refresh tokens when the email is verified', async () => {
    const passwordHash = await bcrypt.hash('Password1', 10);
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'u@example.com',
      passwordHash,
      role: 'USER',
      emailVerified: true,
      phoneNumber: '+37060000000',
    });
    harness.prisma.refreshToken.create.mockResolvedValue({
      token: 'refresh-token',
    });

    const res = await request(harness.app)
      .post('/auth/login')
      .send({ email: 'u@example.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.role).toBe('USER');
    expect(res.body.needsPhone).toBe(false);
  });

  it('returns needsPhone true when USER has no phone number', async () => {
    const passwordHash = await bcrypt.hash('Password1', 10);
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'nophone@example.com',
      passwordHash,
      role: 'USER',
      emailVerified: true,
      phoneNumber: null,
    });
    harness.prisma.refreshToken.create.mockResolvedValue({
      token: 'refresh-token',
    });

    const res = await request(harness.app)
      .post('/auth/login')
      .send({ email: 'nophone@example.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.needsPhone).toBe(true);
  });

  it('returns 403 EMAIL_NOT_VERIFIED when a non-admin user has not verified their address', async () => {
    const passwordHash = await bcrypt.hash('Password1', 10);
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'unverified@example.com',
      passwordHash,
      role: 'USER',
      emailVerified: false,
    });

    const res = await request(harness.app)
      .post('/auth/login')
      .send({ email: 'unverified@example.com', password: 'Password1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('EMAIL_NOT_VERIFIED');
  });

  it('allows an admin to log in even if emailVerified is false (grandfathered/bypass)', async () => {
    const passwordHash = await bcrypt.hash('Password1', 10);
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      emailVerified: false,
    });
    harness.prisma.refreshToken.create.mockResolvedValue({
      token: 'refresh-token',
    });

    const res = await request(harness.app)
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ADMIN');
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects unknown user with 401', async () => {
    harness.prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(harness.app)
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'Password1' });
    expect(res.status).toBe(401);
  });

  it('returns 401 USE_GOOGLE_SIGNIN when account has no password', async () => {
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'googleonly@example.com',
      passwordHash: null,
      role: 'USER',
      emailVerified: true,
      googleId: 'google-sub-123',
    });

    const res = await request(harness.app)
      .post('/auth/login')
      .send({ email: 'googleonly@example.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('USE_GOOGLE_SIGNIN');
  });

  it('rejects bad password with 401', async () => {
    const passwordHash = await bcrypt.hash('OtherPassword1', 10);
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'u@example.com',
      passwordHash,
      role: 'USER',
      emailVerified: true,
    });
    const res = await request(harness.app)
      .post('/auth/login')
      .send({ email: 'u@example.com', password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('requires a refreshToken in the body (400)', async () => {
    const res = await request(harness.app).post('/auth/logout').send({});
    expect(res.status).toBe(400);
  });

  it('returns 204 on successful revoke', async () => {
    harness.prisma.refreshToken.delete.mockResolvedValue({});
    const res = await request(harness.app)
      .post('/auth/logout')
      .send({ refreshToken: 'some-token' });
    expect(res.status).toBe(204);
  });
});

describe('POST /auth/verify-email', () => {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(plainToken, 'utf8').digest('hex');

  it('verifies the user and clears all of their verification tokens (204)', async () => {
    harness.prisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 1,
      tokenHash,
      userId: 42,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    harness.prisma.user.update.mockResolvedValue({});
    harness.prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(harness.app)
      .post('/auth/verify-email')
      .send({ token: plainToken });

    expect(res.status).toBe(204);
    expect(harness.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: expect.objectContaining({
          emailVerified: true,
          emailVerifiedAt: expect.any(Date),
        }),
      })
    );
  });

  it('returns 400 INVALID_TOKEN when the token is missing or too short', async () => {
    const res = await request(harness.app)
      .post('/auth/verify-email')
      .send({ token: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('returns 400 INVALID_TOKEN when the token is unknown', async () => {
    harness.prisma.emailVerificationToken.findUnique.mockResolvedValue(null);
    const res = await request(harness.app)
      .post('/auth/verify-email')
      .send({ token: plainToken });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('returns 400 EXPIRED_TOKEN when the token has expired', async () => {
    harness.prisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 1,
      tokenHash,
      userId: 42,
      expiresAt: new Date(Date.now() - 60 * 1000),
    });
    const res = await request(harness.app)
      .post('/auth/verify-email')
      .send({ token: plainToken });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('EXPIRED_TOKEN');
  });
});

describe('POST /auth/resend-verification', () => {
  it('returns a generic 200 even when the email is unknown (no enumeration)', async () => {
    harness.prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(harness.app)
      .post('/auth/resend-verification')
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(harness.prisma.emailVerificationToken.create).not.toHaveBeenCalled();
  });

  it('does not issue a new token for already-verified users', async () => {
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'verified@example.com',
      emailVerified: true,
    });
    const res = await request(harness.app)
      .post('/auth/resend-verification')
      .send({ email: 'verified@example.com' });
    expect(res.status).toBe(200);
    expect(harness.prisma.emailVerificationToken.create).not.toHaveBeenCalled();
  });

  it('issues a new token for unverified users', async () => {
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'pending@example.com',
      emailVerified: false,
    });
    harness.prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    harness.prisma.emailVerificationToken.create.mockResolvedValue({});

    const res = await request(harness.app)
      .post('/auth/resend-verification')
      .send({ email: 'pending@example.com' });

    expect(res.status).toBe(200);
    expect(harness.prisma.emailVerificationToken.create).toHaveBeenCalledTimes(1);
  });

  it('returns 400 on an invalid email', async () => {
    const res = await request(harness.app)
      .post('/auth/resend-verification')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
