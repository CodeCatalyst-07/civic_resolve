import { describe, it, expect } from 'vitest';
import { Status } from '@civicresolve/shared';
import { getAvailableTransitions } from './transitions.js';

describe('Authority Lifecycle Transitions', () => {
  it('returns empty array when meta transitions not yet loaded', () => {
    expect(getAvailableTransitions(Status.SUBMITTED)).toEqual([]);
    expect(getAvailableTransitions(Status.CLOSED)).toEqual([]);
  });

  it('reads legal transitions dynamically provided by /api/meta', () => {
    const metaTransitions: Record<Status, Status[]> = {
      [Status.SUBMITTED]: [Status.UNDER_REVIEW, Status.REJECTED],
      [Status.UNDER_REVIEW]: [Status.ASSIGNED, Status.REJECTED],
      [Status.ASSIGNED]: [Status.IN_PROGRESS],
      [Status.IN_PROGRESS]: [Status.RESOLVED],
      [Status.RESOLVED]: [Status.CLOSED],
      [Status.REOPENED]: [Status.UNDER_REVIEW, Status.IN_PROGRESS],
      [Status.CLOSED]: [],
      [Status.REJECTED]: [],
    };

    expect(getAvailableTransitions(Status.SUBMITTED, metaTransitions)).toEqual([
      Status.UNDER_REVIEW,
      Status.REJECTED,
    ]);
    expect(getAvailableTransitions(Status.IN_PROGRESS, metaTransitions)).toEqual([
      Status.RESOLVED,
    ]);
  });
});
