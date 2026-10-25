import { describe, it, expect } from '@jest/globals';
import {
  escapeHtmlForEmail,
  buildNewReservationNotificationContent,
} from '../../src/services/email.service.js';

describe('reservation email content', () => {
  it('escapes HTML in user-controlled fields', () => {
    expect(escapeHtmlForEmail('<script>')).toBe('&lt;script&gt;');
    const { html } = buildNewReservationNotificationContent({
      contract: {
        id: 1,
        state: 'DRAFT',
        startDate: new Date('2026-06-01T10:00:00Z'),
        endDate: new Date('2026-06-03T10:00:00Z'),
        totalPrice: 100,
        notes: '<b>hack</b>',
      },
      car: {
        id: 5,
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        numberPlate: null,
        vin: null,
      },
      user: {
        firstName: 'Test',
        lastName: 'User',
        email: 'u@example.com',
        phoneNumber: '+37060000000',
      },
      requiredDeposit: 50,
    });
    expect(html).toContain('&lt;b&gt;hack&lt;/b&gt;');
    expect(html).not.toContain('<b>hack</b>');
  });

  it('includes reservation id in subject', () => {
    const { subject } = buildNewReservationNotificationContent({
      contract: {
        id: 42,
        state: 'DRAFT',
        startDate: new Date('2026-06-01T10:00:00Z'),
        endDate: new Date('2026-06-03T10:00:00Z'),
        totalPrice: 80,
      },
      car: { id: 1, make: 'A', model: 'B', year: 2019 },
      user: { email: 'x@y.z' },
      requiredDeposit: 50,
    });
    expect(subject).toBe('Nauja rezervacija #42 – Skirvita');
  });
});
