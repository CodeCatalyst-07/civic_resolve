import { describe, it, expect, beforeEach } from 'vitest';
import {
  Category,
  Urgency,
  Status,
  Department,
  type Ticket,
  type FinalDecision,
} from '@civicresolve/shared';
import type { TicketRepository } from '../../../src/repo/types.js';

export function runRepositoryContractTests(
  name: string,
  createRepo: () => Promise<TicketRepository> | TicketRepository,
  cleanupRepo?: (repo: TicketRepository) => Promise<void> | void
): void {
  describe(`TicketRepository Contract: ${name}`, () => {
    let repo: TicketRepository;
    const baseDate = new Date('2026-11-21T10:00:00.000Z');

    const sampleDecision: FinalDecision = {
      urgency: Urgency.HIGH,
      category: Category.POTHOLE,
      department: Department.ROADS,
      applied_rules: [],
      emergency_notice: false,
      needs_manual_triage: false,
      ai_suggestion: null,
    };

    function createSampleTicket(id: string, overrides?: Partial<Ticket>): Ticket {
      return {
        id,
        description: `Grievance report for ${id}`,
        category: Category.POTHOLE,
        urgency: Urgency.HIGH,
        department: Department.ROADS,
        ward: 'Ward 12',
        status: Status.SUBMITTED,
        events: [
          {
            id: 'evt-1',
            status: Status.SUBMITTED,
            actor_role: 'citizen',
            at: baseDate.toISOString(),
          },
        ],
        duplicate_count: 0,
        reopen_count: 0,
        created_at: baseDate.toISOString(),
        due_at: new Date(baseDate.getTime() + 48 * 3600 * 1000).toISOString(),
        escalated: false,
        final_decision: sampleDecision,
        attachments: [],
        version: 1,
        ...overrides,
      };
    }

    beforeEach(async () => {
      repo = await createRepo();
      if (cleanupRepo) {
        await cleanupRepo(repo);
      }
    });

    it('creates and retrieves ticket by ID', async () => {
      const ticket = createSampleTicket('CR-TEST01');
      const createRes = await repo.create(ticket);

      expect(createRes.ok).toBe(true);
      if (createRes.ok) {
        expect(createRes.value.id).toBe('CR-TEST01');
        expect(createRes.value.version).toBe(1);
      }

      const getRes = await repo.getById('CR-TEST01');
      expect(getRes.ok).toBe(true);
      if (getRes.ok) {
        expect(getRes.value).not.toBeNull();
        expect(getRes.value?.id).toBe('CR-TEST01');
        expect(getRes.value?.description).toBe(ticket.description);
      }
    });

    it('returns ok(null) for non-existent ticket', async () => {
      const res = await repo.getById('CR-NONEXISTENT');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBeNull();
      }
    });

    it('increments version on successful update', async () => {
      const ticket = createSampleTicket('CR-TEST02');
      await repo.create(ticket);

      const toUpdate: Ticket = {
        ...ticket,
        status: Status.IN_PROGRESS,
      };

      const updateRes = await repo.update(toUpdate);
      expect(updateRes.ok).toBe(true);
      if (updateRes.ok) {
        expect(updateRes.value.status).toBe(Status.IN_PROGRESS);
        expect(updateRes.value.version).toBe(2);
      }

      const getRes = await repo.getById('CR-TEST02');
      if (getRes.ok) {
        expect(getRes.value?.version).toBe(2);
      }
    });

    it('rejects update with conflict error when versions mismatch (optimistic concurrency)', async () => {
      const ticket = createSampleTicket('CR-TEST03');
      await repo.create(ticket);

      // Successfully advance to version 2
      await repo.update({ ...ticket, status: Status.UNDER_REVIEW });

      // Attempt second update with stale version 1
      const staleUpdateRes = await repo.update({
        ...ticket,
        version: 1,
        status: Status.ASSIGNED,
      });

      expect(staleUpdateRes.ok).toBe(false);
      if (!staleUpdateRes.ok) {
        expect(staleUpdateRes.error.code).toBe('conflict');
        expect(staleUpdateRes.error.message).toContain('Optimistic concurrency conflict');
      }
    });

    it('rejects update for non-existent ticket with not_found error', async () => {
      const ghostTicket = createSampleTicket('CR-GHOST');
      const updateRes = await repo.update(ghostTicket);

      expect(updateRes.ok).toBe(false);
      if (!updateRes.ok) {
        expect(updateRes.error.code).toBe('not_found');
      }
    });

    it('lists open tickets newest first, excluding terminal statuses', async () => {
      const t1 = createSampleTicket('CR-OPEN-1', {
        created_at: new Date(baseDate.getTime() + 1000).toISOString(),
        status: Status.SUBMITTED,
      });
      const t2 = createSampleTicket('CR-OPEN-2', {
        created_at: new Date(baseDate.getTime() + 2000).toISOString(),
        status: Status.IN_PROGRESS,
      });
      const t3 = createSampleTicket('CR-CLOSED-3', {
        created_at: new Date(baseDate.getTime() + 3000).toISOString(),
        status: Status.CLOSED,
      });

      await repo.create(t1);
      await repo.create(t2);
      await repo.create(t3);

      const openRes = await repo.listOpen();
      expect(openRes.ok).toBe(true);
      if (openRes.ok) {
        const ids = openRes.value.map((t) => t.id);
        expect(ids).toContain('CR-OPEN-2');
        expect(ids).toContain('CR-OPEN-1');
        expect(ids).not.toContain('CR-CLOSED-3');
        // Newest first
        expect(openRes.value[0]?.id).toBe('CR-OPEN-2');
      }
    });

    it('queries tickets with sorting: urgency descending then due_at ascending', async () => {
      const tLow = createSampleTicket('CR-LOW', {
        urgency: Urgency.LOW,
        due_at: '2026-11-25T10:00:00.000Z',
      });
      const tCritSoon = createSampleTicket('CR-CRIT-SOON', {
        urgency: Urgency.CRITICAL,
        due_at: '2026-11-22T10:00:00.000Z',
      });
      const tCritLater = createSampleTicket('CR-CRIT-LATER', {
        urgency: Urgency.CRITICAL,
        due_at: '2026-11-23T10:00:00.000Z',
      });

      await repo.create(tLow);
      await repo.create(tCritSoon);
      await repo.create(tCritLater);

      const queryRes = await repo.query({ limit: 10 });
      expect(queryRes.ok).toBe(true);
      if (queryRes.ok) {
        const ids = queryRes.value.tickets.map((t) => t.id);
        expect(ids[0]).toBe('CR-CRIT-SOON');
        expect(ids[1]).toBe('CR-CRIT-LATER');
        expect(ids[2]).toBe('CR-LOW');
      }
    });

    it('enforces deep-copy isolation preventing callers from mutating internal state', async () => {
      const ticket = createSampleTicket('CR-MUTATE');
      await repo.create(ticket);

      const getRes = await repo.getById('CR-MUTATE');
      if (getRes.ok && getRes.value) {
        // Mutate caller's copy
        getRes.value.description = 'Mutated locally';
      }

      const freshGet = await repo.getById('CR-MUTATE');
      if (freshGet.ok && freshGet.value) {
        expect(freshGet.value.description).toBe('Grievance report for CR-MUTATE');
      }
    });

    it('counts tickets accurately with optional filters', async () => {
      await repo.create(createSampleTicket('CR-C1', { category: Category.GARBAGE }));
      await repo.create(createSampleTicket('CR-C2', { category: Category.POTHOLE }));
      await repo.create(createSampleTicket('CR-C3', { category: Category.GARBAGE }));

      const totalCount = await repo.count();
      if (totalCount.ok) {
        expect(totalCount.value).toBe(3);
      }

      const garbageCount = await repo.count({ category: Category.GARBAGE });
      if (garbageCount.ok) {
        expect(garbageCount.value).toBe(2);
      }
    });
  });
}
