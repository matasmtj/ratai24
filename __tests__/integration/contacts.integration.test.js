/**
 * Integration tests for /contacts endpoints.
 *
 * Covers the public GET (singleton row with operation areas) and the
 * admin-only PUT with validation errors.
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
});

function adminToken() {
  return jwt.sign(
    { sub: 1, role: 'ADMIN', email: 'admin@example.com' },
    process.env.JWT_SECRET
  );
}

function userToken() {
  return jwt.sign(
    { sub: 2, role: 'USER', email: 'u@example.com' },
    process.env.JWT_SECRET
  );
}

describe('GET /contacts', () => {
  it('returns the contact with operation areas (200)', async () => {
    harness.prisma.contact.findFirst.mockResolvedValue({
      id: 1,
      email: 'info@carlease.lt',
      phone: '+37060012345',
      businessHoursWeekdays: '8:00 - 18:00',
      businessHoursWeekend: '9:00 - 15:00',
      operationAreas: [
        {
          id: 1,
          cityId: 1,
          address: 'Gedimino pr. 1',
          city: { id: 1, name: 'Vilnius', country: 'Lithuania' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await request(harness.app).get('/contacts');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('info@carlease.lt');
    expect(res.body.operationAreas).toContain('Vilnius');
    expect(res.body.operationAreasDetails).toHaveLength(1);
  });

  it('returns 404 when no contact row exists', async () => {
    harness.prisma.contact.findFirst.mockResolvedValue(null);
    const res = await request(harness.app).get('/contacts');
    expect(res.status).toBe(404);
  });
});

describe('PUT /contacts', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await request(harness.app).put('/contacts').send({ email: 'x@y.z' });
    expect(res.status).toBe(401);
  });

  it('rejects non-admin callers with 403', async () => {
    const res = await request(harness.app)
      .put('/contacts')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ email: 'x@y.z' });
    expect(res.status).toBe(403);
  });

  it('rejects invalid email with 400', async () => {
    const res = await request(harness.app)
      .put('/contacts')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('updates the contact when admin sends valid data (200)', async () => {
    harness.prisma.contact.findFirst.mockResolvedValue({ id: 1 });
    harness.prisma.contact.update.mockResolvedValue({
      id: 1,
      email: 'new@carlease.lt',
      phone: '+37060012345',
      businessHoursWeekdays: '8:00 - 18:00',
      businessHoursWeekend: '9:00 - 15:00',
      operationAreas: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await request(harness.app)
      .put('/contacts')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ email: 'new@carlease.lt' });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('new@carlease.lt');
  });
});
