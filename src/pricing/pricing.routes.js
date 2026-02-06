/**
 * Pricing Routes
 * API endpoints for dynamic pricing
 */

import express from 'express';
import * as pricingController from './pricing.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public endpoints - anyone can calculate prices
router.post('/api/pricing/calculate', pricingController.calculatePrice);
router.get('/api/pricing/preview/:carId', pricingController.getPricePreview);
router.post('/api/pricing/bulk-calculate', pricingController.bulkCalculatePrice);
router.get('/api/pricing/demand/:cityId', pricingController.getCityDemand);

// Protected endpoints - require authentication
router.get('/api/pricing/loyalty', requireAuth, pricingController.getCustomerLoyalty);

export default router;
