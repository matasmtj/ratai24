import { config } from '../config.js';

/**
 * Sends password reset email via Resend (https://resend.com) when RESEND_API_KEY is set.
 * Otherwise logs the link (local development).
 */
const RESET_EMAIL_COPY = {
  lt: {
    subject: 'Atstatykite savo slaptažodį',
    cta: 'Nustatyti naują slaptažodį',
    intro: 'Gavome prašymą atstatyti jūsų slaptažodį.',
    expiry: 'Ši nuoroda galioja',
    ignore: 'Jei šio prašymo neteikėte, galite ignoruoti šį laišką.',
  },
  en: {
    subject: 'Reset your password',
    cta: 'Set a new password',
    intro: 'You requested a password reset.',
    expiry: 'This link expires in',
    ignore: 'If you did not request this, you can ignore this email.',
  },
  ru: {
    subject: 'Сброс пароля',
    cta: 'Установить новый пароль',
    intro: 'Вы запросили сброс пароля.',
    expiry: 'Ссылка действительна',
    ignore: 'Если вы не запрашивали это, просто проигнорируйте письмо.',
  },
};

function normalizeLanguage(value) {
  if (typeof value !== 'string') return 'lt';
  const normalized = value.trim().toLowerCase();
  return normalized === 'en' || normalized === 'ru' ? normalized : 'lt';
}

export async function sendPasswordResetEmail({ to, resetUrl, language = 'lt' }) {
  const { resendApiKey, emailFrom } = config;
  const lang = normalizeLanguage(language);
  const copy = RESET_EMAIL_COPY[lang];

  const subject = copy.subject;
  const text = `${copy.intro} ${copy.expiry} ${config.passwordResetExpiresHours} h:\n\n${resetUrl}\n\n${copy.ignore}`;
  const html = `
    <p>${copy.intro}</p>
    <p><a href="${resetUrl}">${copy.cta}</a></p>
    <p>${copy.expiry} ${config.passwordResetExpiresHours} h.</p>
    <p>${copy.ignore}</p>
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
