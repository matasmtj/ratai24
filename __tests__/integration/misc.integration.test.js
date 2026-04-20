/**
 * Integration tests for cross-cutting concerns: health endpoint, 404
 * handling and malformed JSON bodies.
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { setupTestApp } from './helpers/testApp.js';

let harness;

beforeAll(async () => {
  harness = await setupTestApp();
});

describe('Cross-cutting', () => {
  it('GET /health responds with { ok: true }', async () => {
    const res = await request(harness.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('unknown routes return a 404 JSON envelope', async () => {
    const res = await request(harness.app).get('/no-such-endpoint-12345');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });

  it('malformed JSON bodies result in a 4xx response', async () => {
    const res = await request(harness.app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ not valid json');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
