/**
 * Unit tests for src/lib/rentalPrep.js
 *
 * The logic is expressed in Europe/Vilnius wall-clock time so the tests
 * deliberately construct Date values using Luxon to avoid flaky
 * host-timezone behaviour.
 */
import { describe, it, expect } from '@jest/globals';
import { DateTime } from 'luxon';
import {
  rentalEndNeedsPrepDay,
  nextPrepDayRangeUtc,
} from '../../../src/lib/rentalPrep.js';

const vilniusAt = (iso) =>
  DateTime.fromISO(iso, { zone: 'Europe/Vilnius' }).toJSDate();

describe('rentalEndNeedsPrepDay', () => {
  it('returns false when the rental ends exactly at 14:00 local', () => {
    expect(rentalEndNeedsPrepDay(vilniusAt('2026-06-10T14:00:00'))).toBe(false);
  });

  it('returns false when the rental ends before 14:00 local', () => {
    expect(rentalEndNeedsPrepDay(vilniusAt('2026-06-10T10:30:00'))).toBe(false);
  });

  it('returns true when the rental ends strictly after 14:00 local', () => {
    expect(rentalEndNeedsPrepDay(vilniusAt('2026-06-10T14:01:00'))).toBe(true);
    expect(rentalEndNeedsPrepDay(vilniusAt('2026-06-10T18:00:00'))).toBe(true);
  });

  it('accepts a string input', () => {
    expect(rentalEndNeedsPrepDay('2026-06-10T12:00:00+03:00')).toBe(false);
    expect(rentalEndNeedsPrepDay('2026-06-10T18:00:00+03:00')).toBe(true);
  });
});

describe('nextPrepDayRangeUtc', () => {
  it('returns the next calendar day in Vilnius as a UTC half-open range', () => {
    const range = nextPrepDayRangeUtc(vilniusAt('2026-06-10T17:00:00'));

    const expectedStart = DateTime.fromISO('2026-06-11T00:00:00', {
      zone: 'Europe/Vilnius',
    })
      .toUTC()
      .toJSDate();
    const expectedEnd = DateTime.fromISO('2026-06-12T00:00:00', {
      zone: 'Europe/Vilnius',
    })
      .toUTC()
      .toJSDate();

    expect(range.startUtc.getTime()).toBe(expectedStart.getTime());
    expect(range.endExclusiveUtc.getTime()).toBe(expectedEnd.getTime());
  });

  it('half-open range spans exactly 24 hours', () => {
    const range = nextPrepDayRangeUtc(vilniusAt('2026-11-05T09:30:00'));
    const diffMs = range.endExclusiveUtc.getTime() - range.startUtc.getTime();
    // 24h, allowing for one-hour DST shift either way.
    expect([23 * 3600e3, 24 * 3600e3, 25 * 3600e3]).toContain(diffMs);
  });
});
