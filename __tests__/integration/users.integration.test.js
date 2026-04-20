/**
 * Integration tests for /users endpoints.
 *
 * Covers:
 *   • profile endpoints (`/users/me`) with authn guard and validation
 *   • admin-only endpoints (list, get, create, delete) with authz matrix
 *   • guardrail preventing admins from deleting their own account
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

function adminToken(id = 1) {
  return jwt.sign(
    { sub: id, role: 'ADMIN', email: 'admin@example.com' },
    process.env.JWT_SECRET
  );
}

function userToken(id = 2) {
  return jwt.sign(
    { sub: id, role: 'USER', email: `u${id}@example.com` },
    process.env.JWT_SECRET
  );
}

describe('GET /users/me', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(harness.app).get('/users/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user profile (200)', async () => {
    harness.prisma.user.findUnique.mockResolvedValue({
      id: 2,
      email: 'u2@example.com',
      role: 'USER',
    });
    const res = await request(harness.app)
      .get('/users/me')
      .set('Authorization', `Bearer ${userToken(2)}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(2);
  });

  it('returns 404 when the caller\u2019s user record has been deleted', async () => {
    harness.prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(harness.app)
      .get('/users/me')
      .set('Authorization', `Bearer ${userToken(99)}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /users/me', () => {
  it('rejects role change attempts with 400', async () => {
    const res = await request(harness.app)
      .put('/users/me')
      .set('Authorization', `Bearer ${userToken(2)}`)
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
  });
});

describe('GET /users (admin)', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(harness.app).get('/users');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin callers with 403', async () => {
    const res = await request(harness.app)
      .get('/users')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns a list of users when called by admin (200)', async () => {
    harness.prisma.user.findMany.mockResolvedValue([
      { id: 1, email: 'a@b.c', role: 'ADMIN' },
      { id: 2, email: 'u@b.c', role: 'USER' },
    ]);
    const res = await request(harness.app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('POST /users (admin)', () => {
  it('creates a new user (201)', async () => {
    harness.prisma.user.create.mockResolvedValue({
      id: 10,
      email: 'new@example.com',
      role: 'USER',
    });
    const res = await request(harness.app)
      .post('/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ email: 'new@example.com', password: 'Password1', role: 'USER' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(10);
  });

  it('rejects weak passwords with 400', async () => {
    const res = await request(harness.app)
      .post('/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ email: 'new@example.com', password: 'abc' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when the email already exists', async () => {
    harness.prisma.user.create.mockRejectedValue({ code: 'P2002' });
    const res = await request(harness.app)
      .post('/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ email: 'dup@example.com', password: 'Password1' });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /users/:id (admin)', () => {
  it('rejects non-admin callers with 403', async () => {
    const res = await request(harness.app)
      .delete('/users/2')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('refuses to let an admin delete their own account (400)', async () => {
    const res = await request(harness.app)
      .delete('/users/1')
      .set('Authorization', `Bearer ${adminToken(1)}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own account/i);
  });

  it('deletes another user when admin sends a valid id (204)', async () => {
    harness.prisma.user.delete.mockResolvedValue({ id: 2 });
    const res = await request(harness.app)
      .delete('/users/2')
      .set('Authorization', `Bearer ${adminToken(1)}`);
    expect(res.status).toBe(204);
    expect(harness.prisma.user.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});
