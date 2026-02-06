/**
 * Example: Integrating Dynamic Pricing into Car Listings
 * 
 * This file demonstrates how to enhance the existing car listing endpoints
 * to include dynamic pricing information.
 */

import { getBulkPricePreviews, calculateDynamicPrice } from './pricing.service.js';

/**
 * EXAMPLE 1: Enhanced Car Listing with Dynamic Prices
 * 
 * Add this to your existing GET /api/cars endpoint
 */
export async function listCarsWithDynamicPricing(cars, query) {
  // Check if user provided date range for pricing
  const { startDate, endDate } = query;
  
  if (!startDate || !endDate) {
    // No dates provided - just return cars with base pricing
    return cars.map(car => ({
      ...car,
      pricePerDay: car.useDynamicPricing ? car.basePricePerDay : car.pricePerDay,
      isDynamicPricing: car.useDynamicPricing,
    }));
  }

  // Calculate dynamic prices for all cars
  const carIds = cars.map(c => c.id);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const prices = await getBulkPricePreviews(carIds, start, end);

  // Merge pricing data with car data
  return cars.map(car => ({
    ...car,
    pricing: {
      pricePerDay: prices[car.id]?.pricePerDay || car.pricePerDay,
      totalPrice: prices[car.id]?.totalPrice || null,
      basePrice: car.basePricePerDay || car.pricePerDay,
      isDynamic: car.useDynamicPricing,
    },
  }));
}

/**
 * EXAMPLE 2: Car Detail Page with Full Pricing Breakdown
 * 
 * Add this to your GET /api/cars/:id endpoint
 */
export async function getCarWithDetailedPricing(car, query) {
  const { startDate, endDate, userId } = query;

  // If no dates provided, return basic info
  if (!startDate || !endDate) {
    return {
      ...car,
      pricing: {
        basePrice: car.basePricePerDay || car.pricePerDay,
        useDynamicPricing: car.useDynamicPricing,
        minPrice: car.minPricePerDay,
        maxPrice: car.maxPricePerDay,
      },
    };
  }

  // Calculate full pricing with breakdown
  try {
    const pricingResult = await calculateDynamicPrice({
      carId: car.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userId: userId ? parseInt(userId) : null,
      saveSnapshot: false, // Don't save for previews
    });

    return {
      ...car,
      pricing: {
        pricePerDay: pricingResult.pricePerDay,
        totalPrice: pricingResult.totalPrice,
        duration: pricingResult.duration,
        breakdown: pricingResult.breakdown,
        isDynamic: pricingResult.isDynamic,
      },
    };
  } catch (error) {
    console.error('Error calculating dynamic price:', error);
    // Fallback to static pricing
    return {
      ...car,
      pricing: {
        pricePerDay: car.pricePerDay,
        basePrice: car.pricePerDay,
        isDynamic: false,
      },
    };
  }
}

/**
 * EXAMPLE 3: Contract Creation with Dynamic Pricing
 * 
 * Modify your POST /api/contracts endpoint to use calculated pricing
 */
export async function createContractWithDynamicPricing(contractData) {
  const { carId, userId, startDate, endDate } = contractData;

  // Calculate price at time of booking
  const pricing = await calculateDynamicPrice({
    carId,
    startDate,
    endDate,
    userId,
    saveSnapshot: true, // Save for analytics
  });

  // Create contract with pricing breakdown
  const contract = await prisma.contract.create({
    data: {
      userId,
      carId,
      startDate,
      endDate,
      totalPrice: pricing.totalPrice,
      
      // Store pricing breakdown for record-keeping
      basePrice: pricing.basePrice,
      dynamicPrice: pricing.breakdown.dynamicPrice,
      finalPrice: pricing.pricePerDay,
      demandMultiplier: pricing.breakdown.multipliers.demand,
      seasonalMultiplier: pricing.breakdown.multipliers.seasonal,
      durationDiscount: pricing.breakdown.multipliers.duration,
      
      // Link to pricing snapshot
      pricingSnapshotId: pricing.snapshotId || null,
      
      // ... other contract fields
    },
  });

  return contract;
}

/**
 * EXAMPLE 4: Real-time Price Updates for Booking Form
 * 
 * Frontend can call this to show live price updates as user changes dates
 */
export async function getRealtimePriceQuote(req, res) {
  try {
    const { carId, startDate, endDate } = req.query;

    if (!carId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters: carId, startDate, endDate',
      });
    }

    const pricing = await calculateDynamicPrice({
      carId: parseInt(carId),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userId: req.user?.id || null,
      saveSnapshot: false,
    });

    // Return simplified response for UI
    res.json({
      pricePerDay: pricing.pricePerDay,
      totalPrice: pricing.totalPrice,
      duration: pricing.duration,
      savings: pricing.breakdown.dynamicPrice > pricing.pricePerDay 
        ? Math.round((pricing.breakdown.dynamicPrice - pricing.pricePerDay) * pricing.duration * 100) / 100
        : 0,
      highlights: [
        pricing.breakdown.multipliers.duration < 1 ? `${Math.round((1 - pricing.breakdown.multipliers.duration) * 100)}% multi-day discount applied` : null,
        pricing.breakdown.multipliers.customer < 1 ? `${Math.round((1 - pricing.breakdown.multipliers.customer) * 100)}% loyalty discount applied` : null,
        pricing.breakdown.multipliers.seasonal > 1.2 ? 'Peak season pricing' : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('Error getting realtime price:', error);
    res.status(500).json({
      error: 'Failed to calculate price',
    });
  }
}

/**
 * EXAMPLE 5: Price Comparison Widget
 * 
 * Show how price changes over time for a car
 */
export async function getPriceCalendar(req, res) {
  const { carId, month, year } = req.query;

  try {
    const daysInMonth = new Date(year, month, 0).getDate();
    const priceCalendar = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const startDate = new Date(year, month - 1, day);
      const endDate = new Date(year, month - 1, day + 1);

      const pricing = await calculateDynamicPrice({
        carId: parseInt(carId),
        startDate,
        endDate,
        userId: null,
        saveSnapshot: false,
      });

      priceCalendar.push({
        date: startDate.toISOString().split('T')[0],
        price: pricing.pricePerDay,
        demandLevel: pricing.breakdown.multipliers.demand > 1.5 ? 'high' :
                     pricing.breakdown.multipliers.demand < 0.9 ? 'low' : 'normal',
      });
    }

    res.json({
      carId: parseInt(carId),
      month: parseInt(month),
      year: parseInt(year),
      prices: priceCalendar,
    });
  } catch (error) {
    console.error('Error generating price calendar:', error);
    res.status(500).json({
      error: 'Failed to generate price calendar',
    });
  }
}

// --------------------------------------
// How to add to your existing routes:
// --------------------------------------

/*
In your src/routes/cars.routes.js:

import { getRealtimePriceQuote, getPriceCalendar } from '../pricing/pricing.examples.js';

// Add new routes
router.get('/api/cars/price-quote', getRealtimePriceQuote);
router.get('/api/cars/:id/price-calendar', getPriceCalendar);


In your src/controllers/cars.controller.js:

import { listCarsWithDynamicPricing } from '../pricing/pricing.examples.js';

export const listCars = async (req, res, next) => {
  try {
    // ... existing query logic ...
    const cars = await prisma.car.findMany({ where, select: carPublic });
    
    // Add dynamic pricing
    const carsWithPricing = await listCarsWithDynamicPricing(cars, req.query);
    
    return res.json(carsWithPricing);
  } catch (err) {
    next(err);
  }
};
*/
