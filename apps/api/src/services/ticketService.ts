import {
  Category,
  Urgency,
  Status,
  Role,
  type Ticket,
  type PublicTicketView,
  type AuthorityTicketView,
  type AnalyzeReportInput,
  type SubmitReportInput,
  type StatusUpdateInput,
  type OverrideInput,
  type TicketQuery,
  type Result,
  ok,
  err,
  type AiSource,
} from '@civicresolve/shared';
import {
  generateTicketId,
  isValidTicketId,
  computeDueAt,
  isOverdue,
  escalateIfOverdue,
  transitionTicket,
  resolveDepartment,
  urgencyToLevel,
  levelToUrgency,
  applyRules,
  DEPARTMENT_METADATA,
  type TriageOutcome,
} from '../domain/index.js';
import type { TicketRepository } from '../repo/types.js';
import type { TriageService } from './triageService.js';
import type { GeocodingProvider } from './geocoding/types.js';
import { SENSITIVE_SITES } from '../data/sites.js';
import { logger } from '../lib/logger.js';

export interface TicketServiceContext {
  readonly repo: TicketRepository;
  readonly triageService: TriageService;
  readonly geocoding: GeocodingProvider;
  readonly now: () => Date;
  readonly randomBytes: (n: number) => Uint8Array;
}

export type TicketServiceErrorCode =
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'forbidden'
  | 'unavailable'
  | 'internal_error';

export interface TicketServiceError {
  readonly code: TicketServiceErrorCode;
  readonly message: string;
}

export interface PublicTicketSummary {
  readonly id: string;
  readonly category: Category;
  readonly urgency: Urgency;
  readonly status: Status;
  readonly summary: string;
  readonly duplicate_count: number;
  readonly created_at: string;
}

export interface AnalyzeResult {
  readonly outcome: TriageOutcome;
  readonly similar_reports: readonly PublicTicketSummary[];
  readonly meta: {
    readonly ai_source: AiSource;
    readonly degraded: boolean;
  };
}

export interface SubmitResult {
  readonly outcome: TriageOutcome;
  readonly ticket: PublicTicketView | null;
  readonly meta: {
    readonly ai_source: AiSource;
    readonly degraded: boolean;
  };
}

export interface SystemStats {
  readonly open: number;
  readonly resolved: number;
  readonly critical_open: number;
  readonly overdue: number;
  readonly median_resolution_hours: number;
}

/**
 * Maps a domain Ticket to its PublicTicketView DTO using a strict allowlist.
 * Guarantees internal metadata, investigator notes, and raw model text never leak to citizens.
 */
export function toPublicTicket(ticket: Ticket, now: Date = new Date()): PublicTicketView {
  const deptDisplayName = ticket.department
    ? DEPARTMENT_METADATA[ticket.department]?.displayName || ticket.department
    : 'Local Ward Office';

  const reasons = ticket.final_decision.ai_suggestion?.reasons || [];
  const summary =
    ticket.final_decision.ai_suggestion?.summary ||
    `Civic grievance in category ${ticket.category}`;

  const overdue = isOverdue(ticket, now);

  return {
    id: ticket.id,
    status: ticket.status,
    category: ticket.category,
    urgency: ticket.urgency,
    department: deptDisplayName,
    summary,
    ward: ticket.ward,
    created_at: ticket.created_at,
    due_at: ticket.due_at,
    overdue,
    duplicate_count: ticket.duplicate_count,
    reasons: [...reasons],
    applied_rules: [...ticket.final_decision.applied_rules],
    timeline: ticket.events.map((e) => ({
      id: e.id,
      status: e.status,
      role: e.actor_role,
      note: e.note,
      at: e.at,
    })),
    emergency_notice: ticket.final_decision.emergency_notice,
  };
}

/**
 * Maps a domain Ticket to its AuthorityTicketView DTO using a strict allowlist.
 */
export function toAuthorityTicket(ticket: Ticket, now: Date = new Date()): AuthorityTicketView {
  const publicView = toPublicTicket(ticket, now);

  return {
    ...publicView,
    description: ticket.description,
    location: ticket.location ? { ...ticket.location } : undefined,
    ai_suggestion: ticket.final_decision.ai_suggestion
      ? { ...ticket.final_decision.ai_suggestion }
      : null,
    ai_source: ticket.final_decision.ai_source,
    needs_manual_triage: ticket.final_decision.needs_manual_triage,
    escalated: ticket.escalated,
    reopen_count: ticket.reopen_count,
    version: ticket.version,
  };
}

export class TicketService {
  private readonly repo: TicketRepository;
  private readonly triageService: TriageService;
  private readonly geocoding: GeocodingProvider;
  private readonly now: () => Date;
  private readonly randomBytes: (n: number) => Uint8Array;

  public constructor(context: TicketServiceContext) {
    this.repo = context.repo;
    this.triageService = context.triageService;
    this.geocoding = context.geocoding;
    this.now = context.now;
    this.randomBytes = context.randomBytes;
  }

  /**
   * Previews AI triage and searches for potential duplicate reports without persisting anything.
   */
  public async analyzeReport(
    input: AnalyzeReportInput
  ): Promise<Result<AnalyzeResult, TicketServiceError>> {
    const openRes = await this.repo.listOpen();
    const openTickets = openRes.ok ? openRes.value : [];

    const analysis = await this.triageService.analyze({
      description: input.description,
      location: input.location,
      ward: input.location?.ward,
      round: input.round,
      openTickets,
      sites: SENSITIVE_SITES,
      now: this.now(),
    });

    // Map duplicate candidates into public-safe summaries
    const similarReports: PublicTicketSummary[] = analysis.duplicateCandidates.map((c) => ({
      id: c.ticket.id,
      category: c.ticket.category,
      urgency: c.ticket.urgency,
      status: c.ticket.status,
      summary:
        c.ticket.final_decision.ai_suggestion?.summary ||
        `Existing report: ${c.ticket.category}`,
      duplicate_count: c.ticket.duplicate_count,
      created_at: c.ticket.created_at,
    }));

    return ok({
      outcome: analysis.outcome,
      similar_reports: Object.freeze(similarReports),
      meta: {
        ai_source: analysis.meta.ai_source,
        degraded: analysis.meta.degraded,
      },
    });
  }

  /**
   * Submits a civic grievance. Re-evaluates triage server-side (free via cache) and persists valid tickets.
   */
  public async submitReport(
    input: SubmitReportInput
  ): Promise<Result<SubmitResult, TicketServiceError>> {
    const openRes = await this.repo.listOpen();
    const openTickets = openRes.ok ? openRes.value : [];

    const analysis = await this.triageService.analyze({
      description: input.description,
      location: input.location,
      ward: input.location?.ward,
      openTickets,
      sites: SENSITIVE_SITES,
      now: this.now(),
    });

    // If outcome is follow_up or rejected, return the outcome without creating a ticket
    if (analysis.outcome.kind !== 'ticket') {
      return ok({
        outcome: analysis.outcome,
        ticket: null,
        meta: {
          ai_source: analysis.meta.ai_source,
          degraded: analysis.meta.degraded,
        },
      });
    }

    const decision = analysis.outcome.decision;
    const now = this.now();
    const nowIso = now.toISOString();

    // Generate unguessable ID from injected random bytes
    const ticketId = generateTicketId(this.randomBytes(16));
    const dueAt = computeDueAt(decision.urgency, now);

    let finalCategory = decision.category;
    let finalDepartment = decision.department;
    const events = [
      {
        id: 'evt-1',
        status: Status.SUBMITTED,
        actor_role: Role.CITIZEN,
        at: nowIso,
        note: 'Grievance submitted by citizen',
      },
    ];

    // Citizen optional category override: citizens can ONLY specify category (never urgency)
    if (input.category_override && input.category_override !== Category.NOT_CIVIC) {
      finalCategory = input.category_override;
      finalDepartment = resolveDepartment(finalCategory, input.location?.ward);
      events.push({
        id: 'evt-2',
        status: Status.SUBMITTED,
        actor_role: Role.CITIZEN,
        at: nowIso,
        note: `Citizen specified category: ${finalCategory}`,
      });
    }

    const candidateDuplicate =
      analysis.duplicateCandidates.length > 0 ? analysis.duplicateCandidates[0]!.ticket.id : undefined;

    const newTicket: Ticket = {
      id: ticketId,
      description: input.description,
      category: finalCategory,
      urgency: decision.urgency,
      department: finalDepartment,
      ward: input.location?.ward,
      location: input.location
        ? {
            lat: input.location.lat,
            lng: input.location.lng,
            address: input.location.address,
          }
        : undefined,
      status: Status.SUBMITTED,
      events,
      duplicate_of: candidateDuplicate,
      duplicate_count: 0,
      reopen_count: 0,
      created_at: nowIso,
      due_at: dueAt.toISOString(),
      escalated: false,
      final_decision: {
        ...decision,
        category: finalCategory,
        department: finalDepartment,
      },
      attachments: [],
      version: 1,
    };

    const createRes = await this.repo.create(newTicket);
    if (!createRes.ok) {
      return err({
        code: 'internal_error',
        message: 'Failed to persist grievance ticket',
      });
    }

    logger.info('Civic grievance filed successfully', {
      ticketId,
      category: finalCategory,
      urgency: decision.urgency,
      emergencyNotice: decision.emergency_notice,
    });

    return ok({
      outcome: analysis.outcome,
      ticket: toPublicTicket(createRes.value),
      meta: {
        ai_source: analysis.meta.ai_source,
        degraded: analysis.meta.degraded,
      },
    });
  }

  /**
   * "Add your voice": Increments duplicate_count with optimistic-concurrency retry and only raises urgency.
   */
  public async supportReport(id: string): Promise<Result<PublicTicketView, TicketServiceError>> {
    if (!isValidTicketId(id)) {
      return err({ code: 'not_found', message: `Invalid ticket ID "${id}"` });
    }

    // Support optimistic-concurrency retry (max 1 retry)
    for (let attempt = 0; attempt < 2; attempt++) {
      const getRes = await this.repo.getById(id);
      if (!getRes.ok || !getRes.value) {
        return err({ code: 'not_found', message: `Ticket with ID "${id}" was not found` });
      }

      const ticket = getRes.value;
      const isTerminal =
        ticket.status === Status.RESOLVED ||
        ticket.status === Status.CLOSED ||
        ticket.status === Status.REJECTED;

      if (isTerminal) {
        return err({
          code: 'conflict',
          message: `Cannot support a ${ticket.status} grievance ticket`,
        });
      }

      const newDuplicateCount = ticket.duplicate_count + 1;
      let newUrgency = ticket.urgency;

      // Re-evaluate domain rules if stored suggestion is present
      if (ticket.final_decision.ai_suggestion) {
        const reDecision = applyRules(ticket.final_decision.ai_suggestion, {
          description: ticket.description,
          location: ticket.location,
          sites: SENSITIVE_SITES,
          duplicateCount: newDuplicateCount,
          now: this.now(),
          ward: ticket.ward,
        });

        // Rules may ONLY raise urgency: take maximum of previous and re-evaluated urgency
        const maxLevel = Math.max(
          urgencyToLevel(ticket.urgency),
          urgencyToLevel(reDecision.urgency)
        );
        newUrgency = levelToUrgency(maxLevel);
      }

      const nowIso = this.now().toISOString();
      const updatedTicket: Ticket = {
        ...ticket,
        duplicate_count: newDuplicateCount,
        urgency: newUrgency,
        final_decision: {
          ...ticket.final_decision,
          urgency: newUrgency,
        },
        events: [
          ...ticket.events,
          {
            id: `evt-${ticket.events.length + 1}`,
            status: ticket.status,
            actor_role: Role.CITIZEN,
            at: nowIso,
            note: 'Additional citizen added support ("Add your voice")',
          },
        ],
      };

      const updateRes = await this.repo.update(updatedTicket);
      if (updateRes.ok) {
        logger.info('Grievance received community support', {
          ticketId: id,
          duplicateCount: newDuplicateCount,
          urgency: newUrgency,
        });
        return ok(toPublicTicket(updateRes.value, this.now()));
      }

      if (updateRes.error.code !== 'conflict' || attempt === 1) {
        return err({
          code: updateRes.error.code === 'conflict' ? 'conflict' : 'internal_error',
          message: updateRes.error.message,
        });
      }
    }

    return err({
      code: 'conflict',
      message: 'Concurrent modification conflict while supporting grievance. Please try again.',
    });
  }

  private async checkAndEscalate(ticket: Ticket): Promise<Ticket> {
    const now = this.now();
    if (!isOverdue(ticket, now) || ticket.escalated) {
      return ticket;
    }
    const escalatedTicket = escalateIfOverdue(ticket, now);
    const updateRes = await this.repo.update(escalatedTicket);
    return updateRes.ok ? updateRes.value : escalatedTicket;
  }

  /**
   * Retrieves public ticket view with lazy SLA escalation.
   */
  public async getPublicTicket(id: string): Promise<Result<PublicTicketView, TicketServiceError>> {
    if (!isValidTicketId(id)) {
      return err({ code: 'not_found', message: `Invalid ticket ID "${id}"` });
    }

    const getRes = await this.repo.getById(id);
    if (!getRes.ok || !getRes.value) {
      return err({ code: 'not_found', message: `Ticket with ID "${id}" was not found` });
    }

    const ticket = await this.checkAndEscalate(getRes.value);
    return ok(toPublicTicket(ticket, this.now()));
  }

  /**
   * Allows a citizen to reopen a resolved ticket once.
   */
  public async reopenTicket(
    id: string,
    note?: string
  ): Promise<Result<PublicTicketView, TicketServiceError>> {
    if (!isValidTicketId(id)) {
      return err({ code: 'not_found', message: `Invalid ticket ID "${id}"` });
    }

    const getRes = await this.repo.getById(id);
    if (!getRes.ok || !getRes.value) {
      return err({ code: 'not_found', message: `Ticket with ID "${id}" was not found` });
    }

    const ticket = getRes.value;

    const transitionRes = transitionTicket(ticket, Status.REOPENED, {
      actor_role: Role.CITIZEN,
      note: note || 'Citizen reopened unresolved grievance',
      now: this.now(),
    });
    if (!transitionRes.ok) {
      return err({
        code: 'forbidden',
        message: transitionRes.error,
      });
    }

    const updateRes = await this.repo.update(transitionRes.value);
    if (!updateRes.ok) {
      return err({
        code: updateRes.error.code === 'conflict' ? 'conflict' : 'internal_error',
        message: updateRes.error.message,
      });
    }

    return ok(toPublicTicket(updateRes.value, this.now()));
  }

  /**
   * Authority queue list with lazy SLA escalation.
   */
  public async listQueue(
    query: TicketQuery
  ): Promise<Result<{ tickets: AuthorityTicketView[]; nextCursor?: string }, TicketServiceError>> {
    const queryRes = await this.repo.query(query);
    if (!queryRes.ok) {
      return err({ code: 'internal_error', message: queryRes.error.message });
    }

    const tickets: AuthorityTicketView[] = [];

    for (let ticket of queryRes.value.tickets) {
      ticket = await this.checkAndEscalate(ticket);
      tickets.push(toAuthorityTicket(ticket, this.now()));
    }

    return ok({
      tickets,
      nextCursor: queryRes.value.nextCursor,
    });
  }

  /**
   * Retrieves authority ticket view with full investigation metadata.
   */
  public async getAuthorityTicket(
    id: string
  ): Promise<Result<AuthorityTicketView, TicketServiceError>> {
    if (!isValidTicketId(id)) {
      return err({ code: 'not_found', message: `Invalid ticket ID "${id}"` });
    }

    const getRes = await this.repo.getById(id);
    if (!getRes.ok || !getRes.value) {
      return err({ code: 'not_found', message: `Ticket with ID "${id}" was not found` });
    }

    const ticket = await this.checkAndEscalate(getRes.value);
    return ok(toAuthorityTicket(ticket, this.now()));
  }

  /**
   * Updates grievance lifecycle status through domain transition validation.
   * Resolving requires an explanatory resolution note.
   */
  public async updateStatus(
    id: string,
    input: StatusUpdateInput
  ): Promise<Result<AuthorityTicketView, TicketServiceError>> {
    if (!isValidTicketId(id)) {
      return err({ code: 'not_found', message: `Invalid ticket ID "${id}"` });
    }

    const getRes = await this.repo.getById(id);
    if (!getRes.ok || !getRes.value) {
      return err({ code: 'not_found', message: `Ticket with ID "${id}" was not found` });
    }

    const ticket = getRes.value;
    const transitionRes = transitionTicket(ticket, input.status, {
      actor_role: Role.AUTHORITY,
      note: input.note,
      now: this.now(),
    });
    if (!transitionRes.ok) {
      const isMissingNote = transitionRes.error.toLowerCase().includes('note');
      return err({
        code: isMissingNote ? 'validation_failed' : 'conflict',
        message: transitionRes.error,
      });
    }

    const updateRes = await this.repo.update(transitionRes.value);
    if (!updateRes.ok) {
      return err({
        code: updateRes.error.code === 'conflict' ? 'conflict' : 'internal_error',
        message: updateRes.error.message,
      });
    }

    return ok(toAuthorityTicket(updateRes.value, this.now()));
  }

  /**
   * Authority manual triage override: requires reason, audited in ticket history, humans may adjust urgency up or down.
   */
  public async overrideTriage(
    id: string,
    input: OverrideInput
  ): Promise<Result<AuthorityTicketView, TicketServiceError>> {
    if (!isValidTicketId(id)) {
      return err({ code: 'not_found', message: `Invalid ticket ID "${id}"` });
    }

    const getRes = await this.repo.getById(id);
    if (!getRes.ok || !getRes.value) {
      return err({ code: 'not_found', message: `Ticket with ID "${id}" was not found` });
    }

    const ticket = getRes.value;
    const nowIso = this.now().toISOString();

    const newCategory = input.category || ticket.category;
    const newUrgency = input.urgency || ticket.urgency;
    let newDepartment = input.department || ticket.department;

    if (!input.department && input.category) {
      newDepartment = resolveDepartment(input.category, ticket.ward);
    }

    const auditRule = {
      id: 'authority-override',
      label: 'Authority Manual Override',
      effect: input.reason,
    };

    const updatedTicket: Ticket = {
      ...ticket,
      category: newCategory,
      urgency: newUrgency,
      department: newDepartment,
      final_decision: {
        ...ticket.final_decision,
        category: newCategory,
        urgency: newUrgency,
        department: newDepartment,
        applied_rules: [...ticket.final_decision.applied_rules, auditRule],
      },
      events: [
        ...ticket.events,
        {
          id: `evt-${ticket.events.length + 1}`,
          status: ticket.status,
          actor_role: Role.AUTHORITY,
          at: nowIso,
          note: `Authority override applied: ${input.reason}`,
        },
      ],
    };

    const updateRes = await this.repo.update(updatedTicket);
    if (!updateRes.ok) {
      return err({
        code: updateRes.error.code === 'conflict' ? 'conflict' : 'internal_error',
        message: updateRes.error.message,
      });
    }

    return ok(toAuthorityTicket(updateRes.value, this.now()));
  }

  /**
   * Returns anonymized system statistics for public dashboards.
   */
  public async getStats(): Promise<Result<SystemStats, TicketServiceError>> {
    const openRes = await this.repo.listOpen();
    const resolvedRes = await this.repo.listResolvedRecent(200);

    const openTickets = openRes.ok ? openRes.value : [];
    const resolvedTickets = resolvedRes.ok ? resolvedRes.value : [];

    const nowIso = this.now().toISOString();
    let criticalOpen = 0;
    let overdue = 0;

    for (const t of openTickets) {
      if (t.urgency === Urgency.CRITICAL) {
        criticalOpen++;
      }
      if (t.escalated || t.due_at < nowIso) {
        overdue++;
      }
    }

    // Compute median resolution hours
    const resolutionDurationsHours: number[] = [];
    for (const t of resolvedTickets) {
      const resolvedEvt = t.events.find((e) => e.status === Status.RESOLVED);
      if (resolvedEvt) {
        const durationMs =
          new Date(resolvedEvt.at).getTime() - new Date(t.created_at).getTime();
        const durationHours = Math.max(0, durationMs / (1000 * 3600));
        resolutionDurationsHours.push(durationHours);
      }
    }

    resolutionDurationsHours.sort((a, b) => a - b);
    let medianHours = 0;
    if (resolutionDurationsHours.length > 0) {
      const mid = Math.floor(resolutionDurationsHours.length / 2);
      medianHours =
        resolutionDurationsHours.length % 2 === 0
          ? (resolutionDurationsHours[mid - 1]! + resolutionDurationsHours[mid]!) / 2
          : resolutionDurationsHours[mid]!;
    }

    return ok({
      open: openTickets.length,
      resolved: resolvedTickets.length,
      critical_open: criticalOpen,
      overdue,
      median_resolution_hours: Math.round(medianHours * 10) / 10,
    });
  }
}
