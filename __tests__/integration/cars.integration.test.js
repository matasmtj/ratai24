/**
 * Integration tests for /cars endpoints.
 *
 * Fires HTTP requests against the full Express app via Supertest with a
 * mocked Prisma client. Covers listing, single-car lookup, admin-only
 * create / update / delete with the standard authz matrix (anon / user /
 * admin) plus validation and uniqueness-error translation.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestApp } from './helpers/testApp.js';

let harness;

beforeAll(async () => {
  harness = await setupTestApp();
});

beforeEach(() => {
  harness.reset();
  harness.prisma.contract.findMany.mockResolvedValue([]);
});

function adminToken() {
  return jwt.sign(
    { sub: 1, role: 'ADMIN', email: 'admin@example.com' },
    process.env.JWT_SECRET
  );
}

function userToken() {
  return jwt.sign(
    { sub: 2, role: 'USER', email: 'user@example.com' },
    process.env.JWT_SECRET
  );
}

const validCarPayload = {
  vin: '1HGBH41JXMN109186',
  numberPlate: 'ABC123',
  make: 'Toyota',
  model: 'Corolla',
  year: 2022,
  pricePerDay: 40,
  cityId: 1,
  seatCount: 5,
  fuelType: 'PETROL',
  powerKW: 90,
  engineCapacityL: 1.6,
  bodyType: 'SEDAN',
  gearbox: 'AUTOMATIC',
  state: 'AVAILABLE',
  odometerKm: 12000,
};

describe('GET /cars', () => {
  it('returns the public list of cars (200)', async () => {
    harness.prisma.car.findMany.mockResolvedValue([
      { id: 1, make: 'Toyota', model: 'Corolla' },
      { id: 2, make: 'Audi', model: 'A4' },
    ]);
    const res = await request(harness.app).get('/cars');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(harness.prisma.car.findMany).toHaveBeenCalled();
  });

  it('filters by cityId when provided (200)', async () => {
    harness.prisma.car.findMany.mockResolvedValue([]);
    const res = await request(harness.app).get('/cars?cityId=5');
    expect(res.status).toBe(200);
    const where = harness.prisma.car.findMany.mock.calls[0][0].where;
    expect(where.cityId).toBe(5);
  });

  it('rejects a non-integer cityId with 400', async () => {
    const res = await request(harness.app).get('/cars?cityId=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cityId/);
  });
});

describe('GET /cars/:id', () => {
  it('returns a single available car (200)', async () => {
    harness.prisma.car.findUnique.mockResolvedValue({
      id: 1,
      make: 'Toyota',
      state: 'AVAILABLE',
    });
    const res = await request(harness.app).get('/cars/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('returns 404 when the car is missing', async () => {
    harness.prisma.car.findUnique.mockResolvedValue(null);
    const res = await request(harness.app).get('/cars/999');
    expect(res.status).toBe(404);
  });

  it('hides a MAINTENANCE car from non-admin callers (404)', async () => {
    harness.prisma.car.findUnique.mockResolvedValue({
      id: 7,
      make: 'BMW',
      state: 'MAINTENANCE',
    });
    const res = await request(harness.app).get('/cars/7');
    expect(res.status).toBe(404);
  });

  it('returns 400 when id is not an integer', async () => {
    const res = await request(harness.app).get('/cars/abc');
    expect(res.status).toBe(400);
  });
});

describe('POST /cars', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(harness.app).post('/cars').send(validCarPayload);
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users with 403', async () => {
    const res = await request(harness.app)
      .post('/cars')
      .set('Authorization', `Bearer ${userToken()}`)
      .send(validCarPayload);
    expect(res.status).toBe(403);
  });

  it('creates a car when admin sends valid data (201)', async () => {
    harness.prisma.city.findUnique.mockResolvedValue({ id: 1, name: 'Vilnius' });
    harness.prisma.car.create.mockResolvedValue({ id: 42, ...validCarPayload });
    const res = await request(harness.app)
      .post('/cars')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validCarPayload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(42);
    expect(harness.prisma.car.create).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid VIN with 400', async () => {
    const res = await request(harness.app)
      .post('/cars')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validCarPayload, vin: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/vin/i);
  });

  it('returns 409 on duplicate VIN', async () => {
    harness.prisma.city.findUnique.mockResolvedValue({ id: 1, name: 'Vilnius' });
    harness.prisma.car.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['vin'] },
    });
    const res = await request(harness.app)
      .post('/cars')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validCarPayload);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/VIN/);
  });
});

describe('PUT /cars/:id', () => {
  it('rejects non-admin users with 403', async () => {
    const res = await request(harness.app)
      .put('/cars/1')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ make: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('updates a car when admin sends valid data (200)', async () => {
    harness.prisma.car.findUnique.mockResolvedValue({ id: 1, useDynamicPricing: false });
    harness.prisma.car.update.mockResolvedValue({ id: 1, make: 'Updated' });
    const res = await request(harness.app)
      .put('/cars/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ make: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.make).toBe('Updated');
  });
});

describe('DELETE /cars/:id', () => {
  it('rejects non-admin users with 403', async () => {
    const res = await request(harness.app)
      .delete('/cars/1')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when deleting a non-existent car', async () => {
    harness.prisma.car.findUnique.mockResolvedValue(null);
    const res = await request(harness.app)
      .delete('/cars/999')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  it('deletes a car when admin sends a valid id (200)', async () => {
    const car = { id: 5, make: 'Toyota' };
    harness.prisma.car.findUnique.mockResolvedValue(car);
    harness.prisma.car.delete.mockResolvedValue(car);
    const res = await request(harness.app)
      .delete('/cars/5')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(5);
    expect(harness.prisma.car.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });
});
