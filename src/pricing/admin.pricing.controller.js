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

    // ========== ACTUAL REVENUE from completed contracts ==========
    const contracts = await prisma.contract.findMany({
      where: {
        state: 'COMPLETED',
        endDate: { gte: start, lte: end },
        ...(cityId && {
          car: {
            cityId: parseInt(cityId),
          },
        }),
      },
      include: {
        car: {
          select: {
            make: true,
            model: true,
            year: true,
            cityId: true,
            city: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        endDate: 'desc',
      },
    });

    // Calculate revenue metrics
    const totalRevenue = contracts.reduce((sum, c) => sum + c.totalPrice, 0);
    const totalContracts = contracts.length;
    const avgRevenuePerContract = totalContracts > 0 ? totalRevenue / totalContracts : 0;

    // Calculate average price per day
    let totalDays = 0;
    contracts.forEach(c => {
      const days = Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000 * 60 * 60 * 24));
      totalDays += days;
    });
    const avgPricePerDay = totalDays > 0 ? totalRevenue / totalDays : 0;

    // Calculate dynamic pricing adoption (% of cars with useDynamicPricing enabled)
    const totalCars = await prisma.car.count({
      where: {
        availableForLease: true,
        ...(cityId && { cityId: parseInt(cityId) }),
      },
    });
    
    const dynamicPricingCars = await prisma.car.count({
      where: {
        availableForLease: true,
        useDynamicPricing: true,
        ...(cityId && { cityId: parseInt(cityId) }),
      },
    });
    
    const dynamicPricingUsage = totalCars > 0
      ? (dynamicPricingCars / totalCars) * 100
      : 0;

    // Contracts with dynamic pricing breakdown
    const contractsWithPricing = contracts.filter(c => c.dynamicPrice !== null);

    // Calculate pricing impact (dynamic vs base)
    let totalBaseRevenue = 0;
    let totalDynamicRevenue = 0;
    contractsWithPricing.forEach(c => {
      if (c.basePrice && c.dynamicPrice) {
        const days = Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000 * 60 * 60 * 24));
        totalBaseRevenue += c.basePrice * days;
        totalDynamicRevenue += c.dynamicPrice * days;
      }
    });

    const pricingImpact = totalBaseRevenue > 0
      ? ((totalDynamicRevenue - totalBaseRevenue) / totalBaseRevenue) * 100
      : 0;

    // ========== PRICING SNAPSHOTS (for pricing algorithm insights) ==========
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
      take: 100,
    });

    // Snapshot statistics (algorithm performance)
    const avgDemandMultiplier = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.demandMultiplier, 0) / snapshots.length
      : 1.0;

    const avgSeasonalMultiplier = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.seasonalMultiplier, 0) / snapshots.length
      : 1.0;

    res.json({
      period: { start, end },
      
      // Real revenue metrics
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        totalContracts,
        avgPerContract: Math.round(avgRevenuePerContract * 100) / 100,
        avgPricePerDay: Math.round(avgPricePerDay * 100) / 100,
      },

      // Dynamic pricing performance
      pricingPerformance: {
        dynamicPricingAdoption: Math.round(dynamicPricingUsage * 100) / 100, // % of cars with dynamic pricing enabled
        totalCars,
        dynamicPricingCars,
        contractsWithPricing: contractsWithPricing.length,
        totalContracts,
        revenueImpact: Math.round(pricingImpact * 100) / 100, // % change vs base price
        avgDemandMultiplier: Math.round(avgDemandMultiplier * 100) / 100,
        avgSeasonalMultiplier: Math.round(avgSeasonalMultiplier * 100) / 100,
      },

      // Recent activity
      recentContracts: contracts.slice(0, 10).map(c => ({
        id: c.id,
        car: `${c.car.make} ${c.car.model}`,
        city: c.car.city.name,
        totalPrice: c.totalPrice,
        basePrice: c.basePrice,
        dynamicPrice: c.dynamicPrice,
        startDate: c.startDate,
        endDate: c.endDate,
      })),

      // Pricing algorithm insights
      pricingInsights: {
        totalCalculations: snapshots.length,
        recentCalculations: snapshots.slice(0, 20),
      },
    });
  } catch (error) {
    console.error('Error in getPricingAnalytics:', error);
    res.status(500).json({
      error: 'Failed to get pricing analytics',
    });
  }
}

/**
 * Get revenue analytics (focused on actual money earned)
 * GET /api/admin/pricing/revenue
 */
export async function getRevenueAnalytics(req, res) {
  try {
    const { startDate, endDate, cityId, groupBy } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days default
    const end = endDate ? new Date(endDate) : new Date();

    // Get all contracts (not just completed, to show pipeline)
    const allContracts = await prisma.contract.findMany({
      where: {
        // Filter by when the rental ended (completed in this period)
        endDate: { gte: start, lte: end },
        ...(cityId && {
          car: {
            cityId: parseInt(cityId),
          },
        }),
      },
      include: {
        car: {
          select: {
            make: true,
            model: true,
            cityId: true,
            city: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        endDate: 'desc',
      },
    });

    // Break down by state
    const completed = allContracts.filter(c => c.state === 'COMPLETED');
    const active = allContracts.filter(c => c.state === 'ACTIVE');
    const cancelled = allContracts.filter(c => c.state === 'CANCELLED');

    // Revenue calculations
    const totalRevenue = completed.reduce((sum, c) => sum + c.totalPrice, 0);
    const pendingRevenue = active.reduce((sum, c) => sum + c.totalPrice, 0);
    const lostRevenue = cancelled.reduce((sum, c) => sum + c.totalPrice, 0);

    // Group by city if requested
    let revenueByCity = null;
    if (groupBy === 'city') {
      const cityRevenue = {};
      completed.forEach(c => {
        const cityName = c.car.city.name;
        if (!cityRevenue[cityName]) {
          cityRevenue[cityName] = {
            revenue: 0,
            contracts: 0,
            avgRevenue: 0,
          };
        }
        cityRevenue[cityName].revenue += c.totalPrice;
        cityRevenue[cityName].contracts += 1;
      });

      // Calculate averages
      Object.keys(cityRevenue).forEach(city => {
        cityRevenue[city].avgRevenue = cityRevenue[city].contracts > 0
          ? cityRevenue[city].revenue / cityRevenue[city].contracts
          : 0;
      });

      revenueByCity = cityRevenue;
    }

    // Top earning cars
    const carRevenue = {};
    completed.forEach(c => {
      const carKey = `${c.car.make} ${c.car.model} (ID: ${c.carId})`;
      if (!carRevenue[carKey]) {
        carRevenue[carKey] = {
          revenue: 0,
          contracts: 0,
        };
      }
      carRevenue[carKey].revenue += c.totalPrice;
      carRevenue[carKey].contracts += 1;
    });

    const topCars = Object.entries(carRevenue)
      .map(([car, data]) => ({ car, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      period: { start, end },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        pendingRevenue: Math.round(pendingRevenue * 100) / 100,
        lostRevenue: Math.round(lostRevenue * 100) / 100,
        completedContracts: completed.length,
        activeContracts: active.length,
        cancelledContracts: cancelled.length,
        avgRevenuePerContract: completed.length > 0
          ? Math.round((totalRevenue / completed.length) * 100) / 100
          : 0,
      },
      topCars,
      ...(revenueByCity && { revenueByCity }),
    });
  } catch (error) {
    console.error('Error in getRevenueAnalytics:', error);
    res.status(500).json({
      error: 'Failed to get revenue analytics',
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

    // Get current car data
    const car = await prisma.car.findUnique({ where: { id: parseInt(id) } });
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Determine if we should calculate prices automatically
    const shouldCalculatePrices = (
      // User wants to calculate, OR
      req.body.calculatePrices === true || 
      // User provides cost data but no manual prices, OR
      ((dailyOperatingCost !== undefined || monthlyFinancingCost !== undefined || purchasePrice !== undefined) &&
       !basePricePerDay && !minPricePerDay && !maxPricePerDay) ||
      // No prices set at all
      (!car.basePricePerDay && !basePricePerDay)
    );

    let config = { 
      basePricePerDay: basePricePerDay ?? car.basePricePerDay, 
      minPricePerDay: minPricePerDay ?? car.minPricePerDay, 
      maxPricePerDay: maxPricePerDay ?? car.maxPricePerDay 
    };
    
    // Calculate recommended prices if needed
    if (shouldCalculatePrices) {
      const recommended = calculatePriceConstraints({
        ...car,
        dailyOperatingCost: dailyOperatingCost ?? car.dailyOperatingCost,
        monthlyFinancingCost: monthlyFinancingCost ?? car.monthlyFinancingCost,
        purchasePrice: purchasePrice ?? car.purchasePrice,
      });
      config = recommended;
    }

    // Prepare update data
    const updateData = {
      ...(useDynamicPricing !== undefined && { useDynamicPricing }),
      basePricePerDay: config.basePricePerDay,
      minPricePerDay: config.minPricePerDay,
      maxPricePerDay: config.maxPricePerDay,
      ...(dailyOperatingCost !== undefined && { dailyOperatingCost }),
      ...(monthlyFinancingCost !== undefined && { monthlyFinancingCost }),
      ...(purchasePrice !== undefined && { purchasePrice }),
    };

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json(updatedCar);
  } catch (error) {
    console.error('Error in updateCarPricingConfig:', error);
    res.status(500).json({
      error: 'Failed to update car pricing configuration',
      details: error.message,
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
