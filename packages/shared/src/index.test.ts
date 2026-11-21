import { describe, it, expect } from 'vitest';
import {
  createReportInputSchema,
  stripControlCharacters,
  Category,
  Urgency,
  Status,
  Role,
  CATEGORIES,
  URGENCIES,
  STATUSES,
  ROLES,
  categorySchema,
} from './index.js';

describe('stripControlCharacters', () => {
  it('strips null bytes, bell, and escape codes while preserving newlines and tabs', () => {
    const raw = 'Hello\x00 World!\x07 New\nLine\tand\rReturn\x1b';
    const cleaned = stripControlCharacters(raw);
    expect(cleaned).toBe('Hello World! New\nLine\tand\rReturn');
  });
});

describe('createReportInputSchema', () => {
  it('accepts a valid complaint description and location', () => {
    const input = {
      description: 'Massive pothole near the central bus station causing severe traffic jams.',
      location: {
        ward: 'Ward 12',
        lat: 12.9716,
        lng: 77.5946,
        address: '123 MG Road, Bengaluru',
      },
    };

    const parsed = createReportInputSchema.parse(input);
    expect(parsed.description).toBe(
      'Massive pothole near the central bus station causing severe traffic jams.'
    );
    expect(parsed.location?.ward).toBe('Ward 12');
    expect(parsed.location?.lat).toBe(12.9716);
    expect(parsed.location?.lng).toBe(77.5946);
    expect(parsed.location?.address).toBe('123 MG Road, Bengaluru');
  });

  it('accepts a valid complaint without optional location', () => {
    const input = {
      description: 'Garbage dump overflowing into the pedestrian footpath since two days.',
    };

    const parsed = createReportInputSchema.parse(input);
    expect(parsed.description).toBe(
      'Garbage dump overflowing into the pedestrian footpath since two days.'
    );
    expect(parsed.location).toBeUndefined();
  });

  it('rejects description shorter than 10 characters', () => {
    const input = {
      description: 'Too short',
    };

    expect(() => createReportInputSchema.parse(input)).toThrow(/at least 10 characters/);
  });

  it('rejects description that becomes shorter than 10 characters after trimming', () => {
    const input = {
      description: '   abc   ',
    };

    expect(() => createReportInputSchema.parse(input)).toThrow(/at least 10 characters/);
  });

  it('rejects description longer than 1000 characters', () => {
    const input = {
      description: 'a'.repeat(1001),
    };

    expect(() => createReportInputSchema.parse(input)).toThrow(/not exceed 1000 characters/);
  });

  it('strips control characters during validation', () => {
    const input = {
      description: 'Dangerous\x00 pothole\x07 on \x1Bthe road causing accidents',
    };

    const parsed = createReportInputSchema.parse(input);
    expect(parsed.description).toBe('Dangerous pothole on the road causing accidents');
  });

  it('rejects invalid coordinates in location', () => {
    const invalidLat = {
      description: 'Streetlight not working on 5th Avenue',
      location: { lat: 95 },
    };
    expect(() => createReportInputSchema.parse(invalidLat)).toThrow(/Latitude must be between -90 and 90/);

    const invalidLng = {
      description: 'Streetlight not working on 5th Avenue',
      location: { lng: 190 },
    };
    expect(() => createReportInputSchema.parse(invalidLng)).toThrow(/Longitude must be between -180 and 180/);
  });

  it('rejects address longer than 200 characters', () => {
    const input = {
      description: 'Broken water pipe flooding the whole street.',
      location: {
        address: 'X'.repeat(201),
      },
    };
    expect(() => createReportInputSchema.parse(input)).toThrow(/Address cannot exceed 200 characters/);
  });
});

describe('Taxonomy Enums', () => {
  it('exports all expected Category values', () => {
    expect(CATEGORIES).toContain(Category.POTHOLE);
    expect(CATEGORIES).toContain(Category.GARBAGE);
    expect(CATEGORIES).toContain(Category.STREETLIGHT);
    expect(CATEGORIES).toContain(Category.WATER_LEAKAGE);
    expect(CATEGORIES).toContain(Category.SEWER_OVERFLOW);
    expect(CATEGORIES).toContain(Category.FALLEN_TREE);
    expect(CATEGORIES).toContain(Category.PUBLIC_HAZARD);
    expect(CATEGORIES).toContain(Category.OTHER_CIVIC);
    expect(CATEGORIES).toContain(Category.NOT_CIVIC);
    expect(CATEGORIES).toHaveLength(9);
  });

  it('exports all expected Urgency values', () => {
    expect(URGENCIES).toEqual([Urgency.LOW, Urgency.MEDIUM, Urgency.HIGH, Urgency.CRITICAL]);
  });

  it('exports all expected Status values', () => {
    expect(STATUSES).toEqual([
      Status.SUBMITTED,
      Status.UNDER_REVIEW,
      Status.ASSIGNED,
      Status.IN_PROGRESS,
      Status.RESOLVED,
      Status.CLOSED,
      Status.REJECTED,
      Status.REOPENED,
    ]);
  });

  it('exports all expected Role values', () => {
    expect(ROLES).toEqual([Role.CITIZEN, Role.AUTHORITY]);
  });

  it('validates categories using categorySchema', () => {
    expect(categorySchema.parse('pothole')).toBe(Category.POTHOLE);
    expect(() => categorySchema.parse('invalid_category')).toThrow();
  });
});
