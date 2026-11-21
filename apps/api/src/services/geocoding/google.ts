import { type Result, ok, err } from '@civicresolve/shared';
import type { GeocodingProvider, GeocodingResult, GeoError } from './types.js';

export interface GoogleGeocodingOptions {
  readonly apiKey: string;
  readonly timeoutMs?: number;
  readonly fetchFn?: typeof fetch;
}

/**
 * Geographic bounding box defining mainland India.
 */
export const INDIA_BOUNDING_BOX = Object.freeze({
  minLat: 6.0,
  maxLat: 38.0,
  minLng: 68.0,
  maxLng: 98.0,
});

/**
 * Validates whether latitude and longitude lie within mainland India.
 */
export function isWithinIndiaBounds(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BOUNDING_BOX.minLat &&
    lat <= INDIA_BOUNDING_BOX.maxLat &&
    lng >= INDIA_BOUNDING_BOX.minLng &&
    lng <= INDIA_BOUNDING_BOX.maxLng
  );
}

/**
 * Production Geocoding provider communicating with the Google Maps Geocoding REST API.
 */
export class GoogleGeocodingProvider implements GeocodingProvider {
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly cache = new Map<string, GeocodingResult>();

  public constructor(options: GoogleGeocodingOptions) {
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async geocode(
    address: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<GeocodingResult, GeoError>> {
    const trimmed = address.trim();
    if (!trimmed) {
      return err({
        kind: 'not_found',
        message: 'Empty address provided for geocoding',
      });
    }

    const normalizedKey = trimmed.toLowerCase();
    const cached = this.cache.get(normalizedKey);
    if (cached) {
      return ok(cached);
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      trimmed
    )}&region=in&key=${this.apiKey}`;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    if (options?.signal) {
      options.signal.addEventListener('abort', () => abortController.abort(), { once: true });
    }

    try {
      const response = await this.fetchFn(url, {
        method: 'GET',
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          return err({
            kind: 'rate_limited',
            message: 'Google Maps Geocoding rate limit exceeded',
          });
        }
        return err({
          kind: 'unavailable',
          message: `Google Maps Geocoding service error (HTTP ${response.status})`,
        });
      }

      const data = (await response.json()) as {
        status?: string;
        error_message?: string;
        results?: Array<{
          formatted_address: string;
          geometry: {
            location: {
              lat: number;
              lng: number;
            };
          };
        }>;
      };

      const status = data.status;

      if (status === 'ZERO_RESULTS') {
        return err({
          kind: 'not_found',
          message: `No geocoding matches found for address: "${trimmed}"`,
        });
      }

      if (status === 'OVER_QUERY_LIMIT') {
        return err({
          kind: 'rate_limited',
          message: 'Google Maps API query limit exceeded',
        });
      }

      if (status === 'REQUEST_DENIED') {
        return err({
          kind: 'not_configured',
          message: 'Google Maps API request denied: invalid server key or unauthorized referrer',
        });
      }

      if (status === 'INVALID_REQUEST') {
        return err({
          kind: 'not_found',
          message: 'Invalid geocoding request parameters',
        });
      }

      if (status !== 'OK' || !data.results || data.results.length === 0) {
        return err({
          kind: 'unavailable',
          message: `Google Maps Geocoding API returned status ${status || 'UNKNOWN'}`,
        });
      }

      const firstResult = data.results[0];
      if (!firstResult) {
        return err({ kind: 'not_found', message: 'No result candidates returned' });
      }

      const { lat, lng } = firstResult.geometry.location;
      const formatted_address = firstResult.formatted_address;

      if (!isWithinIndiaBounds(lat, lng)) {
        return err({
          kind: 'out_of_bounds',
          message: `Geocoded coordinates (${lat}, ${lng}) fall outside India geographic bounds`,
        });
      }

      const result: GeocodingResult = {
        lat,
        lng,
        formatted_address,
      };

      // Store in memory cache
      this.cache.set(normalizedKey, result);

      return ok(result);
    } catch {
      if (abortController.signal.aborted) {
        return err({
          kind: 'timeout',
          message: `Google Maps Geocoding request timed out after ${this.timeoutMs}ms`,
        });
      }

      return err({
        kind: 'unavailable',
        message: 'Network error communicating with Google Maps Geocoding API',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
