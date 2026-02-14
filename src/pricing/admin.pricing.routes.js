/**
 * Admin Pricing Routes
 * Admin-only endpoints for pricing management
 */

import express from 'express';
import * as adminPricingController from './admin.pricing.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';

const router = express.Router();

// Middleware stack for all admin routes
const adminAuth = [requireAuth, requireRole('ADMIN')];

// Analytics
router.get('/api/admin/pricing/analytics', adminAuth, adminPricingController.getPricingAnalytics);
router.get('/api/admin/pricing/revenue', adminAuth, adminPricingController.getRevenueAnalytics);
router.get('/api/admin/pricing/performance', adminAuth, adminPricingController.getCarPerformance);

// Car pricing configuration
router.put('/api/admin/pricing/cars/:id/config', adminAuth, adminPricingController.updateCarPricingConfig);

// Pricing rules management
router.post('/api/admin/pricing/rules', adminAuth, adminPricingController.createPricingRule);
router.get('/api/admin/pricing/rules', adminAuth, adminPricingController.getPricingRules);
router.put('/api/admin/pricing/rules/:id', adminAuth, adminPricingController.updatePricingRule);
router.delete('/api/admin/pricing/rules/:id', adminAuth, adminPricingController.deletePricingRule);

// Seasonal factors management
router.post('/api/admin/pricing/seasonal-factors', adminAuth, adminPricingController.createSeasonalFactorRoute);
router.get('/api/admin/pricing/seasonal-factors', adminAuth, adminPricingController.getSeasonalFactors);

// Manual refresh
router.post('/api/admin/pricing/refresh', adminAuth, adminPricingController.refreshPricingData);

export default router;
