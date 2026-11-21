import { describe, it, expect } from 'vitest';
import {
  haversineMeters,
  isWithinMeters,
  findSensitiveSitesNearby,
  type GeoPoint,
  type SensitiveSite,
} from '../../../src/domain/geo.js';

describe('Geo utilities (haversineMeters, isWithinMeters, findSensitiveSitesNearby)', () => {
  const mgRoad: GeoPoint = Object.freeze({ lat: 12.9716, lng: 77.5946 });
  const brigadeRoad: GeoPoint = Object.freeze({ lat: 12.973, lng: 77.607 }); // ~1.36 km away
  const adjacentPoint: GeoPoint = Object.freeze({ lat: 12.9718, lng: 77.5948 }); // ~30 meters away

  it('returns 0 for identical coordinates', () => {
    expect(haversineMeters(mgRoad, mgRoad)).toBe(0);
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
  });

  it('calculates accurate distance between known coordinates', () => {
    const dist = haversineMeters(mgRoad, brigadeRoad);
    expect(dist).toBeGreaterThan(1300);
    expect(dist).toBeLessThan(1450);
  });

  it('is symmetric: haversine(A, B) === haversine(B, A)', () => {
    const distAB = haversineMeters(mgRoad, brigadeRoad);
    const distBA = haversineMeters(brigadeRoad, mgRoad);
    expect(Math.abs(distAB - distBA)).toBeLessThan(0.0001);
  });

  it('correctly checks isWithinMeters', () => {
    expect(isWithinMeters(mgRoad, adjacentPoint, 50)).toBe(true);
    expect(isWithinMeters(mgRoad, adjacentPoint, 10)).toBe(false);
    expect(isWithinMeters(mgRoad, brigadeRoad, 1000)).toBe(false);
    expect(isWithinMeters(mgRoad, brigadeRoad, 2000)).toBe(true);
  });

  it('finds sensitive sites within radius', () => {
    const sites: readonly SensitiveSite[] = Object.freeze([
      {
        id: 'site-1',
        type: 'school',
        name: 'St. Joseph School',
        lat: 12.9718,
        lng: 77.5948, // ~30m
      },
      {
        id: 'site-2',
        type: 'hospital',
        name: 'Bowring Hospital',
        lat: 12.982,
        lng: 77.605, // ~1.6km
      },
    ]);

    const nearby = findSensitiveSitesNearby(mgRoad, sites, 200);
    expect(nearby).toHaveLength(1);
    expect(nearby[0]?.name).toBe('St. Joseph School');

    const wider = findSensitiveSitesNearby(mgRoad, sites, 2000);
    expect(wider).toHaveLength(2);

    const none = findSensitiveSitesNearby(mgRoad, sites, 10);
    expect(none).toHaveLength(0);
  });
});
