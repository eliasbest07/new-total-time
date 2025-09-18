const isBrowser = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface CacheEntry<T> {
  value: T;
  storedAt: number;
  expiresAt: number | null;
}

export interface CacheReadResult<T> {
  hit: boolean;
  isExpired: boolean;
  value?: T;
}

export interface CacheWriteOptions {
  ttlMs?: number;
}

/**
 * Maneja lectura/escritura con TTL sobre localStorage sin acoplar la UI.
 */
export class LocalStorageCache {
  private readonly namespace: string;

  constructor(namespace = 'total-time') {
    this.namespace = namespace;
  }

  read<T>(key: string): CacheReadResult<T> {
    if (!isBrowser()) {
      return { hit: false, isExpired: false };
    }

    const storageKey = this.buildKey(key);
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return { hit: false, isExpired: false };
    }

    try {
      const entry = JSON.parse(rawValue) as CacheEntry<T>;
      const isExpired = Boolean(entry.expiresAt && Date.now() > entry.expiresAt);

      if (isExpired) {
        window.localStorage.removeItem(storageKey);
        return { hit: false, isExpired: true };
      }

      return { hit: true, isExpired: false, value: entry.value };
    } catch (error) {
      window.localStorage.removeItem(storageKey);
      return { hit: false, isExpired: false };
    }
  }

  write<T>(key: string, value: T, options: CacheWriteOptions = {}): void {
    if (!isBrowser()) {
      return;
    }

    const storageKey = this.buildKey(key);
    const expiresAt = typeof options.ttlMs === 'number' ? Date.now() + options.ttlMs : null;

    const entry: CacheEntry<T> = {
      value,
      storedAt: Date.now(),
      expiresAt,
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      // si localStorage está lleno o bloqueado, limpiamos solo ese registro
      window.localStorage.removeItem(storageKey);
    }
  }

  remove(key: string): void {
    if (!isBrowser()) {
      return;
    }
    window.localStorage.removeItem(this.buildKey(key));
  }

  clearNamespace(): void {
    if (!isBrowser()) {
      return;
    }

    const prefix = `${this.namespace}::`;
    Object.keys(window.localStorage).forEach((storageKey) => {
      if (storageKey.startsWith(prefix)) {
        window.localStorage.removeItem(storageKey);
      }
    });
  }

  private buildKey(key: string): string {
    return `${this.namespace}::${key}`;
  }
}
