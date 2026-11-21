import type { Category, Ticket } from '@civicresolve/shared';
import { DOMAIN_CONFIG, type DomainConfig } from './config.js';
import { haversineMeters } from './geo.js';

/**
 * Report summary for duplicate matching.
 */
export interface ReportSummary {
  readonly category: Category;
  readonly description: string;
  readonly location?: {
    readonly lat?: number;
    readonly lng?: number;
  };
}

/**
 * Duplicate match candidate with distance and lexical similarity metrics.
 */
export interface DuplicateCandidate {
  readonly ticket: Ticket;
  readonly distance_m: number | null;
  readonly similarity: number;
  readonly score: number;
}

/**
 * Stop-word lexicon covering English, Hindi, and Marathi function words.
 */
const STOP_WORDS: ReadonlySet<string> = new Set([
  // English
  'the',
  'a',
  'an',
  'and',
  'or',
  'is',
  'are',
  'was',
  'were',
  'at',
  'on',
  'in',
  'near',
  'to',
  'of',
  'for',
  'with',
  'by',
  'from',
  'this',
  'that',
  'there',
  'here',
  // Hindi / Marathi / Hinglish
  'hai',
  'hain',
  'ka',
  'ki',
  'ke',
  'ko',
  'me',
  'mein',
  'par',
  'se',
  'tha',
  'thi',
  'the',
  'aahe',
  'aani',
  'ani',
  'la',
  'madhye',
]);

/**
 * Tokenizes text into unique normalized word stems, stripping punctuation and stop words.
 *
 * @param text - Input description
 * @returns Set of non-trivial token strings
 */
export function tokenizeText(text: string): Set<string> {
  if (!text) return new Set();

  const normalized = text.normalize('NFKC').toLowerCase();
  const words = normalized.match(/[\p{L}\p{N}]+/gu);
  if (!words) return new Set();

  const tokenSet = new Set<string>();
  for (const word of words) {
    if (word.length >= 2 && !STOP_WORDS.has(word)) {
      tokenSet.add(word);
    }
  }

  return tokenSet;
}

/**
 * Computes Jaccard similarity between two sets of tokens.
 * J(A, B) = |A ∩ B| / |A ∪ B|
 *
 * @param tokensA - Set of tokens from text A
 * @param tokensB - Set of tokens from text B
 * @returns Similarity score between 0.0 and 1.0
 */
export function jaccardSimilarity(tokensA: ReadonlySet<string>, tokensB: ReadonlySet<string>): number {
  if (tokensA.size === 0 && tokensB.size === 0) {
    return 1.0;
  }
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0.0;
  }

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionCount += 1;
    }
  }

  const unionCount = tokensA.size + tokensB.size - intersectionCount;
  if (unionCount === 0) return 0;

  return intersectionCount / unionCount;
}

/**
 * Identifies duplicate complaint candidates among existing open tickets.
 *
 * Criteria for a candidate:
 * 1. Identical Category
 * 2. Active status (not 'closed' or 'rejected')
 * 3. Opened within duplicateWindowDays (default: 14 days) relative to `now`
 * 4. Situated within duplicateRadiusMeters (default: 150m) if geographic coordinates exist
 *
 * @param report - The newly incoming complaint report
 * @param openTickets - Array of existing tickets (never mutated)
 * @param now - Current timestamp injected as parameter
 * @param config - Domain configuration tunables (defaults to DOMAIN_CONFIG)
 * @returns Array of DuplicateCandidate sorted by distance ascending, then similarity descending
 */
export function findDuplicateCandidates(
  report: ReportSummary,
  openTickets: readonly Ticket[],
  now: Date,
  config: DomainConfig = DOMAIN_CONFIG
): DuplicateCandidate[] {
  const windowMs = config.duplicateWindowDays * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  const reportTokens = tokenizeText(report.description);

  const candidates: DuplicateCandidate[] = [];

  for (const ticket of openTickets) {
    // Category must match exactly
    if (ticket.category !== report.category) {
      continue;
    }

    // Terminal statuses are never considered duplicates
    if (ticket.status === 'closed' || ticket.status === 'rejected') {
      continue;
    }

    // Must be opened within the time window
    const ticketCreatedAtMs = new Date(ticket.created_at).getTime();
    const ageMs = nowMs - ticketCreatedAtMs;
    if (ageMs < 0 || ageMs > windowMs) {
      continue;
    }

    // Proximity evaluation
    let distance: number | null = null;
    if (
      report.location?.lat != null &&
      report.location?.lng != null &&
      ticket.location?.lat != null &&
      ticket.location?.lng != null
    ) {
      distance = haversineMeters(
        { lat: report.location.lat, lng: report.location.lng },
        { lat: ticket.location.lat, lng: ticket.location.lng }
      );
      if (distance > config.duplicateRadiusMeters) {
        continue; // Outside proximity threshold
      }
    }

    // Lexical similarity evaluation
    const ticketTokens = tokenizeText(ticket.description);
    const similarity = jaccardSimilarity(reportTokens, ticketTokens);

    // Composite scoring: 0.6 * distance_score + 0.4 * text_similarity
    const distanceScore =
      distance != null
        ? Math.max(0, 1 - distance / config.duplicateRadiusMeters)
        : 0;
    const compositeScore =
      distance != null
        ? config.duplicateDistanceWeight * distanceScore +
          config.duplicateTextSimilarityWeight * similarity
        : similarity;

    candidates.push({
      ticket,
      distance_m: distance != null ? Math.round(distance * 10) / 10 : null,
      similarity: Math.round(similarity * 1000) / 1000,
      score: Math.round(compositeScore * 1000) / 1000,
    });
  }

  // Sort candidates: composite score descending, then distance ascending (nulls last)
  candidates.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.001) {
      return b.score - a.score;
    }
    if (a.distance_m != null && b.distance_m != null) {
      return a.distance_m - b.distance_m;
    }
    if (a.distance_m != null) return -1;
    if (b.distance_m != null) return 1;
    return b.similarity - a.similarity;
  });

  return Object.freeze(candidates) as DuplicateCandidate[];
}
