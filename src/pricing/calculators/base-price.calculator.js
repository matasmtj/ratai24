/**
 * Base Price Calculator
 * Calculates the foundational price based on car costs and desired profit margin
 */

/**
 * Calculate base price per day for a car
 * @param {Object} car - Car object with cost data
 * @returns {number} Base price per day
 */
export function calculateBasePrice(car) {
  // If base price is manually set, use it
  if (car.basePricePerDay && car.basePricePerDay > 0) {
    return car.basePricePerDay;
  }

  let dailyCost = 0;

  // 1. Daily operating costs (insurance, maintenance, parking)
  if (car.dailyOperatingCost) {
    dailyCost += car.dailyOperatingCost;
  }

  // 2. Financing costs (loan/lease payment divided by 30 days)
  if (car.monthlyFinancingCost) {
    dailyCost += car.monthlyFinancingCost / 30;
  }

  // 3. Depreciation cost
  if (car.purchasePrice && car.createdAt) {
    const ageInYears = (Date.now() - car.createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const estimatedLifeYears = 10; // Assume 10-year useful life
    const annualDepreciation = car.purchasePrice / estimatedLifeYears;
    dailyCost += annualDepreciation / 365;
  }

  // 4. Apply profit margin (default 40%)
  const profitMargin = 1.40; // 40% markup
  const basePrice = dailyCost * profitMargin;

  // Fallback to legacy pricePerDay if calculation fails
  if (!basePrice || basePrice <= 0) {
    return car.pricePerDay || 50; // Default fallback
  }

  return Math.round(basePrice * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate recommended base price settings for a car
 * @param {Object} car - Car object
 * @returns {Object} Recommended min/max prices
 */
export function calculatePriceConstraints(car) {
  const basePrice = calculateBasePrice(car);

  return {
    basePricePerDay: basePrice,
    minPricePerDay: Math.round(basePrice * 0.6 * 100) / 100, // Never below 60%
    maxPricePerDay: Math.round(basePrice * 2.5 * 100) / 100, // Never above 250%
  };
}
