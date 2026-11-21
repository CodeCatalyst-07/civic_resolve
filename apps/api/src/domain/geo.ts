/**
 * Geographic coordinates point.
 */
export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

/**
 * Injected sensitive infrastructure landmark (schools, hospitals).
 */
export interface SensitiveSite extends GeoPoint {
  readonly id: string;
  readonly type: 'school' | 'hospital';
  readonly name: string;
}

const EARTH_RADIUS_METERS = 6371000;

/**
 * Computes the great-circle distance between two geographic coordinates using the Haversine formula.
 * Pure mathematical function with zero dependencies.
 *
 * @param a - First coordinate point
 * @param b - Second coordinate point
 * @returns Distance in meters
 */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  if (a.lat === b.lat && a.lng === b.lng) {
    return 0;
  }

  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLng = Math.sin(dLng / 2);

  const chordLengthSq =
    sinHalfDLat * sinHalfDLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLng * sinHalfDLng;

  // Protect against floating point imprecision exceeding 1
  const angularDistance = 2 * Math.atan2(Math.sqrt(chordLengthSq), Math.sqrt(Math.max(0, 1 - chordLengthSq)));

  return EARTH_RADIUS_METERS * angularDistance;
}

/**
 * Determines whether two geographic points are within a specified distance in meters.
 *
 * @param a - First coordinate point
 * @param b - Second coordinate point
 * @param meters - Maximum distance threshold in meters
 * @returns True if distance is less than or equal to meters
 */
export function isWithinMeters(a: GeoPoint, b: GeoPoint, meters: number): boolean {
  return haversineMeters(a, b) <= meters;
}

/**
 * Filters a list of sensitive sites (schools, hospitals) within a given radius of a complaint location.
 *
 * @param point - The complaint location coordinate
 * @param sites - Injected list of sensitive landmarks
 * @param radiusMeters - Proximity radius in meters
 * @returns Array of sensitive sites situated within the radius
 */
export function findSensitiveSitesNearby(
  point: GeoPoint,
  sites: readonly SensitiveSite[],
  radiusMeters: number
): SensitiveSite[] {
  return sites.filter((site) => isWithinMeters(point, site, radiusMeters));
}
