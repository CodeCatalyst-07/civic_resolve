import type { Urgency } from '@civicresolve/shared';

/**
 * Domain configuration tunables for CivicResolve triage, duplicate detection, and SLA management.
 */
export interface DomainConfig {
  /** Confidence score threshold below which follow-up questions are triggered (0 to 1) */
  readonly confidenceThreshold: number;
  /** Maximum number of clarifying follow-up question rounds allowed per report */
  readonly maxFollowUpRounds: number;
  /** Maximum geographic radius in meters for considering two reports as duplicates */
  readonly duplicateRadiusMeters: number;
  /** Maximum time window in days within which open reports are checked for duplication */
  readonly duplicateWindowDays: number;
  /** Number of duplicate reports required to boost urgency by one level */
  readonly duplicateBoostThreshold: number;
  /** Weight assigned to geographic proximity in candidate duplicate composite score (default 0.6) */
  readonly duplicateDistanceWeight: number;
  /** Weight assigned to lexical Jaccard similarity in candidate duplicate composite score (default 0.4) */
  readonly duplicateTextSimilarityWeight: number;
  /** Minimum composite score (0 to 1) for a ticket to be flagged as a duplicate candidate (default 0.5) */
  readonly duplicateThresholdScore: number;
  /** Proximity in meters to a school or hospital required to boost urgency */
  readonly sensitiveSiteRadiusMeters: number;
  /** Resolution SLA time limits in hours for each urgency tier */
  readonly slaHours: Readonly<Record<Urgency, number>>;
  /** National emergency telephone number */
  readonly emergencyNumber: string;
}

/**
 * Default immutable domain configuration.
 */
export const DOMAIN_CONFIG: DomainConfig = Object.freeze({
  confidenceThreshold: 0.6,
  maxFollowUpRounds: 2,
  duplicateRadiusMeters: 150,
  duplicateWindowDays: 14,
  duplicateBoostThreshold: 3,
  duplicateDistanceWeight: 0.6,
  duplicateTextSimilarityWeight: 0.4,
  duplicateThresholdScore: 0.5,
  sensitiveSiteRadiusMeters: 200,
  slaHours: Object.freeze({
    critical: 24,
    high: 72,
    medium: 168,
    low: 336,
  }),
  emergencyNumber: '112',
});
