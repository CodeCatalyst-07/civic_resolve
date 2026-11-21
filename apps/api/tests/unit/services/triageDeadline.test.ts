import { describe, it, expect, vi } from 'vitest';
import { AiSource, type Result, type TriageSuggestion, ok } from '@civicresolve/shared';
import { createTriageService } from '../../../src/services/triageService.js';
import type { TriageProvider, TriageProviderInput, AiError } from '../../../src/ai/types.js';

describe('TriageService AI Deadline & Degradation', () => {
  it('gracefully degrades to keyword fallback when AI provider exceeds deadline', async () => {
    // A slow provider that simulates an unresponsive network request
    const slowProvider: TriageProvider = {
      name: AiSource.MOCK,
      model: 'mock-slow-v1',
      triage: vi.fn(
        async (_input: TriageProviderInput, options?: { signal?: AbortSignal }): Promise<Result<TriageSuggestion, AiError>> => {
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              resolve(
                ok({
                  is_civic_issue: true,
                  category: 'pothole',
                  urgency: 'low',
                  safety_critical: false,
                  confidence: 0.9,
                  summary: 'Slow summary',
                  reasons: ['Slow reason'],
                  missing_info: [],
                })
              );
            }, 10000);

            options?.signal?.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('Aborted by signal'));
            });
          });
        }
      ),
    };

    const service = createTriageService({
      provider: slowProvider,
      aiTotalDeadlineMs: 50, // 50ms short deadline for fast test execution
    });

    const result = await service.analyze({
      description: 'Massive pothole crater on the road causing major traffic jam',
      ward: 'Ward 3 - Atturu',
      location: { address: 'Main Street near School' },
      round: 2,
    });

    expect(result.outcome.kind).toBe('ticket');
    expect(result.meta.degraded).toBe(true);
    expect(result.meta.degraded_reason).toBe('deadline_exceeded');
    expect(result.meta.ai_source).toBe(AiSource.KEYWORD_FALLBACK);
  });
});
