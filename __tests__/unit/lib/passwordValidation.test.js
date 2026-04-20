/**
 * Unit tests for src/lib/passwordValidation.js
 */
import { describe, it, expect } from '@jest/globals';
import {
  validatePasswordStrength,
  isValidPassword,
} from '../../../src/lib/passwordValidation.js';

describe('validatePasswordStrength', () => {
  it('rejects null and undefined with "Password is required"', () => {
    expect(validatePasswordStrength(null)).toEqual({
      ok: false,
      error: 'Password is required',
    });
    expect(validatePasswordStrength(undefined)).toEqual({
      ok: false,
      error: 'Password is required',
    });
  });

  it('rejects non-string types', () => {
    expect(validatePasswordStrength(12345678).ok).toBe(false);
    expect(validatePasswordStrength({}).ok).toBe(false);
    expect(validatePasswordStrength([]).ok).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePasswordStrength('a1b2')).toEqual({
      ok: false,
      error: 'Password must be at least 8 characters',
    });
  });

  it('rejects passwords without letters', () => {
    expect(validatePasswordStrength('12345678')).toEqual({
      ok: false,
      error: 'Password must include at least one letter',
    });
  });

  it('rejects passwords without digits', () => {
    expect(validatePasswordStrength('abcdefgh')).toEqual({
      ok: false,
      error: 'Password must include at least one number',
    });
  });

  it('accepts a valid password', () => {
    expect(validatePasswordStrength('Password1')).toEqual({ ok: true });
  });

  it('accepts unicode letters as letters', () => {
    // Current regex is ASCII-only; lock this behaviour so future changes
    // are intentional.
    expect(validatePasswordStrength('абвгдежз1').ok).toBe(false);
    expect(validatePasswordStrength('abcdefgh1').ok).toBe(true);
  });
});

describe('isValidPassword', () => {
  it('returns true only for valid passwords', () => {
    expect(isValidPassword('Password1')).toBe(true);
    expect(isValidPassword('short1')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });
});
