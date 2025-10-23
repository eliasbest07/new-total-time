/**
 * Cache para peticiones a Supabase para evitar rate limiting (429)
 */
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Obtiene un valor del cache si está vigente
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    // console.log(`🎯 Cache HIT para ${key}`);
    return cached.data as T;
  }

  /**
   * Guarda un valor en el cache
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
    // console.log(`💾 Cache SET para ${key} (TTL: ${ttlMs}ms)`);
  }

  /**
   * Ejecuta una función async con cache y prevención de duplicados
   */
  async execute<T>(
    key: string, 
    fn: () => Promise<T>, 
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    // 1. Verificar cache primero
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. Verificar si ya hay una petición pendiente
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // console.log(`⏳ Esperando petición pendiente para ${key}`);
      return pending as Promise<T>;
    }

    // 3. Ejecutar nueva petición
    // console.log(`🚀 Nueva petición para ${key}`);
    const promise = fn().then(result => {
      this.set(key, result, ttlMs);
      this.pendingRequests.delete(key);
      return result;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Limpia el cache completamente
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    // console.log('🧹 Cache limpiado completamente');
  }

  /**
   * Limpia entradas expiradas del cache
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Instancia singleton
export const requestCache = new RequestCache();

// Limpieza automática cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.cleanup();
  }, 10 * 60 * 1000);
}