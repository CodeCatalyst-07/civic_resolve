import type { TriageSuggestion, Result, AiSource } from '@civicresolve/shared';

/**
 * Image reference payload reserved for future photo upload support in v2.
 */
export interface ImageRef {
  readonly id: string;
  readonly mimeType: string;
  readonly dataBase64?: string;
  readonly url?: string;
}

/**
 * Input supplied to an AI triage model provider.
 */
export interface TriageProviderInput {
  /** Raw grievance text submitted by the citizen */
  readonly text: string;
  /** Optional administrative ward name or identifier */
  readonly ward?: string;
  /** Optional citizen locale preference (e.g. "en", "hi", "mr") */
  readonly locale?: string;
  /** Reserved for photo attachments in later phases; currently unused */
  readonly images?: readonly ImageRef[];
  /** Repair context provided when retrying after schema validation failure */
  readonly repair?: {
    readonly previousOutput: string;
    readonly errors: readonly string[];
  };
}

/**
 * Standardized AI provider error category.
 */
export type AiErrorKind =
  | 'timeout'
  | 'rate_limited'
  | 'unavailable'
  | 'invalid_output'
  | 'auth_config';

/**
 * Safe, sanitized AI provider error that never leaks credentials, headers, or user text.
 */
export interface AiError {
  readonly kind: AiErrorKind;
  readonly message: string;
}

/**
 * Pluggable interface for AI grievance triage providers (Jarvis Gemma, Gemini, Mock).
 */
export interface TriageProvider {
  /** Identifies the AI provider source for truthful attribution */
  readonly name: AiSource;
  /** Specific model identifier string (e.g. "gemma-4-31b-it", "gemini-1.5-flash") */
  readonly model: string;
  /**
   * Performs AI triage on citizen grievance text.
   *
   * @param input - Grievance text, optional repair context, and metadata
   * @param options - Cancellation abort signal
   * @returns Result containing either a valid TriageSuggestion or safe AiError
   */
  triage(
    input: TriageProviderInput,
    options?: { signal?: AbortSignal }
  ): Promise<Result<TriageSuggestion, AiError>>;
}
