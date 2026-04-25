import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { listCars, listCarsForSale, listCarsForLease, getCar, createCar, updateCar, deleteCar, listContractsForCar } from '../controllers/cars.controller.js';

const r = Router();
r.get('/cars', listCars);
r.get('/cars/for-sale', listCarsForSale);
r.get('/cars/for-lease', listCarsForLease);
r.get('/cars/:id', optionalAuth, getCar);
r.get('/cars/:id/contracts', optionalAuth, listContractsForCar); // hierarchical
r.post('/cars', requireAuth, requireRole('ADMIN'), createCar);
r.put('/cars/:id', requireAuth, requireRole('ADMIN'), updateCar);
r.delete('/cars/:id', requireAuth, requireRole('ADMIN'), deleteCar);
export default r;
