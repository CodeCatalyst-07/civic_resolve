import { describe, it, expect } from 'vitest';
import { Status } from '@civicresolve/shared';
import { getAvailableTransitions } from './transitions.js';

describe('Authority Lifecycle Transitions', () => {
  it('returns legal transitions from default fallback', () => {
    expect(getAvailableTransitions(Status.SUBMITTED)).toEqual([
      Status.UNDER_REVIEW,
      Status.REJECTED,
    ]);
    expect(getAvailableTransitions(Status.UNDER_REVIEW)).toEqual([
      Status.ASSIGNED,
      Status.REJECTED,
    ]);
    expect(getAvailableTransitions(Status.IN_PROGRESS)).toEqual([Status.RESOLVED]);
    expect(getAvailableTransitions(Status.RESOLVED)).toEqual([Status.CLOSED]);
    expect(getAvailableTransitions(Status.CLOSED)).toEqual([]);
    expect(getAvailableTransitions(Status.REJECTED)).toEqual([]);
  });

  it('prefers transitions provided by /api/meta', () => {
    const metaTransitions: Record<Status, Status[]> = {
      [Status.SUBMITTED]: [Status.UNDER_REVIEW],
      [Status.UNDER_REVIEW]: [],
      [Status.ASSIGNED]: [],
      [Status.IN_PROGRESS]: [],
      [Status.RESOLVED]: [],
      [Status.REOPENED]: [],
      [Status.CLOSED]: [],
      [Status.REJECTED]: [],
    };

    expect(getAvailableTransitions(Status.SUBMITTED, metaTransitions)).toEqual([
      Status.UNDER_REVIEW,
    ]);
  });
});
