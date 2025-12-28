import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { getContact, createContact, updateContact } from '../controllers/contacts.controller.js';

const r = Router();

// Public endpoint - no authentication required
r.get('/contacts', getContact);

// Admin only endpoints
r.post('/contacts', requireAuth, requireRole('ADMIN'), createContact);
r.put('/contacts', requireAuth, requireRole('ADMIN'), updateContact);

export default r;
