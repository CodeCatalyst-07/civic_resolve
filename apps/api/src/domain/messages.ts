import type { MissingInfoField } from '@civicresolve/shared';

/**
 * Centralized user-facing messages written in simple, plain language (~8th-grade reading level).
 * Designed for immediate clarity, accessibility, and straightforward future localization.
 */
export const DOMAIN_MESSAGES = Object.freeze({
  /** Rejection messages when non-civic matters or spam are submitted */
  rejection: Object.freeze({
    reason: 'This request does not appear to be a municipal civic issue.',
    guidance:
      'CivicResolve handles local municipal problems such as potholes, garbage collection, broken streetlights, water pipe leaks, fallen trees, and sewer blockages. For general or emergency police/fire assistance, please dial 112.',
  }),

  /** Emergency notices for immediate dangers (live wires, gas leaks, collapses) */
  emergency: Object.freeze({
    dangerNotice:
      'Emergency Warning: Your report describes a potentially dangerous situation. If anyone is in immediate physical danger, please call 112 immediately.',
  }),

  /** Plain-language follow-up questions tailored to missing report details */
  followUpQuestions: Object.freeze({
    location: 'Could you share the street name, junction, or area where this issue is located?',
    landmark: 'Is there a nearby landmark, shop, or building to help the municipal team find it quickly?',
    issue_type: 'Could you describe what kind of problem this is in a few more words?',
    severity: 'How serious is the issue? For example, is it blocking traffic or causing immediate flooding?',
    fallback_clarification:
      'Could you provide a few more details so the municipal team can help resolve this issue?',
  } satisfies Record<MissingInfoField | 'fallback_clarification', string>),

  /** Human-readable explanation labels for deterministic rules */
  rules: Object.freeze({
    r1DangerFloor: 'Immediate hazard detected in complaint description (emergency safety rule)',
    r2SafetyFloor: 'Marked as a potential public safety risk',
    r3LocationBoost: 'Located near a school or hospital (sensitive area priority rule)',
    r4DuplicateBoost: 'Multiple residents reported this same issue nearby (community frequency rule)',
    effectRaisedToCritical: 'Urgency raised to Critical',
    effectRaisedToHigh: 'Urgency raised to High',
    effectRaisedOneLevel: 'Urgency raised by one level',
  }),

  /** Fallback offline classification rationale */
  fallback: Object.freeze({
    reason: 'Automatically matched from report keywords while smart assistant is offline.',
  }),

  /** SLA escalation audit event note */
  sla: Object.freeze({
    escalationNote: 'Automatically escalated due to resolution timeline breach (SLA policy).',
  }),

  /** Ticket lifecycle transition validation notes */
  lifecycle: Object.freeze({
    resolveNoteRequired: 'Resolving a ticket requires an explanation note by the municipal authority.',
    citizenReopenOnlyFromResolved: 'Citizens may only reopen tickets that are marked as Resolved.',
    citizenReopenLimitReached: 'This ticket has already been reopened the maximum allowed number of times (1).',
    illegalTransition: (from: string, to: string) =>
      `Cannot move ticket status from "${from}" to "${to}". This transition is not permitted.`,
    citizenUnauthorizedTransition: 'Citizens are only permitted to reopen resolved tickets.',
  }),
});

/**
 * Returns a follow-up question for a given missing info field.
 *
 * @param field - The missing field category
 * @returns Plain language question string
 */
export function getFollowUpQuestion(field?: MissingInfoField): string {
  if (field && field in DOMAIN_MESSAGES.followUpQuestions) {
    return DOMAIN_MESSAGES.followUpQuestions[field];
  }
  return DOMAIN_MESSAGES.followUpQuestions.fallback_clarification;
}
