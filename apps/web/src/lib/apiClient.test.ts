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
      resolved_last_7_days: 12,
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

  it('throws service_unavailable when server returns non-JSON error like HTML 502/503/504', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => '<html><body>503 Service Unavailable</body></html>',
    });

    try {
      await client.getStats();
      expect.unreachable('Should have thrown ApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const apiErr = e as ApiError;
      expect(apiErr.code).toBe('service_unavailable');
      expect(apiErr.status).toBe(503);
      expect(apiErr.message).toContain('starting up or temporarily unreachable');
    }
  });

  it('throws parse_error when successful response has invalid JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'Not JSON at all',
    });

    try {
      await client.getStats();
      expect.unreachable('Should have thrown ApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const apiErr = e as ApiError;
      expect(apiErr.code).toBe('parse_error');
      expect(apiErr.status).toBe(200);
      expect(apiErr.message).toContain('Invalid JSON response');
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

  it('fetches system metadata and validates schema', async () => {
    const metaPayload = {
      categories: ['pothole', 'garbage'],
      urgencies: ['low', 'medium', 'high', 'critical'],
      statuses: ['submitted', 'in_progress', 'resolved'],
      roles: ['citizen', 'authority'],
      departments: [
        { id: 'roads', displayName: 'Roads & Infrastructure', localAuthority: 'BBMP' },
      ],
      slaHours: { low: 168, medium: 96, high: 48, critical: 24 },
      status_transitions: {
        submitted: ['under_review', 'rejected'],
        under_review: ['assigned', 'rejected'],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: metaPayload }),
    });

    const meta = await client.getMeta();
    expect(meta.categories).toContain('pothole');
    expect(meta.status_transitions.submitted).toContain('under_review');
  });
});
