import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

let client;

function getClient() {
  if (!client) {
    client = new OAuth2Client(config.googleClientId);
  }
  return client;
}

/**
 * Verifies a Google ID token from the Sign In With Google button.
 * @param {string} idToken
 * @returns {Promise<{ googleId: string, email: string, emailVerified: boolean, firstName: string|null, lastName: string|null }>}
 */
export async function verifyGoogleIdToken(idToken) {
  if (!config.googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Invalid Google token payload');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    emailVerified: payload.email_verified === true,
    firstName: payload.given_name ? String(payload.given_name).trim() : null,
    lastName: payload.family_name ? String(payload.family_name).trim() : null,
  };
}
