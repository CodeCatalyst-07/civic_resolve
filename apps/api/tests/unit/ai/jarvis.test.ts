import { describe, it, expect, vi } from 'vitest';
import { JarvisGemmaProvider } from '../../../src/ai/jarvis.js';
import { Category, Urgency } from '@civicresolve/shared';

describe('Jarvis Gemma AI Provider (jarvis.ts)', () => {
  const validSuggestionJson = JSON.stringify({
    is_civic_issue: true,
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    safety_critical: true,
    confidence: 0.91,
    summary: 'Dangerous pothole on main road',
    reasons: ['Deep hole', 'Traffic slowdown'],
    missing_info: [],
  });

  it('sends correct request parameters and parses valid response', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: Record<string, unknown> = {};

    const mockFetch: typeof fetch = vi.fn().mockImplementation(async (url, init) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = JSON.parse(String(init?.body));

      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              finish_reason: 'stop',
              message: { content: validSuggestionJson },
            },
          ],
        }),
      } as unknown as Response;
    });

    const provider = new JarvisGemmaProvider({
      apiKey: 'test-secret-key-1234',
      baseUrl: 'https://models.jarvislabs.net/v1',
      model: 'gemma-4-31b-it',
      disableThinking: true,
      fetchFn: mockFetch,
    });

    const res = await provider.triage({ text: 'Dangerous pothole near signal' });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.category).toBe(Category.POTHOLE);
      expect(res.value.urgency).toBe(Urgency.HIGH);
    }

    // Verify request shape
    expect(capturedUrl).toBe('https://models.jarvislabs.net/v1/chat/completions');
    expect(capturedHeaders['Authorization']).toBe('Bearer test-secret-key-1234');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedBody.model).toBe('gemma-4-31b-it');
    expect(capturedBody.temperature).toBe(0);
    expect(capturedBody.max_tokens).toBe(1000);
    expect(capturedBody.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(capturedBody.response_format).toBeUndefined(); // Must NOT send response_format
  });

  it('maps HTTP 429 to rate_limited', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as unknown as Response);

    const provider = new JarvisGemmaProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    const res = await provider.triage({ text: 'Some issue' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('rate_limited');
      expect(res.error.message).not.toContain('test-key');
    }
  });

  it('maps HTTP 401 and 403 to auth_config without leaking keys', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    } as unknown as Response);

    const provider = new JarvisGemmaProvider({
      apiKey: 'super-secret-api-key',
      fetchFn: mockFetch,
    });

    const res = await provider.triage({ text: 'Some complaint' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('auth_config');
      expect(res.error.message).not.toContain('super-secret-api-key');
      expect(res.error.message).not.toContain('Some complaint');
    }
  });

  it('maps HTTP 500 to unavailable', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const provider = new JarvisGemmaProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    const res = await provider.triage({ text: 'Some issue' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('unavailable');
    }
  });

  it('maps finish_reason = "length" to invalid_output', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            finish_reason: 'length',
            message: { content: '{"category": "pothole"' },
          },
        ],
      }),
    } as unknown as Response);

    const provider = new JarvisGemmaProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    const res = await provider.triage({ text: 'Long text' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('invalid_output');
      expect(res.error.message).toContain('truncated');
    }
  });

  it('maps network abort timeout to timeout kind', async () => {
    const mockFetch: typeof fetch = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          }, 50);
        })
    );

    const provider = new JarvisGemmaProvider({
      apiKey: 'test-key',
      timeoutMs: 20,
      fetchFn: mockFetch,
    });

    const res = await provider.triage({ text: 'Test text' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('timeout');
    }
  });

  it('handles empty choices array as invalid_output', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    } as unknown as Response);

    const provider = new JarvisGemmaProvider({ apiKey: 'test-key', fetchFn: mockFetch });
    const res = await provider.triage({ text: 'Some text' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('invalid_output');
    }
  });

  it('handles schema validation failure as invalid_output', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"category": "alien_invasion"}' } }],
      }),
    } as unknown as Response);

    const provider = new JarvisGemmaProvider({ apiKey: 'test-key', fetchFn: mockFetch });
    const res = await provider.triage({ text: 'Some text' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('invalid_output');
    }
  });

  it('supports external abort signal', async () => {
    const mockFetch: typeof fetch = vi.fn().mockImplementation(
      (_url, init) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        })
    );

    const controller = new AbortController();
    const provider = new JarvisGemmaProvider({ apiKey: 'test-key', fetchFn: mockFetch });
    const promise = provider.triage({ text: 'Test' }, { signal: controller.signal });
    controller.abort();
    const res = await promise;
    expect(res.ok).toBe(false);
  });
});
