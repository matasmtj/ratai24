import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/roles.middleware.js';
import { listCars, getCar, createCar, updateCar, deleteCar, listContractsForCar } from './cars.controller.js';

const r = Router();
r.get('/cars', listCars);
r.get('/cars/:id', getCar);
r.get('/cars/:id/contracts', listContractsForCar);              // hierarchical
r.post('/cars', requireAuth, requireRole('ADMIN'), createCar);
r.put('/cars/:id', requireAuth, requireRole('ADMIN'), updateCar);
r.delete('/cars/:id', requireAuth, requireRole('ADMIN'), deleteCar);
export default r;
