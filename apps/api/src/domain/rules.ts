import {
  Urgency,
  type AppliedRule,
  type FinalDecision,
  type TriageSuggestion,
  type Department,
} from '@civicresolve/shared';
import { DOMAIN_CONFIG, type DomainConfig } from './config.js';
import { DOMAIN_MESSAGES } from './messages.js';
import { resolveDepartment } from './taxonomy.js';
import { findSensitiveSitesNearby, type SensitiveSite } from './geo.js';
import { detectImmediateDanger } from './emergency.js';

/**
 * Contextual metadata injected into the deterministic rules engine.
 */
export interface RuleContext {
  readonly description: string;
  readonly location?: {
    readonly lat?: number;
    readonly lng?: number;
    readonly address?: string;
  };
  readonly sites?: readonly SensitiveSite[];
  readonly duplicateCount?: number;
  readonly now: Date;
  readonly ward?: string;
  readonly wardOverrides?: Readonly<Record<string, Department>>;
}

const URGENCY_LEVELS: Readonly<Record<Urgency, number>> = Object.freeze({
  [Urgency.LOW]: 0,
  [Urgency.MEDIUM]: 1,
  [Urgency.HIGH]: 2,
  [Urgency.CRITICAL]: 3,
});

const LEVEL_TO_URGENCY: readonly Urgency[] = Object.freeze([
  Urgency.LOW,
  Urgency.MEDIUM,
  Urgency.HIGH,
  Urgency.CRITICAL,
]);

/**
 * Maps an urgency enum value to its comparable numeric priority (0 to 3).
 */
export function urgencyToLevel(urgency: Urgency): number {
  return URGENCY_LEVELS[urgency];
}

/**
 * Maps a numeric priority level (0 to 3) to its Urgency enum value.
 */
export function levelToUrgency(level: number): Urgency {
  const boundedLevel = Math.max(0, Math.min(3, Math.floor(level)));
  return LEVEL_TO_URGENCY[boundedLevel]!;
}

/**
 * Increments an urgency value by one level, capping at Critical.
 */
export function boostUrgency(urgency: Urgency): Urgency {
  const current = urgencyToLevel(urgency);
  return levelToUrgency(current + 1);
}

/**
 * Applies deterministic civic domain rules in strict sequential order.
 *
 * ### Invariant Safety Guarantee:
 * Rules may **ONLY RAISE** urgency, never lower it.
 * The AI model's urgency suggestion acts as a minimum floor unless raised by physical hazard,
 * public safety criteria, school/hospital proximity, or duplicate report volume.
 *
 * @param suggestion - The AI triage suggestion
 * @param context - Contextual complaint metadata (description, location, sensitive sites, duplicates)
 * @param config - Domain configuration (defaults to DOMAIN_CONFIG)
 * @returns Fully resolved, explainable FinalDecision
 */
export function applyRules(
  suggestion: TriageSuggestion,
  context: RuleContext,
  config: DomainConfig = DOMAIN_CONFIG
): FinalDecision {
  let currentUrgency = suggestion.urgency;
  const appliedRules: AppliedRule[] = [];
  let emergencyNotice = false;

  // Rule 1: Immediate Danger Floor
  // Hazard keywords (live wire, open manhole, gas leak) mandate an immediate Critical floor.
  const isDangerDetected = detectImmediateDanger(context.description);
  if (isDangerDetected) {
    emergencyNotice = true;
    if (urgencyToLevel(currentUrgency) < urgencyToLevel(Urgency.CRITICAL)) {
      currentUrgency = Urgency.CRITICAL;
      appliedRules.push({
        id: 'R1_IMMEDIATE_DANGER',
        label: DOMAIN_MESSAGES.rules.r1DangerFloor,
        effect: DOMAIN_MESSAGES.rules.effectRaisedToCritical,
      });
    }
  }

  // Rule 2: Safety Floor
  // If the suggestion is flagged as safety_critical, enforce a High urgency minimum.
  if (suggestion.safety_critical) {
    if (urgencyToLevel(currentUrgency) < urgencyToLevel(Urgency.HIGH)) {
      currentUrgency = Urgency.HIGH;
      appliedRules.push({
        id: 'R2_SAFETY_FLOOR',
        label: DOMAIN_MESSAGES.rules.r2SafetyFloor,
        effect: DOMAIN_MESSAGES.rules.effectRaisedToHigh,
      });
    }
  }

  // Rule 3: Sensitive Location Boost
  // A school or hospital within sensitiveSiteRadiusMeters (200m) boosts urgency by one level.
  if (
    context.location?.lat != null &&
    context.location?.lng != null &&
    context.sites &&
    context.sites.length > 0
  ) {
    const nearbySites = findSensitiveSitesNearby(
      { lat: context.location.lat, lng: context.location.lng },
      context.sites,
      config.sensitiveSiteRadiusMeters
    );

    if (nearbySites.length > 0) {
      const prevLevel = urgencyToLevel(currentUrgency);
      const boosted = boostUrgency(currentUrgency);
      if (urgencyToLevel(boosted) > prevLevel) {
        currentUrgency = boosted;
        appliedRules.push({
          id: 'R3_LOCATION_BOOST',
          label: DOMAIN_MESSAGES.rules.r3LocationBoost,
          effect: DOMAIN_MESSAGES.rules.effectRaisedOneLevel,
        });
      }
    }
  }

  // Rule 4: Duplicate Report Boost
  // Multiple community reports at or above the threshold boost urgency by one level.
  if ((context.duplicateCount ?? 0) >= config.duplicateBoostThreshold) {
    const prevLevel = urgencyToLevel(currentUrgency);
    const boosted = boostUrgency(currentUrgency);
    if (urgencyToLevel(boosted) > prevLevel) {
      currentUrgency = boosted;
      appliedRules.push({
        id: 'R4_DUPLICATE_BOOST',
        label: DOMAIN_MESSAGES.rules.r4DuplicateBoost,
        effect: DOMAIN_MESSAGES.rules.effectRaisedOneLevel,
      });
    }
  }

  // Municipal department dispatching: strictly deterministic table, never chosen by the model
  const department = resolveDepartment(
    suggestion.category,
    context.ward,
    context.wardOverrides
  );

  return Object.freeze({
    urgency: currentUrgency,
    category: suggestion.category,
    department,
    applied_rules: appliedRules,
    emergency_notice: emergencyNotice,
    needs_manual_triage: false,
    ai_suggestion: suggestion,
  });
}
