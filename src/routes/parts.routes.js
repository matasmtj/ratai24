import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import {
  listParts,
  getPart,
  createPart,
  updatePart,
  deletePart,
} from '../controllers/parts.controller.js';

const r = Router();

r.get('/parts', listParts);
r.get('/parts/:id', getPart);
r.post('/parts', requireAuth, requireRole('ADMIN'), createPart);
r.put('/parts/:id', requireAuth, requireRole('ADMIN'), updatePart);
r.delete('/parts/:id', requireAuth, requireRole('ADMIN'), deletePart);

export default r;
