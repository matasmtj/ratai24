import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  googleAuth,
} from '../controllers/auth.controller.js';

const r = Router();
r.post('/auth/register', register);
r.post('/auth/login', login);
r.post('/auth/google', googleAuth);
r.post('/auth/refresh', refresh);
r.post('/auth/logout', logout);
r.post('/auth/forgot-password', forgotPassword);
r.post('/auth/reset-password', resetPassword);
r.post('/auth/verify-email', verifyEmail);
r.post('/auth/resend-verification', resendVerification);
export default r;
