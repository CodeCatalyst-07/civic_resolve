import { describe, it, expect } from 'vitest';
import { computeDueAt, isOverdue, escalateIfOverdue } from '../../../src/domain/sla.js';
import { Urgency, Status, Department, Category, Role, type Ticket } from '@civicresolve/shared';

describe('SLA Management & Escalation (sla.ts)', () => {
  const createdDate = new Date('2026-11-01T10:00:00.000Z');

  describe('computeDueAt', () => {
    it('computes 24h SLA for Critical urgency', () => {
      const due = computeDueAt(Urgency.CRITICAL, createdDate);
      const diffHours = (due.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(24);
      expect(due.toISOString()).toBe('2026-11-02T10:00:00.000Z');
    });

    it('computes 72h SLA for High urgency', () => {
      const due = computeDueAt(Urgency.HIGH, createdDate);
      const diffHours = (due.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(72);
      expect(due.toISOString()).toBe('2026-11-04T10:00:00.000Z');
    });

    it('computes 168h (7 days) SLA for Medium urgency', () => {
      const due = computeDueAt(Urgency.MEDIUM, createdDate);
      const diffHours = (due.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(168);
    });

    it('computes 336h (14 days) SLA for Low urgency', () => {
      const due = computeDueAt(Urgency.LOW, createdDate);
      const diffHours = (due.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(336);
    });
  });

  describe('isOverdue and escalateIfOverdue', () => {
    const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
      id: 'CR-TEST1234',
      description: 'Road damage',
      category: Category.POTHOLE,
      urgency: Urgency.MEDIUM,
      department: Department.ROADS,
      status: Status.IN_PROGRESS,
      events: [],
      duplicate_count: 0,
      reopen_count: 0,
      created_at: createdDate.toISOString(),
      due_at: new Date('2026-11-08T10:00:00.000Z').toISOString(), // 7 days later
      escalated: false,
      final_decision: {
        urgency: Urgency.MEDIUM,
        category: Category.POTHOLE,
        department: Department.ROADS,
        applied_rules: [],
        emergency_notice: false,
        needs_manual_triage: false,
        ai_suggestion: null,
      },
      attachments: [],
      version: 1,
      ...overrides,
    });

    it('returns false for isOverdue when current time is before due_at', () => {
      const ticket = makeTicket();
      const beforeDue = new Date('2026-11-05T10:00:00.000Z');
      expect(isOverdue(ticket, beforeDue)).toBe(false);
    });

    it('returns true for isOverdue when current time is after due_at', () => {
      const ticket = makeTicket();
      const afterDue = new Date('2026-11-09T10:00:00.000Z');
      expect(isOverdue(ticket, afterDue)).toBe(true);
    });

    it('returns false for isOverdue if ticket is already resolved, closed, or rejected', () => {
      const afterDue = new Date('2026-11-09T10:00:00.000Z');

      expect(isOverdue(makeTicket({ status: Status.RESOLVED }), afterDue)).toBe(false);
      expect(isOverdue(makeTicket({ status: Status.CLOSED }), afterDue)).toBe(false);
      expect(isOverdue(makeTicket({ status: Status.REJECTED }), afterDue)).toBe(false);
    });

    it('escalates overdue ticket: raises urgency by one level, sets escalated=true, appends event', () => {
      const ticket = makeTicket({ urgency: Urgency.MEDIUM, escalated: false });
      const afterDue = new Date('2026-11-10T10:00:00.000Z');

      const escalated = escalateIfOverdue(ticket, afterDue);

      expect(escalated.escalated).toBe(true);
      expect(escalated.urgency).toBe(Urgency.HIGH); // Medium raised to High
      expect(escalated.events).toHaveLength(1);
      expect(escalated.events[0]?.actor_role).toBe(Role.AUTHORITY);
      expect(escalated.events[0]?.note).toContain('timeline breach');
    });

    it('does not re-escalate if ticket is already marked escalated', () => {
      const ticket = makeTicket({ urgency: Urgency.HIGH, escalated: true });
      const afterDue = new Date('2026-11-10T10:00:00.000Z');

      const result = escalateIfOverdue(ticket, afterDue);
      expect(result).toBe(ticket); // Returns exact same instance
      expect(result.urgency).toBe(Urgency.HIGH);
    });

    it('does not escalate if ticket is not overdue', () => {
      const ticket = makeTicket();
      const beforeDue = new Date('2026-11-05T10:00:00.000Z');

      const result = escalateIfOverdue(ticket, beforeDue);
      expect(result).toBe(ticket);
    });
  });
});
