/**
 * Unit tests for src/pricing/calculators/customer.calculator.js
 *
 * `computeLoyaltyFromContracts` is pure and is tested directly.
 * `calculateCustomerMultiplier` and `getCustomerLoyaltyInfo` touch
 * Prisma — we mock the `@prisma/client` module and exercise the wrappers
 * so loyalty coverage also counts.
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

const prismaMock = {
  contract: { findMany: jest.fn() },
};

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

let customer;
let computeLoyaltyFromContracts;

beforeAll(async () => {
  customer = await import('../../../src/pricing/calculators/customer.calculator.js');
  computeLoyaltyFromContracts = customer.computeLoyaltyFromContracts;
});

beforeEach(() => {
  prismaMock.contract.findMany.mockReset();
});

const today = () => new Date();
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

describe('computeLoyaltyFromContracts', () => {
  it('returns "New Customer" with zero multiplier effect for empty input', () => {
    const res = computeLoyaltyFromContracts([]);
    expect(res.tier).toBe('New Customer');
    expect(res.effectiveDiscountPct).toBe(0);
    expect(res.multiplier).toBe(1);
    expect(res.completedRentals).toBe(0);
    expect(res.lifetimeValue).toBe(0);
  });

  it('assigns "Returning" tier after 2 completed rentals', () => {
    const res = computeLoyaltyFromContracts([
      { state: 'COMPLETED', totalPrice: 100, endDate: daysAgo(100) },
      { state: 'COMPLETED', totalPrice: 200, endDate: daysAgo(90) },
    ]);
    expect(res.tier).toBe('Returning');
    expect(res.tierDiscountPct).toBe(5);
    expect(res.recentActivityBonusPct).toBe(0);
    expect(res.effectiveDiscountPct).toBe(5);
    expect(res.multiplier).toBeCloseTo(0.95, 5);
    expect(res.completedRentals).toBe(2);
    expect(res.lifetimeValue).toBe(300);
  });

  it('assigns "Regular" tier after 6 completed rentals', () => {
    const contracts = Array.from({ length: 6 }, () => ({
      state: 'COMPLETED',
      totalPrice: 100,
      endDate: daysAgo(100),
    }));
    const res = computeLoyaltyFromContracts(contracts);
    expect(res.tier).toBe('Regular');
    expect(res.tierDiscountPct).toBe(8);
  });

  it('assigns "VIP" tier after 11 completed rentals', () => {
    const contracts = Array.from({ length: 11 }, () => ({
      state: 'COMPLETED',
      totalPrice: 50,
      endDate: daysAgo(100),
    }));
    const res = computeLoyaltyFromContracts(contracts);
    expect(res.tier).toBe('VIP');
    expect(res.tierDiscountPct).toBe(12);
  });

  it('assigns "VIP" tier when lifetime value ≥ €5000 even with few rentals', () => {
    const res = computeLoyaltyFromContracts([
      { state: 'COMPLETED', totalPrice: 2500, endDate: daysAgo(60) },
      { state: 'COMPLETED', totalPrice: 2500, endDate: daysAgo(30) },
    ]);
    expect(res.tier).toBe('VIP');
    expect(res.tierDiscountPct).toBe(12);
  });

  it('adds a 3 % recent-activity bonus when a rental ended within 14 days', () => {
    const res = computeLoyaltyFromContracts([
      { state: 'COMPLETED', totalPrice: 100, endDate: daysAgo(200) },
      { state: 'COMPLETED', totalPrice: 100, endDate: daysAgo(5) },
    ]);
    expect(res.recentActivityBonusPct).toBe(3);
    expect(res.effectiveDiscountPct).toBe(5 + 3); // Returning (5) + bonus (3)
  });

  it('does not apply the recent-activity bonus for "New Customer" tier', () => {
    const res = computeLoyaltyFromContracts([
      { state: 'CANCELLED', totalPrice: 100, endDate: today() },
    ]);
    expect(res.tier).toBe('New Customer');
    expect(res.recentActivityBonusPct).toBe(0);
  });

  it('caps the effective discount at 15 %', () => {
    const contracts = Array.from({ length: 20 }, (_, i) => ({
      state: 'COMPLETED',
      totalPrice: 500,
      endDate: i === 0 ? daysAgo(1) : daysAgo(100),
    }));
    const res = computeLoyaltyFromContracts(contracts);
    // VIP = 12 + bonus = 15 (capped) — 12 + 3 = 15 exactly, boundary test.
    expect(res.effectiveDiscountPct).toBeLessThanOrEqual(15);
    expect(res.multiplier).toBeGreaterThanOrEqual(0.85);
  });

  it('ignores non-completed contracts when counting rentals', () => {
    const res = computeLoyaltyFromContracts([
      { state: 'ACTIVE', totalPrice: 100, endDate: daysAgo(100) },
      { state: 'CANCELLED', totalPrice: 100, endDate: daysAgo(100) },
    ]);
    expect(res.completedRentals).toBe(0);
    expect(res.tier).toBe('New Customer');
  });

  it('sums totalPrice across all contracts regardless of state', () => {
    const res = computeLoyaltyFromContracts([
      { state: 'COMPLETED', totalPrice: 100, endDate: daysAgo(100) },
      { state: 'CANCELLED', totalPrice: 50, endDate: daysAgo(100) },
    ]);
    expect(res.lifetimeValue).toBe(150);
  });
});

describe('calculateCustomerMultiplier (Prisma)', () => {
  it('returns 1.0 for guests (no userId)', async () => {
    const m = await customer.calculateCustomerMultiplier(null);
    expect(m).toBe(1.0);
    expect(prismaMock.contract.findMany).not.toHaveBeenCalled();
  });

  it('computes a discounted multiplier for a loyal customer', async () => {
    prismaMock.contract.findMany.mockResolvedValue(
      Array.from({ length: 6 }, () => ({
        state: 'COMPLETED',
        totalPrice: 100,
        endDate: daysAgo(100),
      }))
    );
    const m = await customer.calculateCustomerMultiplier(1);
    expect(m).toBeCloseTo(0.92, 2); // Regular tier = 8%
  });

  it('returns 1.0 and logs an error when Prisma throws', async () => {
    prismaMock.contract.findMany.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const m = await customer.calculateCustomerMultiplier(1);
    expect(m).toBe(1.0);
  });
});

describe('getCustomerLoyaltyInfo', () => {
  it('returns a "Guest" envelope for userId=null', async () => {
    const info = await customer.getCustomerLoyaltyInfo(null);
    expect(info.tier).toBe('Guest');
    expect(info.discount).toBe(0);
    expect(info.rentalsCount).toBe(0);
  });

  it('returns populated info for an existing user', async () => {
    prismaMock.contract.findMany.mockResolvedValue([
      { state: 'COMPLETED', totalPrice: 123.456, endDate: daysAgo(5) },
      { state: 'COMPLETED', totalPrice: 100, endDate: daysAgo(100) },
    ]);
    const info = await customer.getCustomerLoyaltyInfo(1);
    expect(info.tier).toBe('Returning');
    expect(info.rentalsCount).toBe(2);
    // lifetime rounded to 2 decimals
    expect(info.lifetimeValue).toBe(223.46);
    expect(info.recentActivityBonus).toBe(3);
    expect(info.discount).toBe(8); // 5 + 3
  });

  it('returns a safe fallback on Prisma error', async () => {
    prismaMock.contract.findMany.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const info = await customer.getCustomerLoyaltyInfo(1);
    expect(info.tier).toBe('Unknown');
    expect(info.discount).toBe(0);
  });
});
