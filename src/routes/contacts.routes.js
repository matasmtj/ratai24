import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { uploadHero } from '../middlewares/upload.middleware.js';
import {
  getContact,
  createContact,
  updateContact,
  uploadHeroImage,
  deleteHeroImage,
} from '../controllers/contacts.controller.js';

const r = Router();

// Public endpoint - no authentication required
r.get('/contacts', getContact);

// Admin only endpoints
r.post('/contacts', requireAuth, requireRole('ADMIN'), createContact);
r.put('/contacts', requireAuth, requireRole('ADMIN'), updateContact);

// Hero background image management (admin only)
r.post(
  '/contacts/hero-image',
  requireAuth,
  requireRole('ADMIN'),
  uploadHero.single('image'),
  uploadHeroImage,
);
r.delete('/contacts/hero-image', requireAuth, requireRole('ADMIN'), deleteHeroImage);

export default r;
