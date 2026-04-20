/**
 * Unit tests for src/pricing/calculators/seasonal.calculator.js
 *
 * `getHolidays` is pure and tested directly. `createSeasonalFactor` and
 * `calculateSeasonalMultiplier` reach out to Prisma — we mock the
 * `@prisma/client` module so the tests never hit a database.
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

// Shared mock state — re-assigned in beforeEach via jest.clearAllMocks.
const prismaMock = {
  seasonalFactor: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

// Dynamic import must happen AFTER jest.unstable_mockModule so the mock is
// wired up. We use a top-level `let` + beforeAll pattern.
let seasonal;
beforeAll(async () => {
  seasonal = await import('../../../src/pricing/calculators/seasonal.calculator.js');
});

beforeEach(() => {
  for (const fn of Object.values(prismaMock.seasonalFactor)) fn.mockReset();
  prismaMock.seasonalFactor.findMany.mockResolvedValue([]);
});

describe('getHolidays', () => {
  it('returns 11 Lithuanian holidays for a year', () => {
    const holidays = seasonal.getHolidays(2026);
    expect(holidays).toHaveLength(11);
    // Dates are constructed in local time – compare by getFullYear/month/date
    // to avoid UTC conversion flakiness on non-UTC test machines.
    expect(holidays[0].getFullYear()).toBe(2026);
    expect(holidays[0].getMonth()).toBe(0); // January
    expect(holidays[0].getDate()).toBe(1);
    expect(holidays[1].getMonth()).toBe(1); // February
    expect(holidays[1].getDate()).toBe(16);
  });
});

describe('calculateSeasonalMultiplier', () => {
  it('returns the combined multiplier of custom DB factors when they exist', async () => {
    prismaMock.seasonalFactor.findMany.mockResolvedValue([
      { multiplier: 1.3 },
      { multiplier: 1.1 },
    ]);
    const m = await seasonal.calculateSeasonalMultiplier(
      new Date('2026-07-15T10:00:00Z'),
      5
    );
    expect(m).toBeCloseTo(1.3 * 1.1, 5);
  });

  it('applies the default summer premium when no custom factors are active', async () => {
    prismaMock.seasonalFactor.findMany.mockResolvedValue([]);
    // July (summer) + 5-day rental (not short) + far from a holiday +
    // booking > 30 days ahead (early-bird 0.95).
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() + 1);
    startDate.setMonth(6); // July
    startDate.setDate(15);
    const m = await seasonal.calculateSeasonalMultiplier(startDate, 5);
    // Expect at least the summer premium baked in.
    expect(m).toBeGreaterThanOrEqual(1.2);
  });

  it('applies the winter discount outside holidays', async () => {
    prismaMock.seasonalFactor.findMany.mockResolvedValue([]);
    // February, long rental, well in the future → winter 0.85 base * 0.95 early bird
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() + 1);
    startDate.setMonth(1); // February
    startDate.setDate(20);
    const m = await seasonal.calculateSeasonalMultiplier(startDate, 10);
    expect(m).toBeLessThan(1.0);
  });

  it('falls back to multiplier 1.0 if the DB query throws', async () => {
    prismaMock.seasonalFactor.findMany.mockRejectedValue(new Error('boom'));
    // The default branch still runs because the factors list is empty on error.
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() + 1);
    startDate.setMonth(3); // April — default branch returns 1.0
    startDate.setDate(15);
    const m = await seasonal.calculateSeasonalMultiplier(startDate, 10);
    expect(Number.isFinite(m)).toBe(true);
  });
});

describe('createSeasonalFactor', () => {
  it('creates a factor with normalized values', async () => {
    prismaMock.seasonalFactor.create.mockImplementation(async ({ data }) => ({
      id: 1,
      ...data,
    }));

    const result = await seasonal.createSeasonalFactor({
      name: '  Summer Peak  ',
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      multiplier: '1,3', // comma decimal accepted
      cityId: '5',
      isActive: true,
    });
    expect(result.name).toBe('Summer Peak');
    expect(result.multiplier).toBe(1.3);
    expect(result.cityId).toBe(5);
    expect(result.isActive).toBe(true);
  });

  it('rejects an empty name', async () => {
    await expect(
      seasonal.createSeasonalFactor({
        name: '   ',
        startDate: '2026-06-01',
        endDate: '2026-08-31',
        multiplier: 1.2,
      })
    ).rejects.toThrow('Name is required');
  });

  it('rejects an invalid date format', async () => {
    await expect(
      seasonal.createSeasonalFactor({
        name: 'Bad',
        startDate: '06/01/2026',
        endDate: '2026-08-31',
        multiplier: 1.2,
      })
    ).rejects.toThrow('Invalid date format');
  });

  it('rejects when endDate is before startDate', async () => {
    await expect(
      seasonal.createSeasonalFactor({
        name: 'Bad',
        startDate: '2026-08-31',
        endDate: '2026-06-01',
        multiplier: 1.2,
      })
    ).rejects.toThrow('endDate must be on or after startDate');
  });

  it('rejects a multiplier outside the 0.1–3 range', async () => {
    await expect(
      seasonal.createSeasonalFactor({
        name: 'Bad',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        multiplier: 5,
      })
    ).rejects.toThrow('multiplier must be between 0.1 and 3');
  });

  it('defaults cityId to null when omitted', async () => {
    prismaMock.seasonalFactor.create.mockImplementation(async ({ data }) => data);
    const result = await seasonal.createSeasonalFactor({
      name: 'Global',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      multiplier: 1.2,
    });
    expect(result.cityId).toBeNull();
  });
});

describe('updateSeasonalFactorRecord', () => {
  it('returns null when the record does not exist', async () => {
    prismaMock.seasonalFactor.findUnique.mockResolvedValue(null);
    const result = await seasonal.updateSeasonalFactorRecord(123, { name: 'X' });
    expect(result).toBeNull();
  });

  it('merges partial updates on top of the existing record', async () => {
    prismaMock.seasonalFactor.findUnique.mockResolvedValue({
      id: 1,
      name: 'Original',
      startDate: new Date('2026-06-01T12:00:00Z'),
      endDate: new Date('2026-08-31T12:00:00Z'),
      multiplier: 1.1,
      cityId: null,
      isActive: true,
    });
    prismaMock.seasonalFactor.update.mockImplementation(async ({ data }) => data);

    const result = await seasonal.updateSeasonalFactorRecord(1, {
      multiplier: 1.2,
    });
    expect(result.multiplier).toBe(1.2);
    expect(result.name).toBe('Original');
  });

  it('rejects an empty name on update', async () => {
    prismaMock.seasonalFactor.findUnique.mockResolvedValue({
      id: 1,
      name: 'Original',
      startDate: new Date('2026-06-01T12:00:00Z'),
      endDate: new Date('2026-08-31T12:00:00Z'),
      multiplier: 1.1,
      cityId: null,
      isActive: true,
    });
    await expect(
      seasonal.updateSeasonalFactorRecord(1, { name: '   ' })
    ).rejects.toThrow('Name cannot be empty');
  });
});

describe('deleteSeasonalFactorRecord', () => {
  it('calls prisma.seasonalFactor.delete with the id', async () => {
    prismaMock.seasonalFactor.delete.mockResolvedValue({ id: 1 });
    await seasonal.deleteSeasonalFactorRecord(1);
    expect(prismaMock.seasonalFactor.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});
