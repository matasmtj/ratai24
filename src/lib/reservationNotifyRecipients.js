import prisma from '../models/db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidNotifyEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

/**
 * Primary Contact.email and optional companyEmail, deduplicated (case-insensitive).
 * @param {{ email?: string | null, companyEmail?: string | null } | null | undefined} contact
 * @returns {string[]}
 */
export function resolveReservationNotifyEmails(contact) {
  if (!contact) return [];

  const seen = new Set();
  const out = [];

  for (const value of [contact.email, contact.companyEmail]) {
    if (value == null || typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!isValidNotifyEmail(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}

/** Load admin inbox addresses from the contacts CMS row. */
export async function getReservationNotifyRecipients() {
  const contact = await prisma.contact.findFirst({ orderBy: { id: 'asc' } });
  return resolveReservationNotifyEmails(contact);
}
