import { describe, it, expect } from 'vitest';
import { Status, Category, Urgency } from '@civicresolve/shared';
import { toSearchParams, fromSearchParams } from './filters.js';

describe('Authority Queue Filters Utility', () => {
  it('serializes full queue filters into URLSearchParams', () => {
    const params = toSearchParams({
      status: Status.IN_PROGRESS,
      category: Category.POTHOLE,
      urgency: Urgency.HIGH,
      ward: 'Ward 12 - Indiranagar',
      overdue: true,
      cursor: 'cursor-123',
    });

    expect(params.get('status')).toBe('in_progress');
    expect(params.get('category')).toBe('pothole');
    expect(params.get('urgency')).toBe('high');
    expect(params.get('ward')).toBe('Ward 12 - Indiranagar');
    expect(params.get('overdue')).toBe('true');
    expect(params.get('cursor')).toBe('cursor-123');
  });

  it('omits undefined, empty, or false filters', () => {
    const params = toSearchParams({
      status: undefined,
      category: undefined,
      ward: '   ',
      overdue: false,
    });

    expect(params.toString()).toBe('');
  });

  it('parses valid search params into QueueFilters', () => {
    const params = new URLSearchParams(
      'status=assigned&category=garbage&urgency=critical&ward=Ward%201&overdue=true&cursor=cur-abc'
    );
    const filters = fromSearchParams(params);

    expect(filters.status).toBe(Status.ASSIGNED);
    expect(filters.category).toBe(Category.GARBAGE);
    expect(filters.urgency).toBe(Urgency.CRITICAL);
    expect(filters.ward).toBe('Ward 1');
    expect(filters.overdue).toBe(true);
    expect(filters.cursor).toBe('cur-abc');
  });

  it('discards unknown or malicious enum values', () => {
    const params = new URLSearchParams(
      'status=hacked&category=malicious&urgency=extreme&overdue=maybe'
    );
    const filters = fromSearchParams(params);

    expect(filters.status).toBeUndefined();
    expect(filters.category).toBeUndefined();
    expect(filters.urgency).toBeUndefined();
    expect(filters.overdue).toBeUndefined();
  });
});
