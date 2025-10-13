import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/roles.middleware.js';
import { listContracts, getContract, createContract, updateContract, deleteContract, completeContract } from './contracts.controller.js';

const r = Router();
r.get('/contracts', requireAuth, requireRole('ADMIN'), listContracts); // only admin sees all
r.get('/contracts/:id', requireAuth, getContract);                     // owner or admin enforced in controller
r.post('/contracts', requireAuth, createContract);                     // user creates
r.put('/contracts/:id', requireAuth, updateContract);
r.delete('/contracts/:id', requireAuth, deleteContract);
r.post('/contracts/:id/complete', requireAuth, completeContract);
export default r;
