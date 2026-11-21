import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('Config Loader (Unit Tests)', () => {
  it('loads valid default configuration when no environment variables are set', () => {
    const config = loadConfig({});
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3001);
    expect(config.AI_PROVIDER).toBe('mock');
    expect(config.REPO_DRIVER).toBe('memory');
    expect(config.AI_DAILY_BUDGET).toBe(200);
    expect(config.AI_TIMEOUT_MS).toBe(15000);
    expect(config.AI_MAX_TOKENS).toBe(1000);
    expect(config.AI_DISABLE_THINKING).toBe(true);
    expect(config.AI_CACHE_MAX_ENTRIES).toBe(200);
    expect(config.AI_CACHE_TTL_MS).toBe(3600000);
    expect(config.GEOCODE_TIMEOUT_MS).toBe(5000);
    expect(config.RATE_LIMIT_MAX).toBe(100);
    expect(config.JARVIS_BASE_URL).toBe('https://models.jarvislabs.net/v1');
    expect(config.JARVIS_MODEL).toBe('gemma-4-31b-it');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('throws clear error when JARVISLABS_API_KEY is missing for jarvis provider', () => {
    expect(() =>
      loadConfig({
        AI_PROVIDER: 'jarvis',
      })
    ).toThrowError(/JARVISLABS_API_KEY is required when AI_PROVIDER is "jarvis"/);
  });

  it('succeeds for jarvis provider when JARVISLABS_API_KEY is provided', () => {
    const config = loadConfig({
      AI_PROVIDER: 'jarvis',
      JARVISLABS_API_KEY: 'test-jarvis-secret-key',
    });
    expect(config.AI_PROVIDER).toBe('jarvis');
    expect(config.JARVISLABS_API_KEY).toBe('test-jarvis-secret-key');
  });

  it('throws clear error when GEMINI_API_KEY or GEMINI_MODEL is missing for gemini provider', () => {
    expect(() =>
      loadConfig({
        AI_PROVIDER: 'gemini',
      })
    ).toThrowError(/GEMINI_API_KEY is required/);

    expect(() =>
      loadConfig({
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-gemini-key',
      })
    ).toThrowError(/GEMINI_MODEL is required/);
  });

  it('succeeds for gemini provider when GEMINI_API_KEY and GEMINI_MODEL are provided', () => {
    const config = loadConfig({
      AI_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-gemini-key',
      GEMINI_MODEL: 'gemini-1.5-flash',
    });
    expect(config.AI_PROVIDER).toBe('gemini');
    expect(config.GEMINI_MODEL).toBe('gemini-1.5-flash');
  });

  it('throws clear error when FIREBASE_SERVICE_ACCOUNT_JSON is missing for firestore driver', () => {
    expect(() =>
      loadConfig({
        REPO_DRIVER: 'firestore',
      })
    ).toThrowError(/FIREBASE_SERVICE_ACCOUNT_JSON is required when REPO_DRIVER is "firestore"/);
  });

  it('succeeds for firestore driver when FIREBASE_SERVICE_ACCOUNT_JSON is provided', () => {
    const config = loadConfig({
      REPO_DRIVER: 'firestore',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"civicresolve"}',
    });
    expect(config.REPO_DRIVER).toBe('firestore');
  });

  it('rejects invalid enum values', () => {
    expect(() =>
      loadConfig({
        AI_PROVIDER: 'unknown_ai' as unknown as string,
      })
    ).toThrowError(/AI_PROVIDER/);

    expect(() =>
      loadConfig({
        REPO_DRIVER: 'postgres' as unknown as string,
      })
    ).toThrowError(/REPO_DRIVER/);
  });

  it('never prints secret values in error messages', () => {
    const secretValue = 'super-secret-password-12345';
    let caughtError: Error | null = null;
    try {
      loadConfig({
        AI_PROVIDER: 'invalid-provider' as unknown as string,
        JARVISLABS_API_KEY: secretValue,
      });
    } catch (err) {
      caughtError = err as Error;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).not.toContain(secretValue);
  });
});
