import { createHash } from 'node:crypto';
import type { TriageSuggestion, AiSource } from '@civicresolve/shared';

export interface CachedEntry {
  readonly suggestion: TriageSuggestion;
  readonly source: AiSource;
  readonly expiresAt: number;
}

export interface TriageCache {
  get(key: string): { suggestion: TriageSuggestion; source: AiSource } | undefined;
  set(key: string, suggestion: TriageSuggestion, source: AiSource): void;
  size(): number;
  clear(): void;
}

export interface CacheOptions {
  readonly maxEntries?: number;
  readonly ttlMs?: number;
  readonly nowFn?: () => Date;
}

/**
 * Computes a deterministic SHA-256 cache key from normalized complaint text and optional ward.
 */
export function computeTriageCacheKey(text: string, ward?: string): string {
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedWard = (ward || '').trim().toLowerCase();
  const input = `${normalizedWard}:${normalizedText}`;

  return createHash('sha256').update(input).digest('hex');
}

/**
 * In-memory Least-Recently-Used (LRU) cache with Time-To-Live (TTL) expiration.
 *
 * NOTE: In serverless environments (e.g. Vercel), this cache is maintained per container
 * instance on a best-effort basis.
 */
export class InMemoryTriageCache implements TriageCache {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => Date;
  private readonly entries = new Map<string, CachedEntry>();

  public constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 200;
    this.ttlMs = options.ttlMs ?? 3600000; // 1 hour default
    this.now = options.nowFn ?? (() => new Date());
  }

  public get(key: string): { suggestion: TriageSuggestion; source: AiSource } | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    const currentTime = this.now().getTime();
    if (currentTime > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }

    // Refresh LRU ordering: delete and re-insert as most recently used
    this.entries.delete(key);
    this.entries.set(key, entry);

    return {
      suggestion: entry.suggestion,
      source: entry.source,
    };
  }

  public set(key: string, suggestion: TriageSuggestion, source: AiSource): void {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map iteration)
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }

    const expiresAt = this.now().getTime() + this.ttlMs;
    this.entries.set(key, { suggestion, source, expiresAt });
  }

  public size(): number {
    return this.entries.size;
  }

  public clear(): void {
    this.entries.clear();
  }
}
