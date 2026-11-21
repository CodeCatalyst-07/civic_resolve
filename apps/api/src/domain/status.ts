import {
  Status,
  Role,
  ok,
  err,
  type Result,
  type Ticket,
  type TicketEvent,
} from '@civicresolve/shared';
import { DOMAIN_MESSAGES } from './messages.js';

/**
 * Valid state transitions for the civic grievance lifecycle.
 * Defines terminal states ('closed', 'rejected') and permitted flows.
 */
export const LEGAL_TRANSITIONS: Readonly<Record<Status, readonly Status[]>> = Object.freeze({
  [Status.SUBMITTED]: Object.freeze([Status.UNDER_REVIEW, Status.REJECTED]),
  [Status.UNDER_REVIEW]: Object.freeze([Status.ASSIGNED, Status.REJECTED]),
  [Status.ASSIGNED]: Object.freeze([Status.IN_PROGRESS, Status.UNDER_REVIEW]),
  [Status.IN_PROGRESS]: Object.freeze([Status.RESOLVED, Status.ASSIGNED]),
  [Status.RESOLVED]: Object.freeze([Status.CLOSED, Status.REOPENED]),
  [Status.REOPENED]: Object.freeze([Status.UNDER_REVIEW, Status.ASSIGNED, Status.IN_PROGRESS]),
  [Status.CLOSED]: Object.freeze([]),
  [Status.REJECTED]: Object.freeze([]),
});

/**
 * Contextual metadata required for performing a ticket state transition.
 */
export interface TransitionContext {
  readonly actor_role: Role;
  readonly note?: string;
  readonly now: Date;
}

/**
 * Transitions a ticket from its current state to a target state following strict business rules.
 *
 * ### Governance Rules:
 * 1. Only legal lifecycle paths defined in LEGAL_TRANSITIONS are allowed.
 * 2. Closed and Rejected states are permanently terminal.
 * 3. Citizens may ONLY reopen tickets, strictly from 'resolved', and only once per ticket (`reopen_count < 1`).
 * 4. Resolving a ticket by municipal authorities strictly requires an explanatory note detailing actions taken.
 * 5. Returns a new immutable Ticket entity with an appended TicketEvent (never mutates inputs).
 *
 * @param ticket - The current ticket instance
 * @param to - The target status
 * @param context - Transition context (actor role, optional note, timestamp)
 * @returns Result containing the updated Ticket or an error string
 */
export function transitionTicket(
  ticket: Ticket,
  to: Status,
  context: TransitionContext
): Result<Ticket, string> {
  const allowedNextStates = LEGAL_TRANSITIONS[ticket.status];

  // Rule 1 & 2: Verify transition legality
  if (!allowedNextStates.includes(to)) {
    return err(DOMAIN_MESSAGES.lifecycle.illegalTransition(ticket.status, to));
  }

  // Rule 3: Role-based transition authorization for citizens
  if (context.actor_role === Role.CITIZEN) {
    if (to !== Status.REOPENED) {
      return err(DOMAIN_MESSAGES.lifecycle.citizenUnauthorizedTransition);
    }
    if (ticket.status !== Status.RESOLVED) {
      return err(DOMAIN_MESSAGES.lifecycle.citizenReopenOnlyFromResolved);
    }
    if (ticket.reopen_count >= 1) {
      return err(DOMAIN_MESSAGES.lifecycle.citizenReopenLimitReached);
    }
  }

  // Rule 4: Authority resolution requires an explanatory note
  if (to === Status.RESOLVED) {
    if (!context.note || context.note.trim().length === 0) {
      return err(DOMAIN_MESSAGES.lifecycle.resolveNoteRequired);
    }
  }

  // Build immutable transition audit event
  const event: TicketEvent = Object.freeze({
    id: `evt-${context.now.getTime()}`,
    status: to,
    actor_role: context.actor_role,
    note: context.note?.trim(),
    at: context.now.toISOString(),
  });

  // Construct new ticket entity
  const nextTicket: Ticket = Object.freeze({
    ...ticket,
    status: to,
    reopen_count: to === Status.REOPENED ? ticket.reopen_count + 1 : ticket.reopen_count,
    events: [...ticket.events, event],
  });

  return ok(nextTicket);
}
