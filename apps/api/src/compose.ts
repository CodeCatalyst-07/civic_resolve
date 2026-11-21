import crypto from 'node:crypto';
import type { Config } from './config.js';
import type { TicketRepository } from './repo/types.js';
import { createTicketRepository } from './repo/factory.js';
import type { TriageProvider } from './ai/types.js';
import { createAiProvider } from './ai/factory.js';
import type { GeocodingProvider } from './services/geocoding/types.js';
import { createGeocodingProvider } from './services/geocoding/factory.js';
import { type TriageCache, InMemoryTriageCache } from './services/cache.js';
import { type DailyAiBudget, InMemoryDailyAiBudget } from './services/budget.js';
import { type TriageService, createTriageService } from './services/triageService.js';
import { TicketService } from './services/ticketService.js';
import { seedTickets } from './data/seedData.js';
import { logger } from './lib/logger.js';

export interface AppContainer {
  readonly config: Config;
  readonly repo: TicketRepository;
  readonly aiProvider: TriageProvider;
  readonly geocoding: GeocodingProvider;
  readonly cache: TriageCache;
  readonly budget: DailyAiBudget;
  readonly triageService: TriageService;
  readonly ticketService: TicketService;
}

/**
 * Builds and wires all application dependencies into a singleton composition container.
 * Supports partial dependency overrides for unit and integration testing.
 */
export function buildContainer(config: Config, overrides?: Partial<AppContainer>): AppContainer {
  const repo = overrides?.repo ?? createTicketRepository(config);
  const aiProvider = overrides?.aiProvider ?? createAiProvider(config);
  const geocoding = overrides?.geocoding ?? createGeocodingProvider(config);
  const cache =
    overrides?.cache ??
    new InMemoryTriageCache({
      maxEntries: config.AI_CACHE_MAX_ENTRIES,
      ttlMs: config.AI_CACHE_TTL_MS,
    });
  const budget =
    overrides?.budget ??
    new InMemoryDailyAiBudget({
      dailyLimit: config.AI_DAILY_BUDGET,
    });

  const triageService =
    overrides?.triageService ??
    createTriageService({
      provider: aiProvider,
      cache,
      budget,
      aiTotalDeadlineMs: config.AI_TOTAL_DEADLINE_MS,
    });

  const ticketService =
    overrides?.ticketService ??
    new TicketService({
      repo,
      triageService,
      geocoding,
      now: () => new Date(),
      randomBytes: (n: number) => crypto.randomBytes(n),
    });

  logger.info('Composition root assembled container', {
    aiProvider: aiProvider.name,
    repoDriver: config.REPO_DRIVER,
    geocodingAvailable: typeof geocoding.isAvailable === 'function' ? geocoding.isAvailable() : false,
  });

  if (config.AUTO_SEED !== 'false' && config.REPO_DRIVER === 'memory') {
    void seedTickets(repo);
  }

  return Object.freeze({
    config,
    repo,
    aiProvider,
    geocoding,
    cache,
    budget,
    triageService,
    ticketService,
  });
}
