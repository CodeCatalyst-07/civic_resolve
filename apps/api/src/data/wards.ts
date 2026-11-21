// SYNTHETIC DEMO DATA: Fictional municipal wards for local evaluation and testing.
// These coordinates and ward names are synthetic demo representations of an Indian metropolitan zone.

import { z } from 'zod';

export interface WardLandmark {
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
}

export interface Ward {
  readonly id: string;
  readonly name: string;
  readonly number: number;
  readonly centerLat: number;
  readonly centerLng: number;
  readonly landmarks: readonly WardLandmark[];
}

export const wardLandmarkSchema = z.object({
  name: z.string().min(1),
  lat: z.number().min(6.0).max(38.0),
  lng: z.number().min(68.0).max(98.0),
});

export const wardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  number: z.number().int().positive(),
  centerLat: z.number().min(6.0).max(38.0),
  centerLng: z.number().min(68.0).max(98.0),
  landmarks: z.array(wardLandmarkSchema),
});

export const WARDS: readonly Ward[] = Object.freeze([
  {
    id: 'ward-01-indiranagar',
    name: 'Indiranagar Central',
    number: 1,
    centerLat: 12.9784,
    centerLng: 77.6408,
    landmarks: [
      { name: '100ft Road Signal', lat: 12.9716, lng: 77.6412 },
      { name: 'Defense Colony Metro', lat: 12.9792, lng: 77.6441 },
      { name: 'HAL 2nd Stage Park', lat: 12.9685, lng: 77.6398 },
    ],
  },
  {
    id: 'ward-02-koramangala',
    name: 'Koramangala 4th Block',
    number: 2,
    centerLat: 12.9345,
    centerLng: 77.6264,
    landmarks: [
      { name: 'Sony World Junction', lat: 12.9362, lng: 77.6278 },
      { name: 'Water Tank Circle', lat: 12.9328, lng: 77.6251 },
      { name: 'Regional Passport Office', lat: 12.9389, lng: 77.6305 },
    ],
  },
  {
    id: 'ward-03-malleshwaram',
    name: 'Malleshwaram Heritage',
    number: 3,
    centerLat: 13.0031,
    centerLng: 77.5703,
    landmarks: [
      { name: '8th Cross Market Circle', lat: 13.0042, lng: 77.5715 },
      { name: 'Kadu Malleshwara Temple', lat: 13.0078, lng: 77.5689 },
      { name: 'Margosa Road Junction', lat: 12.9995, lng: 77.5721 },
    ],
  },
  {
    id: 'ward-04-jayanagar',
    name: 'Jayanagar South',
    number: 4,
    centerLat: 12.9298,
    centerLng: 77.5841,
    landmarks: [
      { name: '4th Block Shopping Complex', lat: 12.9304, lng: 77.5852 },
      { name: 'Ashoka Pillar Junction', lat: 12.9412, lng: 77.5835 },
      { name: 'Madhavan Park', lat: 12.9351, lng: 77.5829 },
    ],
  },
  {
    id: 'ward-05-whitefield',
    name: 'Whitefield Tech Corridor',
    number: 5,
    centerLat: 12.9698,
    centerLng: 77.7499,
    landmarks: [
      { name: 'ITPL Main Gate', lat: 12.9863, lng: 77.7378 },
      { name: 'Hope Farm Circle', lat: 12.9839, lng: 77.7512 },
      { name: 'Vydehi Hospital Signal', lat: 12.9734, lng: 77.7289 },
    ],
  },
  {
    id: 'ward-06-rajajinagar',
    name: 'Rajajinagar Industrial',
    number: 6,
    centerLat: 12.9912,
    centerLng: 77.5543,
    landmarks: [
      { name: 'Dr. Rajkumar Road Signal', lat: 12.9945, lng: 77.5562 },
      { name: 'Navrang Theatre Circle', lat: 12.9978, lng: 77.5521 },
      { name: 'Esi Hospital Gate', lat: 12.9882, lng: 77.5539 },
    ],
  },
  {
    id: 'ward-07-shivajinagar',
    name: 'Shivajinagar Commercial',
    number: 7,
    centerLat: 12.9856,
    centerLng: 77.6054,
    landmarks: [
      { name: 'Russell Market Circle', lat: 12.9871, lng: 77.6062 },
      { name: 'Shivajinagar Bus Terminus', lat: 12.9842, lng: 77.6048 },
      { name: 'Commercial Street Entrance', lat: 12.9819, lng: 77.6085 },
    ],
  },
  {
    id: 'ward-08-basavanagudi',
    name: 'Basavanagudi Cultural',
    number: 8,
    centerLat: 12.9421,
    centerLng: 77.5752,
    landmarks: [
      { name: 'Bull Temple Circle', lat: 12.9415, lng: 77.5684 },
      { name: 'Gandhi Bazaar Circle', lat: 12.9468, lng: 77.5739 },
      { name: 'Netkallappa Circle', lat: 12.9389, lng: 77.5768 },
    ],
  },
]);
