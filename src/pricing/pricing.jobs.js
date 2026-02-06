/**
 * Pricing Background Jobs
 * Scheduled tasks for maintaining pricing data
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { updateAllCarUtilizationRates } from './calculators/utilization.calculator.js';
import { getCityDemandMetrics } from './calculators/demand.calculator.js';

/**
 * Update city demand metrics for all cities
 * Should run every 15 minutes
 */
export async function updateAllCityDemandMetrics() {
  try {
    console.log('[Pricing Jobs] Updating city demand metrics...');
    
    const cities = await prisma.city.findMany({
      select: { id: true, name: true },
    });

    for (const city of cities) {
      try {
        await getCityDemandMetrics(city.id);
        console.log(`[Pricing Jobs] Updated metrics for ${city.name}`);
      } catch (error) {
        console.error(`[Pricing Jobs] Error updating metrics for ${city.name}:`, error);
      }
    }

    console.log('[Pricing Jobs] City demand metrics update completed');
  } catch (error) {
    console.error('[Pricing Jobs] Error in updateAllCityDemandMetrics:', error);
  }
}

/**
 * Update utilization rates for all cars
 * Should run daily at 2 AM
 */
export async function updateUtilizationRates() {
  try {
    console.log('[Pricing Jobs] Updating car utilization rates...');
    await updateAllCarUtilizationRates();
    console.log('[Pricing Jobs] Utilization rates update completed');
  } catch (error) {
    console.error('[Pricing Jobs] Error in updateUtilizationRates:', error);
  }
}

/**
 * Clean up old pricing snapshots (keep last 90 days)
 * Should run daily
 */
export async function cleanupOldSnapshots() {
  try {
    console.log('[Pricing Jobs] Cleaning up old pricing snapshots...');
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await prisma.pricingSnapshot.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    console.log(`[Pricing Jobs] Deleted ${result.count} old snapshots`);
  } catch (error) {
    console.error('[Pricing Jobs] Error in cleanupOldSnapshots:', error);
  }
}

/**
 * Initialize pricing job schedulers
 * @param {Function} scheduler - Scheduling function (e.g., node-cron)
 */
export function initializePricingJobs(scheduler) {
  if (!scheduler) {
    console.warn('[Pricing Jobs] No scheduler provided, running once...');
    // Run once immediately
    updateAllCityDemandMetrics();
    updateUtilizationRates();
    return;
  }

  try {
    // Update city demand metrics every 15 minutes
    scheduler.schedule('*/15 * * * *', () => {
      updateAllCityDemandMetrics();
    });

    // Update utilization rates daily at 2 AM
    scheduler.schedule('0 2 * * *', () => {
      updateUtilizationRates();
    });

    // Clean up old snapshots daily at 3 AM
    scheduler.schedule('0 3 * * *', () => {
      cleanupOldSnapshots();
    });

    console.log('[Pricing Jobs] Scheduled jobs initialized');
  } catch (error) {
    console.error('[Pricing Jobs] Error initializing jobs:', error);
  }
}

/**
 * Manual trigger for updating all pricing data
 * Useful for admin panel or debugging
 */
export async function runAllPricingJobs() {
  console.log('[Pricing Jobs] Running all pricing jobs manually...');
  
  await updateAllCityDemandMetrics();
  await updateUtilizationRates();
  await cleanupOldSnapshots();
  
  console.log('[Pricing Jobs] All pricing jobs completed');
}
