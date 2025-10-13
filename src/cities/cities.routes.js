import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/roles.middleware.js';
import { listCities, getCity, createCity, updateCity, deleteCity, listCarsInCity } from './cities.controller.js';

const r = Router();
r.get('/cities', listCities);
r.get('/cities/:id', getCity);
r.get('/cities/:id/cars', listCarsInCity);                 // hierarchical
r.post('/cities', requireAuth, requireRole('ADMIN'), createCity);
r.put('/cities/:id', requireAuth, requireRole('ADMIN'), updateCity);
r.delete('/cities/:id', requireAuth, requireRole('ADMIN'), deleteCity);
export default r;
