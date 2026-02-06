/**
 * Admin Pricing Controller
 * Admin-only endpoints for pricing management and analytics
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { calculatePriceConstraints } from './calculators/base-price.calculator.js';
import { createSeasonalFactor } from './calculators/seasonal.calculator.js';
import { runAllPricingJobs } from './pricing.jobs.js';

/**
 * Get pricing analytics dashboard data
 * GET /api/admin/pricing/analytics
 */
export async function getPricingAnalytics(req, res) {
  try {
    const { startDate, endDate, cityId } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get pricing snapshots for the period
    const snapshots = await prisma.pricingSnapshot.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(cityId && { cityId: parseInt(cityId) }),
      },
      include: {
        car: {
          select: {
            make: true,
            model: true,
            year: true,
          },
        },
        city: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // Limit to recent 1000
    });

    // Calculate statistics
    const avgBasePrice = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.basePrice, 0) / snapshots.length
      : 0;

    const avgFinalPrice = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.finalPrice, 0) / snapshots.length
      : 0;

    const avgDemandMultiplier = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.demandMultiplier, 0) / snapshots.length
      : 1.0;

    res.json({
      period: { start, end },
      totalSnapshots: snapshots.length,
      statistics: {
        avgBasePrice: Math.round(avgBasePrice * 100) / 100,
        avgFinalPrice: Math.round(avgFinalPrice * 100) / 100,
        avgDemandMultiplier: Math.round(avgDemandMultiplier * 100) / 100,
        avgPriceIncrease: avgBasePrice > 0
          ? Math.round(((avgFinalPrice - avgBasePrice) / avgBasePrice) * 100 * 100) / 100
          : 0,
      },
      recentSnapshots: snapshots.slice(0, 50), // Return 50 most recent
    });
  } catch (error) {
    console.error('Error in getPricingAnalytics:', error);
    res.status(500).json({
      error: 'Failed to get pricing analytics',
    });
  }
}

/**
 * Get car utilization performance
 * GET /api/admin/pricing/performance
 */
export async function getCarPerformance(req, res) {
  try {
    const { cityId } = req.query;

    const cars = await prisma.car.findMany({
      where: {
        availableForLease: true,
        ...(cityId && { cityId: parseInt(cityId) }),
      },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        pricePerDay: true,
        basePricePerDay: true,
        utilizationRate: true,
        averageRevenuePerDay: true,
        city: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        utilizationRate: 'desc',
      },
    });

    // Add performance ratings
    const carsWithRatings = cars.map(car => {
      let performanceRating = 'Unknown';
      
      if (car.utilizationRate !== null) {
        if (car.utilizationRate >= 0.8) performanceRating = 'Excellent';
        else if (car.utilizationRate >= 0.6) performanceRating = 'Good';
        else if (car.utilizationRate >= 0.4) performanceRating = 'Fair';
        else performanceRating = 'Poor';
      }

      return {
        ...car,
        performanceRating,
      };
    });

    res.json({
      totalCars: cars.length,
      cars: carsWithRatings,
    });
  } catch (error) {
    console.error('Error in getCarPerformance:', error);
    res.status(500).json({
      error: 'Failed to get car performance data',
    });
  }
}

/**
 * Update pricing configuration for a car
 * PUT /api/admin/pricing/cars/:id/config
 */
export async function updateCarPricingConfig(req, res) {
  try {
    const { id } = req.params;
    const {
      useDynamicPricing,
      basePricePerDay,
      minPricePerDay,
      maxPricePerDay,
      dailyOperatingCost,
      monthlyFinancingCost,
      purchasePrice,
    } = req.body;

    // If no manual prices provided, calculate recommended values
    let config = { basePricePerDay, minPricePerDay, maxPricePerDay };
    
    if (!basePricePerDay || !minPricePerDay || !maxPricePerDay) {
      const car = await prisma.car.findUnique({ where: { id: parseInt(id) } });
      if (car) {
        const recommended = calculatePriceConstraints({
          ...car,
          dailyOperatingCost: dailyOperatingCost || car.dailyOperatingCost,
          monthlyFinancingCost: monthlyFinancingCost || car.monthlyFinancingCost,
          purchasePrice: purchasePrice || car.purchasePrice,
        });
        config = recommended;
      }
    }

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(id) },
      data: {
        useDynamicPricing: useDynamicPricing ?? undefined,
        basePricePerDay: config.basePricePerDay,
        minPricePerDay: config.minPricePerDay,
        maxPricePerDay: config.maxPricePerDay,
        dailyOperatingCost,
        monthlyFinancingCost,
        purchasePrice,
      },
    });

    res.json(updatedCar);
  } catch (error) {
    console.error('Error in updateCarPricingConfig:', error);
    res.status(500).json({
      error: 'Failed to update car pricing configuration',
    });
  }
}

/**
 * Create a pricing rule
 * POST /api/admin/pricing/rules
 */
export async function createPricingRule(req, res) {
  try {
    const rule = await prisma.pricingRule.create({
      data: req.body,
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Error in createPricingRule:', error);
    res.status(500).json({
      error: 'Failed to create pricing rule',
    });
  }
}

/**
 * Get all pricing rules
 * GET /api/admin/pricing/rules
 */
export async function getPricingRules(req, res) {
  try {
    const rules = await prisma.pricingRule.findMany({
      include: {
        car: {
          select: {
            make: true,
            model: true,
            year: true,
          },
        },
        city: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        priority: 'desc',
      },
    });

    res.json(rules);
  } catch (error) {
    console.error('Error in getPricingRules:', error);
    res.status(500).json({
      error: 'Failed to get pricing rules',
    });
  }
}

/**
 * Update a pricing rule
 * PUT /api/admin/pricing/rules/:id
 */
export async function updatePricingRule(req, res) {
  try {
    const { id } = req.params;
    const rule = await prisma.pricingRule.update({
      where: { id: parseInt(id) },
      data: req.body,
    });

    res.json(rule);
  } catch (error) {
    console.error('Error in updatePricingRule:', error);
    res.status(500).json({
      error: 'Failed to update pricing rule',
    });
  }
}

/**
 * Delete a pricing rule
 * DELETE /api/admin/pricing/rules/:id
 */
export async function deletePricingRule(req, res) {
  try {
    const { id } = req.params;
    await prisma.pricingRule.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error in deletePricingRule:', error);
    res.status(500).json({
      error: 'Failed to delete pricing rule',
    });
  }
}

/**
 * Create a seasonal factor
 * POST /api/admin/pricing/seasonal-factors
 */
export async function createSeasonalFactorRoute(req, res) {
  try {
    const factor = await createSeasonalFactor(req.body);
    res.status(201).json(factor);
  } catch (error) {
    console.error('Error in createSeasonalFactorRoute:', error);
    res.status(500).json({
      error: 'Failed to create seasonal factor',
    });
  }
}

/**
 * Get all seasonal factors
 * GET /api/admin/pricing/seasonal-factors
 */
export async function getSeasonalFactors(req, res) {
  try {
    const factors = await prisma.seasonalFactor.findMany({
      include: {
        city: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    res.json(factors);
  } catch (error) {
    console.error('Error in getSeasonalFactors:', error);
    res.status(500).json({
      error: 'Failed to get seasonal factors',
    });
  }
}

/**
 * Manually trigger pricing jobs
 * POST /api/admin/pricing/refresh
 */
export async function refreshPricingData(req, res) {
  try {
    // Run jobs in background
    runAllPricingJobs().catch(console.error);

    res.json({
      message: 'Pricing data refresh initiated',
    });
  } catch (error) {
    console.error('Error in refreshPricingData:', error);
    res.status(500).json({
      error: 'Failed to refresh pricing data',
    });
  }
}
