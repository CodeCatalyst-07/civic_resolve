import { describe, it, expect, vi } from 'vitest';
import { withResilience } from '../../../src/ai/resilience.js';
import type { TriageProvider, TriageProviderInput } from '../../../src/ai/types.js';
import { AiSource, Category, Urgency, type TriageSuggestion, ok, err } from '@civicresolve/shared';

describe('AI Resilience Decorator (resilience.ts)', () => {
  const dummySuggestion: TriageSuggestion = Object.freeze({
    is_civic_issue: true,
    category: Category.POTHOLE,
    urgency: Urgency.MEDIUM,
    safety_critical: false,
    confidence: 0.9,
    summary: 'Pothole on lane',
    reasons: ['Visible road dent'],
    missing_info: [],
  });

  it('retries once with backoff on transient rate_limited error and succeeds', async () => {
    let callCount = 0;
    const fakeProvider: TriageProvider = {
      name: AiSource.JARVIS_GEMMA,
      model: 'gemma-test',
      triage: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return err({ kind: 'rate_limited', message: '429 Quota Exceeded' });
        }
        return ok(dummySuggestion);
      }),
    };

    const mockSleep = vi.fn().mockResolvedValue(undefined);
    const resilientProvider = withResilience(fakeProvider, {
      sleepFn: mockSleep,
      backoffMs: 200,
    });

    const res = await resilientProvider.triage({ text: 'Road pothole' });
    expect(res.ok).toBe(true);
    expect(callCount).toBe(2);
    expect(mockSleep).toHaveBeenCalledWith(200);
  });

  it('caps retries at 2 total attempts when transient errors persist', async () => {
    let callCount = 0;
    const fakeProvider: TriageProvider = {
      name: AiSource.JARVIS_GEMMA,
      model: 'gemma-test',
      triage: vi.fn().mockImplementation(async () => {
        callCount++;
        return err({ kind: 'unavailable', message: '503 Service Unavailable' });
      }),
    };

    const mockSleep = vi.fn().mockResolvedValue(undefined);
    const resilientProvider = withResilience(fakeProvider, {
      sleepFn: mockSleep,
      backoffMs: 100,
    });

    const res = await resilientProvider.triage({ text: 'Road pothole' });
    expect(res.ok).toBe(false);
    expect(callCount).toBe(2);
    if (!res.ok) {
      expect(res.error.kind).toBe('unavailable');
    }
  });

  it('performs JSON repair retry on invalid_output and passes repair prompt', async () => {
    let callCount = 0;
    let receivedInputOnSecondCall: TriageProviderInput | undefined;

    const fakeProvider: TriageProvider = {
      name: AiSource.JARVIS_GEMMA,
      model: 'gemma-test',
      triage: vi.fn().mockImplementation(async (input: TriageProviderInput) => {
        callCount++;
        if (callCount === 1) {
          return err({ kind: 'invalid_output', message: 'Syntax error in JSON' });
        }
        receivedInputOnSecondCall = input;
        return ok(dummySuggestion);
      }),
    };

    const resilientProvider = withResilience(fakeProvider);
    const res = await resilientProvider.triage({ text: 'Broken pipe' });

    expect(res.ok).toBe(true);
    expect(callCount).toBe(2);
    expect(receivedInputOnSecondCall?.repair).toBeDefined();
    expect(receivedInputOnSecondCall?.repair?.errors).toContain('Syntax error in JSON');
  });

  it('does not retry fatal auth_config errors', async () => {
    let callCount = 0;
    const fakeProvider: TriageProvider = {
      name: AiSource.GEMINI,
      model: 'gemini-test',
      triage: vi.fn().mockImplementation(async () => {
        callCount++;
        return err({ kind: 'auth_config', message: 'Invalid API key' });
      }),
    };

    const resilientProvider = withResilience(fakeProvider);
    const res = await resilientProvider.triage({ text: 'Garbage pile' });

    expect(res.ok).toBe(false);
    expect(callCount).toBe(1); // No retry
  });

  it('works with default sleep implementation', async () => {
    let callCount = 0;
    const fakeProvider: TriageProvider = {
      name: AiSource.MOCK,
      model: 'test-model',
      triage: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return err({ kind: 'timeout', message: 'Timeout' });
        }
        return ok(dummySuggestion);
      }),
    };

    const resilient = withResilience(fakeProvider, { backoffMs: 1 });
    const res = await resilient.triage({ text: 'Test' });
    expect(res.ok).toBe(true);
    expect(callCount).toBe(2);
  });
});
