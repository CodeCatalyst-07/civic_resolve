import {
  Category,
  Urgency,
  type TriageSuggestion,
} from '@civicresolve/shared';
import { CATEGORY_KEYWORDS } from './data/keywords.js';
import { DOMAIN_MESSAGES } from './messages.js';
import { detectImmediateDanger } from './emergency.js';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks whether user submission exhibits spam characteristics:
 * - Very short (< 5 non-whitespace characters)
 * - Has no alphanumeric characters (e.g. emoji-only or symbols-only)
 * - Repeated identical characters (e.g. "aaaaaa", "111111")
 * - Promotional link stuffing (multiple URLs)
 *
 * @param text - Input complaint text
 * @returns True if text resembles spam or gibberish
 */
export function looksLikeSpam(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 5) {
    return true;
  }

  // Must contain at least one letter or number; symbol-only or emoji-only text is spam
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    return true;
  }

  // Check for repeated identical characters (6 or more consecutive repetitions)
  if (/(.)\1{5,}/u.test(trimmed)) {
    return true;
  }

  // Check for link-stuffed text (2 or more web URLs)
  const urlMatches = trimmed.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi);
  if (urlMatches && urlMatches.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Transparent keyword classifier providing the AI-offline fallback path.
 * Evaluates multilingual keywords across English, Hindi, Marathi, and Hinglish.
 *
 * @param text - Raw complaint description
 * @returns Structurally valid TriageSuggestion marked with low confidence and clear rationale
 */
export function classifyByKeywords(text: string): TriageSuggestion {
  if (looksLikeSpam(text)) {
    return {
      is_civic_issue: false,
      category: Category.NOT_CIVIC,
      urgency: Urgency.LOW,
      safety_critical: false,
      confidence: 0.1,
      summary: text.slice(0, 100).trim() || 'Invalid submission',
      reasons: ['Submission contains spam, promotional links, or non-civic content.'],
      missing_info: [],
    };
  }

  const normalized = text.normalize('NFKC').toLowerCase();
  const isDanger = detectImmediateDanger(text);

  let bestCategory: Category = Category.OTHER_CIVIC;
  let maxMatches = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, readonly string[]][]) {
    let count = 0;
    for (const kw of keywords) {
      const escaped = escapeRegExp(kw.toLowerCase()).replace(/\s+/g, '\\s+');
      const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'u');
      if (regex.test(normalized)) {
        count += 1;
      }
    }
    if (count > maxMatches) {
      maxMatches = count;
      bestCategory = category;
    }
  }

  // If no specific category matched but danger is present, categorize as public_hazard
  if (maxMatches === 0 && isDanger) {
    bestCategory = Category.PUBLIC_HAZARD;
  }

  const summary = text.trim().slice(0, 120);

  return {
    is_civic_issue: bestCategory !== Category.NOT_CIVIC,
    category: bestCategory,
    urgency: isDanger ? Urgency.HIGH : Urgency.MEDIUM,
    safety_critical: isDanger,
    confidence: 0.4,
    summary: summary.length > 0 ? summary : 'Civic grievance description',
    reasons: [DOMAIN_MESSAGES.fallback.reason],
    missing_info: [],
  };
}
