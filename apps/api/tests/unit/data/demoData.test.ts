import { describe, it, expect } from 'vitest';
import { WARDS, wardSchema } from '../../../src/data/wards.js';
import { SENSITIVE_SITES, sensitiveSiteDataSchema } from '../../../src/data/sites.js';
import { isWithinIndiaBounds } from '../../../src/services/geocoding/google.js';

describe('Synthetic Demo Data Integrity (wards.ts & sites.ts)', () => {
  it('validates all 8 synthetic demo wards match schema and bounds', () => {
    expect(WARDS).toHaveLength(8);

    const ids = new Set<string>();
    const numbers = new Set<number>();

    for (const ward of WARDS) {
      expect(wardSchema.safeParse(ward).success).toBe(true);

      // Check unique identifiers
      expect(ids.has(ward.id)).toBe(false);
      ids.add(ward.id);

      expect(numbers.has(ward.number)).toBe(false);
      numbers.add(ward.number);

      // Coordinates within India bounds
      expect(isWithinIndiaBounds(ward.centerLat, ward.centerLng)).toBe(true);

      // Check landmarks
      expect(ward.landmarks.length).toBeGreaterThan(0);
      for (const lm of ward.landmarks) {
        expect(isWithinIndiaBounds(lm.lat, lm.lng)).toBe(true);
      }
    }
  });

  it('validates all 12 synthetic demo sensitive sites match schema and bounds', () => {
    expect(SENSITIVE_SITES).toHaveLength(12);

    const siteIds = new Set<string>();
    let schoolCount = 0;
    let hospitalCount = 0;

    for (const site of SENSITIVE_SITES) {
      expect(sensitiveSiteDataSchema.safeParse(site).success).toBe(true);

      expect(siteIds.has(site.id)).toBe(false);
      siteIds.add(site.id);

      expect(isWithinIndiaBounds(site.lat, site.lng)).toBe(true);

      if (site.type === 'school') schoolCount++;
      if (site.type === 'hospital') hospitalCount++;
    }

    expect(schoolCount).toBeGreaterThan(0);
    expect(hospitalCount).toBeGreaterThan(0);
  });
});
