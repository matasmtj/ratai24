/**
 * Unit tests for src/pricing/calculators/deposit.calculator.js
 */
import { describe, it, expect } from '@jest/globals';
import {
  calculateRequiredDeposit,
  getDepositForDays,
  rentalDurationDays,
} from '../../../src/pricing/calculators/deposit.calculator.js';

describe('getDepositForDays', () => {
  it('returns €50 for 1-3 day rentals', () => {
    expect(getDepositForDays(1)).toBe(50);
    expect(getDepositForDays(2)).toBe(50);
    expect(getDepositForDays(3)).toBe(50);
  });

  it('returns €100 for 4-7 day rentals', () => {
    expect(getDepositForDays(4)).toBe(100);
    expect(getDepositForDays(5)).toBe(100);
    expect(getDepositForDays(7)).toBe(100);
  });

  it('returns €300 for 8-15 day rentals', () => {
    expect(getDepositForDays(8)).toBe(300);
    expect(getDepositForDays(10)).toBe(300);
    expect(getDepositForDays(15)).toBe(300);
  });

  it('returns €300 for 16-30 day rentals', () => {
    expect(getDepositForDays(16)).toBe(300);
    expect(getDepositForDays(20)).toBe(300);
    expect(getDepositForDays(30)).toBe(300);
  });

  it('returns €500 for 31+ day rentals', () => {
    expect(getDepositForDays(31)).toBe(500);
    expect(getDepositForDays(60)).toBe(500);
    expect(getDepositForDays(365)).toBe(500);
  });

  it('clamps non-positive or invalid values to a 1-day rental', () => {
    expect(getDepositForDays(0)).toBe(50);
    expect(getDepositForDays(-5)).toBe(50);
    expect(getDepositForDays(NaN)).toBe(50);
  });

  it('rounds up fractional day inputs', () => {
    expect(getDepositForDays(3.1)).toBe(100);
    expect(getDepositForDays(7.5)).toBe(300);
    expect(getDepositForDays(30.001)).toBe(500);
  });
});

describe('rentalDurationDays', () => {
  it('computes whole-day differences', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    const end = new Date('2026-01-04T10:00:00Z');
    expect(rentalDurationDays(start, end)).toBe(3);
  });

  it('rounds up partial days', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    const end = new Date('2026-01-02T11:00:00Z');
    expect(rentalDurationDays(start, end)).toBe(2);
  });

  it('returns at least 1 day for zero or negative ranges', () => {
    const t = new Date('2026-01-01T10:00:00Z');
    expect(rentalDurationDays(t, t)).toBe(1);
    expect(rentalDurationDays(t, new Date('2025-12-31T10:00:00Z'))).toBe(1);
  });

  it('accepts ISO strings', () => {
    expect(
      rentalDurationDays('2026-01-01T00:00:00Z', '2026-01-08T00:00:00Z')
    ).toBe(7);
  });
});

describe('calculateRequiredDeposit', () => {
  const cases = [
    ['2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z', 50],
    ['2026-01-01T00:00:00Z', '2026-01-04T00:00:00Z', 50],
    ['2026-01-01T00:00:00Z', '2026-01-05T00:00:00Z', 100],
    ['2026-01-01T00:00:00Z', '2026-01-08T00:00:00Z', 100],
    ['2026-01-01T00:00:00Z', '2026-01-09T00:00:00Z', 300],
    ['2026-01-01T00:00:00Z', '2026-01-16T00:00:00Z', 300],
    ['2026-01-01T00:00:00Z', '2026-01-17T00:00:00Z', 300],
    ['2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z', 300],
    ['2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z', 500],
    ['2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z', 500],
  ];

  it.each(cases)('start=%s end=%s -> €%i', (start, end, expected) => {
    expect(calculateRequiredDeposit(start, end)).toBe(expected);
  });
});
