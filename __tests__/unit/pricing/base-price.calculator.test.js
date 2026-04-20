/**
 * Unit tests for src/pricing/calculators/base-price.calculator.js
 */
import { describe, it, expect } from '@jest/globals';
import {
  calculateBasePrice,
  calculatePriceConstraints,
} from '../../../src/pricing/calculators/base-price.calculator.js';

describe('calculateBasePrice', () => {
  it('returns a manually-set basePricePerDay when > 0', () => {
    expect(calculateBasePrice({ basePricePerDay: 42 })).toBe(42);
  });

  it('ignores basePricePerDay of 0 and recomputes', () => {
    const price = calculateBasePrice({
      basePricePerDay: 0,
      dailyOperatingCost: 10,
    });
    expect(price).toBe(Math.round(10 * 1.4 * 100) / 100);
  });

  it('adds daily operating cost', () => {
    expect(calculateBasePrice({ dailyOperatingCost: 10 })).toBeCloseTo(
      14,
      5
    );
  });

  it('adds monthly financing cost divided by 30', () => {
    expect(calculateBasePrice({ monthlyFinancingCost: 300 })).toBeCloseTo(
      14, // (300/30) * 1.4 = 14
      5
    );
  });

  it('adds depreciation when purchasePrice + createdAt are provided', () => {
    const tenYearsAgo = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000);
    const price = calculateBasePrice({
      purchasePrice: 36500,
      createdAt: tenYearsAgo,
      dailyOperatingCost: 0,
    });
    // Daily depreciation: 36500 / 10 / 365 = 10  -> 10 * 1.4 = 14
    expect(price).toBeCloseTo(14, 1);
  });

  it('combines all cost components', () => {
    const car = {
      dailyOperatingCost: 5,
      monthlyFinancingCost: 150, // 5/day
      purchasePrice: 36500,
      createdAt: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000), // 10/day
    };
    const price = calculateBasePrice(car);
    // (5 + 5 + 10) * 1.4 = 28
    expect(price).toBeCloseTo(28, 1);
  });

  it('falls back to car.pricePerDay when no cost inputs are given', () => {
    expect(calculateBasePrice({ pricePerDay: 75 })).toBe(75);
  });

  it('falls back to 50 when no data whatsoever is provided', () => {
    expect(calculateBasePrice({})).toBe(50);
  });

  it('rounds to two decimals', () => {
    const price = calculateBasePrice({ dailyOperatingCost: 7.777 });
    expect(Number.isFinite(price)).toBe(true);
    // Rounded to 2 decimals: (7.777 * 1.4) ≈ 10.8878 -> 10.89
    expect(price).toBe(10.89);
  });
});

describe('calculatePriceConstraints', () => {
  it('derives min/max/base from a car', () => {
    const constraints = calculatePriceConstraints({ basePricePerDay: 100 });
    expect(constraints.basePricePerDay).toBe(100);
    expect(constraints.minPricePerDay).toBe(60);
    expect(constraints.maxPricePerDay).toBe(250);
  });

  it('rounds min/max to 2 decimals', () => {
    const constraints = calculatePriceConstraints({ basePricePerDay: 33.33 });
    expect(constraints.minPricePerDay).toBeCloseTo(20, 1);
    expect(constraints.maxPricePerDay).toBeCloseTo(83.33, 1);
    // Confirm exactly two decimal places are kept.
    for (const v of [constraints.minPricePerDay, constraints.maxPricePerDay]) {
      expect(Math.round(v * 100)).toBe(v * 100);
    }
  });
});
