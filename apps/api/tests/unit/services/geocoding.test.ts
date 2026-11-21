import { describe, it, expect, vi } from 'vitest';
import {
  GoogleGeocodingProvider,
  NullGeocodingProvider,
  createGeocodingProvider,
} from '../../../src/services/geocoding/index.js';
import { loadConfig } from '../../../src/config.js';

describe('Server-side Geocoding with Graceful Degradation (geocoding/)', () => {
  it('successfully geocodes valid address inside India bounds', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OK',
        results: [
          {
            formatted_address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038, India',
            geometry: {
              location: {
                lat: 12.9716,
                lng: 77.6412,
              },
            },
          },
        ],
      }),
    } as unknown as Response);

    const provider = new GoogleGeocodingProvider({
      apiKey: 'test-server-maps-key',
      fetchFn: mockFetch,
    });

    const res = await provider.geocode('100ft road indiranagar');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.lat).toBe(12.9716);
      expect(res.value.lng).toBe(77.6412);
      expect(res.value.formatted_address).toContain('Indiranagar');
    }

    // Repeated call uses cache without second fetch
    await provider.geocode('100ft road indiranagar');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects coordinates outside India bounding box as out_of_bounds', async () => {
    // London coordinates
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OK',
        results: [
          {
            formatted_address: 'Trafalgar Square, London WC2N 5DN, UK',
            geometry: {
              location: {
                lat: 51.508,
                lng: -0.128,
              },
            },
          },
        ],
      }),
    } as unknown as Response);

    const provider = new GoogleGeocodingProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    const res = await provider.geocode('Trafalgar Square');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('out_of_bounds');
      expect(res.error.message).toContain('outside India');
    }
  });

  it('maps ZERO_RESULTS to not_found', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ZERO_RESULTS',
        results: [],
      }),
    } as unknown as Response);

    const provider = new GoogleGeocodingProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    const res = await provider.geocode('RandomNonExistentPlaceXYZ123');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('not_found');
    }
  });

  it('maps OVER_QUERY_LIMIT to rate_limited', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OVER_QUERY_LIMIT',
      }),
    } as unknown as Response);

    const provider = new GoogleGeocodingProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    const res = await provider.geocode('MG Road');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('rate_limited');
    }
  });

  it('rejects empty address with not_found', async () => {
    const provider = new GoogleGeocodingProvider({ apiKey: 'test-key' });
    const res = await provider.geocode('   ');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('not_found');
    }
  });

  it('handles REQUEST_DENIED as not_configured', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'REQUEST_DENIED' }),
    } as unknown as Response);

    const provider = new GoogleGeocodingProvider({ apiKey: 'test-key', fetchFn: mockFetch });
    const res = await provider.geocode('MG Road');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('not_configured');
    }
  });

  it('handles INVALID_REQUEST and UNKNOWN status', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'INVALID_REQUEST' }),
    } as unknown as Response);

    const provider = new GoogleGeocodingProvider({ apiKey: 'test-key', fetchFn: mockFetch });
    const res = await provider.geocode('MG Road');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('not_found');
    }

    const mockFetchUnknown: typeof fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'SERVER_EXPLODED' }),
    } as unknown as Response);

    const providerUnknown = new GoogleGeocodingProvider({ apiKey: 'test-key', fetchFn: mockFetchUnknown });
    const resUnknown = await providerUnknown.geocode('MG Road');
    expect(resUnknown.ok).toBe(false);
    if (!resUnknown.ok) {
      expect(resUnknown.error.kind).toBe('unavailable');
    }
  });

  it('handles HTTP error statuses and timeouts', async () => {
    const mockFetch429: typeof fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as unknown as Response);

    const provider429 = new GoogleGeocodingProvider({ apiKey: 'test-key', fetchFn: mockFetch429 });
    const res429 = await provider429.geocode('MG Road');
    expect(res429.ok).toBe(false);
    if (!res429.ok) {
      expect(res429.error.kind).toBe('rate_limited');
    }

    const mockFetch500: typeof fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const provider500 = new GoogleGeocodingProvider({ apiKey: 'test-key', fetchFn: mockFetch500 });
    const res500 = await provider500.geocode('MG Road');
    expect(res500.ok).toBe(false);
    if (!res500.ok) {
      expect(res500.error.kind).toBe('unavailable');
    }

    const mockFetchTimeout: typeof fetch = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          }, 40);
        })
    );

    const providerTimeout = new GoogleGeocodingProvider({
      apiKey: 'test-key',
      timeoutMs: 15,
      fetchFn: mockFetchTimeout,
    });
    const resTimeout = await providerTimeout.geocode('MG Road');
    expect(resTimeout.ok).toBe(false);
    if (!resTimeout.ok) {
      expect(resTimeout.error.kind).toBe('timeout');
    }
  });

  it('NullGeocodingProvider returns not_configured', async () => {
    const nullProvider = new NullGeocodingProvider();
    const res = await nullProvider.geocode('Anywhere');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('not_configured');
    }
  });

  it('createGeocodingProvider selects NullGeocodingProvider when key is not set', () => {
    const config = loadConfig({});
    const provider = createGeocodingProvider(config);
    expect(provider).toBeInstanceOf(NullGeocodingProvider);
  });

  it('createGeocodingProvider selects GoogleGeocodingProvider when key is present', () => {
    const config = loadConfig({ GOOGLE_MAPS_SERVER_KEY: 'test-maps-key' });
    const provider = createGeocodingProvider(config);
    expect(provider).toBeInstanceOf(GoogleGeocodingProvider);
  });
});
