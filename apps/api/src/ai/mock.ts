import { readFileSync } from 'node:fs';
import {
  AiSource,
  Category,
  Urgency,
  type Result,
  type TriageSuggestion,
  ok,
  err,
} from '@civicresolve/shared';
import { classifyByKeywords } from '../domain/fallback.js';
import type { TriageProvider, TriageProviderInput, AiError } from './types.js';

interface ComplaintFixture {
  id: string;
  text: string;
  expectedCategory: Category;
  minUrgency: Urgency;
  expectedOutcome: 'ticket' | 'follow_up' | 'rejected';
  emergency: boolean;
  language: string;
  fallbackCanClassify: boolean;
}

/**
 * Deterministic mock provider for tests, CI, and local evaluation.
 * Backed by fixtures/complaints.json and falling back to keyword classification.
 */
export class MockProvider implements TriageProvider {
  public readonly name: AiSource = AiSource.MOCK;
  public readonly model: string = 'mock-triage-v1';

  private fixtures: ComplaintFixture[] = [];
  private calls = 0;
  public failWith?: AiError;

  public constructor() {
    this.loadFixtures();
  }

  private loadFixtures(): void {
    try {
      const fixturesUrl = new URL('../../../../fixtures/complaints.json', import.meta.url);
      const raw = readFileSync(fixturesUrl, 'utf-8');
      this.fixtures = JSON.parse(raw) as ComplaintFixture[];
    } catch {
      this.fixtures = [];
    }
  }

  public get callCount(): number {
    return this.calls;
  }

  public resetCallCount(): void {
    this.calls = 0;
  }

  public async triage(
    input: TriageProviderInput
  ): Promise<Result<TriageSuggestion, AiError>> {
    this.calls++;

    if (this.failWith) {
      return err(this.failWith);
    }

    const trimmed = input.text.trim();

    // Check fixtures for exact match
    const matched = this.fixtures.find((f) => f.text.trim() === trimmed);
    if (matched) {
      const isCivic = matched.expectedCategory !== Category.NOT_CIVIC;
      const confidence = matched.expectedOutcome === 'follow_up' ? 0.45 : 0.95;
      const missingInfo = matched.expectedOutcome === 'follow_up' ? (['location'] as const) : [];

      const suggestion: TriageSuggestion = Object.freeze({
        is_civic_issue: isCivic,
        category: matched.expectedCategory,
        urgency: matched.minUrgency,
        safety_critical: matched.emergency,
        confidence,
        summary: `Mock triage analysis for ${matched.id}`,
        reasons: [`Matched regression benchmark fixture ${matched.id}`],
        missing_info: [...missingInfo],
      });

      return ok(suggestion);
    }

    // Fall back to pure domain keyword classifier
    const fallback = classifyByKeywords(trimmed);
    return ok(fallback);
  }
}
