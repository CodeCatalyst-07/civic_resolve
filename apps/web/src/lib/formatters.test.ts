import { describe, it, expect } from 'vitest';
import {
  formatDateTime,
  formatDate,
  formatHours,
  formatTicketId,
  formatUrgency,
  formatStatus,
  formatCategory,
} from './formatters.js';
import { Category, Urgency, Status } from '@civicresolve/shared';

describe('Formatters', () => {
  it('formats valid ISO datetime into localized string', () => {
    const formatted = formatDateTime('2026-11-21T10:30:00.000Z');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Nov');
  });

  it('gracefully returns raw string for invalid date', () => {
    expect(formatDateTime('invalid-date')).toBe('invalid-date');
    expect(formatDate('invalid-date')).toBe('invalid-date');
  });

  it('formats hours into duration text', () => {
    expect(formatHours(0)).toBe('Immediate');
    expect(formatHours(12)).toBe('12 hours');
    expect(formatHours(48)).toContain('48 hours');
    expect(formatHours(48)).toContain('2 days');
  });

  it('normalizes ticket ID', () => {
    expect(formatTicketId('  cr-7x2k9m4p  ')).toBe('CR-7X2K9M4P');
  });

  it('formats urgency, status, and category to plain language labels', () => {
    expect(formatUrgency(Urgency.CRITICAL)).toBe('Immediate Danger');
    expect(formatUrgency(Urgency.HIGH)).toBe('Urgent');
    expect(formatStatus(Status.SUBMITTED)).toBe('Received');
    expect(formatStatus(Status.RESOLVED)).toBe('Resolved');
    expect(formatCategory(Category.POTHOLE)).toBe('Pothole & Road Damage');
  });
});
