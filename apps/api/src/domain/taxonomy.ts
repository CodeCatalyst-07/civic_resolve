import { Department, type Category } from '@civicresolve/shared';

/**
 * Indian municipal division mappings for domain reference:
 * - roads: PWD / Public Works Division / Engineering Ward Wing
 * - sanitation: Solid Waste Management (SWM) / Health & Sanitation Department
 * - public_lighting: Electrical & Public Street Lighting Wing (e.g. BESCOM/BEST/TNEB coordination)
 * - water_sewerage: Water Supply and Sewerage Board (e.g. DJB, BWSSB, MWSSB, Jal Nigam)
 * - parks_horticulture: Horticulture & Tree Authority Department
 * - public_health_safety: Public Health, Disaster Management & Fire Safety Cell
 * - ward_office: Local Assistant Revenue Officer (ARO) / Ward Nodal Office
 */
export const DEPARTMENT_METADATA: Readonly<
  Record<Department, { displayName: string; indianEquivalent: string }>
> = Object.freeze({
  [Department.ROADS]: Object.freeze({
    displayName: 'Roads & Infrastructure',
    indianEquivalent: 'Public Works Division (PWD) / Roads Department',
  }),
  [Department.SANITATION]: Object.freeze({
    displayName: 'Sanitation & Waste Management',
    indianEquivalent: 'Solid Waste Management (SWM) / Health Inspector Wing',
  }),
  [Department.PUBLIC_LIGHTING]: Object.freeze({
    displayName: 'Public Street Lighting',
    indianEquivalent: 'Electrical Engineering & Streetlight Wing',
  }),
  [Department.WATER_SEWERAGE]: Object.freeze({
    displayName: 'Water & Sewerage',
    indianEquivalent: 'Jal Board / Water Supply and Sewerage Board (BWSSB/DJB)',
  }),
  [Department.PARKS_HORTICULTURE]: Object.freeze({
    displayName: 'Parks & Horticulture',
    indianEquivalent: 'Tree Authority & Horticulture Department',
  }),
  [Department.PUBLIC_HEALTH_SAFETY]: Object.freeze({
    displayName: 'Public Health & Safety',
    indianEquivalent: 'Disaster Management & Public Hazard Cell',
  }),
  [Department.WARD_OFFICE]: Object.freeze({
    displayName: 'Local Ward Office',
    indianEquivalent: 'Ward Nodal Office / Assistant Revenue Officer (ARO)',
  }),
});

/**
 * Deterministic category-to-department routing matrix.
 * The AI model NEVER chooses the municipal department; dispatching is 100% deterministic.
 *
 * @param category - Civic grievance category
 * @param ward - Optional ward identifier
 * @param wardOverrides - Optional map of ward-specific department overrides
 * @returns Department responsible for resolution, or null if non-civic
 */
export function resolveDepartment(
  category: Category,
  ward?: string,
  wardOverrides?: Readonly<Record<string, Department>>
): Department | null {
  if (category === 'not_civic') {
    return null;
  }

  // Check if an injected ward-specific routing override exists
  if (ward && wardOverrides && ward in wardOverrides) {
    const override = wardOverrides[ward];
    if (override) {
      return override;
    }
  }

  // Standard category to department routing table
  switch (category) {
    case 'pothole':
      return Department.ROADS;
    case 'garbage':
      return Department.SANITATION;
    case 'streetlight':
      return Department.PUBLIC_LIGHTING;
    case 'water_leakage':
    case 'sewer_overflow':
      return Department.WATER_SEWERAGE;
    case 'fallen_tree':
      return Department.PARKS_HORTICULTURE;
    case 'public_hazard':
      return Department.PUBLIC_HEALTH_SAFETY;
    case 'other_civic':
      return Department.WARD_OFFICE;
    default: {
      const _exhaustiveCheck: never = category;
      return _exhaustiveCheck;
    }
  }
}
