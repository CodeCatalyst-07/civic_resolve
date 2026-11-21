import { describe, it, expect } from 'vitest';
import { InMemoryTriageCache, computeTriageCacheKey } from '../../../src/services/cache.js';
import { AiSource, Category, Urgency, type TriageSuggestion } from '@civicresolve/shared';

describe('Triage LRU Cache (cache.ts)', () => {
  const dummySuggestion: TriageSuggestion = Object.freeze({
    is_civic_issue: true,
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    safety_critical: true,
    confidence: 0.9,
    summary: 'Pothole on 100ft road',
    reasons: ['Deep hole'],
    missing_info: [],
  });

  it('computes deterministic SHA-256 cache key regardless of whitespace and casing', () => {
    const key1 = computeTriageCacheKey('  Pothole on 100ft   road  ', 'Ward 12');
    const key2 = computeTriageCacheKey('pothole on 100ft road', 'ward 12');
    const key3 = computeTriageCacheKey('pothole on 100ft road', 'ward 14');

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('stores and retrieves cached suggestion within TTL', () => {
    let mockTime = 1000;
    const cache = new InMemoryTriageCache({
      ttlMs: 5000,
      nowFn: () => new Date(mockTime),
    });

    cache.set('key-1', dummySuggestion, AiSource.JARVIS_GEMMA);
    expect(cache.size()).toBe(1);

    const retrieved = cache.get('key-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.suggestion.summary).toBe('Pothole on 100ft road');
    expect(retrieved?.source).toBe(AiSource.JARVIS_GEMMA);

    // Advance clock past TTL
    mockTime = 7000;
    expect(cache.get('key-1')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('evicts oldest entry when maxEntries capacity is exceeded (LRU behavior)', () => {
    const cache = new InMemoryTriageCache({
      maxEntries: 2,
    });

    cache.set('key-1', dummySuggestion, AiSource.MOCK);
    cache.set('key-2', dummySuggestion, AiSource.MOCK);

    // Access key-1 to make key-2 the least recently used
    cache.get('key-1');

    // Add key-3 -> should evict key-2
    cache.set('key-3', dummySuggestion, AiSource.MOCK);

    expect(cache.get('key-1')).toBeDefined();
    expect(cache.get('key-2')).toBeUndefined();
    expect(cache.get('key-3')).toBeDefined();
  });

  it('clears all entries and handles default options', () => {
    const cache = new InMemoryTriageCache();
    cache.set('k1', dummySuggestion, AiSource.MOCK);
    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
