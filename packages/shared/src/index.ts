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

/**
 * Municipal departments responsible for resolving civic grievances.
 */
export const Department = {
  ROADS: 'roads',
  SANITATION: 'sanitation',
  PUBLIC_LIGHTING: 'public_lighting',
  WATER_SEWERAGE: 'water_sewerage',
  PARKS_HORTICULTURE: 'parks_horticulture',
  PUBLIC_HEALTH_SAFETY: 'public_health_safety',
  WARD_OFFICE: 'ward_office',
} as const;

export type Department = (typeof Department)[keyof typeof Department];
export const DEPARTMENTS = Object.values(Department) as [Department, ...Department[]];

// Zod schemas for enums
export const categorySchema = z.enum(CATEGORIES);
export const urgencySchema = z.enum(URGENCIES);
export const statusSchema = z.enum(STATUSES);
export const roleSchema = z.enum(ROLES);
export const departmentSchema = z.enum(DEPARTMENTS);

/**
 * Provenance of AI triage analysis for truthful attribution.
 */
export const AiSource = {
  JARVIS_GEMMA: 'jarvis_gemma',
  GEMINI: 'gemini',
  MOCK: 'mock',
  KEYWORD_FALLBACK: 'keyword_fallback',
} as const;

export type AiSource = (typeof AiSource)[keyof typeof AiSource];
export const AI_SOURCES = Object.values(AiSource) as [AiSource, ...AiSource[]];
export const aiSourceSchema = z.enum(AI_SOURCES);

/**
 * Missing information categories that prompt follow-up questions.
 */
export const MISSING_INFO_FIELDS = ['location', 'issue_type', 'severity', 'landmark'] as const;
export type MissingInfoField = (typeof MISSING_INFO_FIELDS)[number];
export const missingInfoFieldSchema = z.enum(MISSING_INFO_FIELDS);

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

/**
 * AI Triage Suggestion schema returned by the AI provider layer.
 */
export const triageSuggestionSchema = z.object({
  is_civic_issue: z.boolean(),
  category: categorySchema,
  urgency: urgencySchema,
  safety_critical: z.boolean(),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().max(160, 'Summary cannot exceed 160 characters'),
  reasons: z.array(z.string().trim().max(140, 'Reason cannot exceed 140 characters')).min(1).max(4),
  missing_info: z.array(missingInfoFieldSchema).max(4),
});

export type TriageSuggestion = z.infer<typeof triageSuggestionSchema>;

/**
 * A deterministic rule applied during triage.
 */
export const appliedRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  effect: z.string(),
});

export type AppliedRule = z.infer<typeof appliedRuleSchema>;

/**
 * Final triage decision combining AI suggestion and domain rules engine.
 */
export const finalDecisionSchema = z.object({
  urgency: urgencySchema,
  category: categorySchema,
  department: departmentSchema.nullable(),
  applied_rules: z.array(appliedRuleSchema),
  emergency_notice: z.boolean(),
  needs_manual_triage: z.boolean(),
  ai_suggestion: triageSuggestionSchema.nullable(),
  ai_source: aiSourceSchema.optional(),
});

export type FinalDecision = z.infer<typeof finalDecisionSchema>;

/**
 * Ticket event recording lifecycle transitions and audits.
 */
export const ticketEventSchema = z.object({
  id: z.string(),
  status: statusSchema,
  actor_role: roleSchema,
  note: z.string().optional(),
  at: z.string().datetime(),
});

export type TicketEvent = z.infer<typeof ticketEventSchema>;

/**
 * Ticket location details.
 */
export const ticketLocationSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().trim().max(200).optional(),
});

export type TicketLocation = z.infer<typeof ticketLocationSchema>;

/**
 * Canonical grievance ticket entity.
 */
export const ticketSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: categorySchema,
  urgency: urgencySchema,
  department: departmentSchema.nullable(),
  ward: z.string().optional(),
  location: ticketLocationSchema.optional(),
  status: statusSchema,
  events: z.array(ticketEventSchema),
  duplicate_of: z.string().optional(),
  duplicate_count: z.number().int().nonnegative(),
  reopen_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  due_at: z.string().datetime(),
  escalated: z.boolean(),
  final_decision: finalDecisionSchema,
  attachments: z.array(z.string()),
  version: z.number().int().positive().default(1),
});

export type Ticket = z.infer<typeof ticketSchema>;

/**
 * Public view DTO with explicit allowlist (never returns sensitive internals or raw model text).
 */
export const publicTicketViewSchema = z.object({
  id: z.string(),
  status: statusSchema,
  category: categorySchema,
  urgency: urgencySchema,
  department: z.string(),
  summary: z.string(),
  ward: z.string().optional(),
  created_at: z.string().datetime(),
  due_at: z.string().datetime(),
  overdue: z.boolean(),
  duplicate_count: z.number().int().nonnegative(),
  reasons: z.array(z.string()),
  applied_rules: z.array(appliedRuleSchema),
  timeline: z.array(
    z.object({
      id: z.string(),
      status: statusSchema,
      role: roleSchema,
      note: z.string().optional(),
      at: z.string().datetime(),
    })
  ),
  emergency_notice: z.boolean(),
});

export type PublicTicketView = z.infer<typeof publicTicketViewSchema>;

/**
 * Authority view DTO extending public view with internal investigation details and audit data.
 */
export const authorityTicketViewSchema = publicTicketViewSchema.extend({
  description: z.string(),
  location: ticketLocationSchema.optional(),
  ai_suggestion: triageSuggestionSchema.nullable(),
  ai_source: aiSourceSchema.optional(),
  needs_manual_triage: z.boolean(),
  escalated: z.boolean(),
  reopen_count: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});

export type AuthorityTicketView = z.infer<typeof authorityTicketViewSchema>;

/**
 * Request schema for pre-submission triage analysis.
 */
export const analyzeReportInputSchema = createReportInputSchema.extend({
  round: z.number().int().min(0).max(2).optional(),
});

export type AnalyzeReportInput = z.infer<typeof analyzeReportInputSchema>;

/**
 * Request schema for final ticket submission.
 */
export const submitReportInputSchema = createReportInputSchema.extend({
  category_override: categorySchema.optional(),
});

export type SubmitReportInput = z.infer<typeof submitReportInputSchema>;

/**
 * Request schema for status transitions.
 */
export const statusUpdateInputSchema = z.object({
  status: statusSchema,
  note: z.string().trim().max(500, 'Note cannot exceed 500 characters').optional(),
});

export type StatusUpdateInput = z.infer<typeof statusUpdateInputSchema>;

/**
 * Request schema for authority manual triage override.
 */
export const overrideInputSchema = z.object({
  category: categorySchema.optional(),
  urgency: urgencySchema.optional(),
  department: departmentSchema.optional(),
  reason: z
    .string()
    .trim()
    .min(5, 'Override reason must be at least 5 characters')
    .max(300, 'Override reason cannot exceed 300 characters'),
});

export type OverrideInput = z.infer<typeof overrideInputSchema>;

/**
 * Request schema for ticket search, filtering, and cursor pagination.
 */
export const ticketQuerySchema = z.object({
  status: statusSchema.optional(),
  category: categorySchema.optional(),
  ward: z.string().optional(),
  urgency: urgencySchema.optional(),
  overdue: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export type TicketQuery = z.infer<typeof ticketQuerySchema>;

/**
 * Standard API error codes.
 */
export const ApiErrorCode = {
  VALIDATION_FAILED: 'validation_failed',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  RATE_LIMITED: 'rate_limited',
  CONFLICT: 'conflict',
  AI_UNAVAILABLE: 'ai_unavailable',
  INTERNAL_ERROR: 'internal_error',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
export const API_ERROR_CODES = Object.values(ApiErrorCode) as [ApiErrorCode, ...ApiErrorCode[]];
export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);

/**
 * Standard API response envelope.
 */
export interface ApiSuccessEnvelope<T> {
  readonly data: T;
}

export interface ApiErrorEnvelope {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
  };
}

export type ApiResponseEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function apiSuccess<T>(data: T): ApiSuccessEnvelope<T> {
  return Object.freeze({ data });
}

export function apiError(code: ApiErrorCode, message: string): ApiErrorEnvelope {
  return Object.freeze({
    error: Object.freeze({
      code,
      message,
    }),
  });
}

/**
 * Functional Result pattern for expected failures without throwing.
 */
export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Construct a successful Result.
 */
export function ok<T>(value: T): Result<T, never> {
  return Object.freeze({ ok: true, value });
}

/**
 * Construct an error Result.
 */
export function err<E>(error: E): Result<never, E> {
  return Object.freeze({ ok: false, error });
}
