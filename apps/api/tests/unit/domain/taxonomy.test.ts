import { describe, it, expect } from 'vitest';
import { resolveDepartment, DEPARTMENT_METADATA } from '../../../src/domain/taxonomy.js';
import { Department, Category } from '@civicresolve/shared';

describe('Taxonomy & Department Resolution', () => {
  const table: { category: Category; expected: Department | null }[] = [
    { category: 'pothole', expected: Department.ROADS },
    { category: 'garbage', expected: Department.SANITATION },
    { category: 'streetlight', expected: Department.PUBLIC_LIGHTING },
    { category: 'water_leakage', expected: Department.WATER_SEWERAGE },
    { category: 'sewer_overflow', expected: Department.WATER_SEWERAGE },
    { category: 'fallen_tree', expected: Department.PARKS_HORTICULTURE },
    { category: 'public_hazard', expected: Department.PUBLIC_HEALTH_SAFETY },
    { category: 'other_civic', expected: Department.WARD_OFFICE },
    { category: 'not_civic', expected: null },
  ];

  for (const { category, expected } of table) {
    it(`resolves category "${category}" to department "${expected}"`, () => {
      expect(resolveDepartment(category)).toBe(expected);
    });
  }

  it('honors ward-specific department overrides when injected', () => {
    const wardOverrides = Object.freeze({
      'Ward-101': Department.WARD_OFFICE,
      'Ward-Special': Department.PUBLIC_HEALTH_SAFETY,
    });

    // pothole normally goes to ROADS, but Ward-101 override routes to WARD_OFFICE
    expect(resolveDepartment(Category.POTHOLE, 'Ward-101', wardOverrides)).toBe(
      Department.WARD_OFFICE
    );

    // Unmatched ward falls back to standard routing
    expect(resolveDepartment(Category.POTHOLE, 'Ward-99', wardOverrides)).toBe(Department.ROADS);
  });

  it('contains Indian municipal equivalents for all departments', () => {
    for (const dept of Object.values(Department)) {
      const meta = DEPARTMENT_METADATA[dept];
      expect(meta).toBeDefined();
      expect(meta.displayName.length).toBeGreaterThan(0);
      expect(meta.indianEquivalent.length).toBeGreaterThan(0);
    }
  });
});
