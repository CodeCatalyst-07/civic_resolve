import {
  triageSuggestionSchema,
  type TriageSuggestion,
  type Result,
  ok,
  err,
} from '@civicresolve/shared';

/**
 * Extracts a balanced JSON object string enclosed between { and } from arbitrary text.
 */
function extractBalancedJsonObject(text: string): string | null {
  const startIdx = text.indexOf('{');
  if (startIdx === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(startIdx, i + 1);
      }
    }
  }

  return null;
}

/**
 * Strips markdown code fences and whitespace from model responses.
 */
function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Parses and strictly validates a raw model string into a typed TriageSuggestion.
 *
 * @param raw - Raw model output text
 * @returns ok(TriageSuggestion) or err(array of human-readable validation error messages)
 */
export function parseTriageJson(raw: string): Result<TriageSuggestion, string[]> {
  if (!raw || raw.trim().length === 0) {
    return err(['Empty response received from AI model']);
  }

  const unfenced = stripMarkdownFences(raw);
  const jsonCandidate = extractBalancedJsonObject(unfenced) ?? unfenced;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch (error) {
    const syntaxErr = error instanceof Error ? error.message : 'Unknown JSON syntax error';
    return err([`Invalid JSON: ${syntaxErr}`]);
  }

  const validation = triageSuggestionSchema.safeParse(parsed);
  if (!validation.success) {
    const errors = validation.error.errors.map(
      (e) => `${e.path.join('.') || 'root'}: ${e.message}`
    );
    return err(errors);
  }

  return ok(validation.data);
}
