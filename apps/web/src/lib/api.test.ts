import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchApi, ApiClientError } from './api.js';

describe('fetchApi client wrapper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches successfully and returns json', async () => {
    const mockData = { status: 'ok', service: 'civicresolve' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchApi('/health');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
  });

  it('throws ApiClientError on non-2xx status code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'Not Found', message: 'Resource not found' }),
    });

    await expect(fetchApi('/unknown')).rejects.toThrow(ApiClientError);
    await expect(fetchApi('/unknown')).rejects.toThrow('Resource not found');
  });

  it('handles non-JSON error response gracefully without failing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    await expect(fetchApi('/broken')).rejects.toThrow(ApiClientError);
  });
});
