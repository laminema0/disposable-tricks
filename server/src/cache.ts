// Saved answers, kept in memory only. One entry per path of choices, so most plays
// cost no AI call. Nothing a player wrote is ever a key or a value here.
// When the server restarts the answers are gone and are simply asked for again.

export interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  readonly size: number;
}

export interface CacheOptions {
  /** The most entries to keep. The one unused for longest is dropped first. */
  max?: number;
  /** How long an answer stays good, in milliseconds. */
  ttlMs?: number;
  now?: () => number;
}

export function createCache<T>(options: CacheOptions = {}): Cache<T> {
  const max = options.max ?? 500;
  const ttlMs = options.ttlMs ?? 7 * 24 * 60 * 60 * 1000;
  const now = options.now ?? Date.now;
  // A Map remembers the order of insertion, so its first key is the oldest.
  const entries = new Map<string, { value: T; until: number }>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      entries.delete(key);
      if (entry.until <= now()) return undefined;
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, { value, until: now() + ttlMs });
      while (entries.size > max) entries.delete(entries.keys().next().value as string);
    },
    get size() {
      return entries.size;
    },
  };
}
