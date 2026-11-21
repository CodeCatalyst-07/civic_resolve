import { describe, it, expect } from 'vitest';
import {
  Category,
  Urgency,
  Status,
  Role,
  type TriageSuggestion,
  type FinalDecision,
  type AppliedRule,
  type TicketEvent,
} from '@civicresolve/shared';
import {
  formatTarget,
  formatConfidence,
  describeDecisionChange,
} from './formatters.js';

describe('Authority Formatters & Decision Change Analysis', () => {
  describe('formatTarget', () => {
    it('formats remaining hours within 24h', () => {
      const now = new Date('2026-11-21T12:00:00.000Z');
      const dueAt = new Date('2026-11-21T16:00:00.000Z').toISOString();

      const result = formatTarget(dueAt, now);
      expect(result.overdue).toBe(false);
      expect(result.label).toBe('4h remaining');
    });

    it('formats remaining days and hours over 24h', () => {
      const now = new Date('2026-11-21T12:00:00.000Z');
      const dueAt = new Date('2026-11-23T15:00:00.000Z').toISOString();

      const result = formatTarget(dueAt, now);
      expect(result.overdue).toBe(false);
      expect(result.label).toBe('2d 3h remaining');
    });

    it('formats overdue hours', () => {
      const now = new Date('2026-11-21T12:00:00.000Z');
      const dueAt = new Date('2026-11-21T06:00:00.000Z').toISOString();

      const result = formatTarget(dueAt, now);
      expect(result.overdue).toBe(true);
      expect(result.label).toBe('6h overdue');
    });

    it('formats overdue days and hours', () => {
      const now = new Date('2026-11-21T12:00:00.000Z');
      const dueAt = new Date('2026-11-19T08:00:00.000Z').toISOString();

      const result = formatTarget(dueAt, now);
      expect(result.overdue).toBe(true);
      expect(result.label).toBe('2d 4h overdue');
    });
  });

  describe('formatConfidence', () => {
    it('formats confidence float into percentage string', () => {
      expect(formatConfidence(0.95)).toBe('95% match');
      expect(formatConfidence(0.824)).toBe('82% match');
    });

    it('returns Unknown for undefined or null or NaN', () => {
      expect(formatConfidence(undefined)).toBe('Unknown');
      expect(formatConfidence(null)).toBe('Unknown');
      expect(formatConfidence(NaN)).toBe('Unknown');
    });
  });

  describe('describeDecisionChange', () => {
    const baseAi: TriageSuggestion = {
      is_civic_issue: true,
      category: Category.POTHOLE,
      urgency: Urgency.MEDIUM,
      safety_critical: false,
      confidence: 0.9,
      summary: 'Pothole on main road',
      reasons: ['Clear road damage'],
      missing_info: [],
    };

    const baseFinal: FinalDecision = {
      category: Category.POTHOLE,
      urgency: Urgency.HIGH,
      department: 'roads',
      emergency_notice: false,
      needs_manual_triage: false,
      applied_rules: [],
      ai_suggestion: baseAi,
    };

    it('returns empty list if AI suggestion is absent', () => {
      const changes = describeDecisionChange(null, baseFinal);
      expect(changes).toEqual([]);
    });

    it('identifies automatic rule urgency boost', () => {
      const rules: AppliedRule[] = [
        {
          id: 'school-boost',
          label: 'Location Boost: Near School / Hospital',
          effect: 'Urgency boosted to High',
        },
      ];

      const changes = describeDecisionChange(baseAi, baseFinal, rules, []);
      expect(changes).toHaveLength(1);
      expect(changes[0]!).toEqual({
        field: 'Urgency',
        from: Urgency.MEDIUM,
        to: Urgency.HIGH,
        author: 'automatic',
        reason: 'Location Boost: Near School / Hospital',
      });
    });

    it('identifies staff manual override over automatic rules', () => {
      const events: TicketEvent[] = [
        {
          id: 'evt-1',
          status: Status.SUBMITTED,
          actor_role: Role.CITIZEN,
          at: '2026-11-21T10:00:00.000Z',
        },
        {
          id: 'evt-2',
          status: Status.UNDER_REVIEW,
          actor_role: Role.AUTHORITY,
          note: 'Manual override: Increased urgency due to pending VIP convoy',
          at: '2026-11-21T11:00:00.000Z',
        },
      ];

      const changes = describeDecisionChange(baseAi, baseFinal, [], events);
      expect(changes).toHaveLength(1);
      expect(changes[0]!).toEqual({
        field: 'Urgency',
        from: Urgency.MEDIUM,
        to: Urgency.HIGH,
        author: 'staff',
        reason: 'Manual override: Increased urgency due to pending VIP convoy',
      });
    });

    it('identifies category divergence', () => {
      const changedFinal: FinalDecision = {
        ...baseFinal,
        urgency: Urgency.MEDIUM,
        category: Category.GARBAGE,
      };

      const changes = describeDecisionChange(baseAi, changedFinal, [], []);
      expect(changes).toHaveLength(1);
      expect(changes[0]!).toEqual({
        field: 'Category',
        from: Category.POTHOLE,
        to: Category.GARBAGE,
        author: 'automatic',
        reason: 'Taxonomy mapping rules',
      });
    });
  });
});
