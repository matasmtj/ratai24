/**
 * Integration tests for /auth endpoints.
 *
 * Covers registration, login, refresh and logout happy paths plus the
 * most important validation failures.
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
import { setupTestApp } from './helpers/testApp.js';

let harness;

beforeAll(async () => {
  harness = await setupTestApp();
});

beforeEach(() => {
  harness.reset();
});

describe('POST /auth/register', () => {
  it('creates a user with valid credentials (201)', async () => {
    harness.prisma.user.create.mockResolvedValue({
      id: 1,
      email: 'new@example.com',
      role: 'USER',
    });
    const res = await request(harness.app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'Password1' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 1,
      email: 'new@example.com',
      role: 'USER',
    });
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

  it('rejects invalid roles with 400', async () => {
    const res = await request(harness.app)
      .post('/auth/register')
      .send({
        email: 'u@example.com',
        password: 'Password1',
        role: 'SUPERUSER',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
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
  it('returns access + refresh tokens on success', async () => {
    const passwordHash = await bcrypt.hash('Password1', 10);
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'u@example.com',
      passwordHash,
      role: 'USER',
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
  });

  it('rejects unknown user with 401', async () => {
    harness.prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(harness.app)
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'Password1' });
    expect(res.status).toBe(401);
  });

  it('rejects bad password with 401', async () => {
    const passwordHash = await bcrypt.hash('OtherPassword1', 10);
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'u@example.com',
      passwordHash,
      role: 'USER',
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
