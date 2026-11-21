import type { Config } from '../config.js';
import type { TicketRepository } from './types.js';
import { InMemoryTicketRepository } from './memory.js';
import { FirestoreTicketRepository } from './firestore.js';

/**
 * Creates the appropriate grievance ticket repository based on application configuration.
 * Fails fast with human-readable error if required credentials are not supplied.
 *
 * @param config - Validated application configuration
 * @returns Configured TicketRepository instance
 */
export function createRepository(config: Config): TicketRepository {
  if (config.REPO_DRIVER === 'firestore') {
    if (!config.FIREBASE_SERVICE_ACCOUNT_JSON || config.FIREBASE_SERVICE_ACCOUNT_JSON.trim() === '') {
      throw new Error(
        'CivicResolve Configuration Error: FIREBASE_SERVICE_ACCOUNT_JSON is required when REPO_DRIVER is set to "firestore".'
      );
    }

    try {
      return new FirestoreTicketRepository({
        serviceAccountJson: config.FIREBASE_SERVICE_ACCOUNT_JSON,
        collectionName: 'tickets',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        '[CivicResolve Firestore Error]: Failed to initialize Firestore repository, falling back to in-memory store:',
        msg
      );
      return new InMemoryTicketRepository();
    }
  }

  return new InMemoryTicketRepository();
}

export const createTicketRepository = createRepository;
