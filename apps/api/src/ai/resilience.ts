import type { Result, TriageSuggestion, AiSource } from '@civicresolve/shared';
import type { TriageProvider, TriageProviderInput, AiError } from './types.js';

export interface ResilienceOptions {
  readonly sleepFn?: (ms: number) => Promise<void>;
  readonly backoffMs?: number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decorates a TriageProvider with automatic transient error backoff and JSON repair retries.
 * Maximum of 2 total attempts per failure category.
 */
export class ResilientTriageProvider implements TriageProvider {
  private readonly provider: TriageProvider;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly backoffMs: number;

  public constructor(provider: TriageProvider, options: ResilienceOptions = {}) {
    this.provider = provider;
    this.sleep = options.sleepFn ?? defaultSleep;
    this.backoffMs = options.backoffMs ?? 500;
  }

  public get name(): AiSource {
    return this.provider.name;
  }

  public get model(): string {
    return this.provider.model;
  }

  public async triage(
    input: TriageProviderInput,
    options?: { signal?: AbortSignal }
  ): Promise<Result<TriageSuggestion, AiError>> {
    // Attempt 1
    const firstAttempt = await this.provider.triage(input, options);
    if (firstAttempt.ok) {
      return firstAttempt;
    }

    const error = firstAttempt.error;

    // Retry Category 1: Transient network / rate limit / timeout errors (1 retry with backoff)
    if (
      error.kind === 'rate_limited' ||
      error.kind === 'unavailable' ||
      error.kind === 'timeout'
    ) {
      await this.sleep(this.backoffMs);
      return this.provider.triage(input, options);
    }

    // Retry Category 2: Invalid JSON or schema mismatch (1 repair retry)
    if (error.kind === 'invalid_output') {
      const repairInput: TriageProviderInput = {
        ...input,
        repair: {
          previousOutput: error.message,
          errors: [error.message],
        },
      };
      return this.provider.triage(repairInput, options);
    }

    // Category 3: Fatal configuration errors (auth_config) - no retry
    return firstAttempt;
  }
}

/**
 * Convenience factory to wrap any TriageProvider with resilience decorator.
 */
export function withResilience(
  provider: TriageProvider,
  options?: ResilienceOptions
): TriageProvider {
  return new ResilientTriageProvider(provider, options);
}
