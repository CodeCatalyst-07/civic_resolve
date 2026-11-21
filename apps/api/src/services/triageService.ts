import {
  AiSource,
  type Ticket,
  type FinalDecision,
} from '@civicresolve/shared';
import {
  decideTriage,
  classifyByKeywords,
  looksLikeSpam,
  findDuplicateCandidates,
  type TriageOutcome,
  type SensitiveSite,
  type DomainConfig,
  DOMAIN_CONFIG,
  DOMAIN_MESSAGES,
} from '../domain/index.js';
import type { TriageProvider } from '../ai/index.js';
import { computeTriageCacheKey, type TriageCache, InMemoryTriageCache } from './cache.js';
import { type DailyAiBudget, InMemoryDailyAiBudget } from './budget.js';
import { logger as defaultLogger } from '../lib/logger.js';

export interface TriageServiceInput {
  readonly description: string;
  readonly location?: {
    readonly lat?: number;
    readonly lng?: number;
    readonly address?: string;
  };
  readonly ward?: string;
  readonly round?: number;
  readonly openTickets?: readonly Ticket[];
  readonly sites?: readonly SensitiveSite[];
  readonly now?: Date;
}

export interface TriageServiceMeta {
  readonly ai_source: AiSource;
  readonly cached: boolean;
  readonly degraded: boolean;
  readonly degraded_reason?: string;
  readonly duration_ms: number;
}

export interface TriageServiceResult {
  readonly outcome: TriageOutcome;
  readonly meta: TriageServiceMeta;
}

export interface TriageServiceDeps {
  readonly provider: TriageProvider;
  readonly cache?: TriageCache;
  readonly budget?: DailyAiBudget;
  readonly config?: DomainConfig;
  readonly logger?: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };
}

export interface TriageService {
  analyze(input: TriageServiceInput): Promise<TriageServiceResult>;
}

/**
 * Creates the central Grievance Triage Service orchestrating the cheap-first pipeline:
 * Spam check -> Cache lookup -> Budget verification -> Resilient AI provider -> Domain Rules -> Privacy-safe Audit.
 *
 * @param deps - Injected AI provider, cache, budget, config, and logger dependencies
 * @returns TriageService instance
 */
export function createTriageService(deps: TriageServiceDeps): TriageService {
  const provider = deps.provider;
  const cache = deps.cache ?? new InMemoryTriageCache();
  const budget = deps.budget ?? new InMemoryDailyAiBudget({ dailyLimit: 200 });
  const domainConfig = deps.config ?? DOMAIN_CONFIG;
  const logger = deps.logger ?? defaultLogger;

  return {
    async analyze(input: TriageServiceInput): Promise<TriageServiceResult> {
      const startTime = Date.now();
      const now = input.now ?? new Date();
      const trimmedText = input.description.trim();

      // Step 1 (CHEAP FIRST): Spam check - reject immediately without engaging AI model
      if (looksLikeSpam(trimmedText)) {
        const duration_ms = Date.now() - startTime;
        const outcome: TriageOutcome = Object.freeze({
          kind: 'rejected',
          reason: DOMAIN_MESSAGES.rejection.reason,
          guidance: DOMAIN_MESSAGES.rejection.guidance,
          emergency_notice: false,
        });

        const meta: TriageServiceMeta = {
          ai_source: AiSource.KEYWORD_FALLBACK,
          cached: false,
          degraded: false,
          duration_ms,
        };

        logger.info('Triage completed: spam rejected without model call', {
          provider: meta.ai_source,
          cached: false,
          degraded: false,
          outcome: outcome.kind,
          duration_ms,
        });

        return { outcome, meta };
      }

      // Step 2: Cache lookup by deterministic SHA-256(text + ward)
      const cacheKey = computeTriageCacheKey(trimmedText, input.ward);
      const cached = cache.get(cacheKey);

      let suggestion = cached?.suggestion;
      let aiSource = cached?.source ?? provider.name;
      const isCached = cached !== undefined;
      let isDegraded = false;
      let degradedReason: string | undefined;

      // Step 3: Call AI Provider or degrade gracefully
      if (!suggestion) {
        if (!budget.canConsume()) {
          // Daily budget exhausted -> graceful keyword degradation
          suggestion = classifyByKeywords(trimmedText);
          aiSource = AiSource.KEYWORD_FALLBACK;
          isDegraded = true;
          degradedReason = 'budget_exhausted';
        } else {
          const providerResult = await provider.triage({
            text: trimmedText,
            ward: input.ward,
          });

          if (providerResult.ok) {
            suggestion = providerResult.value;
            aiSource = provider.name;
            budget.consume();
            // Store successful model suggestions in cache
            cache.set(cacheKey, suggestion, aiSource);
          } else {
            // Provider error (timeout, unavailable, invalid) -> graceful keyword degradation
            suggestion = classifyByKeywords(trimmedText);
            aiSource = AiSource.KEYWORD_FALLBACK;
            isDegraded = true;
            degradedReason = providerResult.error.kind;
          }
        }
      }

      // Step 4: Evaluate candidate duplicates
      const openTickets = input.openTickets ?? [];
      const duplicateCandidates = findDuplicateCandidates(
        {
          category: suggestion.category,
          description: trimmedText,
          location: input.location,
        },
        openTickets,
        now,
        domainConfig
      );
      const duplicateCount = duplicateCandidates.length;

      // Step 5: Evaluate domain rules and build final decision
      const baseOutcome = decideTriage(
        {
          description: trimmedText,
          suggestion,
          location: input.location,
          sites: input.sites,
          duplicateCount,
          followUpRounds: input.round ?? 0,
          ward: input.ward,
          now,
        },
        domainConfig
      );

      // Decorate final decision with truthful AI source attribution and manual triage flag if degraded
      let finalOutcome = baseOutcome;
      if (baseOutcome.kind === 'ticket') {
        const decoratedDecision: FinalDecision = Object.freeze({
          ...baseOutcome.decision,
          ai_source: aiSource,
          needs_manual_triage: isDegraded || baseOutcome.decision.needs_manual_triage,
        });

        finalOutcome = Object.freeze({
          ...baseOutcome,
          decision: decoratedDecision,
          needs_manual_triage: decoratedDecision.needs_manual_triage,
        });
      }

      const duration_ms = Date.now() - startTime;
      const meta: TriageServiceMeta = {
        ai_source: aiSource,
        cached: isCached,
        degraded: isDegraded,
        degraded_reason: degradedReason,
        duration_ms,
      };

      // Step 6: Privacy-safe audit logging (NO complaint text, NO keys, NO raw output)
      logger.info('Triage analysis completed', {
        provider: meta.ai_source,
        cached: meta.cached,
        degraded: meta.degraded,
        degraded_reason: meta.degraded_reason,
        outcome: finalOutcome.kind,
        duration_ms,
      });

      return {
        outcome: finalOutcome,
        meta,
      };
    },
  };
}
