import { type Result, err } from '@civicresolve/shared';
import type { GeocodingProvider, GeocodingResult, GeoError } from './types.js';

/**
 * Null Object Geocoding provider used when GOOGLE_MAPS_SERVER_KEY is unconfigured.
 * Allows CivicResolve to run completely offline without Google Maps.
 */
export class NullGeocodingProvider implements GeocodingProvider {
  public async geocode(
    _address: string,
    _options?: { signal?: AbortSignal }
  ): Promise<Result<GeocodingResult, GeoError>> {
    return err({
      kind: 'not_configured',
      message: 'Google Maps Server Key is not configured',
    });
  }
}
