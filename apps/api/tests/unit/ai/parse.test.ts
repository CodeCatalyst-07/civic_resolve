import { describe, it, expect } from 'vitest';
import { parseTriageJson } from '../../../src/ai/parse.js';
import { Category, Urgency } from '@civicresolve/shared';

describe('AI JSON Parser & Schema Validator (parse.ts)', () => {
  const validJson = JSON.stringify({
    is_civic_issue: true,
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    safety_critical: true,
    confidence: 0.9,
    summary: 'Dangerous pothole near bus stand',
    reasons: ['Visible crater', 'Causing bus diversions'],
    missing_info: [],
  });

  it('parses valid raw JSON string', () => {
    const res = parseTriageJson(validJson);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.category).toBe(Category.POTHOLE);
      expect(res.value.urgency).toBe(Urgency.HIGH);
      expect(res.value.confidence).toBe(0.9);
    }
  });

  it('strips markdown code fences (```json ... ```)', () => {
    const fenced = `\`\`\`json\n${validJson}\n\`\`\``;
    const res = parseTriageJson(fenced);
    expect(res.ok).toBe(true);
  });

  it('extracts balanced JSON block when model includes conversational preamble', () => {
    const messy = `Here is the analysis:\n${validJson}\nHope this helps!`;
    const res = parseTriageJson(messy);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.summary).toBe('Dangerous pothole near bus stand');
    }
  });

  it('rejects empty or whitespace output', () => {
    const res = parseTriageJson('   ');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error[0]).toContain('Empty response');
    }
  });

  it('rejects malformed syntax JSON', () => {
    const res = parseTriageJson('{ "category": "pothole", ');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error[0]).toContain('Invalid JSON');
    }
  });

  it('rejects output violating Zod schema requirements (e.g. invalid category)', () => {
    const invalidSchemaJson = JSON.stringify({
      is_civic_issue: true,
      category: 'alien_invasion',
      urgency: 'low',
      safety_critical: false,
      confidence: 0.5,
      summary: 'Aliens',
      reasons: ['Saw a flying saucer'],
      missing_info: [],
    });

    const res = parseTriageJson(invalidSchemaJson);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.some((e) => e.includes('category'))).toBe(true);
    }
  });
});
