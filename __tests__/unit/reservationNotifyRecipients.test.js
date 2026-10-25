import { describe, it, expect } from '@jest/globals';
import {
  isValidNotifyEmail,
  resolveReservationNotifyEmails,
} from '../../src/lib/reservationNotifyRecipients.js';

describe('reservationNotifyRecipients', () => {
  it('validates email format', () => {
    expect(isValidNotifyEmail('a@b.co')).toBe(true);
    expect(isValidNotifyEmail('not-an-email')).toBe(false);
    expect(isValidNotifyEmail('')).toBe(false);
  });

  it('returns empty when contact is missing', () => {
    expect(resolveReservationNotifyEmails(null)).toEqual([]);
    expect(resolveReservationNotifyEmails(undefined)).toEqual([]);
  });

  it('collects primary and company emails', () => {
    expect(
      resolveReservationNotifyEmails({
        email: 'info@skirvita.lt',
        companyEmail: 'sales@skirvita.lt',
      })
    ).toEqual(['info@skirvita.lt', 'sales@skirvita.lt']);
  });

  it('deduplicates case-insensitive addresses', () => {
    expect(
      resolveReservationNotifyEmails({
        email: 'Info@Skirvita.lt',
        companyEmail: 'info@skirvita.lt',
      })
    ).toEqual(['Info@Skirvita.lt']);
  });

  it('skips invalid company email', () => {
    expect(
      resolveReservationNotifyEmails({
        email: 'info@skirvita.lt',
        companyEmail: 'bad',
      })
    ).toEqual(['info@skirvita.lt']);
  });
});
