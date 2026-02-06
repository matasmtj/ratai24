/**
 * Demand Calculator
 * Calculates pricing multiplier based on supply and demand in a city
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Calculate demand score based on available cars vs. rented cars
 * @param {number} cityId - City ID
 * @param {Date} startDate - Rental start date
 * @param {Date} endDate - Rental end date
 * @returns {Promise<number>} Demand multiplier (0.6 - 2.5)
 */
export async function calculateDemandMultiplier(cityId, startDate, endDate) {
  try {
    // Get total cars in the city that are available for lease
    const totalCars = await prisma.car.count({
      where: {
        cityId,
        availableForLease: true,
        state: { not: 'MAINTENANCE' },
      },
    });

    if (totalCars === 0) {
      return 1.0; // No cars = no data
    }

    // Count active contracts that overlap with the requested dates
    const overlappingContracts = await prisma.contract.count({
      where: {
        car: { cityId },
        state: { in: ['ACTIVE', 'DRAFT'] },
        OR: [
          {
            // Contract starts during requested period
            startDate: { gte: startDate, lte: endDate },
          },
          {
            // Contract ends during requested period
            endDate: { gte: startDate, lte: endDate },
          },
          {
            // Contract spans entire requested period
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } },
            ],
          },
        ],
      },
    });

    const availableCars = totalCars - overlappingContracts;
    const supplyRatio = availableCars / totalCars;

    // Calculate demand score based on availability
    // High availability (low demand) = lower multiplier
    // Low availability (high demand) = higher multiplier
    let demandScore;

    if (supplyRatio >= 0.7) {
      // 70%+ available: Low demand - discount pricing
      demandScore = 0.7 + (supplyRatio - 0.7) * 0.3; // 0.7 - 0.79
    } else if (supplyRatio >= 0.4) {
      // 40-70% available: Normal demand
      demandScore = 0.9 + (0.7 - supplyRatio) * 0.67; // 0.9 - 1.1
    } else if (supplyRatio >= 0.2) {
      // 20-40% available: High demand - premium pricing
      demandScore = 1.2 + (0.4 - supplyRatio) * 2.5; // 1.2 - 1.7
    } else {
      // Less than 20% available: Very high demand
      demandScore = 1.8 + (0.2 - supplyRatio) * 3.5; // 1.8 - 2.5
    }

    // Clamp between 0.6 and 2.5
    return Math.max(0.6, Math.min(2.5, demandScore));
  } catch (error) {
    console.error('Error calculating demand multiplier:', error);
    return 1.0; // Fallback to neutral multiplier
  }
}

/**
 * Get or calculate city demand metrics (with caching)
 * @param {number} cityId - City ID
 * @returns {Promise<Object>} Demand metrics
 */
export async function getCityDemandMetrics(cityId) {
  try {
    // Try to get cached metrics (valid for 15 minutes)
    const metrics = await prisma.cityDemandMetrics.findUnique({
      where: { cityId },
    });

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    if (metrics && metrics.lastCalculated > fifteenMinutesAgo) {
      return metrics;
    }

    // Calculate fresh metrics
    const totalCars = await prisma.car.count({
      where: {
        cityId,
        availableForLease: true,
      },
    });

    const activeContracts = await prisma.contract.count({
      where: {
        car: { cityId },
        state: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const availableCars = totalCars - activeContracts;
    const utilizationRate = totalCars > 0 ? activeContracts / totalCars : 0;
    const supplyRatio = totalCars > 0 ? availableCars / totalCars : 1;
    
    // Simple demand score calculation
    const demandScore = Math.max(0.6, Math.min(2.5, 2.5 - supplyRatio * 2));

    // Upsert metrics
    const updatedMetrics = await prisma.cityDemandMetrics.upsert({
      where: { cityId },
      create: {
        cityId,
        totalCars,
        availableCars,
        activeContracts,
        utilizationRate,
        demandScore,
        lastCalculated: new Date(),
      },
      update: {
        totalCars,
        availableCars,
        activeContracts,
        utilizationRate,
        demandScore,
        lastCalculated: new Date(),
      },
    });

    return updatedMetrics;
  } catch (error) {
    console.error('Error getting city demand metrics:', error);
    return {
      totalCars: 0,
      availableCars: 0,
      activeContracts: 0,
      utilizationRate: 0,
      demandScore: 1.0,
    };
  }
}
