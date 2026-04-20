/**
 * Integration tests for /contracts endpoints.
 *
 * Covers the booking lifecycle: listing (admin only), fetching "my"
 * contracts, creating a reservation with static pricing and rejecting
 * calendar conflicts / missing cars, plus the admin-only activation flow.
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

function userToken(id = 2) {
  return jwt.sign(
    { sub: id, role: 'USER', email: `u${id}@example.com` },
    process.env.JWT_SECRET
  );
}

function nextWeek(daysOffset = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(10, 0, 0, 0);
  return d;
}

describe('GET /contracts', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(harness.app).get('/contracts');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users with 403', async () => {
    const res = await request(harness.app)
      .get('/contracts')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns all contracts for admin (200)', async () => {
    harness.prisma.contract.findMany.mockResolvedValue([
      { id: 1, userId: 2, state: 'ACTIVE' },
      { id: 2, userId: 3, state: 'DRAFT' },
    ]);
    const res = await request(harness.app)
      .get('/contracts')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /contracts/my', () => {
  it('returns 401 without a token', async () => {
    const res = await request(harness.app).get('/contracts/my');
    expect(res.status).toBe(401);
  });

  it('returns only the caller\u2019s contracts (200)', async () => {
    harness.prisma.contract.findMany.mockResolvedValue([
      { id: 10, userId: 2, state: 'ACTIVE' },
    ]);
    const res = await request(harness.app)
      .get('/contracts/my')
      .set('Authorization', `Bearer ${userToken(2)}`);
    expect(res.status).toBe(200);
    const where = harness.prisma.contract.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe(2);
  });
});

describe('POST /contracts', () => {
  const validBody = {
    carId: 1,
    startDate: nextWeek(7).toISOString(),
    endDate: nextWeek(10).toISOString(),
    mileageStartKm: 10000,
    fuelLevelStartPct: 80,
  };

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(harness.app).post('/contracts').send(validBody);
    expect(res.status).toBe(401);
  });

  it('rejects invalid dates with 400 (endDate <= startDate)', async () => {
    harness.prisma.car.findUnique.mockResolvedValue({
      id: 1,
      pricePerDay: 40,
      useDynamicPricing: false,
      state: 'AVAILABLE',
    });
    const res = await request(harness.app)
      .post('/contracts')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({
        ...validBody,
        startDate: nextWeek(10).toISOString(),
        endDate: nextWeek(7).toISOString(),
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/date/i);
  });

  it('returns 400 when the car does not exist', async () => {
    harness.prisma.car.findUnique.mockResolvedValue(null);
    const res = await request(harness.app)
      .post('/contracts')
      .set('Authorization', `Bearer ${userToken()}`)
      .send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/carId/);
  });

  it('rejects when the calendar slot overlaps an existing reservation (400)', async () => {
    harness.prisma.car.findUnique.mockResolvedValue({
      id: 1,
      pricePerDay: 40,
      useDynamicPricing: false,
      state: 'AVAILABLE',
    });
    harness.prisma.contract.count.mockResolvedValue(0);
    harness.prisma.contract.findFirst.mockResolvedValueOnce({
      id: 99,
      carId: 1,
    });
    const res = await request(harness.app)
      .post('/contracts')
      .set('Authorization', `Bearer ${userToken()}`)
      .send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/overlap/i);
  });

  it('creates a DRAFT reservation with static pricing (201)', async () => {
    harness.prisma.car.findUnique.mockResolvedValue({
      id: 1,
      pricePerDay: 40,
      useDynamicPricing: false,
      state: 'AVAILABLE',
    });
    harness.prisma.contract.count.mockResolvedValue(0);
    harness.prisma.contract.findFirst.mockResolvedValue(null);
    harness.prisma.carPrepBlock.findFirst.mockResolvedValue(null);
    harness.prisma.contract.create.mockResolvedValue({
      id: 100,
      carId: 1,
      userId: 2,
      totalPrice: 120,
      state: 'DRAFT',
    });
    const res = await request(harness.app)
      .post('/contracts')
      .set('Authorization', `Bearer ${userToken(2)}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(100);
    expect(res.body.state).toBe('DRAFT');
  });
});

describe('POST /contracts/:id/activate', () => {
  it('rejects non-admin callers with 403', async () => {
    const res = await request(harness.app)
      .post('/contracts/1/activate')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when the contract does not exist', async () => {
    harness.prisma.contract.findUnique.mockResolvedValue(null);
    const res = await request(harness.app)
      .post('/contracts/999/activate')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns 409 when the contract is not in DRAFT state', async () => {
    harness.prisma.contract.findUnique.mockResolvedValue({
      id: 1,
      state: 'ACTIVE',
    });
    const res = await request(harness.app)
      .post('/contracts/1/activate')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(409);
  });

  it('activates a DRAFT contract and returns 200', async () => {
    harness.prisma.contract.findUnique.mockResolvedValue({
      id: 1,
      carId: 5,
      state: 'DRAFT',
    });
    harness.prisma.contract.update.mockResolvedValue({
      id: 1,
      state: 'ACTIVE',
    });
    harness.prisma.car.update.mockResolvedValue({});
    const res = await request(harness.app)
      .post('/contracts/1/activate')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('ACTIVE');
  });
});

describe('POST /contracts/:id/cancel', () => {
  it('rejects other users trying to cancel another user\u2019s contract (403)', async () => {
    harness.prisma.contract.findUnique.mockResolvedValue({
      id: 1,
      userId: 99,
      state: 'DRAFT',
    });
    const res = await request(harness.app)
      .post('/contracts/1/cancel')
      .set('Authorization', `Bearer ${userToken(2)}`);
    expect(res.status).toBe(403);
  });

  it('returns 409 when the contract is already completed', async () => {
    harness.prisma.contract.findUnique.mockResolvedValue({
      id: 1,
      userId: 2,
      state: 'COMPLETED',
    });
    const res = await request(harness.app)
      .post('/contracts/1/cancel')
      .set('Authorization', `Bearer ${userToken(2)}`);
    expect(res.status).toBe(409);
  });

  it('cancels a DRAFT contract owned by the caller (200)', async () => {
    harness.prisma.contract.findUnique.mockResolvedValue({
      id: 1,
      userId: 2,
      state: 'DRAFT',
    });
    harness.prisma.contract.update.mockResolvedValue({
      id: 1,
      state: 'CANCELLED',
    });
    const res = await request(harness.app)
      .post('/contracts/1/cancel')
      .set('Authorization', `Bearer ${userToken(2)}`);
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('CANCELLED');
  });
});
