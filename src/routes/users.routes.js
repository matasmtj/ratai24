import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import {
  getMe,
  updateMe,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller.js';

const r = Router();

// Current user endpoints
r.get('/users/me', requireAuth, getMe);
r.put('/users/me', requireAuth, updateMe);

// Admin endpoints
r.get('/users', requireAuth, requireRole('ADMIN'), listUsers);
r.get('/users/:id', requireAuth, requireRole('ADMIN'), getUserById);
r.post('/users', requireAuth, requireRole('ADMIN'), createUser);
r.put('/users/:id', requireAuth, requireRole('ADMIN'), updateUser);
r.delete('/users/:id', requireAuth, requireRole('ADMIN'), deleteUser);

export default r;
