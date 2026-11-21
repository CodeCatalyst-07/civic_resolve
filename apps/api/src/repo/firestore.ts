import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import {
  getFirestore,
  type Firestore,
  type CollectionReference,
  type Query,
  type Transaction,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase-admin/firestore';
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

export interface FirestoreConfig {
  readonly serviceAccountJson?: string;
  readonly collectionName?: string;
}

/**
 * Parses and validates Firebase Service Account JSON supporting raw JSON and base64 strings.
 * Throws readable error without ever logging or leaking secret values.
 */
function parseServiceAccount(raw: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      parsed = JSON.parse(decoded);
    } catch {
      throw new Error(
        'CivicResolve Configuration Error: FIREBASE_SERVICE_ACCOUNT_JSON must be a valid JSON or base64-encoded JSON string'
      );
    }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('client_email' in parsed) ||
    !('private_key' in parsed)
  ) {
    throw new Error(
      'CivicResolve Configuration Error: FIREBASE_SERVICE_ACCOUNT_JSON is missing required client_email or private_key fields'
    );
  }

  return parsed as Record<string, unknown>;
}

/**
 * Production-ready Firestore repository backed by the Firebase Admin SDK.
 * Implements lazy connection caching, transactional concurrency checks, and indexed queries.
 */
export class FirestoreTicketRepository implements TicketRepository {
  private readonly collectionName: string;
  private readonly firestore: Firestore;
  private readonly collection: CollectionReference<DocumentData>;

  public constructor(config: FirestoreConfig) {
    this.collectionName = config.collectionName || 'tickets';

    let app: App;
    const existingApps = getApps();

    if (existingApps.length > 0 && existingApps[0]) {
      app = existingApps[0];
    } else {
      if (!config.serviceAccountJson || config.serviceAccountJson.trim() === '') {
        // When running in Firebase Emulator or Cloud Functions with ADC
        if (process.env.FIRESTORE_EMULATOR_HOST) {
          app = initializeApp({ projectId: 'demo-civicresolve' });
        } else {
          throw new Error(
            'CivicResolve Configuration Error: FIREBASE_SERVICE_ACCOUNT_JSON is required when REPO_DRIVER is "firestore"'
          );
        }
      } else {
        const credentials = parseServiceAccount(config.serviceAccountJson);
        app = initializeApp({
          credential: cert(credentials),
        });
      }
    }

    this.firestore = getFirestore(app);
    try {
      this.firestore.settings({ ignoreUndefinedProperties: true });
    } catch {
      // In case settings were already initialized on this App singleton
    }
    this.collection = this.firestore.collection(this.collectionName);
  }

  private sanitize<T>(data: T): T {
    if (data === null || data === undefined || typeof data !== 'object') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item)) as unknown as T;
    }
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (v !== undefined) {
        clean[k] = this.sanitize(v);
      }
    }
    return clean as unknown as T;
  }

  public async create(ticket: Ticket): Promise<Result<Ticket, RepoError>> {
    try {
      const docRef = this.collection.doc(ticket.id);
      const snapshot = await docRef.get();
      if (snapshot.exists) {
        return err({
          code: 'conflict',
          message: `Ticket with id "${ticket.id}" already exists`,
        });
      }

      const versioned: Ticket = {
        ...ticket,
        version: ticket.version ?? 1,
      };

      await docRef.set(this.sanitize(versioned));
      return ok(versioned);
    } catch {
      return err({
        code: 'internal',
        message: 'Failed to create ticket in Firestore database',
      });
    }
  }

  public async getById(id: string): Promise<Result<Ticket | null, RepoError>> {
    try {
      const docRef = this.collection.doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return ok(null);
      }
      return ok(snapshot.data() as Ticket);
    } catch {
      return err({
        code: 'internal',
        message: 'Failed to fetch ticket from Firestore database',
      });
    }
  }

  public async update(ticket: Ticket): Promise<Result<Ticket, RepoError>> {
    try {
      return await this.firestore.runTransaction(async (transaction: Transaction) => {
        const docRef = this.collection.doc(ticket.id);
        const snapshot = await transaction.get(docRef);

        if (!snapshot.exists) {
          return err<RepoError>({
            code: 'not_found',
            message: `Ticket with id "${ticket.id}" not found`,
          });
        }

        const stored = snapshot.data() as Ticket;
        const storedVersion = stored.version ?? 1;

        if (storedVersion !== ticket.version) {
          return err<RepoError>({
            code: 'conflict',
            message: `Optimistic concurrency conflict on ticket "${ticket.id}": stored version ${storedVersion}, update specified ${ticket.version}`,
          });
        }

        const updated: Ticket = {
          ...ticket,
          version: storedVersion + 1,
        };

        transaction.set(docRef, this.sanitize(updated));
        return ok(updated);
      });
    } catch {
      return err({
        code: 'internal',
        message: 'Failed to update ticket in Firestore database',
      });
    }
  }

  public async listOpen(options?: {
    category?: Category;
    since?: string;
  }): Promise<Result<Ticket[], RepoError>> {
    try {
      const openStatuses: string[] = [
        Status.SUBMITTED,
        Status.UNDER_REVIEW,
        Status.ASSIGNED,
        Status.IN_PROGRESS,
        Status.REOPENED,
      ];

      // Query on indexed fields only
      let q: Query<DocumentData> = this.collection.where('status', 'in', openStatuses);

      if (options?.category) {
        q = q.where('category', '==', options.category);
      }

      // Fetch bounded collection (max 200)
      const snapshot = await q.limit(200).get();
      let tickets: Ticket[] = snapshot.docs.map(
        (d: QueryDocumentSnapshot<DocumentData>) => d.data() as Ticket
      );

      if (options?.since) {
        tickets = tickets.filter((t) => t.created_at >= options.since!);
      }

      // Sort newest first
      tickets.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return ok(tickets);
    } catch {
      return err({
        code: 'internal',
        message: 'Failed to list open tickets from Firestore database',
      });
    }
  }

  public async query(
    query: TicketQuery
  ): Promise<Result<{ tickets: Ticket[]; nextCursor?: string }, RepoError>> {
    try {
      const nowIso = new Date().toISOString();
      let q: Query<DocumentData> = this.collection;

      if (query.status) {
        q = q.where('status', '==', query.status);
      }
      if (query.category) {
        q = q.where('category', '==', query.category);
      }
      if (query.urgency) {
        q = q.where('urgency', '==', query.urgency);
      }

      // Fetch bounded batch of candidate documents
      const snapshot = await q.limit(200).get();
      let matching: Ticket[] = snapshot.docs.map(
        (d: QueryDocumentSnapshot<DocumentData>) => d.data() as Ticket
      );

      // In-memory post-filtering for non-indexed fields
      if (query.ward) {
        matching = matching.filter((t) => t.ward === query.ward);
      }

      if (query.overdue !== undefined) {
        matching = matching.filter((ticket) => {
          const isTerminal =
            ticket.status === Status.RESOLVED ||
            ticket.status === Status.CLOSED ||
            ticket.status === Status.REJECTED;
          const isOverdue = !isTerminal && (ticket.escalated || ticket.due_at < nowIso);
          return query.overdue === isOverdue;
        });
      }

      // Deterministic sort: urgency descending, due_at ascending
      matching.sort((a, b) => {
        const urgA = urgencyToLevel(a.urgency);
        const urgB = urgencyToLevel(b.urgency);
        if (urgA !== urgB) {
          return urgB - urgA;
        }
        return a.due_at.localeCompare(b.due_at);
      });

      // Cursor pagination
      let startIndex = 0;
      if (query.cursor) {
        try {
          const decodedId = Buffer.from(query.cursor, 'base64').toString('utf8');
          const foundIdx = matching.findIndex((t) => t.id === decodedId);
          if (foundIdx >= 0) {
            startIndex = foundIdx + 1;
          }
        } catch {
          // Fall back to beginning
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
        tickets: page,
        nextCursor,
      });
    } catch {
      return err({
        code: 'internal',
        message: 'Failed to query tickets from Firestore database',
      });
    }
  }

  public async listResolvedRecent(limit: number): Promise<Result<Ticket[], RepoError>> {
    try {
      const q: Query<DocumentData> = this.collection
        .where('status', '==', Status.RESOLVED)
        .limit(Math.max(1, limit));

      const snapshot = await q.get();
      const resolved: Ticket[] = snapshot.docs.map(
        (d: QueryDocumentSnapshot<DocumentData>) => d.data() as Ticket
      );
      resolved.sort((a: Ticket, b: Ticket) => b.created_at.localeCompare(a.created_at));
      return ok(resolved);
    } catch {
      return err({
        code: 'internal',
        message: 'Failed to fetch resolved tickets from Firestore database',
      });
    }
  }

  public async count(filters?: Partial<TicketQuery>): Promise<Result<number, RepoError>> {
    try {
      let q: Query<DocumentData> = this.collection;

      if (filters?.status) {
        q = q.where('status', '==', filters.status);
      }
      if (filters?.category) {
        q = q.where('category', '==', filters.category);
      }
      if (filters?.urgency) {
        q = q.where('urgency', '==', filters.urgency);
      }

      if (filters?.ward || filters?.overdue !== undefined) {
        // Evaluate in-memory when non-indexed criteria are present
        const snapshot = await q.get();
        let docs: Ticket[] = snapshot.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => d.data() as Ticket
        );
        const nowIso = new Date().toISOString();

        if (filters.ward) {
          docs = docs.filter((t: Ticket) => t.ward === filters.ward);
        }
        if (filters.overdue !== undefined) {
          docs = docs.filter((ticket: Ticket) => {
            const isTerminal =
              ticket.status === Status.RESOLVED ||
              ticket.status === Status.CLOSED ||
              ticket.status === Status.REJECTED;
            const isOverdue = !isTerminal && (ticket.escalated || ticket.due_at < nowIso);
            return filters.overdue === isOverdue;
          });
        }
        return ok(docs.length);
      }

      const agg = await q.count().get();
      return ok(agg.data().count);
    } catch {
      return err({
        code: 'internal',
        message: 'Failed to count tickets in Firestore database',
      });
    }
  }
}
