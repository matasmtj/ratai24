/**
 * Unit tests for src/pricing/calculators/utilization.calculator.js
 *
 * Pure branches (`calculateUtilizationMultiplierForCar`,
 * `getMaintenanceMultiplier`) are tested directly. The Prisma-dependent
 * wrappers are exercised via `@prisma/client` module mocks.
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

const prismaMock = {
  car: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  contract: {
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

let utilization;
beforeAll(async () => {
  utilization = await import('../../../src/pricing/calculators/utilization.calculator.js');
});

beforeEach(() => {
  for (const group of Object.values(prismaMock)) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
});

describe('calculateUtilizationMultiplierForCar', () => {
  it('returns 1.0 when car is null', () => {
    expect(utilization.calculateUtilizationMultiplierForCar(null)).toBe(1.0);
  });

  it('returns 1.0 when applyUtilizationPricing is false', () => {
    expect(
      utilization.calculateUtilizationMultiplierForCar({
        applyUtilizationPricing: false,
        utilizationRate: 0.95,
      })
    ).toBe(1.0);
  });

  it('respects a valid utilizationMultiplierOverride', () => {
    expect(
      utilization.calculateUtilizationMultiplierForCar({
        utilizationMultiplierOverride: 1.25,
      })
    ).toBe(1.25);
  });

  it('ignores an out-of-range override and falls through to rate logic', () => {
    const out = utilization.calculateUtilizationMultiplierForCar({
      utilizationMultiplierOverride: 10,
      utilizationRate: 0.8,
    });
    expect(out).toBe(1.05);
  });

  it('returns 1.0 when utilizationRate is null/undefined', () => {
    expect(
      utilization.calculateUtilizationMultiplierForCar({ utilizationRate: null })
    ).toBe(1.0);
    expect(
      utilization.calculateUtilizationMultiplierForCar({
        utilizationRate: undefined,
      })
    ).toBe(1.0);
  });

  it.each([
    [0.1, 0.9],
    [0.29, 0.9],
    [0.3, 0.95],
    [0.49, 0.95],
    [0.5, 1.0],
    [0.74, 1.0],
    [0.76, 1.05],
    [0.9, 1.05],
    [0.91, 1.1],
    [1.0, 1.1],
  ])('utilizationRate %f → multiplier %f', (rate, expected) => {
    expect(
      utilization.calculateUtilizationMultiplierForCar({ utilizationRate: rate })
    ).toBe(expected);
  });
});

describe('calculateUtilizationMultiplier (Prisma)', () => {
  it('reads the car and delegates to the pure helper', async () => {
    prismaMock.car.findUnique.mockResolvedValue({
      utilizationRate: 0.95,
      applyUtilizationPricing: true,
      utilizationMultiplierOverride: null,
    });
    const m = await utilization.calculateUtilizationMultiplier(42);
    expect(m).toBe(1.1);
    expect(prismaMock.car.findUnique).toHaveBeenCalledWith({
      where: { id: 42 },
      select: {
        utilizationRate: true,
        applyUtilizationPricing: true,
        utilizationMultiplierOverride: true,
      },
    });
  });

  it('returns 1.0 when Prisma throws', async () => {
    prismaMock.car.findUnique.mockRejectedValue(new Error('boom'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const m = await utilization.calculateUtilizationMultiplier(1);
    expect(m).toBe(1.0);
  });
});

describe('updateCarUtilizationRate', () => {
  it('resets rate to 0 when there are no contracts', async () => {
    prismaMock.contract.findMany.mockResolvedValue([]);
    prismaMock.car.update.mockResolvedValue({});
    const rate = await utilization.updateCarUtilizationRate(1, 90);
    expect(rate).toBe(0);
    expect(prismaMock.car.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ utilizationRate: 0 }),
      })
    );
  });

  it('computes a non-zero utilization rate from contract history', async () => {
    const now = Date.now();
    prismaMock.contract.findMany.mockResolvedValue([
      {
        startDate: new Date(now - 30 * 24 * 3600e3),
        endDate: new Date(now - 20 * 24 * 3600e3),
      },
    ]);
    prismaMock.car.update.mockResolvedValue({});
    const rate = await utilization.updateCarUtilizationRate(1, 90);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(1);
  });

  it('returns 0 and swallows errors', async () => {
    prismaMock.contract.findMany.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const rate = await utilization.updateCarUtilizationRate(1, 90);
    expect(rate).toBe(0);
  });
});

describe('getMaintenanceMultiplier', () => {
  it('returns 1.0 when maintenanceScore is missing', () => {
    expect(utilization.getMaintenanceMultiplier({})).toBe(1.0);
  });

  it.each([
    [100, 1.05],
    [95, 1.05],
    [90, 1.0],
    [85, 1.0],
    [80, 0.95],
    [70, 0.95],
    [60, 0.85],
    [1, 0.85],
  ])('score %i → multiplier %f', (score, expected) => {
    expect(
      utilization.getMaintenanceMultiplier({ maintenanceScore: score })
    ).toBe(expected);
  });
});
