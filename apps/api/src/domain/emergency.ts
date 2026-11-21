import { DANGER_KEYWORDS } from './data/keywords.js';

/**
 * Escapes special regex characters in a literal string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects presence of immediate physical hazards (live wires, open manholes, fires, collapses)
 * using Unicode-aware, case-insensitive keyword and phrase matching across English, Hindi, Marathi, and Hinglish.
 *
 * ### Known Architectural Limitation:
 * Syntactic negation (e.g. "there is NO live wire here" or "pothole fixed, no open manhole")
 * is intentionally NOT parsed or subtracted in this pure domain rule. The system deliberately
 * errs toward raising urgency to Critical to prevent catastrophic injury or loss of life,
 * leaving downgrades exclusively to verified human authority inspections.
 *
 * @param text - The complaint text or description to evaluate
 * @param keywords - Optional keyword list override (defaults to DANGER_KEYWORDS)
 * @returns True if any danger keyword or hazard indicator is detected
 */
export function detectImmediateDanger(
  text: string,
  keywords: readonly string[] = DANGER_KEYWORDS
): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Unicode normalize and lowercase for consistent linguistic comparison
  const normalized = text.normalize('NFKC').toLowerCase();

  for (const keyword of keywords) {
    const trimmed = keyword.trim().toLowerCase();
    if (trimmed.length === 0) continue;

    // Use Unicode-aware boundary matching supporting Latin, Devanagari, and numeric tokens
    const escaped = escapeRegExp(trimmed).replace(/\s+/g, '\\s+');
    const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'u');

    if (regex.test(normalized)) {
      return true;
    }
  }

  return false;
}
