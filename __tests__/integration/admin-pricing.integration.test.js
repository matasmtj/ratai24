/**
 * Integration tests for /api/admin/pricing/* endpoints.
 *
 * Focuses on the admin-only pricing management subtree: authn/authz
 * guards, listing and creating pricing rules, and deleting them. Heavy
 * analytics endpoints (revenue, performance) are exercised indirectly
 * via unit tests of the underlying calculators.
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

describe('GET /api/admin/pricing/rules', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await request(harness.app).get('/api/admin/pricing/rules');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin callers with 403', async () => {
    const res = await request(harness.app)
      .get('/api/admin/pricing/rules')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns the list of pricing rules for admin (200)', async () => {
    harness.prisma.pricingRule.findMany.mockResolvedValue([
      { id: 1, name: 'Summer boost', priority: 10 },
      { id: 2, name: 'Weekend sale', priority: 5 },
    ]);
    const res = await request(harness.app)
      .get('/api/admin/pricing/rules')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('POST /api/admin/pricing/rules', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await request(harness.app)
      .post('/api/admin/pricing/rules')
      .send({ name: 'Test rule' });
    expect(res.status).toBe(401);
  });

  it('creates a new pricing rule (201)', async () => {
    harness.prisma.pricingRule.create.mockResolvedValue({
      id: 10,
      name: 'Test rule',
      multiplier: 1.2,
      priority: 10,
    });
    const res = await request(harness.app)
      .post('/api/admin/pricing/rules')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Test rule', multiplier: 1.2 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(10);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(harness.app)
      .post('/api/admin/pricing/rules')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });
});

describe('DELETE /api/admin/pricing/rules/:id', () => {
  it('rejects non-admin callers with 403', async () => {
    const res = await request(harness.app)
      .delete('/api/admin/pricing/rules/1')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('deletes a pricing rule (204)', async () => {
    harness.prisma.pricingRule.delete.mockResolvedValue({ id: 1 });
    const res = await request(harness.app)
      .delete('/api/admin/pricing/rules/1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(204);
    expect(harness.prisma.pricingRule.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});

describe('GET /api/admin/pricing/seasonal-factors', () => {
  it('rejects non-admin callers with 403', async () => {
    const res = await request(harness.app)
      .get('/api/admin/pricing/seasonal-factors')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns the list of seasonal factors for admin (200)', async () => {
    harness.prisma.seasonalFactor.findMany.mockResolvedValue([
      { id: 1, name: 'Summer', multiplier: 1.2 },
    ]);
    const res = await request(harness.app)
      .get('/api/admin/pricing/seasonal-factors')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
