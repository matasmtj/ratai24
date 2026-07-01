import { config } from '../config.js';

function resolveEmailLanguage(language) {
  const code = typeof language === 'string' ? language.trim().toLowerCase().slice(0, 2) : '';
  if (code === 'en') return 'en';
  if (code === 'ru') return 'ru';
  return 'lt';
}

// Backwards-compatible alias used elsewhere in the file.
const resolveResetEmailLanguage = resolveEmailLanguage;

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

function buildVerificationContent(verifyUrl, lang) {
  const hours = config.emailVerificationExpiresHours;
  if (lang === 'en') {
    return {
      subject: 'Verify your email',
      text: `Welcome to Ratai24! Please confirm your email by opening this link (valid ${hours} hour(s)):\n\n${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`,
      html: `
    <p>Welcome to Ratai24!</p>
    <p>Please confirm your email by clicking the link below:</p>
    <p><a href="${verifyUrl}">Verify my email</a></p>
    <p>This link expires in ${hours} hour(s).</p>
    <p>If you did not create an account, you can ignore this email.</p>
  `.trim(),
    };
  }
  if (lang === 'ru') {
    return {
      subject: 'Подтвердите ваш email',
      text: `Добро пожаловать в Ratai24! Подтвердите ваш email, перейдя по ссылке (действует ${hours} ч.):\n\n${verifyUrl}\n\nЕсли вы не регистрировались, проигнорируйте это письмо.`,
      html: `
    <p>Добро пожаловать в Ratai24!</p>
    <p>Подтвердите ваш email, нажав на ссылку ниже:</p>
    <p><a href="${verifyUrl}">Подтвердить email</a></p>
    <p>Ссылка действительна ${hours} ч.</p>
    <p>Если вы не регистрировались, проигнорируйте это письмо.</p>
  `.trim(),
    };
  }
  return {
    subject: 'Patvirtinkite savo el. paštą',
    text: `Sveiki atvykę į Ratai24! Patvirtinkite savo el. paštą paspaudę nuorodą (galioja ${hours} val.):\n\n${verifyUrl}\n\nJei paskyros nekūrėte, ignoruokite šį laišką.`,
    html: `
    <p>Sveiki atvykę į Ratai24!</p>
    <p>Patvirtinkite savo el. paštą paspaudę nuorodą:</p>
    <p><a href="${verifyUrl}">Patvirtinti el. paštą</a></p>
    <p>Nuoroda galioja ${hours} val.</p>
    <p>Jei paskyros nekūrėte, ignoruokite šį laišką.</p>
  `.trim(),
  };
}

/**
 * Sends an email verification message via Resend when RESEND_API_KEY is set.
 * Otherwise logs the link (local development).
 *
 * @param {{ to: string, verifyUrl: string, language?: string }} args
 */
export async function sendVerificationEmail({ to, verifyUrl, language }) {
  const { resendApiKey, emailFrom } = config;

  const lang = resolveEmailLanguage(language);
  const { subject, text, html } = buildVerificationContent(verifyUrl, lang);

  if (!resendApiKey) {
    console.warn('[email] RESEND_API_KEY not set — verification link (dev):', verifyUrl);
    return;
  }

  if (!resendApiKey.startsWith('re_')) {
    console.error(
      '[email] RESEND_API_KEY should start with re_ — check for typos, extra quotes, or wrong variable on your host.'
    );
  }

  console.log('[email] Sending verification email via Resend', {
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
    console.error('[email] Resend verification send failed:', {
      status: res.status,
      body,
      hint:
        res.status === 403 || res.status === 422
          ? 'Verify EMAIL_FROM domain in Resend, or use a verified domain. Test inbox: delivered@resend.dev'
          : undefined,
    });
    throw new Error('Failed to send verification email');
  }

  try {
    const data = JSON.parse(body);
    if (data?.id) {
      console.log('[email] Verification email queued, Resend id:', data.id);
    }
  } catch {
    // non-JSON success body — ignore
  }
}
