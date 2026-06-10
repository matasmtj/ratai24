import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import {
  listLegalPages,
  getLegalPage,
  upsertLegalPage,
} from '../controllers/legal-pages.controller.js';

const r = Router();

r.get('/legal-pages', requireAuth, requireRole('ADMIN'), listLegalPages);
r.get('/legal-pages/:pageKey', getLegalPage);
r.put('/legal-pages/:pageKey', requireAuth, requireRole('ADMIN'), upsertLegalPage);

export default r;
