import type { Config } from '../config.js';
import type { TriageProvider } from './types.js';
import { JarvisGemmaProvider } from './jarvis.js';
import { GeminiProvider, type GeminiClient } from './gemini.js';
import { MockProvider } from './mock.js';
import { withResilience, type ResilienceOptions } from './resilience.js';

export interface ProviderFactoryDeps {
  readonly fetchFn?: typeof fetch;
  readonly geminiClient?: GeminiClient;
  readonly resilienceOptions?: ResilienceOptions;
}

/**
 * Creates, configures, and wraps the active AI TriageProvider based on environment configuration.
 *
 * @param config - Validated application configuration
 * @param deps - Optional injected dependencies for testing
 * @returns Configured TriageProvider decorated with resilience retries
 */
export function createTriageProvider(
  config: Config,
  deps: ProviderFactoryDeps = {}
): TriageProvider {
  let innerProvider: TriageProvider;

  switch (config.AI_PROVIDER) {
    case 'jarvis': {
      if (!config.JARVISLABS_API_KEY) {
        throw new Error('Cannot initialize Jarvis provider: JARVISLABS_API_KEY is not set');
      }
      innerProvider = new JarvisGemmaProvider({
        apiKey: config.JARVISLABS_API_KEY,
        baseUrl: config.JARVIS_BASE_URL,
        model: config.JARVIS_MODEL,
        timeoutMs: config.AI_TIMEOUT_MS,
        maxTokens: config.AI_MAX_TOKENS,
        disableThinking: config.AI_DISABLE_THINKING,
        fetchFn: deps.fetchFn,
      });
      break;
    }

    case 'gemini': {
      if (!config.GEMINI_API_KEY || !config.GEMINI_MODEL) {
        throw new Error('Cannot initialize Gemini provider: GEMINI_API_KEY or GEMINI_MODEL is not set');
      }
      innerProvider = new GeminiProvider({
        apiKey: config.GEMINI_API_KEY,
        model: config.GEMINI_MODEL,
        timeoutMs: config.AI_TIMEOUT_MS,
        maxTokens: config.AI_MAX_TOKENS,
        client: deps.geminiClient,
      });
      break;
    }

    case 'mock':
    default: {
      innerProvider = new MockProvider();
      break;
    }
  }

  return withResilience(innerProvider, deps.resilienceOptions);
}

export const createAiProvider = createTriageProvider;
