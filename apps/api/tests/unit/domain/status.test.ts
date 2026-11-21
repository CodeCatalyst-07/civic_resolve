import { describe, it, expect } from 'vitest';
import { transitionTicket, LEGAL_TRANSITIONS } from '../../../src/domain/status.js';
import { Status, Role, Urgency, Category, Department, type Ticket } from '@civicresolve/shared';

describe('Ticket Lifecycle & Status Transitions (status.ts)', () => {
  const mockNow = new Date('2026-11-21T10:00:00.000Z');

  const makeBaseTicket = (status: Status, reopenCount = 0): Ticket => ({
    id: 'CR-STATUS12',
    description: 'Broken streetlight on lane 4',
    category: Category.STREETLIGHT,
    urgency: Urgency.MEDIUM,
    department: Department.PUBLIC_LIGHTING,
    status,
    events: [],
    duplicate_count: 0,
    reopen_count: reopenCount,
    created_at: mockNow.toISOString(),
    due_at: mockNow.toISOString(),
    escalated: false,
    final_decision: {
      urgency: Urgency.MEDIUM,
      category: Category.STREETLIGHT,
      department: Department.PUBLIC_LIGHTING,
      applied_rules: [],
      emergency_notice: false,
      needs_manual_triage: false,
      ai_suggestion: null,
    },
    attachments: [],
    version: 1,
  });

  describe('Exhaustive Legal and Illegal State Transitions', () => {
    const allStatuses = Object.values(Status);

    for (const fromStatus of allStatuses) {
      const allowedNext = LEGAL_TRANSITIONS[fromStatus];

      for (const toStatus of allStatuses) {
        const isLegal = allowedNext.includes(toStatus);

        it(`${fromStatus} -> ${toStatus} is ${isLegal ? 'PERMITTED' : 'REJECTED'}`, () => {
          const ticket = makeBaseTicket(fromStatus);

          const result = transitionTicket(ticket, toStatus, {
            actor_role: Role.AUTHORITY,
            note: toStatus === Status.RESOLVED ? 'Resolution note provided.' : 'Valid move',
            now: mockNow,
          });

          if (isLegal) {
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.value.status).toBe(toStatus);
              expect(result.value.events).toHaveLength(1);
            }
          } else {
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error).toContain('Cannot move ticket status');
            }
          }
        });
      }
    }
  });

  describe('Citizen Role Boundaries and Reopen Limits', () => {
    it('allows a citizen to reopen a resolved ticket when reopen_count is 0', () => {
      const resolvedTicket = makeBaseTicket(Status.RESOLVED, 0);

      const res = transitionTicket(resolvedTicket, Status.REOPENED, {
        actor_role: Role.CITIZEN,
        note: 'Still not working properly after repair.',
        now: mockNow,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.status).toBe(Status.REOPENED);
        expect(res.value.reopen_count).toBe(1); // Increment count
        expect(res.value.events).toHaveLength(1);
        expect(res.value.events[0]?.actor_role).toBe(Role.CITIZEN);
      }
    });

    it('rejects citizen attempting to reopen an already reopened ticket (limit: 1)', () => {
      const resolvedTicketAlreadyReopenedOnce = makeBaseTicket(Status.RESOLVED, 1);

      const res = transitionTicket(resolvedTicketAlreadyReopenedOnce, Status.REOPENED, {
        actor_role: Role.CITIZEN,
        note: 'Trying to reopen second time',
        now: mockNow,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('maximum allowed number of times (1)');
      }
    });

    it('rejects citizen attempting to reopen from any non-resolved status', () => {
      const inProgressTicket = makeBaseTicket(Status.IN_PROGRESS);

      const res = transitionTicket(inProgressTicket, Status.REOPENED, {
        actor_role: Role.CITIZEN,
        note: 'Reopen attempt',
        now: mockNow,
      });

      expect(res.ok).toBe(false);
    });

    it('rejects citizen attempting non-reopen transitions (e.g. resolving or closing)', () => {
      const assignedTicket = makeBaseTicket(Status.ASSIGNED);

      const res = transitionTicket(assignedTicket, Status.IN_PROGRESS, {
        actor_role: Role.CITIZEN,
        now: mockNow,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('Citizens are only permitted to reopen');
      }
    });
  });

  describe('Authority Resolution Note Requirement', () => {
    it('requires a non-empty note when moving to Status.RESOLVED', () => {
      const inProgressTicket = makeBaseTicket(Status.IN_PROGRESS);

      // Missing note
      const resMissing = transitionTicket(inProgressTicket, Status.RESOLVED, {
        actor_role: Role.AUTHORITY,
        now: mockNow,
      });
      expect(resMissing.ok).toBe(false);
      if (!resMissing.ok) {
        expect(resMissing.error).toContain('Resolving a ticket requires an explanation note');
      }

      // Whitespace-only note
      const resWhitespace = transitionTicket(inProgressTicket, Status.RESOLVED, {
        actor_role: Role.AUTHORITY,
        note: '   ',
        now: mockNow,
      });
      expect(resWhitespace.ok).toBe(false);

      // Valid note succeeds
      const resValid = transitionTicket(inProgressTicket, Status.RESOLVED, {
        actor_role: Role.AUTHORITY,
        note: 'Replaced high-pressure sodium bulb and verified ballast.',
        now: mockNow,
      });
      expect(resValid.ok).toBe(true);
      if (resValid.ok) {
        expect(resValid.value.status).toBe(Status.RESOLVED);
        expect(resValid.value.events[0]?.note).toBe('Replaced high-pressure sodium bulb and verified ballast.');
      }
    });
  });

  describe('Terminal Status Guarantees', () => {
    it('closed is permanently terminal (no exits)', () => {
      expect(LEGAL_TRANSITIONS.closed).toHaveLength(0);
      const closedTicket = makeBaseTicket(Status.CLOSED);

      for (const next of Object.values(Status)) {
        const res = transitionTicket(closedTicket, next, {
          actor_role: Role.AUTHORITY,
          now: mockNow,
        });
        expect(res.ok).toBe(false);
      }
    });

    it('rejected is permanently terminal (no exits)', () => {
      expect(LEGAL_TRANSITIONS.rejected).toHaveLength(0);
      const rejectedTicket = makeBaseTicket(Status.REJECTED);

      for (const next of Object.values(Status)) {
        const res = transitionTicket(rejectedTicket, next, {
          actor_role: Role.AUTHORITY,
          now: mockNow,
        });
        expect(res.ok).toBe(false);
      }
    });
  });
});
