import { describe, it, expect, vi } from 'vitest';
import { createTriageService } from '../../../src/services/triageService.js';
import { MockProvider } from '../../../src/ai/mock.js';
import { InMemoryTriageCache } from '../../../src/services/cache.js';
import { InMemoryDailyAiBudget } from '../../../src/services/budget.js';
import { AiSource, Urgency, Category } from '@civicresolve/shared';

describe('Grievance Triage Service Pipeline (triageService.ts)', () => {
  const mockNow = new Date('2026-11-21T10:00:00.000Z');

  it('rejects spam immediately without calling the AI model (cheap first)', async () => {
    const mockProvider = new MockProvider();
    const service = createTriageService({
      provider: mockProvider,
    });

    const res = await service.analyze({
      description: 'Buy cheap cryptocurrency at http://spam.crypto.biz and visit http://promo-coins.io for free tokens!',
      now: mockNow,
    });

    expect(res.outcome.kind).toBe('rejected');
    expect(res.meta.ai_source).toBe(AiSource.KEYWORD_FALLBACK);
    expect(res.meta.cached).toBe(false);
    expect(mockProvider.callCount).toBe(0); // AI model was NOT called
  });

  it('reuses cached suggestion on identical second submission without calling model', async () => {
    const mockProvider = new MockProvider();
    const cache = new InMemoryTriageCache();
    const service = createTriageService({
      provider: mockProvider,
      cache,
    });

    const complaint = 'Large pothole on 100ft road near signal causing traffic.';

    // First call
    const res1 = await service.analyze({
      description: complaint,
      ward: 'Ward 12',
      now: mockNow,
    });
    expect(res1.meta.cached).toBe(false);
    expect(mockProvider.callCount).toBe(1);

    // Second call with same text and ward
    const res2 = await service.analyze({
      description: complaint,
      ward: 'Ward 12',
      now: mockNow,
    });
    expect(res2.meta.cached).toBe(true);
    expect(mockProvider.callCount).toBe(1); // Provider call count did not increase
  });

  it('degrades gracefully to keyword classification when daily budget is exhausted', async () => {
    const mockProvider = new MockProvider();
    const budget = new InMemoryDailyAiBudget({ dailyLimit: 0 }); // Budget is 0

    const service = createTriageService({
      provider: mockProvider,
      budget,
    });

    const res = await service.analyze({
      description: 'Pothole on 5th cross lane road.',
      now: mockNow,
    });

    expect(res.meta.degraded).toBe(true);
    expect(res.meta.degraded_reason).toBe('budget_exhausted');
    expect(res.meta.ai_source).toBe(AiSource.KEYWORD_FALLBACK);
    expect(mockProvider.callCount).toBe(0);

    if (res.outcome.kind === 'ticket') {
      expect(res.outcome.needs_manual_triage).toBe(true);
    }
  });

  it('degrades gracefully to keyword fallback when AI provider returns an error', async () => {
    const mockProvider = new MockProvider();
    mockProvider.failWith = {
      kind: 'unavailable',
      message: '503 Service Unavailable',
    };

    const service = createTriageService({
      provider: mockProvider,
    });

    const res = await service.analyze({
      description: 'Continuous water leakage flooding the road.',
      now: mockNow,
    });

    expect(res.meta.degraded).toBe(true);
    expect(res.meta.degraded_reason).toBe('unavailable');
    expect(res.meta.ai_source).toBe(AiSource.KEYWORD_FALLBACK);

    if (res.outcome.kind === 'ticket') {
      expect(res.outcome.needs_manual_triage).toBe(true);
      expect(res.outcome.decision.category).toBe(Category.WATER_LEAKAGE);
    }
  });

  it('preserves emergency notice (112) and Critical urgency floor even when AI is unavailable', async () => {
    const mockProvider = new MockProvider();
    mockProvider.failWith = {
      kind: 'timeout',
      message: 'Provider timeout',
    };

    const service = createTriageService({
      provider: mockProvider,
    });

    const res = await service.analyze({
      description: 'Live wire hanging sparked with fire over pedestrian path!',
      now: mockNow,
    });

    expect(res.outcome.kind).toBe('ticket');
    if (res.outcome.kind === 'ticket') {
      expect(res.outcome.emergency_notice).toBe(true);
      expect(res.outcome.decision.urgency).toBe(Urgency.CRITICAL);
      expect(res.outcome.decision.emergency_notice).toBe(true);
    }
  });

  it('returns follow_up outcome for vague low-confidence report', async () => {
    const mockProvider = new MockProvider();
    const service = createTriageService({
      provider: mockProvider,
    });

    // Fixture cmp-02 has low confidence and expected outcome follow_up
    const res = await service.analyze({
      description: 'road is bad',
      round: 0,
      now: mockNow,
    });

    expect(res.outcome.kind).toBe('follow_up');
    if (res.outcome.kind === 'follow_up') {
      expect(res.outcome.round).toBe(1);
      expect(res.outcome.question.length).toBeGreaterThan(0);
    }
  });

  it('verifies that privacy-safe logger spy NEVER records complaint text or secrets', async () => {
    const mockProvider = new MockProvider();
    const loggedMessages: Array<{ msg: string; meta?: Record<string, unknown> }> = [];

    const spyLogger = {
      info: vi.fn().mockImplementation((msg, meta) => loggedMessages.push({ msg, meta })),
      warn: vi.fn().mockImplementation((msg, meta) => loggedMessages.push({ msg, meta })),
      error: vi.fn().mockImplementation((msg, meta) => loggedMessages.push({ msg, meta })),
    };

    const service = createTriageService({
      provider: mockProvider,
      logger: spyLogger,
    });

    const privateComplaintText = 'SECRET_CITIZEN_SSN_AND_PRIVATE_NOTES: Pothole on 2nd main';
    await service.analyze({
      description: privateComplaintText,
      now: mockNow,
    });

    expect(spyLogger.info).toHaveBeenCalled();

    for (const entry of loggedMessages) {
      const serialized = JSON.stringify(entry);
      expect(serialized).not.toContain(privateComplaintText);
      expect(serialized).not.toContain('SECRET_CITIZEN');
      expect(serialized).not.toContain('key');
      expect(serialized).not.toContain('token');
    }
  });
});
