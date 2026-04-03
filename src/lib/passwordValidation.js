/**
 * Shared password rules: register, reset-password, and profile updates must stay in sync.
 */
export function validatePasswordStrength(password) {
  if (password == null || typeof password !== 'string') {
    return { ok: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { ok: false, error: 'Password must include at least one letter' };
  }
  if (!/\d/.test(password)) {
    return { ok: false, error: 'Password must include at least one number' };
  }
  return { ok: true };
}

export function isValidPassword(password) {
  return validatePasswordStrength(password).ok;
}
