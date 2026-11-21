import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchApiClient, ApiError } from './apiClient.js';

describe('FetchApiClient', () => {
  const mockFetch = vi.fn();
  let client: FetchApiClient;

  beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as { fetch: unknown }).fetch = mockFetch;
    client = new FetchApiClient({
      baseUrl: 'http://localhost:3000',
      getAuthHeaders: () => ({
        'X-Demo-Role': 'citizen',
      }),
    });
  });

  it('fetches system stats and validates response schema', async () => {
    const statsPayload = {
      open: 10,
      resolved: 25,
      critical_open: 1,
      overdue: 0,
      median_resolution_hours: 24,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: statsPayload }),
    });

    const stats = await client.getStats();
    expect(stats.open).toBe(10);
    expect(stats.median_resolution_hours).toBe(24);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/stats',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
  });

  it('throws ApiError with status and code when API returns 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({
        error: {
          code: 'not_found',
          message: 'Ticket with ID "CR-12345678" not found',
        },
      }),
    });

    try {
      await client.getTicket('CR-12345678');
      expect.unreachable('Should have thrown ApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const apiErr = e as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe('not_found');
      expect(apiErr.message).toContain('Ticket with ID');
    }
  });

  it('throws ApiError when response violates Zod schema', async () => {
    // Malformed stats (missing fields)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { open: 'not-a-number' } }),
    });

    try {
      await client.getStats();
      expect.unreachable('Should have thrown ApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const apiErr = e as ApiError;
      expect(apiErr.code).toBe('schema_validation_failed');
      expect(apiErr.status).toBe(500);
    }
  });

  it('injects authority headers when authority role is configured', async () => {
    const authClient = new FetchApiClient({
      baseUrl: 'http://localhost:3000',
      getAuthHeaders: () => ({
        'X-Demo-Role': 'authority',
        'X-Demo-Authority-Code': 'secret-authority-pass-99',
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });

    await authClient.getWards();

    const callHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(callHeaders.get('X-Demo-Role')).toBe('authority');
    expect(callHeaders.get('X-Demo-Authority-Code')).toBe('secret-authority-pass-99');
  });
});
