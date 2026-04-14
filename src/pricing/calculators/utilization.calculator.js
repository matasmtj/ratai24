/**
 * Utilization Calculator
 * Adjusts pricing based on how well a specific car is performing.
 *
 * Default bands (when no per-car override): edit the constants below or use
 * Car.utilizationMultiplierOverride / Car.applyUtilizationPricing in the database.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_UTILIZATION = 0.75;

/**
 * @param {Object} car - Car row with utilization fields (from prisma include/select)
 * @returns {number} Utilization multiplier
 */
export function calculateUtilizationMultiplierForCar(car) {
  if (!car || car.applyUtilizationPricing === false) {
    return 1.0;
  }

  if (
    car.utilizationMultiplierOverride != null &&
    Number.isFinite(car.utilizationMultiplierOverride)
  ) {
    const m = car.utilizationMultiplierOverride;
    if (m >= 0.1 && m <= 3) return m;
  }

  if (car.utilizationRate === null || car.utilizationRate === undefined) {
    return 1.0;
  }

  const utilizationRate = car.utilizationRate;

  if (utilizationRate < 0.3) {
    return 0.9;
  }
  if (utilizationRate < 0.5) {
    return 0.95;
  }
  if (utilizationRate > 0.9) {
    return 1.1;
  }
  if (utilizationRate > TARGET_UTILIZATION) {
    return 1.05;
  }
  return 1.0;
}

/**
 * @param {number} carId - Car ID
 * @returns {Promise<number>} Utilization multiplier
 */
export async function calculateUtilizationMultiplier(carId) {
  try {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: {
        utilizationRate: true,
        applyUtilizationPricing: true,
        utilizationMultiplierOverride: true,
      },
    });
    return calculateUtilizationMultiplierForCar(car);
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
      await prisma.car.update({
        where: { id: carId },
        data: {
          utilizationRate: 0,
          lastUtilizationUpdate: new Date(),
        },
      });
      return 0;
    }

    let totalRentedDays = 0;
    contracts.forEach((contract) => {
      const start = Math.max(contract.startDate.getTime(), lookbackDate.getTime());
      const end = Math.min(contract.endDate.getTime(), Date.now());
      const rentedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      totalRentedDays += Math.max(0, rentedDays);
    });

    const utilizationRate = totalRentedDays / days;

    await prisma.car.update({
      where: { id: carId },
      data: {
        utilizationRate: Math.min(1.0, utilizationRate),
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
    return 1.0;
  }

  if (car.maintenanceScore >= 95) {
    return 1.05;
  }
  if (car.maintenanceScore >= 85) {
    return 1.0;
  }
  if (car.maintenanceScore >= 70) {
    return 0.95;
  }
  return 0.85;
}
