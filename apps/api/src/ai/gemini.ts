import { AiSource, type Result, type TriageSuggestion, ok, err } from '@civicresolve/shared';
import type { TriageProvider, TriageProviderInput, AiError } from './types.js';
import { buildMessages, buildRepairMessages } from './prompts.js';
import { parseTriageJson } from './parse.js';

export interface GeminiClient {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config?: {
        responseMimeType?: string;
        temperature?: number;
        maxOutputTokens?: number;
      };
    }): Promise<{ text?: string | null }>;
  };
}

export interface GeminiProviderOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs?: number;
  readonly maxTokens?: number;
  readonly client?: GeminiClient;
}

/**
 * AI Triage Provider using Google's official @google/genai SDK.
 */
export class GeminiProvider implements TriageProvider {
  public readonly name: AiSource = AiSource.GEMINI;
  public readonly model: string;

  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxTokens: number;
  private clientPromise?: Promise<GeminiClient>;
  private injectedClient?: GeminiClient;

  public constructor(options: GeminiProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.maxTokens = options.maxTokens ?? 1000;
    if (options.client) {
      this.injectedClient = options.client;
    }
  }

  private async getClient(): Promise<GeminiClient> {
    if (this.injectedClient) {
      return this.injectedClient;
    }
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { GoogleGenAI } = await import('@google/genai');
        return new GoogleGenAI({ apiKey: this.apiKey }) as unknown as GeminiClient;
      })();
    }
    return this.clientPromise;
  }

  public async triage(
    input: TriageProviderInput,
    options?: { signal?: AbortSignal }
  ): Promise<Result<TriageSuggestion, AiError>> {
    const messages = input.repair ? buildRepairMessages(input) : buildMessages(input);
    const combinedPrompt = messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n');

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    if (options?.signal) {
      options.signal.addEventListener('abort', () => abortController.abort(), { once: true });
    }

    try {
      const client = await this.getClient();

      const response = await Promise.race([
        client.models.generateContent({
          model: this.model,
          contents: combinedPrompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: this.maxTokens,
          },
        }),
        new Promise<never>((_, reject) => {
          abortController.signal.addEventListener('abort', () =>
            reject(new Error('AbortError: Gemini request timeout'))
          );
        }),
      ]);

      const text = response.text;
      if (!text || text.trim().length === 0) {
        return err({
          kind: 'invalid_output',
          message: 'Gemini returned empty or whitespace response',
        });
      }

      const parsed = parseTriageJson(text);
      if (!parsed.ok) {
        return err({
          kind: 'invalid_output',
          message: `Gemini JSON output failed schema validation: ${parsed.error.join('; ')}`,
        });
      }

      return ok(parsed.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (abortController.signal.aborted || message.includes('AbortError')) {
        return err({
          kind: 'timeout',
          message: `Gemini API request timed out after ${this.timeoutMs}ms`,
        });
      }

      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        return err({
          kind: 'rate_limited',
          message: 'Gemini rate limit exceeded',
        });
      }

      if (
        message.includes('401') ||
        message.includes('403') ||
        message.includes('API_KEY_INVALID') ||
        message.includes('PERMISSION_DENIED')
      ) {
        return err({
          kind: 'auth_config',
          message: 'Authentication failed for Gemini API',
        });
      }

      return err({
        kind: 'unavailable',
        message: 'Google Gemini service error or network failure',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
