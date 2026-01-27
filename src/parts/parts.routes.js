import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/roles.middleware.js';
import { listParts, getPart, createPart, updatePart, deletePart } from './parts.controller.js';

const r = Router();

// Public endpoints
r.get('/parts', listParts);
r.get('/parts/:id', getPart);

// Admin only endpoints
r.post('/parts', requireAuth, requireRole('ADMIN'), createPart);
r.put('/parts/:id', requireAuth, requireRole('ADMIN'), updatePart);
r.delete('/parts/:id', requireAuth, requireRole('ADMIN'), deletePart);

export default r;
