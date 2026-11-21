import type { Status } from '@civicresolve/shared';

/**
 * Resolves available legal target lifecycle statuses for an authority actor.
 * Reads dynamically from the state machine published by /api/meta.
 *
 * @param currentStatus - Current lifecycle status of the grievance
 * @param metaTransitions - Transition map loaded dynamically from /api/meta
 * @returns Array of legal target Status values
 */
export function getAvailableTransitions(
  currentStatus: Status,
  metaTransitions?: Partial<Record<Status, Status[]>>
): Status[] {
  if (metaTransitions && metaTransitions[currentStatus]) {
    return [...(metaTransitions[currentStatus] || [])];
  }
  return [];
}
