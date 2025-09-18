import { LocalStorageCache } from './LocalStorageCache';

export interface CachedFetchOptions<T> {
  ttlMs?: number;
  cache?: LocalStorageCache;
  hydrate?(cachedValue: T): T;
  shouldUpdateCache?(freshValue: T): boolean;
}

export interface CachedFetchResult<T> {
  data: T;
  fromCache: boolean;
}

/**
 * Ejecuta un fetch con soporte de cache local y TTL.
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: CachedFetchOptions<T> = {},
): Promise<CachedFetchResult<T>> {
  const { ttlMs, cache = new LocalStorageCache(), hydrate, shouldUpdateCache } = options;

  const cached = cache.read<T>(cacheKey);
  if (cached.hit && cached.value !== undefined) {
    const hydratedValue = hydrate ? hydrate(cached.value) : cached.value;
    return { data: hydratedValue, fromCache: true };
  }

  const freshValue = await fetcher();
  const canPersist = shouldUpdateCache ? shouldUpdateCache(freshValue) : true;

  if (canPersist) {
    cache.write(cacheKey, freshValue, { ttlMs });
  }

  return { data: freshValue, fromCache: false };
}
