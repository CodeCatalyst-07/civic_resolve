import { AiSource, type Result, type TriageSuggestion, ok, err } from '@civicresolve/shared';
import type { TriageProvider, TriageProviderInput, AiError } from './types.js';
import { buildMessages, buildRepairMessages } from './prompts.js';
import { parseTriageJson } from './parse.js';

export interface JarvisProviderOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly maxTokens?: number;
  readonly disableThinking?: boolean;
  readonly fetchFn?: typeof fetch;
}

/**
 * AI Triage Provider for Gemma 4 hosted on Jarvis Labs via OpenAI-compatible endpoint.
 */
export class JarvisGemmaProvider implements TriageProvider {
  public readonly name: AiSource = AiSource.JARVIS_GEMMA;
  public readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxTokens: number;
  private readonly disableThinking: boolean;
  private readonly fetchFn: typeof fetch;

  public constructor(options: JarvisProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'https://models.jarvislabs.net/v1').replace(/\/+$/, '');
    this.model = options.model || 'gemma-4-31b-it';
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.maxTokens = options.maxTokens ?? 1000;
    this.disableThinking = options.disableThinking ?? true;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async triage(
    input: TriageProviderInput,
    options?: { signal?: AbortSignal }
  ): Promise<Result<TriageSuggestion, AiError>> {
    const messages = input.repair ? buildRepairMessages(input) : buildMessages(input);

    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0,
      max_tokens: this.maxTokens,
    };

    if (this.disableThinking) {
      requestBody.chat_template_kwargs = { enable_thinking: false };
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    // Merge external abort signal if provided
    if (options?.signal) {
      options.signal.addEventListener('abort', () => abortController.abort(), { once: true });
    }

    try {
      const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          return err({
            kind: 'rate_limited',
            message: 'Jarvis Labs rate limit exceeded (HTTP 429)',
          });
        }
        if (response.status === 401 || response.status === 403) {
          return err({
            kind: 'auth_config',
            message: 'Authentication failed for Jarvis Labs API (HTTP 401/403)',
          });
        }
        return err({
          kind: 'unavailable',
          message: `Jarvis Labs service error (HTTP ${response.status})`,
        });
      }

      const data = (await response.json()) as {
        choices?: Array<{
          finish_reason?: string;
          message?: {
            content?: string;
          };
        }>;
      };

      const choice = data.choices?.[0];
      if (!choice || !choice.message?.content) {
        return err({
          kind: 'invalid_output',
          message: 'Jarvis Labs returned an empty choice or missing content',
        });
      }

      if (choice.finish_reason === 'length') {
        return err({
          kind: 'invalid_output',
          message: 'Model output was truncated before completion (finish_reason: length)',
        });
      }

      const parseResult = parseTriageJson(choice.message.content);
      if (!parseResult.ok) {
        return err({
          kind: 'invalid_output',
          message: `Model output failed schema validation: ${parseResult.error.join('; ')}`,
        });
      }

      return ok(parseResult.value);
    } catch {
      if (abortController.signal.aborted) {
        return err({
          kind: 'timeout',
          message: `Jarvis Labs request timed out after ${this.timeoutMs}ms`,
        });
      }

      return err({
        kind: 'unavailable',
        message: 'Network error communicating with Jarvis Labs endpoint',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
