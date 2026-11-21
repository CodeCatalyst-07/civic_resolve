import { describe, it, expect } from 'vitest';
import {
  Status,
  Urgency,
  Category,
} from '@civicresolve/shared';
import { generateSeedTickets, seedTickets } from '../../../src/data/seedData.js';
import { isValidTicketId } from '../../../src/domain/index.js';
import { InMemoryTicketRepository } from '../../../src/repo/memory.js';

describe('Seed Data Generator (seedData.ts)', () => {
  const referenceNow = new Date('2026-11-21T12:00:00.000Z');

  it('generates a full collection of realistic tickets with valid IDs and legal domain values', () => {
    const tickets = generateSeedTickets(referenceNow);

    expect(tickets.length).toBeGreaterThanOrEqual(35);

    for (const t of tickets) {
      expect(isValidTicketId(t.id)).toBe(true);
      expect(Object.values(Category)).toContain(t.category);
      expect(Object.values(Urgency)).toContain(t.urgency);
      expect(Object.values(Status)).toContain(t.status);
      expect(t.ward).toBeTruthy();
      expect(t.location?.lat).toBeTypeOf('number');
      expect(t.location?.lng).toBeTypeOf('number');
      expect(t.due_at).toBeTruthy();
      expect(t.created_at).toBeTruthy();
      expect(t.events.length).toBeGreaterThanOrEqual(1);
      expect(t.final_decision.ai_source).toBe('mock');
    }
  });

  it('covers all critical lifecycle and SLA test criteria', () => {
    const tickets = generateSeedTickets(referenceNow);

    // 1. Emergency critical ticket exists
    const emergencyTickets = tickets.filter(
      (t) => t.urgency === Urgency.CRITICAL && t.final_decision.emergency_notice
    );
    expect(emergencyTickets.length).toBeGreaterThanOrEqual(1);

    // 2. Overdue tickets exist (age > SLA)
    const overdueOrEscalated = tickets.filter(
      (t) => t.escalated || new Date(t.due_at).getTime() < referenceNow.getTime()
    );
    expect(overdueOrEscalated.length).toBeGreaterThanOrEqual(3);

    // 3. Reopened tickets exist
    const reopenedTickets = tickets.filter((t) => t.status === Status.REOPENED);
    expect(reopenedTickets.length).toBe(2);
    for (const t of reopenedTickets) {
      expect(t.reopen_count).toBe(1);
      expect(t.events.some((e) => e.status === Status.REOPENED)).toBe(true);
    }

    // 4. Rejected ticket exists with reason
    const rejectedTickets = tickets.filter((t) => t.status === Status.REJECTED);
    expect(rejectedTickets.length).toBe(1);
    expect(rejectedTickets[0]?.events.some((e) => e.status === Status.REJECTED)).toBe(true);

    // 5. Resolved tickets exist with explanatory resolution notes
    const resolvedTickets = tickets.filter((t) => t.status === Status.RESOLVED);
    expect(resolvedTickets.length).toBeGreaterThanOrEqual(5);
    for (const t of resolvedTickets) {
      const resEvent = t.events.find((e) => e.status === Status.RESOLVED);
      expect(resEvent?.note).toBeTruthy();
      expect(resEvent!.note!.length).toBeGreaterThanOrEqual(10);
    }

    // 6. Duplicate clusters exist
    const duplicateReports = tickets.filter((t) => t.duplicate_count > 0);
    expect(duplicateReports.length).toBeGreaterThanOrEqual(2);
  });

  it('seeds an InMemoryTicketRepository and correctly persists all tickets', async () => {
    const repo = new InMemoryTicketRepository();
    const result = await seedTickets(repo, { now: referenceNow });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.inserted).toBeGreaterThanOrEqual(35);
    }

    const openRes = await repo.listOpen();
    expect(openRes.ok).toBe(true);
    if (openRes.ok) {
      expect(openRes.value.length).toBeGreaterThan(0);
    }
  });
});
