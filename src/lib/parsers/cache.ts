type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cacheStore = getCacheStore();

export async function readThroughCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = cacheStore.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const value = await loader();
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
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
    __changkiAiCacheStore?: Map<string, CacheEntry<unknown>>;
  };

  if (!globalStore.__changkiAiCacheStore) {
    globalStore.__changkiAiCacheStore = new Map<string, CacheEntry<unknown>>();
  }

  return globalStore.__changkiAiCacheStore;
}
