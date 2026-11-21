import {
  Role,
  type Urgency,
  type Ticket,
  type TicketEvent,
} from '@civicresolve/shared';
import { DOMAIN_CONFIG, type DomainConfig } from './config.js';
import { DOMAIN_MESSAGES } from './messages.js';
import { boostUrgency } from './rules.js';

/**
 * Computes the target SLA deadline for a ticket given its urgency tier and creation timestamp.
 *
 * @param urgency - Urgency tier (critical, high, medium, low)
 * @param createdAt - Ticket creation Date
 * @param config - Domain configuration tunables (defaults to DOMAIN_CONFIG)
 * @returns Date by which the ticket should be resolved
 */
export function computeDueAt(
  urgency: Urgency,
  createdAt: Date,
  config: DomainConfig = DOMAIN_CONFIG
): Date {
  const slaHours = config.slaHours[urgency];
  const dueMs = createdAt.getTime() + slaHours * 60 * 60 * 1000;
  return new Date(dueMs);
}

/**
 * Determines whether an open ticket has exceeded its resolution SLA deadline.
 * Terminal states ('resolved', 'closed', 'rejected') are never overdue.
 *
 * @param ticket - The ticket entity to inspect
 * @param now - Current timestamp injected as parameter
 * @returns True if ticket is active and current time is past due_at
 */
export function isOverdue(ticket: Ticket, now: Date): boolean {
  if (
    ticket.status === 'resolved' ||
    ticket.status === 'closed' ||
    ticket.status === 'rejected'
  ) {
    return false;
  }

  const dueMs = new Date(ticket.due_at).getTime();
  return now.getTime() > dueMs;
}

/**
 * Evaluates a ticket for SLA breach. If overdue and not previously escalated:
 * - Raises urgency by one level (capped at Critical)
 * - Sets escalated = true
 * - Appends an automatic SLA escalation TicketEvent
 *
 * If not overdue or already escalated, returns the ticket completely unchanged (immutable).
 *
 * @param ticket - Input ticket (never mutated)
 * @param now - Current timestamp injected as parameter
 * @param _config - Optional domain configuration
 * @returns Newly escalated ticket or unchanged ticket instance
 */
export function escalateIfOverdue(
  ticket: Ticket,
  now: Date,
  _config: DomainConfig = DOMAIN_CONFIG
): Ticket {
  if (!isOverdue(ticket, now) || ticket.escalated) {
    return ticket;
  }

  const escalatedUrgency = boostUrgency(ticket.urgency);

  const escalationEvent: TicketEvent = Object.freeze({
    id: `evt-esc-${now.getTime()}`,
    status: ticket.status,
    actor_role: Role.AUTHORITY,
    note: DOMAIN_MESSAGES.sla.escalationNote,
    at: now.toISOString(),
  });

  return Object.freeze({
    ...ticket,
    urgency: escalatedUrgency,
    escalated: true,
    events: [...ticket.events, escalationEvent],
  });
}
