import { DateTime } from 'luxon';
import { config } from '../config.js';
import { calculateRequiredDeposit } from '../pricing/calculators/deposit.calculator.js';
import { getReservationNotifyRecipients } from '../lib/reservationNotifyRecipients.js';

const NOTIFY_TZ = 'Europe/Vilnius';

function resolveEmailLanguage(language) {
  const code = typeof language === 'string' ? language.trim().toLowerCase().slice(0, 2) : '';
  if (code === 'en') return 'en';
  if (code === 'ru') return 'ru';
  return 'lt';
}

const resolveResetEmailLanguage = resolveEmailLanguage;

/** @param {string} value */
export function escapeHtmlForEmail(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emailDomain(to) {
  return to.includes('@') ? to.split('@')[1] : '(invalid)';
}

/**
 * Sends email via Resend. Requires RESEND_API_KEY and verified EMAIL_FROM in production.
 * @param {{ to: string | string[], subject: string, text: string, html: string, logLabel?: string }} args
 */
async function sendViaResend({ to, subject, text, html, logLabel = 'email' }) {
  const { resendApiKey, emailFrom } = config;
  const recipients = Array.isArray(to) ? to : [to];

  if (!resendApiKey) {
    console.warn(`[email] RESEND_API_KEY not set — ${logLabel} (dev), recipients:`, recipients.length);
    console.warn(`[email] ${logLabel} subject:`, subject);
    return;
  }

  if (!resendApiKey.startsWith('re_')) {
    console.error(
      '[email] RESEND_API_KEY should start with re_ — check for typos, extra quotes, or wrong variable on your host.'
    );
  }

  console.log(`[email] Sending ${logLabel} via Resend`, {
    from: emailFrom,
    toDomains: recipients.map(emailDomain),
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
      to: recipients,
      subject,
      text,
      html,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`[email] Resend ${logLabel} send failed:`, {
      status: res.status,
      body,
      hint:
        res.status === 403 || res.status === 422
          ? 'Verify EMAIL_FROM domain in Resend, or use a verified domain. Test inbox: delivered@resend.dev'
          : undefined,
    });
    throw new Error(`Failed to send ${logLabel}`);
  }

  try {
    const data = JSON.parse(body);
    if (data?.id) {
      console.log(`[email] ${logLabel} queued, Resend id:`, data.id);
    }
  } catch {
    // non-JSON success body — ignore
  }
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

export async function sendPasswordResetEmail({ to, resetUrl, language }) {
  const lang = resolveResetEmailLanguage(language);
  const { subject, text, html } = buildPasswordResetContent(resetUrl, lang);
  await sendViaResend({ to, subject, text, html, logLabel: 'password reset' });
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

export async function sendVerificationEmail({ to, verifyUrl, language }) {
  const lang = resolveEmailLanguage(language);
  const { subject, text, html } = buildVerificationContent(verifyUrl, lang);
  await sendViaResend({ to, subject, text, html, logLabel: 'verification' });
}

function formatReservationInstant(date) {
  return DateTime.fromJSDate(new Date(date)).setZone(NOTIFY_TZ).toFormat('yyyy-MM-dd HH:mm');
}

function displayUserName(user) {
  if (!user) return '—';
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

/**
 * @param {{ contract: object, car: object, user: object | null, requiredDeposit: number }} payload
 */
export function buildNewReservationNotificationContent({ contract, car, user, requiredDeposit }) {
  const adminUrl = `${config.frontendUrl}/admin/contracts`;
  const start = formatReservationInstant(contract.startDate);
  const end = formatReservationInstant(contract.endDate);
  const userName = displayUserName(user);
  const userEmail = user?.email ?? '—';
  const userPhone = user?.phoneNumber?.trim() ? user.phoneNumber.trim() : '—';
  const plate = car.numberPlate?.trim() || '—';
  const vin = car.vin?.trim() || '—';
  const notes = contract.notes?.trim() ? contract.notes.trim() : null;
  const totalPrice = Number(contract.totalPrice);
  const priceStr = Number.isFinite(totalPrice) ? `€${totalPrice.toFixed(2)}` : '—';

  const subject = `Nauja rezervacija #${contract.id} – Skirvita`;

  const textLines = [
    'Nauja rezervacija svetainėje Skirvita',
    '',
    `Rezervacijos ID: ${contract.id}`,
    `Būsena: ${contract.state}`,
    `Pradžia: ${start} (${NOTIFY_TZ})`,
    `Pabaiga: ${end} (${NOTIFY_TZ})`,
    '',
    'Klientas:',
    `  Vardas: ${userName}`,
    `  El. paštas: ${userEmail}`,
    `  Telefonas: ${userPhone}`,
    '',
    'Automobilis:',
    `  ID: ${car.id}`,
    `  ${car.make} ${car.model} (${car.year})`,
    `  Valstybinis nr.: ${plate}`,
    `  VIN: ${vin}`,
    '',
    `Suma: ${priceStr}`,
    `Depozitas: €${requiredDeposit}`,
  ];
  if (notes) {
    textLines.push('', 'Pastabos:', notes);
  }
  textLines.push('', `Peržiūrėti administravime: ${adminUrl}`);

  const html = `
    <h2>Nauja rezervacija</h2>
    <p><strong>Rezervacijos ID:</strong> ${contract.id}</p>
    <p><strong>Būsena:</strong> ${escapeHtmlForEmail(contract.state)}</p>
    <p><strong>Pradžia:</strong> ${escapeHtmlForEmail(start)} (${NOTIFY_TZ})<br/>
    <strong>Pabaiga:</strong> ${escapeHtmlForEmail(end)} (${NOTIFY_TZ})</p>
    <h3>Klientas</h3>
    <ul>
      <li><strong>Vardas:</strong> ${escapeHtmlForEmail(userName)}</li>
      <li><strong>El. paštas:</strong> ${escapeHtmlForEmail(userEmail)}</li>
      <li><strong>Telefonas:</strong> ${escapeHtmlForEmail(userPhone)}</li>
    </ul>
    <h3>Automobilis</h3>
    <ul>
      <li><strong>ID:</strong> ${car.id}</li>
      <li><strong>Modelis:</strong> ${escapeHtmlForEmail(car.make)} ${escapeHtmlForEmail(car.model)} (${car.year})</li>
      <li><strong>Valstybinis nr.:</strong> ${escapeHtmlForEmail(plate)}</li>
      <li><strong>VIN:</strong> ${escapeHtmlForEmail(vin)}</li>
    </ul>
    <p><strong>Suma:</strong> ${escapeHtmlForEmail(priceStr)}<br/>
    <strong>Depozitas:</strong> €${requiredDeposit}</p>
    ${notes ? `<p><strong>Pastabos:</strong><br/>${escapeHtmlForEmail(notes).replace(/\n/g, '<br/>')}</p>` : ''}
    <p><a href="${escapeHtmlForEmail(adminUrl)}">Atidaryti rezervacijas administravime</a></p>
  `.trim();

  return { subject, text: textLines.join('\n'), html };
}

/**
 * Notify business inboxes when a user creates a DRAFT reservation.
 * Requires RESEND_API_KEY + EMAIL_FROM; recipients from Contact.email and companyEmail.
 * Controlled by RESERVATION_NOTIFY_ENABLED (default on).
 *
 * @param {{ contract: object, car: object, user: object | null }} args
 */
export async function sendNewReservationNotification({ contract, car, user }) {
  if (!config.reservationNotifyEnabled) {
    return;
  }

  const recipients = await getReservationNotifyRecipients();
  if (!recipients.length) {
    console.warn('[email] No valid contact emails for reservation notification — skipping');
    return;
  }

  const requiredDeposit = calculateRequiredDeposit(contract.startDate, contract.endDate);
  const { subject, text, html } = buildNewReservationNotificationContent({
    contract,
    car,
    user,
    requiredDeposit,
  });

  await sendViaResend({
    to: recipients,
    subject,
    text,
    html,
    logLabel: `reservation #${contract.id} notification`,
  });

  console.log('[email] Reservation notification sent', {
    contractId: contract.id,
    recipientDomains: recipients.map(emailDomain),
  });
}
