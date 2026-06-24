/**
 * Deposit Calculator
 * Calculates the required reservation deposit based on rental duration.
 *
 * Bracket policy (inclusive bounds, in days):
 *   1 to 3  -> €50
 *   4 to 7  -> €100
 *   8 to 15 -> €300
 *  16 to 30 -> €300
 *  31+      -> €500
 */

const BRACKETS = [
  { maxDays: 3, deposit: 50 },
  { maxDays: 7, deposit: 100 },
  { maxDays: 15, deposit: 300 },
  { maxDays: 30, deposit: 300 },
];
const LONG_TERM_DEPOSIT = 500;

/**
 * Compute the number of rental days from two Date-like inputs.
 * Mirrors the convention used in pricing.service.js (Math.ceil of the
 * millisecond delta), and always returns at least 1.
 *
 * @param {Date|string|number} startDate
 * @param {Date|string|number} endDate
 * @returns {number} integer day count (>= 1)
 */
export function rentalDurationDays(startDate, endDate) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Get the required deposit (in euro) for a given rental duration in days.
 * @param {number} days
 * @returns {number}
 */
export function getDepositForDays(days) {
  const d = Number.isFinite(days) ? Math.max(1, Math.ceil(days)) : 1;
  for (const bracket of BRACKETS) {
    if (d <= bracket.maxDays) return bracket.deposit;
  }
  return LONG_TERM_DEPOSIT;
}

/**
 * Compute the required deposit from a start/end date pair.
 * @param {Date|string|number} startDate
 * @param {Date|string|number} endDate
 * @returns {number}
 */
export function calculateRequiredDeposit(startDate, endDate) {
  return getDepositForDays(rentalDurationDays(startDate, endDate));
}
