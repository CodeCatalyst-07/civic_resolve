import { describe, it, expect, vi } from 'vitest';
import { GeminiProvider, type GeminiClient } from '../../../src/ai/gemini.js';
import { Category, Urgency } from '@civicresolve/shared';

describe('Google Gemini AI Provider (gemini.ts)', () => {
  const validSuggestionJson = JSON.stringify({
    is_civic_issue: true,
    category: Category.GARBAGE,
    urgency: Urgency.MEDIUM,
    safety_critical: false,
    confidence: 0.88,
    summary: 'Overflowing garbage bin on 4th cross',
    reasons: ['Litter scattered on footpath'],
    missing_info: [],
  });

  it('calls client.models.generateContent with JSON mode and parses result', async () => {
    let capturedParams: Record<string, unknown> = {};

    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn().mockImplementation(async (params) => {
          capturedParams = params as Record<string, unknown>;
          return { text: validSuggestionJson };
        }),
      },
    };

    const provider = new GeminiProvider({
      apiKey: 'test-gemini-secret-key',
      model: 'gemini-1.5-flash',
      client: fakeClient,
    });

    const res = await provider.triage({ text: 'Garbage bin overflowing' });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.category).toBe(Category.GARBAGE);
      expect(res.value.urgency).toBe(Urgency.MEDIUM);
    }

    expect(capturedParams.model).toBe('gemini-1.5-flash');
    const config = capturedParams.config as Record<string, unknown>;
    expect(config.responseMimeType).toBe('application/json');
    expect(config.temperature).toBe(0.1);
    expect(config.maxOutputTokens).toBe(1000);
  });

  it('maps RESOURCE_EXHAUSTED / 429 error to rate_limited', async () => {
    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('429 RESOURCE_EXHAUSTED quota exceeded')),
      },
    };

    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      client: fakeClient,
    });

    const res = await provider.triage({ text: 'Garbage pile' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('rate_limited');
    }
  });

  it('maps API_KEY_INVALID / 401 error to auth_config without leaking keys', async () => {
    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('API_KEY_INVALID: Key AIzaSySecretKey is invalid')),
      },
    };

    const provider = new GeminiProvider({
      apiKey: 'AIzaSySecretKey',
      model: 'gemini-1.5-flash',
      client: fakeClient,
    });

    const res = await provider.triage({ text: 'Broken lamp' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('auth_config');
      expect(res.error.message).not.toContain('AIzaSySecretKey');
    }
  });

  it('maps timeout / abort error to timeout', async () => {
    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        ),
      },
    };

    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      timeoutMs: 20,
      client: fakeClient,
    });

    const res = await provider.triage({ text: 'Some text' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('timeout');
    }
  });

  it('maps empty or whitespace response to invalid_output', async () => {
    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: '   ' }),
      },
    };

    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      client: fakeClient,
    });

    const res = await provider.triage({ text: 'Some text' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('invalid_output');
    }
  });

  it('maps schema parse error to invalid_output', async () => {
    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: '{"category": "invalid_val"}' }),
      },
    };

    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      client: fakeClient,
    });

    const res = await provider.triage({ text: 'Some text' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('invalid_output');
    }
  });

  it('maps generic error to unavailable', async () => {
    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('Unknown backend failure')),
      },
    };

    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      client: fakeClient,
    });

    const res = await provider.triage({ text: 'Some text' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('unavailable');
    }
  });

  it('supports external abort signal', async () => {
    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 500))
        ),
      },
    };

    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      client: fakeClient,
    });

    const controller = new AbortController();
    const promise = provider.triage({ text: 'Test' }, { signal: controller.signal });
    controller.abort();
    const res = await promise;
    expect(res.ok).toBe(false);
  });
});
