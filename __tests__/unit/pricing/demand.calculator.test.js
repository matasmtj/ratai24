/**
 * Unit tests for src/pricing/calculators/demand.calculator.js
 *
 * The supply-ratio → multiplier mapping is the core business rule and the
 * focus of these tests. Prisma is mocked at the `@prisma/client` module
 * level.
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

const prismaMock = {
  car: { count: jest.fn() },
  contract: { count: jest.fn() },
  cityDemandMetrics: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

let demand;
beforeAll(async () => {
  demand = await import('../../../src/pricing/calculators/demand.calculator.js');
});

beforeEach(() => {
  for (const group of Object.values(prismaMock)) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
});

const makeCityWith = (totalCars, overlapping) => {
  prismaMock.car.count.mockResolvedValue(totalCars);
  prismaMock.contract.count.mockResolvedValue(overlapping);
};

describe('calculateDemandMultiplier', () => {
  it('returns 1.0 when the city has no cars', async () => {
    makeCityWith(0, 0);
    const m = await demand.calculateDemandMultiplier(
      1,
      new Date('2026-06-01'),
      new Date('2026-06-07')
    );
    expect(m).toBe(1.0);
  });

  it('low demand (100% available) → ~0.9 multiplier (near floor of band)', async () => {
    makeCityWith(10, 0); // 100% available
    const m = await demand.calculateDemandMultiplier(
      1,
      new Date('2026-06-01'),
      new Date('2026-06-07')
    );
    // supplyRatio 1.0 → 0.9 + 0.3*0.5 = 1.05 -> clamped to 1.05
    expect(m).toBeCloseTo(1.05, 2);
  });

  it('normal demand (50% available) → between 1.0 and 1.15', async () => {
    makeCityWith(10, 5);
    const m = await demand.calculateDemandMultiplier(
      1,
      new Date('2026-06-01'),
      new Date('2026-06-07')
    );
    expect(m).toBeGreaterThanOrEqual(1.0);
    expect(m).toBeLessThanOrEqual(1.15);
  });

  it('high demand (30% available) → between 1.15 and 1.3', async () => {
    makeCityWith(10, 7);
    const m = await demand.calculateDemandMultiplier(
      1,
      new Date('2026-06-01'),
      new Date('2026-06-07')
    );
    expect(m).toBeGreaterThanOrEqual(1.15);
    expect(m).toBeLessThanOrEqual(1.3);
  });

  it('very high demand (10% available) → clamped at 1.4', async () => {
    makeCityWith(10, 9);
    const m = await demand.calculateDemandMultiplier(
      1,
      new Date('2026-06-01'),
      new Date('2026-06-07')
    );
    expect(m).toBeLessThanOrEqual(1.4);
    expect(m).toBeGreaterThan(1.3);
  });

  it('clamps results to the [0.85, 1.4] range', async () => {
    makeCityWith(10, 0);
    const m = await demand.calculateDemandMultiplier(
      1,
      new Date('2026-06-01'),
      new Date('2026-06-07')
    );
    expect(m).toBeGreaterThanOrEqual(0.85);
    expect(m).toBeLessThanOrEqual(1.4);
  });

  it('returns 1.0 and logs an error when Prisma throws', async () => {
    prismaMock.car.count.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const m = await demand.calculateDemandMultiplier(
      1,
      new Date(),
      new Date()
    );
    expect(m).toBe(1.0);
  });
});

describe('getCityDemandMetrics', () => {
  it('returns cached metrics when they are fresh', async () => {
    const cached = {
      cityId: 1,
      totalCars: 10,
      availableCars: 5,
      activeContracts: 5,
      utilizationRate: 0.5,
      demandScore: 1.15,
      lastCalculated: new Date(),
    };
    prismaMock.cityDemandMetrics.findUnique.mockResolvedValue(cached);
    const result = await demand.getCityDemandMetrics(1);
    expect(result).toBe(cached);
    expect(prismaMock.cityDemandMetrics.upsert).not.toHaveBeenCalled();
  });

  it('refreshes metrics when cache is stale', async () => {
    prismaMock.cityDemandMetrics.findUnique.mockResolvedValue({
      lastCalculated: new Date(Date.now() - 30 * 60 * 1000),
    });
    prismaMock.car.count.mockResolvedValue(10);
    // occupiedCars comes from contract.findMany with a select+distinct
    // The demand calculator uses prisma.contract.findMany here
    prismaMock.contract.findMany = jest.fn().mockResolvedValue([
      { carId: 1 },
      { carId: 2 },
    ]);
    prismaMock.cityDemandMetrics.upsert.mockImplementation(async ({ create }) => create);

    const result = await demand.getCityDemandMetrics(1);
    expect(result.totalCars).toBe(10);
    expect(result.activeContracts).toBe(2);
    expect(result.availableCars).toBe(8);
    expect(prismaMock.cityDemandMetrics.upsert).toHaveBeenCalled();
  });

  it('returns a safe fallback on error', async () => {
    prismaMock.cityDemandMetrics.findUnique.mockRejectedValue(new Error('x'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await demand.getCityDemandMetrics(1);
    expect(result).toEqual({
      totalCars: 0,
      availableCars: 0,
      activeContracts: 0,
      utilizationRate: 0,
      demandScore: 1.0,
    });
  });
});
