import type { Config } from '../../config.js';
import type { GeocodingProvider } from './types.js';
import { GoogleGeocodingProvider } from './google.js';
import { NullGeocodingProvider } from './null.js';

export interface GeocodingFactoryDeps {
  readonly fetchFn?: typeof fetch;
}

/**
 * Creates the appropriate GeocodingProvider based on server configuration.
 */
export function createGeocodingProvider(
  config: Config,
  deps: GeocodingFactoryDeps = {}
): GeocodingProvider {
  if (config.GOOGLE_MAPS_SERVER_KEY && config.GOOGLE_MAPS_SERVER_KEY.trim().length > 0) {
    return new GoogleGeocodingProvider({
      apiKey: config.GOOGLE_MAPS_SERVER_KEY,
      timeoutMs: config.GEOCODE_TIMEOUT_MS,
      fetchFn: deps.fetchFn,
    });
  }

  return new NullGeocodingProvider();
}
