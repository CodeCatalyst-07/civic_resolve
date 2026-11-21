import {
  STATUSES,
  CATEGORIES,
  URGENCIES,
  type Status,
  type Category,
  type Urgency,
} from '@civicresolve/shared';
import type { QueueFilters } from '../types.js';

const VALID_STATUSES = new Set<string>(STATUSES);
const VALID_CATEGORIES = new Set<string>(CATEGORIES);
const VALID_URGENCIES = new Set<string>(URGENCIES);

/**
 * Serializes authority queue filters into URLSearchParams.
 * Omits empty, default, or undefined filter parameters.
 */
export function toSearchParams(filters: QueueFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.status && VALID_STATUSES.has(filters.status)) {
    params.set('status', filters.status);
  }
  if (filters.category && VALID_CATEGORIES.has(filters.category)) {
    params.set('category', filters.category);
  }
  if (filters.urgency && VALID_URGENCIES.has(filters.urgency)) {
    params.set('urgency', filters.urgency);
  }
  if (filters.ward && filters.ward.trim() !== '') {
    params.set('ward', filters.ward.trim());
  }
  if (filters.overdue === true) {
    params.set('overdue', 'true');
  }
  if (filters.cursor && filters.cursor.trim() !== '') {
    params.set('cursor', filters.cursor.trim());
  }

  return params;
}

/**
 * Parses and validates authority queue filters from URLSearchParams.
 * Sanitizes input and rejects invalid or unknown enum values.
 */
export function fromSearchParams(searchParams: URLSearchParams): QueueFilters {
  const filters: QueueFilters = {};

  const status = searchParams.get('status');
  if (status && VALID_STATUSES.has(status)) {
    filters.status = status as Status;
  }

  const category = searchParams.get('category');
  if (category && VALID_CATEGORIES.has(category)) {
    filters.category = category as Category;
  }

  const urgency = searchParams.get('urgency');
  if (urgency && VALID_URGENCIES.has(urgency)) {
    filters.urgency = urgency as Urgency;
  }

  const ward = searchParams.get('ward');
  if (ward && ward.trim() !== '') {
    filters.ward = ward.trim();
  }

  const overdue = searchParams.get('overdue');
  if (overdue === 'true') {
    filters.overdue = true;
  }

  const cursor = searchParams.get('cursor');
  if (cursor && cursor.trim() !== '') {
    filters.cursor = cursor.trim();
  }

  return filters;
}
