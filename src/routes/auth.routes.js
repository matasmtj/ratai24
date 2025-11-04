import { Router } from 'express';
import { login, refresh, logout, register } from '../controllers/auth.controller.js';

const r = Router();
r.post('/auth/register', register);
r.post('/auth/login',    login);
r.post('/auth/refresh',  refresh);
r.post('/auth/logout',   logout);
export default r;
