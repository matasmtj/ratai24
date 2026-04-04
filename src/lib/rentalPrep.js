/**
 * Post-rental prep day rules (Europe/Vilnius wall clock).
 * If rental ends after 14:00, the next local calendar day is reserved for cleaning/prep.
 */

import { DateTime } from 'luxon';

const TZ = 'Europe/Vilnius';

/**
 * @param {Date|string|number} contractEndDate - Rental end instant (contract.endDate)
 * @returns {boolean} true if prep day should be booked (end strictly after 14:00 local)
 */
export function rentalEndNeedsPrepDay(contractEndDate) {
  const end = DateTime.fromJSDate(new Date(contractEndDate)).setZone(TZ);
  const minutes = end.hour * 60 + end.minute + end.second / 60;
  return minutes > 14 * 60;
}

/**
 * Full next local calendar day in Vilnius as UTC half-open range [start, end).
 * @param {Date|string|number} contractEndDate
 * @returns {{ startUtc: Date, endExclusiveUtc: Date } | null}
 */
export function nextPrepDayRangeUtc(contractEndDate) {
  const end = DateTime.fromJSDate(new Date(contractEndDate)).setZone(TZ);
  const start = end.startOf('day').plus({ days: 1 });
  const endExclusive = start.plus({ days: 1 });
  return {
    startUtc: start.toUTC().toJSDate(),
    endExclusiveUtc: endExclusive.toUTC().toJSDate(),
  };
}
