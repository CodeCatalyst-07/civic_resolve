import type {
  Category,
  Urgency,
  Status,
} from '@civicresolve/shared';
import { CATEGORY_LABELS, URGENCY_LABELS, STATUS_LABELS } from '../content/labels.js';

/**
 * Formats an ISO datetime string into human-readable Indian standard format (e.g., "21 Nov 2026, 02:30 PM").
 */
export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return iso;
  }
}

/**
 * Formats an ISO datetime string into short date (e.g. "21 Nov 2026").
 */
export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

/**
 * Formats duration in hours into plain language (e.g., "48 hours (2 days)").
 */
export function formatHours(hours: number): string {
  if (hours <= 0) return 'Immediate';
  if (hours < 24) return `${hours} hours`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${hours} hours (~${days} ${days === 1 ? 'day' : 'days'})`;
}

/**
 * Normalizes ticket ID display.
 */
export function formatTicketId(id: string): string {
  return id.trim().toUpperCase();
}

export function formatUrgency(urgency: Urgency): string {
  return URGENCY_LABELS[urgency]?.label || urgency;
}

export function formatStatus(status: Status): string {
  return STATUS_LABELS[status]?.label || status;
}

export function formatCategory(category: Category): string {
  return CATEGORY_LABELS[category]?.label || category;
}
