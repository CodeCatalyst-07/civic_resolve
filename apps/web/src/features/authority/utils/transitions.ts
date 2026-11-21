import { Status } from '@civicresolve/shared';

/**
 * Fallback static lifecycle transitions permitted for municipal authorities.
 * Strictly mirrors domain/status.ts AUTHORITY_TRANSITIONS.
 */
const DEFAULT_AUTHORITY_TRANSITIONS: Record<Status, Status[]> = {
  [Status.SUBMITTED]: [Status.UNDER_REVIEW, Status.REJECTED],
  [Status.UNDER_REVIEW]: [Status.ASSIGNED, Status.REJECTED],
  [Status.ASSIGNED]: [Status.IN_PROGRESS],
  [Status.IN_PROGRESS]: [Status.RESOLVED],
  [Status.RESOLVED]: [Status.CLOSED],
  [Status.REOPENED]: [Status.UNDER_REVIEW, Status.IN_PROGRESS],
  [Status.CLOSED]: [],
  [Status.REJECTED]: [],
};

/**
 * Resolves available legal target lifecycle statuses for an authority actor.
 * Prefers live backend metadata map from /api/meta when present.
 *
 * @param currentStatus - Current lifecycle status of the grievance
 * @param metaTransitions - Optional transition map loaded from /api/meta
 * @returns Array of legal target Status values
 */
export function getAvailableTransitions(
  currentStatus: Status,
  metaTransitions?: Partial<Record<Status, Status[]>>
): Status[] {
  if (metaTransitions && metaTransitions[currentStatus]) {
    return metaTransitions[currentStatus] || [];
  }
  return DEFAULT_AUTHORITY_TRANSITIONS[currentStatus] || [];
}
