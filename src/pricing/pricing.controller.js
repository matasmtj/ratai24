/**
 * Pricing Controller
 * Handles API requests for dynamic pricing
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import * as pricingService from './pricing.service.js';
import { getCityDemandMetrics } from './calculators/demand.calculator.js';
import { getCustomerLoyaltyInfo } from './calculators/customer.calculator.js';

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function parseDateValue(value, fieldName) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
  return parsed;
}

/**
 * Calculate price for a specific car and date range
 * POST /api/pricing/calculate
 */
export async function calculatePrice(req, res) {
  try {
    const { carId, startDate, endDate, userId } = req.body;

    // Validation
    if (!carId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: carId, startDate, endDate',
      });
    }

    const parsedCarId = parsePositiveInt(carId, 'carId');
    const start = parseDateValue(startDate, 'startDate');
    const end = parseDateValue(endDate, 'endDate');

    if (start >= end) {
      return res.status(400).json({
        error: 'End date must be after start date',
      });
    }

    // Calculate price
    const result = await pricingService.calculateDynamicPrice({
      carId: parsedCarId,
      startDate: start,
      endDate: end,
      userId: userId ? parsePositiveInt(userId, 'userId') : null,
      saveSnapshot: true, // Save for analytics
    });

    res.json(result);
  } catch (error) {
    console.error('Error in calculatePrice:', error);
    if (error instanceof Error && (error.message.includes('carId') || error.message.includes('startDate') || error.message.includes('endDate') || error.message.includes('userId'))) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({
      error: error.message || 'Failed to calculate price',
    });
  }
}

/**
 * Get price preview for a car (quick calculation)
 * GET /api/pricing/preview/:carId
 */
export async function getPricePreview(req, res) {
  try {
    const { carId } = req.params;
    const { startDate, endDate, duration } = req.query;
    const parsedCarId = parsePositiveInt(carId, 'carId');

    // Default to 7-day rental starting today
    let start = startDate ? parseDateValue(startDate, 'startDate') : new Date();
    let end;

    if (endDate) {
      end = parseDateValue(endDate, 'endDate');
    } else {
      const days = duration ? parsePositiveInt(duration, 'duration') : 7;
      end = new Date(start);
      end.setDate(end.getDate() + days);
    }
    if (start >= end) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const result = await pricingService.calculateDynamicPrice({
      carId: parsedCarId,
      startDate: start,
      endDate: end,
      userId: req.user?.id || null,
      saveSnapshot: false, // Don't save previews
    });

    // Get car pricing configuration
    const car = await prisma.car.findUnique({
      where: { id: parsedCarId },
      select: {
        basePricePerDay: true,
        minPricePerDay: true,
        maxPricePerDay: true,
        useDynamicPricing: true,
      },
    });

    // Enhanced response with pricing configuration
    res.json({
      carId: result.carId,
      pricePerDay: result.pricePerDay,
      totalPrice: result.totalPrice,
      duration: result.duration,
      isDynamic: result.isDynamic,
      pricingConfig: {
        basePricePerDay: car?.basePricePerDay,
        minPricePerDay: car?.minPricePerDay,
        maxPricePerDay: car?.maxPricePerDay,
        useDynamicPricing: car?.useDynamicPricing,
      },
      breakdown: result.breakdown,
    });
  } catch (error) {
    console.error('Error in getPricePreview:', error);
    if (error instanceof Error && (error.message.includes('carId') || error.message.includes('startDate') || error.message.includes('endDate') || error.message.includes('duration'))) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({
      error: error.message || 'Failed to get price preview',
    });
  }
}

/**
 * Get city demand metrics
 * GET /api/pricing/demand/:cityId
 */
export async function getCityDemand(req, res) {
  try {
    const { cityId } = req.params;
    const parsedCityId = parsePositiveInt(cityId, 'cityId');
    const metrics = await getCityDemandMetrics(parsedCityId);
    res.json(metrics);
  } catch (error) {
    console.error('Error in getCityDemand:', error);
    if (error instanceof Error && error.message.includes('cityId')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({
      error: 'Failed to get demand metrics',
    });
  }
}

/**
 * Get customer loyalty information
 * GET /api/pricing/loyalty
 */
export async function getCustomerLoyalty(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const loyaltyInfo = await getCustomerLoyaltyInfo(req.user.id);
    res.json(loyaltyInfo);
  } catch (error) {
    console.error('Error in getCustomerLoyalty:', error);
    res.status(500).json({
      error: 'Failed to get loyalty information',
    });
  }
}

/**
 * Calculate prices for multiple cars (bulk operation)
 * POST /api/pricing/bulk-calculate
 */
export async function bulkCalculatePrice(req, res) {
  try {
    const { carIds, startDate, endDate } = req.body;

    if (!carIds || !Array.isArray(carIds) || carIds.length === 0) {
      return res.status(400).json({
        error: 'carIds must be a non-empty array',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: startDate, endDate',
      });
    }

    const parsedCarIds = carIds.map((id) => parsePositiveInt(id, 'carIds'));
    const start = parseDateValue(startDate, 'startDate');
    const end = parseDateValue(endDate, 'endDate');
    if (start >= end) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const prices = await pricingService.getBulkPricePreviews(
      parsedCarIds,
      start,
      end
    );

    res.json(prices);
  } catch (error) {
    console.error('Error in bulkCalculatePrice:', error);
    if (error instanceof Error && (error.message.includes('carIds') || error.message.includes('startDate') || error.message.includes('endDate'))) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({
      error: 'Failed to calculate bulk prices',
    });
  }
}
