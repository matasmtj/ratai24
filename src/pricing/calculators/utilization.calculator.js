/**
 * Utilization Calculator
 * Adjusts pricing based on how well a specific car is performing
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Calculate utilization multiplier for a specific car
 * @param {number} carId - Car ID
 * @returns {Promise<number>} Utilization multiplier
 */
export async function calculateUtilizationMultiplier(carId) {
  try {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: { utilizationRate: true },
    });

    if (!car || car.utilizationRate === null || car.utilizationRate === undefined) {
      return 1.0; // No data available
    }

    const utilizationRate = car.utilizationRate;
    const TARGET_UTILIZATION = 0.75; // Target 75% utilization

    // Adjust pricing based on utilization
    if (utilizationRate < 0.3) {
      // Very low utilization (< 30%) - aggressive discount
      return 0.75; // 25% discount
    } else if (utilizationRate < 0.5) {
      // Low utilization (30-50%) - moderate discount
      return 0.85; // 15% discount
    } else if (utilizationRate > 0.9) {
      // Very high utilization (> 90%) - premium pricing
      return 1.25; // 25% premium
    } else if (utilizationRate > TARGET_UTILIZATION) {
      // Above target utilization - slight premium
      return 1.1; // 10% premium
    } else {
      // Normal utilization - no adjustment
      return 1.0;
    }
  } catch (error) {
    console.error('Error calculating utilization multiplier:', error);
    return 1.0;
  }
}

/**
 * Update utilization rate for a car based on historical contracts
 * @param {number} carId - Car ID
 * @param {number} days - Number of days to look back (default 90)
 * @returns {Promise<number>} Calculated utilization rate
 */
export async function updateCarUtilizationRate(carId, days = 90) {
  try {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - days);

    // Get all contracts for this car in the lookback period
    const contracts = await prisma.contract.findMany({
      where: {
        carId,
        state: { in: ['ACTIVE', 'COMPLETED'] },
        startDate: { gte: lookbackDate },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    if (contracts.length === 0) {
      // No contracts in this period
      await prisma.car.update({
        where: { id: carId },
        data: {
          utilizationRate: 0,
          lastUtilizationUpdate: new Date(),
        },
      });
      return 0;
    }

    // Calculate total days the car was rented
    let totalRentedDays = 0;
    contracts.forEach(contract => {
      const start = Math.max(contract.startDate.getTime(), lookbackDate.getTime());
      const end = Math.min(contract.endDate.getTime(), Date.now());
      const rentedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      totalRentedDays += Math.max(0, rentedDays);
    });

    // Calculate utilization rate
    const utilizationRate = totalRentedDays / days;

    // Update the car record
    await prisma.car.update({
      where: { id: carId },
      data: {
        utilizationRate: Math.min(1.0, utilizationRate), // Cap at 100%
        lastUtilizationUpdate: new Date(),
      },
    });

    return utilizationRate;
  } catch (error) {
    console.error(`Error updating utilization for car ${carId}:`, error);
    return 0;
  }
}

/**
 * Update utilization rates for all cars
 * @returns {Promise<void>}
 */
export async function updateAllCarUtilizationRates() {
  try {
    const cars = await prisma.car.findMany({
      where: { availableForLease: true },
      select: { id: true },
    });

    console.log(`Updating utilization rates for ${cars.length} cars...`);

    for (const car of cars) {
      await updateCarUtilizationRate(car.id);
    }

    console.log('Utilization rates updated successfully');
  } catch (error) {
    console.error('Error updating all car utilization rates:', error);
  }
}

/**
 * Get maintenance adjustment multiplier
 * @param {Object} car - Car object with maintenance data
 * @returns {number} Maintenance multiplier
 */
export function getMaintenanceMultiplier(car) {
  if (!car.maintenanceScore) {
    return 1.0; // No data
  }

  // Excellent condition (95-100) - slight premium
  if (car.maintenanceScore >= 95) {
    return 1.05; // 5% premium for perfect condition
  }
  // Good condition (85-95) - normal
  else if (car.maintenanceScore >= 85) {
    return 1.0;
  }
  // Fair condition (70-85) - slight discount
  else if (car.maintenanceScore >= 70) {
    return 0.95; // 5% discount
  }
  // Poor condition (< 70) - larger discount
  else {
    return 0.85; // 15% discount
  }
}
