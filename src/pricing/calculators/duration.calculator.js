/**
 * Duration Calculator
 * Calculates discounts based on rental duration
 */

/**
 * Calculate duration discount multiplier
 * Longer rentals get better daily rates
 * @param {number} days - Number of rental days
 * @returns {number} Duration multiplier (< 1.0 means discount)
 */
export function calculateDurationMultiplier(days) {
  if (days <= 2) {
    // Very short rental - full price
    return 1.0;
  } else if (days <= 6) {
    // 3-6 days - small discount
    return 0.95; // 5% discount
  } else if (days <= 13) {
    // 1-2 weeks - moderate discount
    return 0.88; // 12% discount
  } else if (days <= 20) {
    // 2-3 weeks - good discount
    return 0.82; // 18% discount
  } else if (days <= 29) {
    // 3-4 weeks - better discount
    return 0.75; // 25% discount
  } else {
    // Monthly+ rental - best rate
    return 0.65; // 35% discount
  }
}

/**
 * Get human-readable duration discount description
 * @param {number} days - Number of rental days
 * @returns {string} Description
 */
export function getDurationDiscountDescription(days) {
  const multiplier = calculateDurationMultiplier(days);
  const discountPercent = Math.round((1 - multiplier) * 100);

  if (discountPercent === 0) {
    return 'Standard daily rate';
  }

  let period = '';
  if (days <= 6) period = 'multi-day';
  else if (days <= 13) period = 'weekly';
  else if (days <= 29) period = 'extended';
  else period = 'monthly';

  return `${discountPercent}% ${period} rental discount`;
}

/**
 * Calculate minimum rental period multiplier
 * Some cars/situations may have minimum rental requirements
 * @param {number} days - Rental duration
 * @param {number} minimumDays - Minimum required days
 * @returns {number} Penalty multiplier if below minimum
 */
export function applyMinimumDurationPenalty(days, minimumDays = 1) {
  if (days >= minimumDays) {
    return 1.0; // No penalty
  }

  // Doesn't make sense for car rentals, but kept for completeness
  return 1.0;
}
