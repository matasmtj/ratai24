import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { getMe, updateMe } from '../controllers/users.controller.js';

const r = Router();

r.get('/users/me', requireAuth, getMe);
r.put('/users/me', requireAuth, updateMe);

export default r;
