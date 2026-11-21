// Configuration
export { DOMAIN_CONFIG, type DomainConfig } from './config.js';

// User-facing plain language messages
export { DOMAIN_MESSAGES, getFollowUpQuestion } from './messages.js';

// Taxonomy & Department resolution
export { resolveDepartment, DEPARTMENT_METADATA } from './taxonomy.js';

// Geographic calculations
export {
  haversineMeters,
  isWithinMeters,
  findSensitiveSitesNearby,
  type GeoPoint,
  type SensitiveSite,
} from './geo.js';

// Emergency danger detection
export { detectImmediateDanger } from './emergency.js';
export { DANGER_KEYWORDS, CATEGORY_KEYWORDS } from './data/keywords.js';

// Deterministic rules engine
export {
  applyRules,
  urgencyToLevel,
  levelToUrgency,
  boostUrgency,
  type RuleContext,
} from './rules.js';

// Fallback classifier and spam detection
export { classifyByKeywords, looksLikeSpam } from './fallback.js';

// Central triage decision engine
export { decideTriage, type TriageInput, type TriageOutcome } from './triage.js';

// Duplicate detection
export {
  findDuplicateCandidates,
  tokenizeText,
  jaccardSimilarity,
  type ReportSummary,
  type DuplicateCandidate,
} from './duplicates.js';

// SLA calculations & escalation
export { computeDueAt, isOverdue, escalateIfOverdue } from './sla.js';

// Ticket lifecycle transitions
export {
  transitionTicket,
  LEGAL_TRANSITIONS,
  AUTHORITY_TRANSITIONS,
  type TransitionContext,
} from './status.js';

// Public ticket identification
export { generateTicketId, isValidTicketId } from './ticketId.js';
