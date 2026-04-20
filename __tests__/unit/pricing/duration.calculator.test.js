/**
 * Unit tests for src/pricing/calculators/duration.calculator.js
 *
 * Pure deterministic logic — no mocks required.
 */
import { describe, it, expect } from '@jest/globals';
import {
  calculateDurationMultiplier,
  getDurationDiscountDescription,
  applyMinimumDurationPenalty,
} from '../../../src/pricing/calculators/duration.calculator.js';

describe('calculateDurationMultiplier', () => {
  it.each([
    [1, 1.0],
    [2, 1.0],
    [3, 0.98],
    [6, 0.98],
    [7, 0.95],
    [13, 0.95],
    [14, 0.92],
    [20, 0.92],
    [21, 0.9],
    [29, 0.9],
    [30, 0.88],
    [90, 0.88],
  ])('%i days → multiplier %f', (days, expected) => {
    expect(calculateDurationMultiplier(days)).toBe(expected);
  });
});

describe('getDurationDiscountDescription', () => {
  it('returns "Standard daily rate" when no discount applies', () => {
    expect(getDurationDiscountDescription(1)).toBe('Standard daily rate');
  });

  it('labels multi-day rentals (3-6 days)', () => {
    expect(getDurationDiscountDescription(5)).toBe(
      '2% multi-day rental discount'
    );
  });

  it('labels weekly rentals (7-13 days)', () => {
    expect(getDurationDiscountDescription(10)).toBe(
      '5% weekly rental discount'
    );
  });

  it('labels extended rentals (14-29 days)', () => {
    expect(getDurationDiscountDescription(14)).toBe(
      '8% extended rental discount'
    );
    expect(getDurationDiscountDescription(25)).toBe(
      '10% extended rental discount'
    );
  });

  it('labels monthly rentals (30+ days)', () => {
    expect(getDurationDiscountDescription(30)).toBe(
      '12% monthly rental discount'
    );
  });
});

describe('applyMinimumDurationPenalty', () => {
  it('returns 1.0 when the duration meets or exceeds the minimum', () => {
    expect(applyMinimumDurationPenalty(5, 1)).toBe(1.0);
    expect(applyMinimumDurationPenalty(1, 1)).toBe(1.0);
  });

  it('returns 1.0 when the duration is below the minimum (no-op policy)', () => {
    expect(applyMinimumDurationPenalty(0, 5)).toBe(1.0);
  });
});
