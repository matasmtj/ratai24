/**
 * Integration tests for /api/pricing/* endpoints.
 *
 * Exercises the route → controller → service → Prisma(mocked) chain,
 * focusing on request validation and the shape of successful responses.
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

function userToken() {
  return jwt.sign(
    { sub: 42, role: 'USER', email: 'u@example.com' },
    process.env.JWT_SECRET
  );
}

// Helper: stub the Prisma surface that pricing.service needs so that
// calculateDynamicPrice completes without hitting a real DB.
function stubPricingDependencies() {
  // pricing.service calls findUnique TWICE: once with include:{city:true},
  // and then pricing.controller calls it again with a price-config select.
  harness.prisma.car.findUnique
    .mockResolvedValueOnce({
      id: 1,
      make: 'Toyota',
      model: 'Corolla',
      pricePerDay: 50,
      basePricePerDay: 50,
      minPricePerDay: 30,
      maxPricePerDay: 125,
      useDynamicPricing: true,
      cityId: 1,
      utilizationRate: 0.6,
      applyUtilizationPricing: true,
      utilizationMultiplierOverride: null,
      availableForLease: true,
      state: 'AVAILABLE',
      city: { id: 1, name: 'Vilnius' },
    })
    .mockResolvedValue({
      basePricePerDay: 50,
      minPricePerDay: 30,
      maxPricePerDay: 125,
      useDynamicPricing: true,
    });
  harness.prisma.car.count.mockResolvedValue(10);
  harness.prisma.contract.count.mockResolvedValue(4);
  harness.prisma.contract.findMany.mockResolvedValue([]);
  harness.prisma.seasonalFactor.findMany.mockResolvedValue([]);
  // pricing rules lookup – any table the service touches returns nothing.
  if (harness.prisma.pricingRule?.findMany)
    harness.prisma.pricingRule.findMany.mockResolvedValue([]);
  if (harness.prisma.priceSnapshot?.create)
    harness.prisma.priceSnapshot.create.mockResolvedValue({});
}

describe('POST /api/pricing/calculate', () => {
  it('rejects missing fields with 400', async () => {
    const res = await request(harness.app)
      .post('/api/pricing/calculate')
      .send({ carId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  it('rejects a non-positive carId with 400', async () => {
    const res = await request(harness.app)
      .post('/api/pricing/calculate')
      .send({
        carId: -5,
        startDate: '2026-06-01',
        endDate: '2026-06-07',
      });
    expect(res.status).toBe(400);
  });

  it('rejects endDate ≤ startDate with 400', async () => {
    const res = await request(harness.app)
      .post('/api/pricing/calculate')
      .send({
        carId: 1,
        startDate: '2026-06-07',
        endDate: '2026-06-01',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/after start/i);
  });
});

describe('GET /api/pricing/preview/:carId', () => {
  it('returns a price preview (200)', async () => {
    stubPricingDependencies();
    const res = await request(harness.app)
      .get('/api/pricing/preview/1')
      .query({ duration: 7 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pricePerDay');
    expect(res.body).toHaveProperty('totalPrice');
    expect(res.body).toHaveProperty('duration');
    expect(res.body.pricingConfig).toHaveProperty('basePricePerDay', 50);
  });

  it('rejects an invalid carId with 400', async () => {
    const res = await request(harness.app).get('/api/pricing/preview/-1');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/pricing/loyalty', () => {
  it('returns 401 without a token', async () => {
    const res = await request(harness.app).get('/api/pricing/loyalty');
    expect(res.status).toBe(401);
  });

  it('returns a loyalty envelope for an authenticated user', async () => {
    harness.prisma.contract.findMany.mockResolvedValue([]);
    const res = await request(harness.app)
      .get('/api/pricing/loyalty')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tier');
    expect(res.body).toHaveProperty('discount');
  });
});

describe('POST /api/pricing/calculate — static cars + loyalty', () => {
  it('applies loyalty multiplier to fixed pricePerDay', async () => {
    harness.prisma.car.findUnique.mockResolvedValue({
      id: 9,
      pricePerDay: 100,
      useDynamicPricing: false,
      availableForLease: true,
      state: 'AVAILABLE',
      cityId: 3,
      city: { id: 3, name: 'Kaunas' },
    });
    harness.prisma.contract.findMany.mockResolvedValue(
      Array.from({ length: 7 }, () => ({
        totalPrice: 50,
        state: 'COMPLETED',
        endDate: new Date(2019, 5, 1),
      }))
    );
    harness.prisma.pricingRule.findMany.mockResolvedValue([]);
    const res = await request(harness.app)
      .post('/api/pricing/calculate')
      .send({
        carId: 9,
        userId: 5,
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      });
    expect(res.status).toBe(200);
    expect(res.body.isDynamic).toBe(false);
    expect(res.body.breakdown.multipliers.customer).toBeCloseTo(0.92, 5);
    expect(res.body.pricePerDay).toBeCloseTo(92, 5);
    expect(res.body.totalPrice).toBeCloseTo(368, 5);
  });
});

describe('POST /api/pricing/calculate — pricing rules query', () => {
  it('scopes active rules by car/city/global AND rental date window', async () => {
    stubPricingDependencies();
    harness.prisma.pricingRule.findMany.mockImplementation((args) => {
      expect(Array.isArray(args.where.AND)).toBe(true);
      expect(args.where.AND).toHaveLength(2);
      const scopeOr = args.where.AND[0].OR;
      expect(scopeOr).toEqual(
        expect.arrayContaining([
          { carId: 1 },
          { cars: { some: { carId: 1 } } },
          { carId: null, cityId: 1, cars: { none: {} } },
          { carId: null, cityId: null, cars: { none: {} } },
        ])
      );
      return Promise.resolve([]);
    });
    const res = await request(harness.app)
      .post('/api/pricing/calculate')
      .send({
        carId: 1,
        startDate: '2026-06-01',
        endDate: '2026-06-08',
      });
    expect(res.status).toBe(200);
    expect(harness.prisma.pricingRule.findMany).toHaveBeenCalled();
  });
});
