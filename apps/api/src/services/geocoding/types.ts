import type { Result } from '@civicresolve/shared';

export type GeoErrorKind =
  | 'not_configured'
  | 'not_found'
  | 'out_of_bounds'
  | 'rate_limited'
  | 'unavailable'
  | 'timeout';

export interface GeoError {
  readonly kind: GeoErrorKind;
  readonly message: string;
}

export interface GeocodingResult {
  readonly lat: number;
  readonly lng: number;
  readonly formatted_address: string;
}

export interface GeocodingProvider {
  isAvailable?(): boolean;
  geocode(
    address: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<GeocodingResult, GeoError>>;
}
