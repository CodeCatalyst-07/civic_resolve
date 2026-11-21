import type { Category, Ticket, TicketQuery, Result } from '@civicresolve/shared';

/**
 * Standard repository error codes.
 */
export type RepoErrorCode = 'not_found' | 'conflict' | 'unavailable' | 'internal';

/**
 * Structured repository error object without leaking internal driver details.
 */
export interface RepoError {
  readonly code: RepoErrorCode;
  readonly message: string;
}

/**
 * Grievance ticket persistence repository contract.
 * Enforces optimistic concurrency on updates via `ticket.version`.
 */
export interface TicketRepository {
  /**
   * Persists a new grievance ticket.
   */
  create(ticket: Ticket): Promise<Result<Ticket, RepoError>>;

  /**
   * Retrieves a single ticket by its unique public ID.
   * Returns ok(null) if the ticket does not exist.
   */
  getById(id: string): Promise<Result<Ticket | null, RepoError>>;

  /**
   * Updates an existing ticket using optimistic concurrency checking on `ticket.version`.
   * Returns a `conflict` error if the stored ticket version differs.
   * On success, increments `version` by 1 and returns the updated ticket.
   */
  update(ticket: Ticket): Promise<Result<Ticket, RepoError>>;

  /**
   * Lists open tickets (status != resolved && status != closed && status != rejected)
   * for duplicate detection. Bounded, sorted newest first, maximum 200 items.
   */
  listOpen(options?: { category?: Category; since?: string }): Promise<Result<Ticket[], RepoError>>;

  /**
   * Queries tickets with multi-field filtering, sorting by urgency then due date,
   * and opaque cursor-based pagination.
   */
  query(query: TicketQuery): Promise<Result<{ tickets: Ticket[]; nextCursor?: string }, RepoError>>;

  /**
   * Lists recently resolved tickets for public transparency. Bounded by limit.
   */
  listResolvedRecent(limit: number): Promise<Result<Ticket[], RepoError>>;

  /**
   * Counts tickets matching optional filter criteria for dashboard aggregations.
   */
  count(filters?: Partial<TicketQuery>): Promise<Result<number, RepoError>>;
}
