import { config } from '../config.js';

function resolveResetEmailLanguage(language) {
  const code = typeof language === 'string' ? language.trim().toLowerCase().slice(0, 2) : '';
  if (code === 'en') return 'en';
  if (code === 'ru') return 'ru';
  return 'lt';
}

function buildPasswordResetContent(resetUrl, lang) {
  const hours = config.passwordResetExpiresHours;
  if (lang === 'en') {
    return {
      subject: 'Reset your password',
      text: `You requested a password reset. Open this link to choose a new password (valid ${hours} hour(s)):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Set a new password</a></p>
    <p>This link expires in ${hours} hour(s).</p>
    <p>If you did not request this, you can ignore this email.</p>
  `.trim(),
    };
  }
  if (lang === 'ru') {
    return {
      subject: 'Сброс пароля',
      text: `Вы запросили сброс пароля. Перейдите по ссылке, чтобы задать новый пароль (действует ${hours} ч.):\n\n${resetUrl}\n\nЕсли вы не запрашивали сброс, проигнорируйте это письмо.`,
      html: `
    <p>Вы запросили сброс пароля.</p>
    <p><a href="${resetUrl}">Задать новый пароль</a></p>
    <p>Ссылка действительна ${hours} ч.</p>
    <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
  `.trim(),
    };
  }
  return {
    subject: 'Atstatykite savo slaptažodį',
    text: `Prašėte atkurti slaptažodį. Atidarykite nuorodą ir nustatykite naują slaptažodį (galioja ${hours} val.):\n\n${resetUrl}\n\nJei neprašėte slaptažodžio keitimo, ignoruokite šį laišką.`,
    html: `
    <p>Prašėte atkurti slaptažodį.</p>
    <p><a href="${resetUrl}">Nustatyti naują slaptažodį</a></p>
    <p>Nuoroda galioja ${hours} val.</p>
    <p>Jei neprašėte slaptažodžio keitimo, ignoruokite šį laišką.</p>
  `.trim(),
  };
}

/**
 * Sends password reset email via Resend (https://resend.com) when RESEND_API_KEY is set.
 * Otherwise logs the link (local development).
 *
 * @param {{ to: string, resetUrl: string, language?: string }} args
 */
export async function sendPasswordResetEmail({ to, resetUrl, language }) {
  const { resendApiKey, emailFrom } = config;

  const lang = resolveResetEmailLanguage(language);
  const { subject, text, html } = buildPasswordResetContent(resetUrl, lang);

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
