/**
 * Integration tests for /cities endpoints.
 *
 * These tests fire real HTTP requests against the full Express app via
 * Supertest. Prisma is mocked at the `@prisma/client` module level, so
 * each test prescribes the DB behaviour it expects rather than talking
 * to PostgreSQL.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestApp } from './helpers/testApp.js';

let harness;

beforeAll(async () => {
  harness = await setupTestApp();
});

beforeEach(() => {
  harness.reset();
});

function adminToken() {
  return jwt.sign(
    { sub: 1, role: 'ADMIN', email: 'admin@example.com' },
    process.env.JWT_SECRET
  );
}

function userToken() {
  return jwt.sign(
    { sub: 2, role: 'USER', email: 'user@example.com' },
    process.env.JWT_SECRET
  );
}

describe('GET /cities', () => {
  it('returns the public list of cities (200)', async () => {
    harness.prisma.city.findMany.mockResolvedValue([
      { id: 1, name: 'Vilnius', country: 'Lithuania' },
      { id: 2, name: 'Kaunas', country: 'Lithuania' },
    ]);
    const res = await request(harness.app).get('/cities');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ name: 'Vilnius' });
  });
});

describe('GET /cities/:id', () => {
  it('returns a single city (200)', async () => {
    harness.prisma.city.findUnique.mockResolvedValue({
      id: 1,
      name: 'Vilnius',
      country: 'Lithuania',
    });
    const res = await request(harness.app).get('/cities/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('returns 404 when the city is missing', async () => {
    harness.prisma.city.findUnique.mockResolvedValue(null);
    const res = await request(harness.app).get('/cities/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('City not found');
  });

  it('returns 400 when id is not an integer', async () => {
    const res = await request(harness.app).get('/cities/abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/integer/i);
  });
});

describe('POST /cities', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(harness.app)
      .post('/cities')
      .send({ name: 'Klaipėda', country: 'Lithuania' });
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users with 403', async () => {
    const res = await request(harness.app)
      .post('/cities')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ name: 'Klaipėda', country: 'Lithuania' });
    expect(res.status).toBe(403);
  });

  it('creates a city when admin sends valid data (201)', async () => {
    harness.prisma.city.create.mockResolvedValue({
      id: 3,
      name: 'Klaipėda',
      country: 'Lithuania',
    });
    const res = await request(harness.app)
      .post('/cities')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Klaipėda', country: 'Lithuania' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(3);
    expect(harness.prisma.city.create).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid body with 400', async () => {
    const res = await request(harness.app)
      .post('/cities')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate city name', async () => {
    harness.prisma.city.create.mockRejectedValue({ code: 'P2002' });
    const res = await request(harness.app)
      .post('/cities')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Vilnius', country: 'Lithuania' });
    expect(res.status).toBe(409);
  });
});
