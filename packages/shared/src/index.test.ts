import { describe, it, expect } from 'vitest';
import {
  createReportInputSchema,
  stripControlCharacters,
  Category,
  Urgency,
  Status,
  Role,
  Department,
  CATEGORIES,
  URGENCIES,
  STATUSES,
  ROLES,
  DEPARTMENTS,
  categorySchema,
  departmentSchema,
  AiSource,
  AI_SOURCES,
  aiSourceSchema,
  triageSuggestionSchema,
  appliedRuleSchema,
  finalDecisionSchema,
  ticketEventSchema,
  ticketSchema,
  publicTicketViewSchema,
  type PublicTicketView,
  authorityTicketViewSchema,
  type AuthorityTicketView,
  analyzeReportInputSchema,
  submitReportInputSchema,
  statusUpdateInputSchema,
  overrideInputSchema,
  ticketQuerySchema,
  ApiErrorCode,
  apiSuccess,
  apiError,
  ok,
  err,
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
    expect(CATEGORIES).toHaveLength(9);
    expect(CATEGORIES).toContain(Category.POTHOLE);
    expect(CATEGORIES).toContain(Category.GARBAGE);
    expect(CATEGORIES).toContain(Category.STREETLIGHT);
    expect(CATEGORIES).toContain(Category.WATER_LEAKAGE);
    expect(CATEGORIES).toContain(Category.SEWER_OVERFLOW);
    expect(CATEGORIES).toContain(Category.FALLEN_TREE);
    expect(CATEGORIES).toContain(Category.PUBLIC_HAZARD);
    expect(CATEGORIES).toContain(Category.OTHER_CIVIC);
    expect(CATEGORIES).toContain(Category.NOT_CIVIC);
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

  it('exports all expected Department values', () => {
    expect(DEPARTMENTS).toHaveLength(7);
    expect(DEPARTMENTS).toContain(Department.ROADS);
    expect(DEPARTMENTS).toContain(Department.SANITATION);
    expect(DEPARTMENTS).toContain(Department.PUBLIC_LIGHTING);
    expect(DEPARTMENTS).toContain(Department.WATER_SEWERAGE);
    expect(DEPARTMENTS).toContain(Department.PARKS_HORTICULTURE);
    expect(DEPARTMENTS).toContain(Department.PUBLIC_HEALTH_SAFETY);
    expect(DEPARTMENTS).toContain(Department.WARD_OFFICE);
  });

  it('validates categories using categorySchema', () => {
    expect(categorySchema.parse('pothole')).toBe(Category.POTHOLE);
    expect(() => categorySchema.parse('invalid_category')).toThrow();
  });

  it('validates departments using departmentSchema', () => {
    expect(departmentSchema.parse('roads')).toBe(Department.ROADS);
    expect(() => departmentSchema.parse('finance')).toThrow();
  });
});

describe('TriageSuggestion Schema', () => {
  it('validates a correct TriageSuggestion', () => {
    const valid = {
      is_civic_issue: true,
      category: 'pothole',
      urgency: 'high',
      safety_critical: false,
      confidence: 0.85,
      summary: 'Deep pothole on main road',
      reasons: ['Visible road damage', 'Traffic disruption observed'],
      missing_info: ['landmark'],
    };

    const parsed = triageSuggestionSchema.parse(valid);
    expect(parsed.confidence).toBe(0.85);
    expect(parsed.reasons).toHaveLength(2);
    expect(parsed.missing_info).toEqual(['landmark']);
  });

  it('rejects out of bounds confidence scores', () => {
    const invalidLow = {
      is_civic_issue: true,
      category: 'pothole',
      urgency: 'medium',
      safety_critical: false,
      confidence: -0.1,
      summary: 'Summary',
      reasons: ['Reason'],
      missing_info: [],
    };
    expect(() => triageSuggestionSchema.parse(invalidLow)).toThrow();

    const invalidHigh = {
      ...invalidLow,
      confidence: 1.05,
    };
    expect(() => triageSuggestionSchema.parse(invalidHigh)).toThrow();
  });

  it('rejects summary longer than 160 characters', () => {
    const invalid = {
      is_civic_issue: true,
      category: 'pothole',
      urgency: 'medium',
      safety_critical: false,
      confidence: 0.7,
      summary: 'S'.repeat(161),
      reasons: ['Valid reason'],
      missing_info: [],
    };
    expect(() => triageSuggestionSchema.parse(invalid)).toThrow(/160 characters/);
  });

  it('rejects empty reasons array or more than 4 reasons', () => {
    const noReasons = {
      is_civic_issue: true,
      category: 'garbage',
      urgency: 'low',
      safety_critical: false,
      confidence: 0.9,
      summary: 'Summary',
      reasons: [],
      missing_info: [],
    };
    expect(() => triageSuggestionSchema.parse(noReasons)).toThrow();

    const tooManyReasons = {
      ...noReasons,
      reasons: ['R1', 'R2', 'R3', 'R4', 'R5'],
    };
    expect(() => triageSuggestionSchema.parse(tooManyReasons)).toThrow();
  });

  it('rejects reason longer than 140 characters', () => {
    const invalidReason = {
      is_civic_issue: true,
      category: 'pothole',
      urgency: 'medium',
      safety_critical: false,
      confidence: 0.8,
      summary: 'Valid summary',
      reasons: ['R'.repeat(141)],
      missing_info: [],
    };
    expect(() => triageSuggestionSchema.parse(invalidReason)).toThrow(/140 characters/);
  });
});

describe('AppliedRule and FinalDecision Schemas', () => {
  it('validates appliedRuleSchema', () => {
    const rule = {
      id: 'R3_LOCATION_BOOST',
      label: 'Reported near a school or hospital (safety rule)',
      effect: 'Urgency raised to High',
    };
    expect(appliedRuleSchema.parse(rule)).toEqual(rule);
  });

  it('validates finalDecisionSchema with null department for not_civic', () => {
    const decision = {
      urgency: 'low',
      category: 'not_civic',
      department: null,
      applied_rules: [],
      emergency_notice: false,
      needs_manual_triage: false,
      ai_suggestion: null,
    };
    const parsed = finalDecisionSchema.parse(decision);
    expect(parsed.department).toBeNull();
  });

  it('validates AiSource enum values and schema', () => {
    expect(AI_SOURCES).toEqual([
      AiSource.JARVIS_GEMMA,
      AiSource.GEMINI,
      AiSource.MOCK,
      AiSource.KEYWORD_FALLBACK,
    ]);
    expect(aiSourceSchema.parse('jarvis_gemma')).toBe(AiSource.JARVIS_GEMMA);
    expect(aiSourceSchema.parse('gemini')).toBe(AiSource.GEMINI);
    expect(aiSourceSchema.parse('mock')).toBe(AiSource.MOCK);
    expect(aiSourceSchema.parse('keyword_fallback')).toBe(AiSource.KEYWORD_FALLBACK);
    expect(() => aiSourceSchema.parse('invalid_ai_source')).toThrow();
  });

  it('validates finalDecisionSchema with ai_source attribution', () => {
    const decisionWithSource = {
      urgency: 'high',
      category: 'pothole',
      department: 'roads',
      applied_rules: [],
      emergency_notice: false,
      needs_manual_triage: false,
      ai_suggestion: null,
      ai_source: AiSource.JARVIS_GEMMA,
    };
    const parsed = finalDecisionSchema.parse(decisionWithSource);
    expect(parsed.ai_source).toBe(AiSource.JARVIS_GEMMA);
  });
});

describe('Ticket and TicketEvent Schemas', () => {
  const mockNow = new Date('2026-11-21T10:00:00.000Z').toISOString();

  it('validates ticketEventSchema with valid ISO datetime', () => {
    const event = {
      id: 'evt-1',
      status: 'submitted',
      actor_role: 'citizen',
      note: 'Initial submission',
      at: mockNow,
    };
    expect(ticketEventSchema.parse(event)).toEqual(event);
  });

  it('rejects ticketEventSchema with invalid datetime', () => {
    const event = {
      id: 'evt-1',
      status: 'submitted',
      actor_role: 'citizen',
      at: 'not-a-datetime',
    };
    expect(() => ticketEventSchema.parse(event)).toThrow();
  });

  it('validates full ticketSchema', () => {
    const ticket = {
      id: 'CR-3A4B5C6D',
      description: 'Open manhole emitting foul odor near residential gate.',
      category: 'sewer_overflow',
      urgency: 'critical',
      department: 'water_sewerage',
      ward: 'Ward 14',
      location: { lat: 12.9716, lng: 77.5946, address: 'Near St. Mary School' },
      status: 'submitted',
      events: [
        {
          id: 'evt-1',
          status: 'submitted',
          actor_role: 'citizen',
          at: mockNow,
        },
      ],
      duplicate_count: 0,
      reopen_count: 0,
      created_at: mockNow,
      due_at: new Date('2026-11-22T10:00:00.000Z').toISOString(),
      escalated: false,
      final_decision: {
        urgency: 'critical',
        category: 'sewer_overflow',
        department: 'water_sewerage',
        applied_rules: [],
        emergency_notice: false,
        needs_manual_triage: false,
        ai_suggestion: null,
      },
      attachments: [],
    };

    expect(ticketSchema.parse(ticket).id).toBe('CR-3A4B5C6D');
    expect(ticketSchema.parse(ticket).version).toBe(1);
  });

  it('rejects negative duplicate or reopen counts', () => {
    const baseTicket = {
      id: 'CR-3A4B5C6D',
      description: 'Pothole on 4th cross road.',
      category: 'pothole',
      urgency: 'medium',
      department: 'roads',
      status: 'submitted',
      events: [],
      duplicate_count: -1,
      reopen_count: 0,
      created_at: mockNow,
      due_at: mockNow,
      escalated: false,
      final_decision: {
        urgency: 'medium',
        category: 'pothole',
        department: 'roads',
        applied_rules: [],
        emergency_notice: false,
        needs_manual_triage: false,
        ai_suggestion: null,
      },
      attachments: [],
    };
    expect(() => ticketSchema.parse(baseTicket)).toThrow();
  });
});

describe('Result helper functions', () => {
  it('ok returns a frozen ok result', () => {
    const res = ok(42);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBe(42);
    }
    expect(Object.isFrozen(res)).toBe(true);
  });

  it('err returns a frozen error result', () => {
    const res = err('Invalid transition');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Invalid transition');
    }
    expect(Object.isFrozen(res)).toBe(true);
  });
});

describe('Phase 2.3 Shared DTO and Request Schemas', () => {
  const mockNow = new Date().toISOString();

  it('validates a correct PublicTicketView', () => {
    const publicView: PublicTicketView = {
      id: 'CR-3A4B5C6D',
      status: 'submitted',
      category: 'pothole',
      urgency: 'high',
      department: 'Roads & Infrastructure',
      summary: 'Deep dangerous pothole outside school',
      ward: 'Ward 12',
      created_at: mockNow,
      due_at: mockNow,
      overdue: false,
      duplicate_count: 2,
      reasons: ['Outside school'],
      applied_rules: [{ id: 'R3_LOCATION_BOOST', label: 'School boost', effect: 'Raised to High' }],
      timeline: [
        {
          id: 'evt-1',
          status: 'submitted',
          role: 'citizen',
          note: 'Report filed',
          at: mockNow,
        },
      ],
      emergency_notice: false,
    };

    const parsed = publicTicketViewSchema.parse(publicView);
    expect(parsed.id).toBe('CR-3A4B5C6D');
    expect(parsed.department).toBe('Roads & Infrastructure');
  });

  it('validates a correct AuthorityTicketView containing extended fields', () => {
    const authorityView: AuthorityTicketView = {
      id: 'CR-3A4B5C6D',
      status: 'assigned',
      category: 'pothole',
      urgency: 'high',
      department: 'Roads & Infrastructure',
      summary: 'Deep dangerous pothole outside school',
      ward: 'Ward 12',
      created_at: mockNow,
      due_at: mockNow,
      overdue: false,
      duplicate_count: 2,
      reasons: ['Outside school'],
      applied_rules: [],
      timeline: [],
      emergency_notice: false,
      description: 'Original citizen complaint with all details.',
      location: { lat: 12.9716, lng: 77.5946, address: 'Indiranagar' },
      ai_suggestion: null,
      ai_source: 'mock',
      needs_manual_triage: false,
      escalated: false,
      reopen_count: 0,
      version: 2,
    };

    const parsed = authorityTicketViewSchema.parse(authorityView);
    expect(parsed.version).toBe(2);
    expect(parsed.description).toContain('Original citizen complaint');
  });

  it('validates AnalyzeReportInput and SubmitReportInput schemas', () => {
    const analyzeInput = analyzeReportInputSchema.parse({
      description: 'Pothole on 100ft road near signal.',
      round: 1,
    });
    expect(analyzeInput.round).toBe(1);

    const submitInput = submitReportInputSchema.parse({
      description: 'Pothole on 100ft road near signal.',
      category_override: 'pothole',
    });
    expect(submitInput.category_override).toBe('pothole');
  });

  it('validates StatusUpdateInput and OverrideInput schemas', () => {
    const statusInput = statusUpdateInputSchema.parse({
      status: 'resolved',
      note: 'Road resurfacing completed.',
    });
    expect(statusInput.status).toBe('resolved');

    const overrideInput = overrideInputSchema.parse({
      urgency: 'critical',
      reason: 'Physical inspection confirmed live hazard',
    });
    expect(overrideInput.urgency).toBe('critical');

    expect(() =>
      overrideInputSchema.parse({
        reason: 'bad', // less than 5 chars
      })
    ).toThrow();
  });

  it('validates TicketQuery schema and type coercions', () => {
    const query = ticketQuerySchema.parse({
      status: 'assigned',
      overdue: 'true',
      limit: '15',
    });
    expect(query.overdue).toBe(true);
    expect(query.limit).toBe(15);
  });

  it('validates response envelopes and error helper functions', () => {
    const success = apiSuccess({ ticketId: 'CR-1234' });
    expect(success.data.ticketId).toBe('CR-1234');

    const error = apiError(ApiErrorCode.VALIDATION_FAILED, 'Invalid input payload');
    expect(error.error.code).toBe('validation_failed');
    expect(error.error.message).toBe('Invalid input payload');
  });
});
