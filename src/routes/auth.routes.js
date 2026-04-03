import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  register,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';

const r = Router();
r.post('/auth/register', register);
r.post('/auth/login', login);
r.post('/auth/refresh', refresh);
r.post('/auth/logout', logout);
r.post('/auth/forgot-password', forgotPassword);
r.post('/auth/reset-password', resetPassword);
export default r;
