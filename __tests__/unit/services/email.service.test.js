/**
 * Unit tests for src/services/email.service.js
 *
 * The service sends mail via Resend's HTTP API. We mock `global.fetch`
 * and the app config so the test never touches the network.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Ensure we import after the config mock is installed below.
let emailModule;
let configModule;

const originalFetch = global.fetch;

beforeEach(async () => {
  jest.resetModules();
  // Silence expected console output during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  configModule = await import('../../../src/config.js');
  emailModule = await import('../../../src/services/email.service.js');
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('sendPasswordResetEmail', () => {
  it('logs the reset link and returns when no API key is configured', async () => {
    const prevKey = configModule.config.resendApiKey;
    configModule.config.resendApiKey = '';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await emailModule.sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'https://app.example.com/reset?token=abc',
      });
    } finally {
      configModule.config.resendApiKey = prevKey;
    }

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/RESEND_API_KEY not set/);
  });

  it('calls Resend with the Lithuanian subject by default', async () => {
    const prevKey = configModule.config.resendApiKey;
    configModule.config.resendApiKey = 're_test_123';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'resend-id-1' }),
    });

    try {
      await emailModule.sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'https://app.example.com/reset?token=abc',
        language: 'lt',
      });
    } finally {
      configModule.config.resendApiKey = prevKey;
    }

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, opts] = global.fetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.subject).toBe('Atstatykite savo slaptažodį');
    expect(body.to).toEqual(['user@example.com']);
    expect(opts.headers.Authorization).toBe('Bearer re_test_123');
  });

  it.each([
    ['en', 'Reset your password'],
    ['ru', 'Сброс пароля'],
  ])('localizes the subject for %s', async (language, expectedSubject) => {
    const prevKey = configModule.config.resendApiKey;
    configModule.config.resendApiKey = 're_test_123';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{}',
    });

    try {
      await emailModule.sendPasswordResetEmail({
        to: 'u@x.com',
        resetUrl: 'https://x',
        language,
      });
    } finally {
      configModule.config.resendApiKey = prevKey;
    }

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.subject).toBe(expectedSubject);
  });

  it('falls back to Lithuanian for unsupported languages', async () => {
    const prevKey = configModule.config.resendApiKey;
    configModule.config.resendApiKey = 're_test_123';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{}',
    });

    try {
      await emailModule.sendPasswordResetEmail({
        to: 'u@x.com',
        resetUrl: 'https://x',
        language: 'de',
      });
    } finally {
      configModule.config.resendApiKey = prevKey;
    }

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.subject).toBe('Atstatykite savo slaptažodį');
  });

  it('throws when Resend responds with an error status', async () => {
    const prevKey = configModule.config.resendApiKey;
    configModule.config.resendApiKey = 're_test_123';

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => '{"message":"from domain not verified"}',
    });

    try {
      await expect(
        emailModule.sendPasswordResetEmail({
          to: 'u@x.com',
          resetUrl: 'https://x',
        })
      ).rejects.toThrow('Failed to send reset email');
    } finally {
      configModule.config.resendApiKey = prevKey;
    }
  });
});
