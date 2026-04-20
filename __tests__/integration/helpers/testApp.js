/**
 * Integration test harness.
 *
 * Builds the Express app via `src/app.js`'s `createApp` factory, while
 * replacing `@prisma/client` with a deep-mocked instance so no real
 * PostgreSQL connection is required. The mock is a singleton so every
 * `new PrismaClient()` call across the codebase shares the same mock
 * state, and tests can stub individual method returns.
 *
 * Usage pattern inside a test file:
 *
 *   import { beforeAll, beforeEach, jest } from '@jest/globals';
 *   import { setupTestApp } from './helpers/testApp.js';
 *
 *   let harness;
 *   beforeAll(async () => { harness = await setupTestApp(); });
 *   beforeEach(() => harness.reset());
 */
import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';

export async function setupTestApp() {
  // Test-only JWT secret; must be set BEFORE config.js is imported.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-abc123xyz';
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  const prismaMock = mockDeep();
  // Prisma's `$transaction` helper is used throughout the codebase; by
  // default resolve to an array of the operations' return values.
  prismaMock.$transaction.mockImplementation(async (ops) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    if (typeof ops === 'function') return ops(prismaMock);
    return ops;
  });

  jest.unstable_mockModule('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => prismaMock),
  }));

  // src/models/db.js calls `new PrismaClient()` at import time, so its
  // default export is already backed by our mock. No extra module mock
  // is needed — just make sure @prisma/client is mocked before it loads.

  // Quiet expected console noise in controllers.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});

  const { createApp } = await import('../../../src/app.js');
  const app = createApp({ enableSwagger: false, enableMorgan: false });

  return {
    app,
    prisma: prismaMock,
    reset() {
      mockReset(prismaMock);
      // Re-apply the $transaction helper after reset.
      prismaMock.$transaction.mockImplementation(async (ops) => {
        if (Array.isArray(ops)) return Promise.all(ops);
        if (typeof ops === 'function') return ops(prismaMock);
        return ops;
      });
    },
  };
}
