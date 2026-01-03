import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { listCars, listCarsForSale, listCarsForLease, getCar, createCar, updateCar, deleteCar, listContractsForCar, reorderCarImages } from '../controllers/cars.controller.js';

const r = Router();
r.get('/cars', listCars);
r.get('/cars/for-sale', listCarsForSale);
r.get('/cars/for-lease', listCarsForLease);
r.get('/cars/:id', getCar);
r.get('/cars/:id/contracts', listContractsForCar);              // hierarchical
r.post('/cars', requireAuth, requireRole('ADMIN'), createCar);
r.put('/cars/:id', requireAuth, requireRole('ADMIN'), updateCar);
r.put('/cars/:id/images/reorder', requireAuth, requireRole('ADMIN'), reorderCarImages);
r.delete('/cars/:id', requireAuth, requireRole('ADMIN'), deleteCar);
export default r;
