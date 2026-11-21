import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../../src/ai/mock.js';
import { Category, Urgency } from '@civicresolve/shared';

describe('Mock AI Provider (mock.ts)', () => {
  it('returns fixture expectation on exact fixture text match', async () => {
    const provider = new MockProvider();
    const fixtureText =
      'Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck.';

    const res = await provider.triage({ text: fixtureText });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.category).toBe(Category.POTHOLE);
      expect(res.value.urgency).toBe(Urgency.HIGH);
      expect(res.value.safety_critical).toBe(false);
      expect(res.value.confidence).toBeGreaterThan(0.9);
    }
    expect(provider.callCount).toBe(1);
  });

  it('falls back to keyword classification for arbitrary unknown complaints', async () => {
    const provider = new MockProvider();
    const res = await provider.triage({ text: 'There is continuous water leakage from the municipal pipe near junction.' });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.category).toBe(Category.WATER_LEAKAGE);
    }
  });

  it('returns scripted failure when failWith is set', async () => {
    const provider = new MockProvider();
    provider.failWith = {
      kind: 'rate_limited',
      message: 'Simulated rate limit exceeded',
    };

    const res = await provider.triage({ text: 'Pothole on street' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('rate_limited');
      expect(res.error.message).toContain('Simulated rate limit');
    }
  });

  it('increments and resets call counter properly', async () => {
    const provider = new MockProvider();
    expect(provider.callCount).toBe(0);

    await provider.triage({ text: 'Garbage pile' });
    await provider.triage({ text: 'Broken light' });
    expect(provider.callCount).toBe(2);

    provider.resetCallCount();
    expect(provider.callCount).toBe(0);
  });
});
