import {
  Status,
  type Category,
  type Ticket,
  type TicketQuery,
  type Result,
  ok,
  err,
} from '@civicresolve/shared';
import { urgencyToLevel } from '../domain/rules.js';
import type { TicketRepository, RepoError } from './types.js';

/**
 * In-memory thread-safe grievance repository using structuredClone for mutation isolation.
 * Provides deterministic ordering, optimistic concurrency validation, and pagination.
 */
export class InMemoryTicketRepository implements TicketRepository {
  private readonly tickets = new Map<string, Ticket>();

  public constructor(initialTickets?: readonly Ticket[]) {
    if (initialTickets) {
      for (const ticket of initialTickets) {
        this.tickets.set(ticket.id, structuredClone(ticket));
      }
    }
  }

  public async create(ticket: Ticket): Promise<Result<Ticket, RepoError>> {
    const clone = structuredClone({
      ...ticket,
      version: ticket.version ?? 1,
    });
    this.tickets.set(clone.id, clone);
    return ok(structuredClone(clone));
  }

  public async getById(id: string): Promise<Result<Ticket | null, RepoError>> {
    const stored = this.tickets.get(id);
    if (!stored) {
      return ok(null);
    }
    return ok(structuredClone(stored));
  }

  public async update(ticket: Ticket): Promise<Result<Ticket, RepoError>> {
    const existing = this.tickets.get(ticket.id);
    if (!existing) {
      return err({
        code: 'not_found',
        message: `Ticket with id "${ticket.id}" not found`,
      });
    }

    if (existing.version !== ticket.version) {
      return err({
        code: 'conflict',
        message: `Optimistic concurrency conflict on ticket "${ticket.id}": stored version is ${existing.version}, update specified version ${ticket.version}`,
      });
    }

    const updated = structuredClone({
      ...ticket,
      version: existing.version + 1,
    });

    this.tickets.set(ticket.id, updated);
    return ok(structuredClone(updated));
  }

  public async listOpen(options?: {
    category?: Category;
    since?: string;
  }): Promise<Result<Ticket[], RepoError>> {
    const openStatuses: readonly Status[] = [
      Status.SUBMITTED,
      Status.UNDER_REVIEW,
      Status.ASSIGNED,
      Status.IN_PROGRESS,
      Status.REOPENED,
    ];

    const results: Ticket[] = [];

    for (const ticket of this.tickets.values()) {
      if (!openStatuses.includes(ticket.status)) {
        continue;
      }

      if (options?.category && ticket.category !== options.category) {
        continue;
      }

      if (options?.since && ticket.created_at < options.since) {
        continue;
      }

      results.push(ticket);
    }

    // Sort newest first
    results.sort((a, b) => b.created_at.localeCompare(a.created_at));

    // Bound to maximum 200 items for duplicate detection
    const bounded = results.slice(0, 200).map((t) => structuredClone(t));
    return ok(bounded);
  }

  public async query(
    query: TicketQuery
  ): Promise<Result<{ tickets: Ticket[]; nextCursor?: string }, RepoError>> {
    const nowIso = new Date().toISOString();
    const matching: Ticket[] = [];

    for (const ticket of this.tickets.values()) {
      if (query.status && ticket.status !== query.status) {
        continue;
      }

      if (query.category && ticket.category !== query.category) {
        continue;
      }

      if (query.ward && ticket.ward !== query.ward) {
        continue;
      }

      if (query.urgency && ticket.urgency !== query.urgency) {
        continue;
      }

      if (query.overdue !== undefined) {
        const isTerminal =
          ticket.status === Status.RESOLVED ||
          ticket.status === Status.CLOSED ||
          ticket.status === Status.REJECTED;
        const isOverdue = !isTerminal && (ticket.escalated || ticket.due_at < nowIso);
        if (query.overdue !== isOverdue) {
          continue;
        }
      }

      matching.push(ticket);
    }

    // Deterministic sorting: primary = urgency descending (critical > high > medium > low),
    // secondary = due_at ascending
    matching.sort((a, b) => {
      const urgA = urgencyToLevel(a.urgency);
      const urgB = urgencyToLevel(b.urgency);
      if (urgA !== urgB) {
        return urgB - urgA; // highest urgency first
      }
      return a.due_at.localeCompare(b.due_at);
    });

    // Cursor pagination (cursor encodes the last seen ticket id)
    let startIndex = 0;
    if (query.cursor) {
      try {
        const decodedId = Buffer.from(query.cursor, 'base64').toString('utf8');
        const foundIdx = matching.findIndex((t) => t.id === decodedId);
        if (foundIdx >= 0) {
          startIndex = foundIdx + 1;
        }
      } catch {
        // Invalid cursor token starts from 0
      }
    }

    const limit = query.limit ?? 20;
    const page = matching.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < matching.length;
    const nextCursor =
      hasMore && page.length > 0
        ? Buffer.from(page[page.length - 1]!.id, 'utf8').toString('base64')
        : undefined;

    return ok({
      tickets: page.map((t) => structuredClone(t)),
      nextCursor,
    });
  }

  public async listResolvedRecent(limit: number): Promise<Result<Ticket[], RepoError>> {
    const resolved: Ticket[] = [];

    for (const ticket of this.tickets.values()) {
      if (ticket.status === Status.RESOLVED) {
        resolved.push(ticket);
      }
    }

    resolved.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const page = resolved.slice(0, Math.max(1, limit)).map((t) => structuredClone(t));
    return ok(page);
  }

  public async count(filters?: Partial<TicketQuery>): Promise<Result<number, RepoError>> {
    if (!filters || Object.keys(filters).length === 0) {
      return ok(this.tickets.size);
    }

    const nowIso = new Date().toISOString();
    let count = 0;

    for (const ticket of this.tickets.values()) {
      if (filters.status && ticket.status !== filters.status) continue;
      if (filters.category && ticket.category !== filters.category) continue;
      if (filters.ward && ticket.ward !== filters.ward) continue;
      if (filters.urgency && ticket.urgency !== filters.urgency) continue;
      if (filters.overdue !== undefined) {
        const isTerminal =
          ticket.status === Status.RESOLVED ||
          ticket.status === Status.CLOSED ||
          ticket.status === Status.REJECTED;
        const isOverdue = !isTerminal && (ticket.escalated || ticket.due_at < nowIso);
        if (filters.overdue !== isOverdue) continue;
      }
      count++;
    }

    return ok(count);
  }

  /**
   * Resets repository contents (used for test teardown and deterministic seed resets).
   */
  public clear(): void {
    this.tickets.clear();
  }
}
