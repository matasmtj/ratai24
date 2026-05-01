/**
 * Main Pricing Service
 * Orchestrates all pricing calculators to generate dynamic prices
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { calculateBasePrice } from './calculators/base-price.calculator.js';
import { calculateDemandMultiplier } from './calculators/demand.calculator.js';
import { calculateSeasonalMultiplier } from './calculators/seasonal.calculator.js';
import {
  calculateUtilizationMultiplierForCar,
  getMaintenanceMultiplier,
} from './calculators/utilization.calculator.js';
import { calculateDurationMultiplier } from './calculators/duration.calculator.js';
import { calculateCustomerMultiplier } from './calculators/customer.calculator.js';

/**
 * Calculate dynamic price for a car rental
 * @param {Object} params - Pricing parameters
 * @param {number} params.carId - Car ID
 * @param {Date} params.startDate - Rental start date
 * @param {Date} params.endDate - Rental end date
 * @param {number} params.userId - Optional user ID for loyalty pricing
 * @param {boolean} params.saveSnapshot - Whether to save pricing snapshot (default: false)
 * @returns {Promise<Object>} Pricing result with breakdown
 */
export async function calculateDynamicPrice({ carId, startDate, endDate, userId = null, saveSnapshot = false }) {
  try {
    // 1. Get car data
    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { city: true },
    });

    if (!car) {
      throw new Error(`Car with ID ${carId} not found`);
    }

    // Check if car is available for lease
    if (!car.availableForLease) {
      throw new Error('Car is not available for lease');
    }
    if (car.state === 'MAINTENANCE') {
      throw new Error('Car is not available for lease');
    }

    // Fixed daily rate cars: loyalty still applies (same multiplier as dynamic pricing path).
    // Seasonal factors and pricing-rule overrides remain dynamic-pricing-only by design.
    if (!car.useDynamicPricing) {
      const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (duration < 1) {
        throw new Error('Rental duration must be at least 1 day');
      }

      const baseListed = car.pricePerDay;
      const customerMultiplier = await calculateCustomerMultiplier(userId);
      const pricePerDay =
        Math.round(baseListed * customerMultiplier * 100) / 100;
      const totalPrice = Math.round(pricePerDay * duration * 100) / 100;

      return {
        carId,
        cityId: car.cityId,
        cityName: car.city?.name,
        basePrice: baseListed,
        pricePerDay,
        totalPrice,
        duration,
        startDate,
        endDate,
        breakdown: {
          base: baseListed,
          multipliers: {
            demand: 1.0,
            seasonal: 1.0,
            utilization: 1.0,
            duration: 1.0,
            customer: customerMultiplier,
          },
          dynamicPrice: pricePerDay,
          constraints: {
            min: baseListed,
            max: baseListed,
            applied: false,
          },
          rules: [],
        },
        isDynamic: false,
        calculatedAt: new Date(),
      };
    }

    // 2. Calculate duration
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (duration < 1) {
      throw new Error('Rental duration must be at least 1 day');
    }

    // 3. Calculate base price
    const basePrice = calculateBasePrice(car);

    // 4. Calculate all multipliers in parallel
    const [
      demandMultiplier,
      seasonalMultiplier,
      utilizationMultiplier,
      durationMultiplier,
      customerMultiplier,
    ] = await Promise.all([
      calculateDemandMultiplier(car.cityId, startDate, endDate),
      calculateSeasonalMultiplier(startDate, duration, car.cityId),
      Promise.resolve(calculateUtilizationMultiplierForCar(car)),
      Promise.resolve(calculateDurationMultiplier(duration)),
      calculateCustomerMultiplier(userId),
    ]);

    // 5. Apply maintenance adjustment
    const maintenanceMultiplier = getMaintenanceMultiplier(car);

    // 6. Calculate dynamic price
    let dynamicPrice = basePrice 
      * demandMultiplier 
      * seasonalMultiplier 
      * utilizationMultiplier 
      * maintenanceMultiplier 
      * durationMultiplier 
      * customerMultiplier;

    // 7. Apply constraints (min/max price)
    const minPrice = car.minPricePerDay || basePrice * 0.6;
    const maxPrice = car.maxPricePerDay || basePrice * 2.5;
    
    dynamicPrice = Math.max(minPrice, Math.min(maxPrice, dynamicPrice));

    // 8. Round to 2 decimals
    dynamicPrice = Math.round(dynamicPrice * 100) / 100;
    const totalPrice = Math.round(dynamicPrice * duration * 100) / 100;

    // 9. Check for pricing rules/overrides
    const appliedRules = await applyPricingRules(car, startDate, endDate, dynamicPrice);
    const finalPricePerDay = appliedRules.finalPrice || dynamicPrice;
    const finalTotalPrice = Math.round(finalPricePerDay * duration * 100) / 100;

    // 10. Build result
    const result = {
      carId,
      cityId: car.cityId,
      cityName: car.city.name,
      basePrice,
      pricePerDay: finalPricePerDay,
      totalPrice: finalTotalPrice,
      duration,
      startDate,
      endDate,
      breakdown: {
        base: basePrice,
        multipliers: {
          demand: demandMultiplier,
          seasonal: seasonalMultiplier,
          utilization: utilizationMultiplier,
          maintenance: maintenanceMultiplier,
          duration: durationMultiplier,
          customer: customerMultiplier,
        },
        dynamicPrice,
        constraints: {
          min: minPrice,
          max: maxPrice,
          applied: dynamicPrice !== finalPricePerDay,
        },
        rules: appliedRules.rules || [],
      },
      isDynamic: true,
      calculatedAt: new Date(),
    };

    // 11. Save snapshot if requested
    if (saveSnapshot) {
      await savePricingSnapshot(result);
    }

    return result;
  } catch (error) {
    console.error('Error calculating dynamic price:', error);
    throw error;
  }
}

/**
 * Apply pricing rules/overrides
 * @param {Object} car - Car object
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} currentPrice - Current calculated price
 * @returns {Promise<Object>} Applied rules and final price
 */
async function applyPricingRules(car, startDate, endDate, currentPrice) {
  try {
    const rules = await prisma.pricingRule.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { carId: car.id },
              { carId: null, cityId: car.cityId },
              { carId: null, cityId: null },
            ],
          },
          {
            OR: [
              { startDate: null, endDate: null },
              {
                AND: [
                  { startDate: { lte: endDate } },
                  { endDate: { gte: startDate } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: {
        priority: 'desc', // Higher priority first
      },
    });

    if (rules.length === 0) {
      return { finalPrice: currentPrice, rules: [] };
    }

    let finalPrice = currentPrice;
    const appliedRules = [];

    for (const rule of rules) {
      let newPrice = finalPrice;

      // Apply fixed price override
      if (rule.fixedPrice !== null) {
        newPrice = rule.fixedPrice;
      }
      // Apply multiplier
      else if (rule.multiplier !== null) {
        newPrice = finalPrice * rule.multiplier;
      }

      // Apply min/max overrides
      if (rule.minPrice !== null) {
        newPrice = Math.max(newPrice, rule.minPrice);
      }
      if (rule.maxPrice !== null) {
        newPrice = Math.min(newPrice, rule.maxPrice);
      }

      if (newPrice !== finalPrice) {
        appliedRules.push({
          name: rule.name,
          description: rule.description,
          adjustment: newPrice - finalPrice,
        });
        finalPrice = newPrice;
      }
    }

    return {
      finalPrice: Math.round(finalPrice * 100) / 100,
      rules: appliedRules,
    };
  } catch (error) {
    console.error('Error applying pricing rules:', error);
    return { finalPrice: currentPrice, rules: [] };
  }
}

/**
 * Save pricing snapshot to database
 * @param {Object} pricingResult - Pricing calculation result
 * @returns {Promise<Object>} Created snapshot
 */
async function savePricingSnapshot(pricingResult) {
  try {
    // Get current availability
    const totalCars = await prisma.car.count({
      where: {
        cityId: pricingResult.cityId,
        availableForLease: true,
      },
    });

    const activeContracts = await prisma.contract.count({
      where: {
        car: { cityId: pricingResult.cityId },
        state: 'ACTIVE',
      },
    });

    const snapshot = await prisma.pricingSnapshot.create({
      data: {
        carId: pricingResult.carId,
        cityId: pricingResult.cityId,
        calculatedPrice: pricingResult.breakdown.dynamicPrice,
        basePrice: pricingResult.basePrice,
        demandMultiplier: pricingResult.breakdown.multipliers.demand,
        seasonalMultiplier: pricingResult.breakdown.multipliers.seasonal,
        utilizationMultiplier: pricingResult.breakdown.multipliers.utilization,
        durationMultiplier: pricingResult.breakdown.multipliers.duration,
        customerMultiplier: pricingResult.breakdown.multipliers.customer,
        finalPrice: pricingResult.pricePerDay,
        availableCars: totalCars - activeContracts,
        activeContracts,
        requestDate: new Date(),
        startDate: pricingResult.startDate,
        duration: pricingResult.duration,
      },
    });

    return snapshot;
  } catch (error) {
    console.error('Error saving pricing snapshot:', error);
    return null;
  }
}

/**
 * Get price preview for multiple cars (for listing pages)
 * @param {Array<number>} carIds - Array of car IDs
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Map of carId -> price
 */
export async function getBulkPricePreviews(carIds, startDate, endDate) {
  const prices = {};

  for (const carId of carIds) {
    try {
      const result = await calculateDynamicPrice({
        carId,
        startDate,
        endDate,
        userId: null,
        saveSnapshot: false,
      });
      prices[carId] = {
        pricePerDay: result.pricePerDay,
        totalPrice: result.totalPrice,
      };
    } catch (error) {
      console.error(`Error calculating price for car ${carId}:`, error);
      // Fallback to database price
      const car = await prisma.car.findUnique({ where: { id: carId } });
      if (car) {
        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        prices[carId] = {
          pricePerDay: car.pricePerDay,
          totalPrice: car.pricePerDay * duration,
        };
      }
    }
  }

  return prices;
}
