import { describe, it, expect } from 'vitest';
import { Status, Urgency, Category } from '@civicresolve/shared';
import { InMemoryTicketRepository } from '../../../src/repo/memory.js';
import { runRepositoryContractTests } from './repositoryContract.js';

describe('InMemoryTicketRepository Contract Tests', () => {
  runRepositoryContractTests(
    'InMemory',
    () => new InMemoryTicketRepository(),
    (repo) => (repo as InMemoryTicketRepository).clear()
  );

  it('handles cursor pagination and nextCursor decoding correctly', async () => {
    const repo = new InMemoryTicketRepository();
    const t1 = {
      id: 'CR-11111111',
      description: 'Pothole 1',
      category: Category.POTHOLE,
      urgency: Urgency.CRITICAL,
      department: null,
      status: Status.SUBMITTED,
      events: [],
      duplicate_count: 0,
      reopen_count: 0,
      created_at: '2026-11-20T10:00:00.000Z',
      due_at: '2026-11-21T10:00:00.000Z',
      escalated: false,
      final_decision: {
        category: Category.POTHOLE,
        urgency: Urgency.CRITICAL,
        department: null,
        emergency_notice: false,
        applied_rules: [],
        ai_suggestion: null,
        needs_manual_triage: false,
      },
      attachments: [],
      version: 1,
    };
    const t2 = {
      ...t1,
      id: 'CR-22222222',
      description: 'Pothole 2',
      created_at: '2026-11-20T11:00:00.000Z',
    };

    await repo.create(t1);
    await repo.create(t2);

    // Page 1
    const p1 = await repo.query({ limit: 1 });
    expect(p1.ok).toBe(true);
    if (p1.ok) {
      expect(p1.value.tickets.length).toBe(1);
      expect(p1.value.nextCursor).toBeDefined();

      // Page 2 using cursor
      const p2 = await repo.query({ limit: 1, cursor: p1.value.nextCursor });
      expect(p2.ok).toBe(true);
      if (p2.ok) {
        expect(p2.value.tickets.length).toBe(1);
        expect(p2.value.tickets[0]?.id).not.toBe(p1.value.tickets[0]?.id);
      }
    }

    // Query with invalid cursor token
    const pInvalid = await repo.query({ limit: 20, cursor: 'invalid-non-base64-cursor!!!' });
    expect(pInvalid.ok).toBe(true);
  });

  it('filters count by ward and overdue flags accurately', async () => {
    const repo = new InMemoryTicketRepository();
    const nowIso = new Date().toISOString();
    const pastIso = new Date(Date.now() - 3600 * 1000).toISOString();

    await repo.create({
      id: 'CR-33333333',
      description: 'Overdue ticket in Ward 1',
      category: Category.POTHOLE,
      urgency: Urgency.HIGH,
      department: null,
      ward: 'Ward 1',
      status: Status.SUBMITTED,
      events: [],
      duplicate_count: 0,
      reopen_count: 0,
      created_at: pastIso,
      due_at: pastIso, // overdue
      escalated: false,
      final_decision: {
        category: Category.POTHOLE,
        urgency: Urgency.HIGH,
        department: null,
        emergency_notice: false,
        applied_rules: [],
        ai_suggestion: null,
        needs_manual_triage: false,
      },
      attachments: [],
      version: 1,
    });

    const totalCount = await repo.count();
    expect(totalCount.ok && totalCount.value).toBe(1);

    const ward1Count = await repo.count({ ward: 'Ward 1' });
    expect(ward1Count.ok && ward1Count.value).toBe(1);

    const ward2Count = await repo.count({ ward: 'Ward 2' });
    expect(ward2Count.ok && ward2Count.value).toBe(0);

    const overdueCount = await repo.count({ overdue: true });
    expect(overdueCount.ok && overdueCount.value).toBe(1);

    const notOverdueCount = await repo.count({ overdue: false });
    expect(notOverdueCount.ok && notOverdueCount.value).toBe(0);

    // listOpen with since
    const sinceRes = await repo.listOpen({ since: nowIso });
    expect(sinceRes.ok && sinceRes.value.length).toBe(0);

    // query with urgency, overdue, and pagination cursor edge cases
    const qUrgency = await repo.query({ limit: 20, urgency: Urgency.HIGH });
    expect(qUrgency.ok && qUrgency.value.tickets.length).toBe(1);

    const qUrgencyLow = await repo.query({ limit: 20, urgency: Urgency.LOW });
    expect(qUrgencyLow.ok && qUrgencyLow.value.tickets.length).toBe(0);

    const qOverdue = await repo.query({ limit: 20, overdue: true });
    expect(qOverdue.ok && qOverdue.value.tickets.length).toBe(1);

    const qNotOverdue = await repo.query({ limit: 20, overdue: false });
    expect(qNotOverdue.ok && qNotOverdue.value.tickets.length).toBe(0);

    // Invalid cursor gracefully starts from 0
    const qBadCursor = await repo.query({ limit: 20, cursor: 'not-valid-base64-ticket' });
    expect(qBadCursor.ok && qBadCursor.value.tickets.length).toBe(1);
  });
});
