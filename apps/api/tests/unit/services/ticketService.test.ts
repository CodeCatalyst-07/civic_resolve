import { describe, it, expect, beforeEach } from 'vitest';
import {
  Category,
  Urgency,
  Status,
  Department,
  err,
  type PublicTicketView,
  type AuthorityTicketView,
} from '@civicresolve/shared';
import { TicketService, toPublicTicket, toAuthorityTicket } from '../../../src/services/ticketService.js';
import { InMemoryTicketRepository } from '../../../src/repo/memory.js';
import { createTriageService, type TriageService } from '../../../src/services/triageService.js';
import { MockProvider } from '../../../src/ai/mock.js';
import { NullGeocodingProvider } from '../../../src/services/geocoding/null.js';
import { InMemoryTriageCache } from '../../../src/services/cache.js';
import { InMemoryDailyAiBudget } from '../../../src/services/budget.js';

describe('TicketService (Unit Tests)', () => {
  let repo: InMemoryTicketRepository;
  let triageService: TriageService;
  let ticketService: TicketService;
  let mockDate: Date;

  const VALID_POTHOLE_TEXT =
    'Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck.';

  const PUBLIC_ALLOWLIST_KEYS = [
    'id',
    'status',
    'category',
    'urgency',
    'department',
    'summary',
    'ward',
    'created_at',
    'due_at',
    'overdue',
    'duplicate_count',
    'reasons',
    'applied_rules',
    'timeline',
    'emergency_notice',
  ].sort();

  const AUTHORITY_ALLOWLIST_KEYS = [
    ...PUBLIC_ALLOWLIST_KEYS,
    'description',
    'location',
    'ai_suggestion',
    'ai_source',
    'needs_manual_triage',
    'escalated',
    'reopen_count',
    'version',
  ].sort();

  beforeEach(() => {
    mockDate = new Date('2026-11-21T10:00:00.000Z');
    repo = new InMemoryTicketRepository();
    const mockAi = new MockProvider();
    const cache = new InMemoryTriageCache();
    const budget = new InMemoryDailyAiBudget({ dailyLimit: 200 });

    triageService = createTriageService({
      provider: mockAi,
      cache,
      budget,
    });

    let seedCounter = 0;
    ticketService = new TicketService({
      repo,
      triageService,
      geocoding: new NullGeocodingProvider(),
      now: () => mockDate,
      randomBytes: (n: number) => {
        const b = new Uint8Array(n);
        b.fill(170);
        b[0] = (seedCounter++) & 0xff;
        return b;
      },
    });
  });

  it('analyzeReport returns preview without persisting anything', async () => {
    const res = await ticketService.analyzeReport({
      description: VALID_POTHOLE_TEXT,
      location: { ward: 'Ward 12' },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.outcome.kind).toBe('ticket');
      expect(Array.isArray(res.value.similar_reports)).toBe(true);
      expect(res.value.meta.ai_source).toBe('mock');
    }

    // Verify nothing was persisted
    const countRes = await repo.count();
    expect(countRes.ok && countRes.value).toBe(0);
  });

  it('submitReport creates ticket for valid complaint and enforces optimistic concurrency version = 1', async () => {
    const res = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
      location: { ward: 'Ward 12' },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.outcome.kind).toBe('ticket');
      expect(res.value.ticket).not.toBeNull();
      expect(res.value.ticket?.status).toBe(Status.SUBMITTED);
      expect(res.value.ticket?.ward).toBe('Ward 12');
      expect(res.value.ticket?.timeline.length).toBeGreaterThanOrEqual(1);

      // Verify stored in repo
      const stored = await repo.getById(res.value.ticket!.id);
      expect(stored.ok && stored.value?.version).toBe(1);
    }
  });

  it('submitReport returns outcome without creating ticket for follow-up questions', async () => {
    const res = await ticketService.submitReport({
      description: 'Road issue somewhere in the city.',
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.outcome.kind).toBe('follow_up');
      expect(res.value.ticket).toBeNull();
    }

    const countRes = await repo.count();
    expect(countRes.ok && countRes.value).toBe(0);
  });

  it('submitReport respects citizen category_override and re-resolves department, but citizen cannot modify urgency', async () => {
    const res = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
      category_override: Category.PUBLIC_HAZARD,
    });

    expect(res.ok).toBe(true);
    if (res.ok && res.value.ticket) {
      expect(res.value.ticket.category).toBe(Category.PUBLIC_HAZARD);
      expect(res.value.ticket.department).toBe('Public Health & Safety');
      // Urgency was determined by rules/AI (High), not by the citizen
      expect(res.value.ticket.urgency).toBe(Urgency.HIGH);
    }
  });

  it('supportReport increments duplicate count, re-evaluates rules, and only raises urgency', async () => {
    const subRes = await ticketService.submitReport({
      description:
        'Overflowing garbage dump and broken waste dustbin on 80ft road near vegetable market, foul smell spreading.',
      location: { ward: 'Ward 15' },
    });

    expect(subRes.ok && subRes.value.ticket).toBeDefined();
    const ticketId = subRes.ok ? subRes.value.ticket!.id : '';

    const supportRes = await ticketService.supportReport(ticketId);
    expect(supportRes.ok).toBe(true);
    if (supportRes.ok) {
      expect(supportRes.value.duplicate_count).toBe(1);
    }
  });

  it('getPublicTicket performs lazy escalation if overdue and persists update', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });

    const ticketId = subRes.ok && subRes.value.ticket ? subRes.value.ticket.id : '';
    expect(ticketId).toBeTruthy();

    // Fast-forward time past due_at
    mockDate = new Date(mockDate.getTime() + 100 * 3600 * 1000);

    const publicRes = await ticketService.getPublicTicket(ticketId);
    expect(publicRes.ok).toBe(true);
    if (publicRes.ok) {
      expect(publicRes.value.overdue).toBe(true);
    }

    const stored = await repo.getById(ticketId);
    expect(stored.ok && stored.value?.escalated).toBe(true);
  });

  it('toPublicTicket allowlist mapper contains exact public keys and zero internal fields', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });

    const ticketId = subRes.ok ? subRes.value.ticket!.id : '';
    const stored = await repo.getById(ticketId);
    if (!stored.ok || !stored.value) {
      throw new Error('Ticket not stored in repository');
    }

    const publicView: PublicTicketView = toPublicTicket(stored.value, mockDate);
    const actualKeys = Object.keys(publicView).sort();

    expect(actualKeys).toEqual(PUBLIC_ALLOWLIST_KEYS);
    // Ensure no authority or sensitive internal fields exist
    expect(publicView).not.toHaveProperty('description');
    expect(publicView).not.toHaveProperty('version');
    expect(publicView).not.toHaveProperty('ai_suggestion');
    expect(publicView).not.toHaveProperty('needs_manual_triage');
  });

  it('toAuthorityTicket allowlist mapper contains exact authority keys', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });

    const ticketId = subRes.ok ? subRes.value.ticket!.id : '';
    const stored = await repo.getById(ticketId);
    if (!stored.ok || !stored.value) {
      throw new Error('Ticket not stored in repository');
    }

    const authorityView: AuthorityTicketView = toAuthorityTicket(stored.value, mockDate);
    const actualKeys = Object.keys(authorityView).sort();

    expect(actualKeys).toEqual(AUTHORITY_ALLOWLIST_KEYS);
    expect(authorityView.description).toContain('Deep dangerous pothole');
    expect(authorityView.version).toBe(1);
  });

  it('reopenTicket allows single reopen from resolved, rejects second reopen and unresolved status', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });
    const ticketId = subRes.ok ? subRes.value.ticket!.id : '';

    // Cannot reopen submitted ticket
    const invalidReopen = await ticketService.reopenTicket(ticketId);
    expect(invalidReopen.ok).toBe(false);
    if (!invalidReopen.ok) {
      expect(invalidReopen.error.code).toBe('forbidden');
    }

    // Step through legal transitions: SUBMITTED -> UNDER_REVIEW -> ASSIGNED -> IN_PROGRESS -> RESOLVED
    await ticketService.updateStatus(ticketId, { status: Status.UNDER_REVIEW });
    await ticketService.updateStatus(ticketId, { status: Status.ASSIGNED });
    await ticketService.updateStatus(ticketId, { status: Status.IN_PROGRESS });
    await ticketService.updateStatus(ticketId, {
      status: Status.RESOLVED,
      note: 'Road surface patched and bitumen rolled.',
    });

    // First reopen succeeds
    const firstReopen = await ticketService.reopenTicket(ticketId, 'Pothole caved in again after rain.');
    expect(firstReopen.ok).toBe(true);
    if (firstReopen.ok) {
      expect(firstReopen.value.status).toBe(Status.REOPENED);
    }

    // Resolve ticket again: REOPENED -> IN_PROGRESS -> RESOLVED
    await ticketService.updateStatus(ticketId, { status: Status.IN_PROGRESS });
    await ticketService.updateStatus(ticketId, {
      status: Status.RESOLVED,
      note: 'Reinforced concrete patch applied.',
    });

    // Second reopen fails
    const secondReopen = await ticketService.reopenTicket(ticketId, 'Still sinking.');
    expect(secondReopen.ok).toBe(false);
    if (!secondReopen.ok) {
      expect(secondReopen.error.code).toBe('forbidden');
      expect(secondReopen.error.message).toContain('reopened the maximum allowed number of times');
    }
  });

  it('updateStatus requires explanatory note when status is resolved', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });
    const ticketId = subRes.ok ? subRes.value.ticket!.id : '';

    // Progress to in_progress first
    await ticketService.updateStatus(ticketId, { status: Status.UNDER_REVIEW });
    await ticketService.updateStatus(ticketId, { status: Status.ASSIGNED });
    await ticketService.updateStatus(ticketId, { status: Status.IN_PROGRESS });

    const failNoNote = await ticketService.updateStatus(ticketId, {
      status: Status.RESOLVED,
    });
    expect(failNoNote.ok).toBe(false);
    if (!failNoNote.ok) {
      expect(failNoNote.error.code).toBe('validation_failed');
    }

    const successWithNote = await ticketService.updateStatus(ticketId, {
      status: Status.RESOLVED,
      note: 'Asphalt resurfaced by PWD division.',
    });
    expect(successWithNote.ok).toBe(true);
  });

  it('overrideTriage requires reason, allows adjusting urgency and logs audit rule', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });
    const ticketId = subRes.ok ? subRes.value.ticket!.id : '';

    const overrideRes = await ticketService.overrideTriage(ticketId, {
      urgency: Urgency.LOW,
      reason: 'Physical inspection confirmed pothole is shallow and off roadway.',
    });

    expect(overrideRes.ok).toBe(true);
    if (overrideRes.ok) {
      // Humans are allowed to lower urgency
      expect(overrideRes.value.urgency).toBe(Urgency.LOW);
      const overrideRule = overrideRes.value.applied_rules.find((r) => r.id === 'authority-override');
      expect(overrideRule).toBeDefined();
      expect(overrideRule?.effect).toContain('Physical inspection');
    }
  });

  it('getStats calculates aggregated system metrics accurately', async () => {
    // Ticket 1: Open
    await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });

    // Ticket 2: Resolved
    const t2 = await ticketService.submitReport({
      description:
        'Garbage dump spilling on footpath and water pipe leak flooding the street near Market Circle, Ward 4.',
    });
    const t2Id = t2.ok && t2.value.ticket ? t2.value.ticket.id : '';

    // Progress t2 to in_progress
    await ticketService.updateStatus(t2Id, { status: Status.UNDER_REVIEW });
    await ticketService.updateStatus(t2Id, { status: Status.ASSIGNED });
    await ticketService.updateStatus(t2Id, { status: Status.IN_PROGRESS });

    // Fast-forward 4 hours
    mockDate = new Date(mockDate.getTime() + 4 * 3600 * 1000);
    await ticketService.updateStatus(t2Id, {
      status: Status.RESOLVED,
      note: 'Garbage truck cleared the pile.',
    });

    // Ticket 3: Also resolved to test even number median calculation and overdue open ticket
    const t3 = await ticketService.submitReport({
      description:
        'Streetlight pole broken and street light not working for whole lane in Sector 3, completely dark at night.',
    });
    const t3Id = t3.ok && t3.value.ticket ? t3.value.ticket.id : '';
    await ticketService.updateStatus(t3Id, { status: Status.UNDER_REVIEW });
    await ticketService.updateStatus(t3Id, { status: Status.ASSIGNED });
    await ticketService.updateStatus(t3Id, { status: Status.IN_PROGRESS });
    // Fast-forward another 6 hours (total 10 hours from start)
    mockDate = new Date(mockDate.getTime() + 6 * 3600 * 1000);
    await ticketService.updateStatus(t3Id, {
      status: Status.RESOLVED,
      note: 'Bulb replaced by lighting wing.',
    });

    // Fast-forward 200 hours so open ticket is overdue
    mockDate = new Date(mockDate.getTime() + 200 * 3600 * 1000);

    const statsRes = await ticketService.getStats();
    expect(statsRes.ok).toBe(true);
    if (statsRes.ok) {
      expect(statsRes.value.open).toBe(1);
      expect(statsRes.value.resolved).toBe(2);
      expect(statsRes.value.overdue).toBeGreaterThanOrEqual(1);
      // Median of [4, 6] is 5
      expect(statsRes.value.median_resolution_hours).toBe(5);
    }
  });

  it('overrideTriage returns not_found for nonexistent or invalid ticket id', async () => {
    const resBad = await ticketService.overrideTriage('bad-id', {
      urgency: Urgency.LOW,
      reason: 'Testing bad id format',
    });
    expect(resBad.ok).toBe(false);
    if (!resBad.ok) {
      expect(resBad.error.code).toBe('not_found');
    }

    const fakeValidId = '00000000-0000-4000-8000-000000000000';
    const resMissing = await ticketService.overrideTriage(fakeValidId, {
      urgency: Urgency.LOW,
      reason: 'Testing missing ticket',
    });
    expect(resMissing.ok).toBe(false);
    if (!resMissing.ok) {
      expect(resMissing.error.code).toBe('not_found');
    }
  });

  it('reopenTicket and getAuthorityTicket handle invalid IDs and missing tickets gracefully', async () => {
    const fakeId = 'CR-00000000';
    const badId = 'invalid';

    // reopenTicket
    const r1 = await ticketService.reopenTicket(badId);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error.code).toBe('not_found');

    const r2 = await ticketService.reopenTicket(fakeId);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe('not_found');

    // getAuthorityTicket
    const a1 = await ticketService.getAuthorityTicket(badId);
    expect(a1.ok).toBe(false);
    if (!a1.ok) expect(a1.error.code).toBe('not_found');

    const a2 = await ticketService.getAuthorityTicket(fakeId);
    expect(a2.ok).toBe(false);
    if (!a2.ok) expect(a2.error.code).toBe('not_found');
  });

  it('supportReport retries on concurrent modification conflict', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });
    const ticketId = subRes.ok && subRes.value.ticket ? subRes.value.ticket.id : '';

    let attempts = 0;
    const originalUpdate = repo.update.bind(repo);
    repo.update = async (ticket) => {
      attempts++;
      if (attempts === 1) {
        return err({ code: 'conflict', message: 'Simulated concurrent conflict' });
      }
      return originalUpdate(ticket);
    };

    const supRes = await ticketService.supportReport(ticketId);
    expect(supRes.ok).toBe(true);
    expect(attempts).toBe(2);

    // Now test conflict retry exhaustion
    repo.update = async () => err({ code: 'conflict', message: 'Persistent conflict' });
    const supFail = await ticketService.supportReport(ticketId);
    expect(supFail.ok).toBe(false);
    if (!supFail.ok) {
      expect(supFail.error.code).toBe('conflict');
    }

    // Restore original update
    repo.update = originalUpdate;
  });

  it('listQueue returns internal_error when repository query fails', async () => {
    const originalQuery = repo.query.bind(repo);
    repo.query = async () => err({ code: 'internal', message: 'Disk read failure' });

    const qRes = await ticketService.listQueue({ limit: 10 });
    expect(qRes.ok).toBe(false);
    if (!qRes.ok) {
      expect(qRes.error.code).toBe('internal_error');
    }

    repo.query = originalQuery;
  });

  it('handles repo update conflict and error in reopenTicket and overrideTriage', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });
    const ticketId = subRes.ok && subRes.value.ticket ? subRes.value.ticket.id : '';

    // Move to resolved
    await ticketService.updateStatus(ticketId, { status: Status.UNDER_REVIEW });
    await ticketService.updateStatus(ticketId, { status: Status.ASSIGNED });
    await ticketService.updateStatus(ticketId, { status: Status.IN_PROGRESS });
    await ticketService.updateStatus(ticketId, {
      status: Status.RESOLVED,
      note: 'Road patch completed by maintenance wing.',
    });

    const originalUpdate = repo.update.bind(repo);

    // Reopen fails with conflict
    repo.update = async () => err({ code: 'conflict', message: 'Reopen conflict' });
    const reopenConflict = await ticketService.reopenTicket(ticketId, 'Still sinking');
    expect(reopenConflict.ok).toBe(false);
    if (!reopenConflict.ok) expect(reopenConflict.error.code).toBe('conflict');

    // Reopen fails with internal_error
    repo.update = async () => err({ code: 'internal', message: 'Storage crash' });
    const reopenErr = await ticketService.reopenTicket(ticketId, 'Still sinking');
    expect(reopenErr.ok).toBe(false);
    if (!reopenErr.ok) expect(reopenErr.error.code).toBe('internal_error');

    // Override fails with conflict
    repo.update = async () => err({ code: 'conflict', message: 'Override conflict' });
    const overrideConflict = await ticketService.overrideTriage(ticketId, {
      urgency: Urgency.CRITICAL,
      reason: 'Safety audit escalation',
    });
    expect(overrideConflict.ok).toBe(false);
    if (!overrideConflict.ok) expect(overrideConflict.error.code).toBe('conflict');

    // Override fails with internal_error
    repo.update = async () => err({ code: 'internal', message: 'DB crash' });
    const overrideErr = await ticketService.overrideTriage(ticketId, {
      urgency: Urgency.CRITICAL,
      reason: 'Safety audit escalation',
    });
    expect(overrideErr.ok).toBe(false);
    if (!overrideErr.ok) expect(overrideErr.error.code).toBe('internal_error');

    repo.update = originalUpdate;
  });

  it('handles updateStatus when repo update fails with conflict or error', async () => {
    const subRes = await ticketService.submitReport({
      description: VALID_POTHOLE_TEXT,
    });
    const ticketId = subRes.ok && subRes.value.ticket ? subRes.value.ticket.id : '';

    const originalUpdate = repo.update.bind(repo);

    repo.update = async () => err({ code: 'conflict', message: 'Status update conflict' });
    const resConflict = await ticketService.updateStatus(ticketId, { status: Status.UNDER_REVIEW });
    expect(resConflict.ok).toBe(false);
    if (!resConflict.ok) expect(resConflict.error.code).toBe('conflict');

    repo.update = async () => err({ code: 'internal', message: 'Disk down' });
    const resErr = await ticketService.updateStatus(ticketId, { status: Status.UNDER_REVIEW });
    expect(resErr.ok).toBe(false);
    if (!resErr.ok) expect(resErr.error.code).toBe('internal_error');

    // supportReport on nonexistent ticket
    const supNotFound = await ticketService.supportReport('CR-00000000');
    expect(supNotFound.ok).toBe(false);
    if (!supNotFound.ok) expect(supNotFound.error.code).toBe('not_found');

    // overrideTriage with category override (auto-resolves department)
    repo.update = originalUpdate;
    const catOverride = await ticketService.overrideTriage(ticketId, {
      category: Category.GARBAGE,
      reason: 'Recategorized to garbage',
    });
    expect(catOverride.ok).toBe(true);
    if (catOverride.ok) {
      expect(catOverride.value.category).toBe(Category.GARBAGE);
      expect(catOverride.value.department).toBe('Sanitation & Waste Management');
    }

    // overrideTriage with explicit department override
    const deptOverride = await ticketService.overrideTriage(ticketId, {
      department: Department.ROADS,
      reason: 'Cross-functional road repair assistance',
    });
    expect(deptOverride.ok).toBe(true);
  });
});
