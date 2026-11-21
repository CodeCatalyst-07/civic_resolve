import type {
  TriageSuggestion,
  Category,
  Urgency,
  AppliedRule,
} from '@civicresolve/shared';
import type { DecisionChange, TargetSlaStatus } from '../types.js';

export interface DecisionDecisionSnapshot {
  urgency: Urgency;
  category: Category;
  department?: string | null;
}

export interface DecisionEventSnapshot {
  note?: string;
  role?: string;
}

/**
 * Formats demo target time countdown into human-readable plain language.
 *
 * @param dueAtIso - ISO timestamp of target deadline
 * @param now - Reference anchor time (defaults to current system time)
 * @returns TargetSlaStatus with plain label and overdue boolean
 */
export function formatTarget(dueAtIso: string, now: Date = new Date()): TargetSlaStatus {
  const due = new Date(dueAtIso);
  const diffMs = due.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const totalHours = Math.floor(absMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;

  let timeStr = '';
  if (days >= 1) {
    timeStr = remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  } else {
    timeStr = `${Math.max(1, totalHours)}h`;
  }

  return {
    label: isOverdue ? `${timeStr} overdue` : `${timeStr} remaining`,
    overdue: isOverdue,
  };
}

/**
 * Formats AI model confidence into a readable percentage.
 *
 * @param confidence - Floating-point score between 0 and 1
 * @returns Formatted percentage string (e.g. "95% match")
 */
export function formatConfidence(confidence?: number | null): string {
  if (confidence === undefined || confidence === null || isNaN(confidence)) {
    return 'Unknown';
  }
  return `${Math.round(confidence * 100)}% match`;
}

/**
 * Computes difference between AI triage suggestion and final decision.
 * Identifies whether divergence was caused by automated domain rules or staff overrides.
 *
 * @param ai - Raw AI triage suggestion or null
 * @param final - Final operational triage decision
 * @param rules - Rules applied by the deterministic domain engine
 * @param events - Audit timeline events
 * @returns Array of decision changes
 */
export function describeDecisionChange(
  ai: TriageSuggestion | null | undefined,
  final: DecisionDecisionSnapshot,
  rules: readonly AppliedRule[] = [],
  events: readonly DecisionEventSnapshot[] = []
): DecisionChange[] {
  const changes: DecisionChange[] = [];
  if (!ai) return changes;

  // 1. Urgency change
  if (ai.urgency !== final.urgency) {
    const overrideEvent = events
      .slice()
      .reverse()
      .find((e) => e.note?.toLowerCase().includes('override') || e.note?.toLowerCase().includes('urgency'));

    if (overrideEvent) {
      changes.push({
        field: 'Urgency',
        from: ai.urgency,
        to: final.urgency,
        author: 'staff',
        reason: overrideEvent.note,
      });
    } else {
      const ruleReason = rules.map((r) => r.label).join('; ') || 'Domain SLA rules engine';
      changes.push({
        field: 'Urgency',
        from: ai.urgency,
        to: final.urgency,
        author: 'automatic',
        reason: ruleReason,
      });
    }
  }

  // 2. Category change
  if (ai.category !== final.category) {
    const overrideEvent = events
      .slice()
      .reverse()
      .find((e) => e.note?.toLowerCase().includes('category') || e.note?.toLowerCase().includes('override'));

    changes.push({
      field: 'Category',
      from: ai.category,
      to: final.category,
      author: overrideEvent ? 'staff' : 'automatic',
      reason: overrideEvent?.note || 'Taxonomy mapping rules',
    });
  }

  return changes;
}
