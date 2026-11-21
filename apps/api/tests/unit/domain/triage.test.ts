import { describe, it, expect } from 'vitest';
import { decideTriage, type TriageInput } from '../../../src/domain/triage.js';
import { Category, Urgency, Department, type TriageSuggestion, type MissingInfoField } from '@civicresolve/shared';
import { DOMAIN_CONFIG } from '../../../src/domain/config.js';

describe('Triage Decision Engine (decideTriage)', () => {
  const mockNow = new Date('2026-11-21T10:00:00.000Z');

  const validSuggestion: TriageSuggestion = Object.freeze({
    is_civic_issue: true,
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    safety_critical: false,
    confidence: 0.95,
    summary: 'Dangerous pothole on 100ft road',
    reasons: ['Visible depth', 'Traffic disruption'],
    missing_info: [],
  });

  it('returns { kind: "ticket" } for clear high-confidence civic complaint', () => {
    const input: TriageInput = {
      description: 'Dangerous pothole on 100ft road near signal.',
      suggestion: validSuggestion,
      now: mockNow,
    };

    const outcome = decideTriage(input);
    expect(outcome.kind).toBe('ticket');
    if (outcome.kind === 'ticket') {
      expect(outcome.decision.urgency).toBe(Urgency.HIGH);
      expect(outcome.decision.category).toBe(Category.POTHOLE);
      expect(outcome.needs_manual_triage).toBe(false);
    }
  });

  it('returns { kind: "rejected" } when is_civic_issue is false', () => {
    const nonCivicSuggestion: TriageSuggestion = Object.freeze({
      ...validSuggestion,
      is_civic_issue: false,
      category: Category.NOT_CIVIC,
      urgency: Urgency.LOW,
      confidence: 0.99,
    });

    const input: TriageInput = {
      description: 'How to pay income tax return online for my company?',
      suggestion: nonCivicSuggestion,
      now: mockNow,
    };

    const outcome = decideTriage(input);
    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.reason.length).toBeGreaterThan(0);
      expect(outcome.guidance.length).toBeGreaterThan(0);
      expect(outcome.emergency_notice).toBe(false);
    }
  });

  it('always files a ticket with emergency_notice = true when danger keyword is detected, even if suggested non-civic', () => {
    const nonCivicDangerSuggestion: TriageSuggestion = Object.freeze({
      ...validSuggestion,
      is_civic_issue: false,
      category: Category.NOT_CIVIC,
    });

    const input: TriageInput = {
      description: 'Civil court dispute regarding inheritance, but transformer blast occurred outside courthouse with live wire on street!',
      suggestion: nonCivicDangerSuggestion,
      now: mockNow,
    };

    const outcome = decideTriage(input);
    expect(outcome.kind).toBe('ticket');
    if (outcome.kind === 'ticket') {
      expect(outcome.emergency_notice).toBe(true);
      expect(outcome.decision.emergency_notice).toBe(true);
      expect(outcome.decision.urgency).toBe(Urgency.CRITICAL);
      expect(outcome.decision.category).toBe(Category.OTHER_CIVIC);
      expect(outcome.decision.department).toBe(Department.WARD_OFFICE);
      expect(outcome.decision.needs_manual_triage).toBe(true);
    }
  });

  it('rejects spam-like text without creating a ticket, but carries emergency notice if danger phrase is present', () => {
    const inputWithSpamAndDanger: TriageInput = {
      description: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa live wire sparking on road aaaaaaaaaaaaaaaaaa',
      suggestion: validSuggestion,
      now: mockNow,
    };

    const outcome = decideTriage(inputWithSpamAndDanger);
    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.emergency_notice).toBe(true);
    }
  });

  it('rejects spam-like text without emergency notice when no danger phrase is present', () => {
    const inputWithSpam: TriageInput = {
      description: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
      suggestion: validSuggestion,
      now: mockNow,
    };

    const outcome = decideTriage(inputWithSpam);
    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.emergency_notice).toBe(false);
    }
  });

  it('bypasses follow-up questions when danger keyword is detected even if confidence is low', () => {
    const lowConfidenceDangerSuggestion: TriageSuggestion = Object.freeze({
      ...validSuggestion,
      confidence: 0.3,
      missing_info: ['location' as MissingInfoField],
    });

    const input: TriageInput = {
      description: 'Live wire sparking and hanging over footpath near market!',
      suggestion: lowConfidenceDangerSuggestion,
      followUpRounds: 0,
      now: mockNow,
    };

    const outcome = decideTriage(input);
    expect(outcome.kind).toBe('ticket');
    if (outcome.kind === 'ticket') {
      expect(outcome.emergency_notice).toBe(true);
      expect(outcome.decision.urgency).toBe(Urgency.CRITICAL);
    }
  });

  it('triggers { kind: "follow_up" } when confidence is below threshold and round < max', () => {
    const lowConfidenceSuggestion: TriageSuggestion = Object.freeze({
      ...validSuggestion,
      confidence: 0.5, // Below 0.6 threshold
      missing_info: ['location' as MissingInfoField],
    });

    const input: TriageInput = {
      description: 'Road is damaged somewhere in the city.',
      suggestion: lowConfidenceSuggestion,
      followUpRounds: 0,
      now: mockNow,
    };

    const outcome = decideTriage(input);
    expect(outcome.kind).toBe('follow_up');
    if (outcome.kind === 'follow_up') {
      expect(outcome.round).toBe(1);
      expect(outcome.question).toContain('street name, junction, or area');
    }
  });

  it('selects landmark question when missing_info has landmark', () => {
    const landmarkMissingSuggestion: TriageSuggestion = Object.freeze({
      ...validSuggestion,
      confidence: 0.55,
      missing_info: ['landmark' as MissingInfoField],
    });

    const input: TriageInput = {
      description: 'Pothole on 5th cross.',
      suggestion: landmarkMissingSuggestion,
      followUpRounds: 1,
      now: mockNow,
    };

    const outcome = decideTriage(input);
    expect(outcome.kind).toBe('follow_up');
    if (outcome.kind === 'follow_up') {
      expect(outcome.round).toBe(2);
      expect(outcome.question).toContain('landmark');
    }
  });

  it('generates a ticket with needs_manual_triage = true when max follow-up rounds are reached (never blocks citizen)', () => {
    const lowConfidenceSuggestion: TriageSuggestion = Object.freeze({
      ...validSuggestion,
      confidence: 0.45,
      missing_info: ['location' as MissingInfoField],
    });

    const input: TriageInput = {
      description: 'Road is bad.',
      suggestion: lowConfidenceSuggestion,
      followUpRounds: DOMAIN_CONFIG.maxFollowUpRounds, // Max rounds reached (2)
      now: mockNow,
    };

    const outcome = decideTriage(input);
    expect(outcome.kind).toBe('ticket');
    if (outcome.kind === 'ticket') {
      expect(outcome.needs_manual_triage).toBe(true);
      expect(outcome.decision.needs_manual_triage).toBe(true);
    }
  });

  it('engages fallback classifier when AI suggestion is null and sets needs_manual_triage = true', () => {
    const input: TriageInput = {
      description: 'Broken water pipe leaking clean drinking water all over the road.',
      suggestion: null, // AI provider failure / offline
      now: mockNow,
      followUpRounds: DOMAIN_CONFIG.maxFollowUpRounds,
    };

    const outcome = decideTriage(input);
    expect(outcome.kind).toBe('ticket');
    if (outcome.kind === 'ticket') {
      expect(outcome.decision.category).toBe(Category.WATER_LEAKAGE);
      expect(outcome.decision.urgency).toBe(Urgency.MEDIUM); // Never silently Low
      expect(outcome.needs_manual_triage).toBe(true);
    }
  });

  it('selects appropriate follow-up questions across all missing info field types', () => {
    const fields = ['location', 'landmark', 'issue_type', 'severity'] as const;
    for (const field of fields) {
      const suggestion: TriageSuggestion = Object.freeze({
        ...validSuggestion,
        confidence: 0.5,
        missing_info: [field],
      });
      const outcome = decideTriage({
        description: 'Need help with road issue',
        suggestion,
        followUpRounds: 0,
        now: mockNow,
      });
      expect(outcome.kind).toBe('follow_up');
      if (outcome.kind === 'follow_up') {
        expect(outcome.question.length).toBeGreaterThan(10);
      }
    }
  });
});
