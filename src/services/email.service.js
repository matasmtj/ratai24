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

  if (!resendApiKey.startsWith('re_')) {
    console.error(
      '[email] RESEND_API_KEY should start with re_ — check for typos, extra quotes, or wrong variable on your host.'
    );
  }

  console.log('[email] Sending password reset via Resend', {
    from: emailFrom,
    toDomain: to.includes('@') ? to.split('@')[1] : '(invalid)',
    keyPreview: `${resendApiKey.slice(0, 6)}…`,
  });

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
    console.error('[email] Resend send failed:', {
      status: res.status,
      body,
      hint:
        res.status === 403 || res.status === 422
          ? 'Verify EMAIL_FROM domain in Resend, or use a verified domain. Test inbox: delivered@resend.dev'
          : undefined,
    });
    throw new Error('Failed to send reset email');
  }

  try {
    const data = JSON.parse(body);
    if (data?.id) {
      console.log('[email] Password reset email queued, Resend id:', data.id);
    }
  } catch {
    // non-JSON success body — ignore
  }
}
