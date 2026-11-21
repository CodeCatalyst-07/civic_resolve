import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { categorySchema, urgencySchema } from '@civicresolve/shared';
import { classifyByKeywords } from '../../../src/domain/fallback.js';
import { decideTriage } from '../../../src/domain/triage.js';
import { detectImmediateDanger } from '../../../src/domain/emergency.js';
import { urgencyToLevel } from '../../../src/domain/rules.js';
import { DOMAIN_CONFIG } from '../../../src/domain/config.js';

const complaintFixtureSchema = z.object({
  id: z.string(),
  text: z.string(),
  expectedCategory: categorySchema,
  minUrgency: urgencySchema,
  expectedOutcome: z.enum(['ticket', 'follow_up', 'rejected']),
  emergency: z.boolean(),
  language: z.string(),
  fallbackCanClassify: z.boolean(),
});

const complaintsListSchema = z.array(complaintFixtureSchema).min(20);

describe('Complaints Regression Fixtures Validation', () => {
  const filePath = new URL('../../../../../fixtures/complaints.json', import.meta.url);
  const rawData = readFileSync(filePath, 'utf-8');
  const complaints = JSON.parse(rawData) as unknown[];

  it('validates that fixtures/complaints.json contains at least 20 items matching schema', () => {
    const parsed = complaintsListSchema.parse(complaints);
    expect(parsed.length).toBeGreaterThanOrEqual(20);
  });

  const parsedComplaints = complaintsListSchema.parse(complaints);

  describe('Fallback Classifier & Triage Execution on Fixtures', () => {
    const mockNow = new Date('2026-11-21T10:00:00.000Z');

    for (const item of parsedComplaints) {
      if (!item.fallbackCanClassify) {
        it(`skips fallback classification for ambiguous item "${item.id}" (relies on AI in Phase 2.2)`, () => {
          expect(item.fallbackCanClassify).toBe(false);
        });
        continue;
      }

      it(`evaluates fixture item "${item.id}" (${item.language})`, () => {
        // 1. Verify emergency detection if marked emergency
        const isDanger = detectImmediateDanger(item.text);
        if (item.emergency) {
          expect(
            isDanger,
            `Expected emergency danger keyword to match in ${item.id}`
          ).toBe(true);
        }

        // 2. Classify using fallback keyword classifier
        const suggestion = classifyByKeywords(item.text);
        expect(
          suggestion.category,
          `Category mismatch in fallback classifier for ${item.id}`
        ).toBe(item.expectedCategory);

        // 3. Evaluate full decideTriage decision flow
        const sites =
          item.id === 'cmp-01-pothole-school'
            ? [
                {
                  id: 'site-school-1',
                  type: 'school' as const,
                  name: 'National Public School',
                  lat: 12.9718,
                  lng: 77.5948,
                },
              ]
            : [];
        const location =
          item.id === 'cmp-01-pothole-school'
            ? { lat: 12.9716, lng: 77.5946 }
            : undefined;

        const outcome = decideTriage({
          description: item.text,
          suggestion: null, // Test pure offline path
          location,
          sites,
          now: mockNow,
          followUpRounds: DOMAIN_CONFIG.maxFollowUpRounds,
        });

        expect(
          outcome.kind,
          `Outcome kind mismatch for ${item.id}: expected ${item.expectedOutcome}, got ${outcome.kind}`
        ).toBe(item.expectedOutcome);

        if (outcome.kind === 'ticket') {
          // Verify urgency floor
          expect(
            urgencyToLevel(outcome.decision.urgency),
            `Urgency below minimum in ${item.id}`
          ).toBeGreaterThanOrEqual(urgencyToLevel(item.minUrgency));

          if (item.emergency) {
            expect(outcome.decision.emergency_notice).toBe(true);
          }
        } else if (outcome.kind === 'rejected' && item.emergency) {
          expect(outcome.emergency_notice).toBe(true);
        }
      });
    }
  });
});
