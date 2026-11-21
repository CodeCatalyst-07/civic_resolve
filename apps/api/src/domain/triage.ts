import { Category, type FinalDecision, type TriageSuggestion, type Department } from '@civicresolve/shared';
import { DOMAIN_CONFIG, type DomainConfig } from './config.js';
import { DOMAIN_MESSAGES, getFollowUpQuestion } from './messages.js';
import { applyRules } from './rules.js';
import { classifyByKeywords, looksLikeSpam } from './fallback.js';
import { detectImmediateDanger } from './emergency.js';
import type { SensitiveSite } from './geo.js';

/**
 * Inputs supplied to the central triage decision engine.
 */
export interface TriageInput {
  readonly description: string;
  readonly suggestion?: TriageSuggestion | null;
  readonly location?: {
    readonly lat?: number;
    readonly lng?: number;
    readonly address?: string;
  };
  readonly sites?: readonly SensitiveSite[];
  readonly duplicateCount?: number;
  readonly followUpRounds?: number;
  readonly ward?: string;
  readonly wardOverrides?: Readonly<Record<string, Department>>;
  readonly now: Date;
}

/**
 * Discriminated union outcome of the triage decision engine.
 */
export type TriageOutcome =
  | {
      readonly kind: 'rejected';
      readonly reason: string;
      readonly guidance: string;
      readonly emergency_notice: false;
    }
  | {
      readonly kind: 'follow_up';
      readonly question: string;
      readonly round: number;
    }
  | {
      readonly kind: 'ticket';
      readonly decision: FinalDecision;
      readonly needs_manual_triage: boolean;
      readonly emergency_notice: boolean;
    };

/**
 * Decides whether a citizen report produces a confirmed ticket, requests follow-up clarification,
 * or is safely rejected as a non-civic matter.
 *
 * ### Key Invariants:
 * 1. AI failure or null suggestion triggers the transparent keyword fallback classifier (never silently Low).
 * 2. Low confidence after maximum follow-up rounds still creates a ticket flagged `needs_manual_triage` (the citizen is never stuck).
 * 3. Immediate danger keywords ALWAYS produce a confirmed ticket at Critical urgency with an emergency notice (112),
 *    never delayed for follow-up questions and never rejected.
 *
 * @param input - Triage inputs including description, AI suggestion, and context
 * @param config - Domain configuration tunables (defaults to DOMAIN_CONFIG)
 * @returns TriageOutcome discriminated union
 */
export function decideTriage(
  input: TriageInput,
  config: DomainConfig = DOMAIN_CONFIG
): TriageOutcome {
  let suggestion: TriageSuggestion;
  let isFallback = false;

  // If AI suggestion failed or is absent, engage the keyword fallback classifier
  if (!input.suggestion) {
    suggestion = classifyByKeywords(input.description);
    isFallback = true;
  } else {
    suggestion = input.suggestion;
  }

  // Check for immediate life/safety hazard first
  const dangerDetected = detectImmediateDanger(input.description);

  // If immediate danger is detected, public safety takes absolute priority:
  // It MUST produce a confirmed ticket at Critical urgency and display emergency advice (112).
  // It must never be rejected or delayed for follow-up questions.
  if (dangerDetected) {
    if (!suggestion.is_civic_issue || suggestion.category === Category.NOT_CIVIC) {
      suggestion = {
        ...suggestion,
        is_civic_issue: true,
        category: Category.PUBLIC_HAZARD,
      };
    }

    const decision = applyRules(suggestion, input, config);
    const needsManualTriage = isFallback || suggestion.confidence < config.confidenceThreshold;

    const finalDecisionWithTriageFlag: FinalDecision = Object.freeze({
      ...decision,
      needs_manual_triage: needsManualTriage,
    });

    return Object.freeze({
      kind: 'ticket',
      decision: finalDecisionWithTriageFlag,
      needs_manual_triage: needsManualTriage,
      emergency_notice: true,
    });
  }

  // Spam detection overrides civic validity (when no danger is present)
  if (looksLikeSpam(input.description)) {
    suggestion = {
      ...suggestion,
      is_civic_issue: false,
    };
  }

  // Case 1: Non-civic issue rejection
  if (!suggestion.is_civic_issue) {
    return Object.freeze({
      kind: 'rejected',
      reason: DOMAIN_MESSAGES.rejection.reason,
      guidance: DOMAIN_MESSAGES.rejection.guidance,
      emergency_notice: false,
    });
  }

  // Case 2: Clarifying follow-up rounds for low confidence or missing critical info
  const currentRound = input.followUpRounds ?? 0;
  const isLowConfidence = suggestion.confidence < config.confidenceThreshold;
  const hasMissingInfo = suggestion.missing_info.length > 0;

  if ((isLowConfidence || hasMissingInfo) && currentRound < config.maxFollowUpRounds) {
    const question = getFollowUpQuestion(suggestion.missing_info[0]);
    return Object.freeze({
      kind: 'follow_up',
      question,
      round: currentRound + 1,
    });
  }

  // Case 3: Standard ticket generation
  // After max follow-up rounds with low confidence or fallback, flag for manual review so citizen is never blocked
  const needsManualTriage = isFallback || isLowConfidence;
  const decision = applyRules(suggestion, input, config);

  const finalDecisionWithTriageFlag: FinalDecision = Object.freeze({
    ...decision,
    needs_manual_triage: needsManualTriage,
  });

  return Object.freeze({
    kind: 'ticket',
    decision: finalDecisionWithTriageFlag,
    needs_manual_triage: needsManualTriage,
    emergency_notice: decision.emergency_notice,
  });
}
