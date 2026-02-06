/**
 * Pricing Controller
 * Handles API requests for dynamic pricing
 */

import * as pricingService from './pricing.service.js';
import { getCityDemandMetrics } from './calculators/demand.calculator.js';
import { getCustomerLoyaltyInfo } from './calculators/customer.calculator.js';

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

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
      });
    }

    if (start >= end) {
      return res.status(400).json({
        error: 'End date must be after start date',
      });
    }

    // Calculate price
    const result = await pricingService.calculateDynamicPrice({
      carId: parseInt(carId),
      startDate: start,
      endDate: end,
      userId: userId ? parseInt(userId) : null,
      saveSnapshot: true, // Save for analytics
    });

    res.json(result);
  } catch (error) {
    console.error('Error in calculatePrice:', error);
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

    // Default to 7-day rental starting today
    let start = startDate ? new Date(startDate) : new Date();
    let end;

    if (endDate) {
      end = new Date(endDate);
    } else {
      const days = duration ? parseInt(duration) : 7;
      end = new Date(start);
      end.setDate(end.getDate() + days);
    }

    const result = await pricingService.calculateDynamicPrice({
      carId: parseInt(carId),
      startDate: start,
      endDate: end,
      userId: req.user?.id || null,
      saveSnapshot: false, // Don't save previews
    });

    // Simplified response for preview
    res.json({
      carId: result.carId,
      pricePerDay: result.pricePerDay,
      totalPrice: result.totalPrice,
      duration: result.duration,
      isDynamic: result.isDynamic,
    });
  } catch (error) {
    console.error('Error in getPricePreview:', error);
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
    const metrics = await getCityDemandMetrics(parseInt(cityId));
    res.json(metrics);
  } catch (error) {
    console.error('Error in getCityDemand:', error);
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

    const start = new Date(startDate);
    const end = new Date(endDate);

    const prices = await pricingService.getBulkPricePreviews(
      carIds.map(id => parseInt(id)),
      start,
      end
    );

    res.json(prices);
  } catch (error) {
    console.error('Error in bulkCalculatePrice:', error);
    res.status(500).json({
      error: 'Failed to calculate bulk prices',
    });
  }
}
