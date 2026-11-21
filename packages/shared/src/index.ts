import { z } from 'zod';

/**
 * Strips non-printable ASCII control characters (C0 and C1 controls, except standard whitespace like tab, newline, and carriage return).
 *
 * @param input - The raw string to sanitize
 * @returns Cleaned string without control characters
 */
export function stripControlCharacters(input: string): string {
  // Retains \t (\x09), \n (\x0A), and \r (\x0D); strips all other control characters.
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}

/**
 * Civic grievance category taxonomy.
 */
export const Category = {
  POTHOLE: 'pothole',
  GARBAGE: 'garbage',
  STREETLIGHT: 'streetlight',
  WATER_LEAKAGE: 'water_leakage',
  SEWER_OVERFLOW: 'sewer_overflow',
  FALLEN_TREE: 'fallen_tree',
  PUBLIC_HAZARD: 'public_hazard',
  OTHER_CIVIC: 'other_civic',
  NOT_CIVIC: 'not_civic',
} as const;

export type Category = (typeof Category)[keyof typeof Category];
export const CATEGORIES = Object.values(Category) as [Category, ...Category[]];

/**
 * Grievance urgency levels.
 */
export const Urgency = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type Urgency = (typeof Urgency)[keyof typeof Urgency];
export const URGENCIES = Object.values(Urgency) as [Urgency, ...Urgency[]];

/**
 * Lifecycle status of civic grievances.
 */
export const Status = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REJECTED: 'rejected',
  REOPENED: 'reopened',
} as const;

export type Status = (typeof Status)[keyof typeof Status];
export const STATUSES = Object.values(Status) as [Status, ...Status[]];

/**
 * System roles in CivicResolve demo mode.
 */
export const Role = {
  CITIZEN: 'citizen',
  AUTHORITY: 'authority',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role) as [Role, ...Role[]];

// Zod schemas for enums
export const categorySchema = z.enum(CATEGORIES);
export const urgencySchema = z.enum(URGENCIES);
export const statusSchema = z.enum(STATUSES);
export const roleSchema = z.enum(ROLES);

/**
 * Location schema for civic reports.
 */
export const locationInputSchema = z.object({
  ward: z
    .string()
    .transform((val) => stripControlCharacters(val).trim())
    .pipe(z.string().max(100, 'Ward cannot exceed 100 characters'))
    .optional(),
  lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
  lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
  address: z
    .string()
    .transform((val) => stripControlCharacters(val).trim())
    .pipe(z.string().max(200, 'Address cannot exceed 200 characters'))
    .optional(),
});

export type LocationInput = z.infer<typeof locationInputSchema>;

/**
 * CreateReportInput schema validating citizen complaint submissions.
 */
export const createReportInputSchema = z.object({
  description: z
    .string({ required_error: 'Description is required' })
    .transform((val) => stripControlCharacters(val).trim())
    .pipe(
      z
        .string()
        .min(10, 'Description must be at least 10 characters')
        .max(1000, 'Description cannot exceed 1000 characters')
    ),
  location: locationInputSchema.optional(),
});

export type CreateReportInput = z.infer<typeof createReportInputSchema>;
