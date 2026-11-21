import { describe, it, expect, vi } from 'vitest';
import { createTriageProvider } from '../../../src/ai/factory.js';
import { loadConfig } from '../../../src/config.js';
import { AiSource } from '@civicresolve/shared';
import type { GeminiClient } from '../../../src/ai/gemini.js';

describe('AI Provider Factory (factory.ts)', () => {
  it('creates MockProvider by default when AI_PROVIDER is mock', () => {
    const config = loadConfig({ AI_PROVIDER: 'mock' });
    const provider = createTriageProvider(config);

    expect(provider.name).toBe(AiSource.MOCK);
    expect(provider.model).toBe('mock-triage-v1');
  });

  it('creates JarvisGemmaProvider when AI_PROVIDER is jarvis', () => {
    const config = loadConfig({
      AI_PROVIDER: 'jarvis',
      JARVISLABS_API_KEY: 'test-jarvis-key',
      JARVIS_MODEL: 'gemma-4-31b-it',
    });
    const provider = createTriageProvider(config);

    expect(provider.name).toBe(AiSource.JARVIS_GEMMA);
    expect(provider.model).toBe('gemma-4-31b-it');
  });

  it('creates GeminiProvider when AI_PROVIDER is gemini with fake client', () => {
    const config = loadConfig({
      AI_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-gemini-key',
      GEMINI_MODEL: 'gemini-1.5-flash',
    });

    const fakeClient: GeminiClient = {
      models: {
        generateContent: vi.fn(),
      },
    };

    const provider = createTriageProvider(config, { geminiClient: fakeClient });
    expect(provider.name).toBe(AiSource.GEMINI);
    expect(provider.model).toBe('gemini-1.5-flash');
  });

  it('throws readable error when factory receives unconfigured credentials', () => {
    const unconfiguredJarvis = {
      AI_PROVIDER: 'jarvis',
      JARVISLABS_API_KEY: undefined,
    } as unknown as ReturnType<typeof loadConfig>;
    expect(() => createTriageProvider(unconfiguredJarvis)).toThrow(
      'JARVISLABS_API_KEY is not set'
    );

    const unconfiguredGemini = {
      AI_PROVIDER: 'gemini',
      GEMINI_API_KEY: undefined,
    } as unknown as ReturnType<typeof loadConfig>;
    expect(() => createTriageProvider(unconfiguredGemini)).toThrow(
      'GEMINI_API_KEY or GEMINI_MODEL is not set'
    );
  });
});
