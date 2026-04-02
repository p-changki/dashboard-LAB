type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cacheStore = getCacheStore();
const MAX_CACHE_ENTRIES = 200;

export async function readThroughCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  pruneExpiredCacheEntries();
  const cached = cacheStore.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const value = await loader();
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
  enforceCacheEntryLimit();
  return value;
}

export function clearCache(key?: string) {
  if (key) {
    cacheStore.delete(key);
    return;
  }

  cacheStore.clear();
}

function getCacheStore() {
  const globalStore = globalThis as typeof globalThis & {
    __dashboardLabCacheStore?: Map<string, CacheEntry<unknown>>;
  };

  if (!globalStore.__dashboardLabCacheStore) {
    globalStore.__dashboardLabCacheStore = new Map<string, CacheEntry<unknown>>();
  }

  return globalStore.__dashboardLabCacheStore;
}

function pruneExpiredCacheEntries() {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}

function enforceCacheEntryLimit() {
  if (cacheStore.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const overflow = cacheStore.size - MAX_CACHE_ENTRIES;
  let removed = 0;
  for (const key of cacheStore.keys()) {
    cacheStore.delete(key);
    removed += 1;
    if (removed >= overflow) {
      break;
    }
  }
}
