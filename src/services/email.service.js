import { config } from '../config.js';

/**
 * Sends password reset email via Resend (https://resend.com) when RESEND_API_KEY is set.
 * Otherwise logs the link (local development).
 */
export async function sendPasswordResetEmail({ to, resetUrl }) {
  const { resendApiKey, emailFrom } = config;

  const subject = 'Reset your password';
  const text = `You requested a password reset. Open this link to choose a new password (valid ${config.passwordResetExpiresHours} hour(s)):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Set a new password</a></p>
    <p>This link expires in ${config.passwordResetExpiresHours} hour(s).</p>
    <p>If you did not request this, you can ignore this email.</p>
  `.trim();

  if (!resendApiKey) {
    console.warn('[email] RESEND_API_KEY not set — password reset link (dev):', resetUrl);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error('[email] Resend error:', res.status, body);
    throw new Error('Failed to send reset email');
  }
}
