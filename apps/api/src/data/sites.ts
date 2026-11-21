// SYNTHETIC DEMO DATA: Fictional sensitive sites for local evaluation and testing.
// Coordinates are realistic points placed near municipal ward landmarks to test safety proximity rules.

import { z } from 'zod';
import type { SensitiveSite } from '../domain/geo.js';

export const sensitiveSiteDataSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['school', 'hospital']),
  name: z.string().min(1),
  lat: z.number().min(6.0).max(38.0),
  lng: z.number().min(68.0).max(98.0),
});

export const SENSITIVE_SITES: readonly SensitiveSite[] = Object.freeze([
  // Ward 1 (Indiranagar)
  {
    id: 'site-01-national-public-school',
    type: 'school',
    name: 'National Public School Indiranagar',
    lat: 12.9718,
    lng: 77.6415, // ~35m from 100ft road signal
  },
  {
    id: 'site-02-chinmaya-mission-hospital',
    type: 'hospital',
    name: 'Chinmaya Mission Hospital Indiranagar',
    lat: 12.9789,
    lng: 77.6438,
  },
  // Ward 2 (Koramangala)
  {
    id: 'site-03-st-johns-medical-hospital',
    type: 'hospital',
    name: "St. John's Medical College Hospital",
    lat: 12.9348,
    lng: 77.6258,
  },
  {
    id: 'site-04-bethany-high-school',
    type: 'school',
    name: 'Bethany High School Koramangala',
    lat: 12.9368,
    lng: 77.6285,
  },
  // Ward 3 (Malleshwaram)
  {
    id: 'site-05-kc-general-hospital',
    type: 'hospital',
    name: 'KC General Hospital Malleshwaram',
    lat: 13.0038,
    lng: 77.5708,
  },
  {
    id: 'site-06-bhavan-vidya-mandir',
    type: 'school',
    name: "Bharatiya Vidya Bhavan High School",
    lat: 13.0075,
    lng: 77.5692,
  },
  // Ward 4 (Jayanagar)
  {
    id: 'site-07-jayanagar-general-hospital',
    type: 'hospital',
    name: 'Jayanagar General Hospital',
    lat: 12.9309,
    lng: 77.5849,
  },
  {
    id: 'site-08-sudharshan-vidya-school',
    type: 'school',
    name: 'Sudharshan Vidya Mandir School',
    lat: 12.9355,
    lng: 77.5832,
  },
  // Ward 5 (Whitefield)
  {
    id: 'site-09-vydehi-institute-hospital',
    type: 'hospital',
    name: 'Vydehi Super Specialty Hospital',
    lat: 12.9739,
    lng: 77.7294,
  },
  {
    id: 'site-10-whitefield-global-school',
    type: 'school',
    name: 'Whitefield Global School',
    lat: 12.9845,
    lng: 77.7508,
  },
  // Ward 6 (Rajajinagar)
  {
    id: 'site-11-esi-super-speciality-hospital',
    type: 'hospital',
    name: 'ESI Super Specialty Hospital',
    lat: 12.9885,
    lng: 77.5542,
  },
  // Ward 8 (Basavanagudi)
  {
    id: 'site-12-national-high-school',
    type: 'school',
    name: 'National High School Basavanagudi',
    lat: 12.9465,
    lng: 77.5742,
  },
]);
