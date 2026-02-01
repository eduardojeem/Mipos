/**
 * Simple In-Memory Cache for API Routes
 * 
 * Proporciona cache temporal para reducir queries costosas a la base de datos.
 * TTL configurable per cache key.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class MemoryCache {
    private cache: Map<string, CacheEntry<any>>;

    constructor() {
        this.cache = new Map();
    }

    /**
     * Guarda datos en cache con TTL
     */
    set<T>(key: string, data: T, ttl: number = 300000): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    /**
     * Obtiene datos del cache si no han expirado
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const now = Date.now();
        const age = now - entry.timestamp;

        // Si el dato ha expirado, eliminarlo y retornar null
        if (age > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Verifica si existe un valor válido en cache
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Elimina un valor del cache
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Limpia todo el cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Limpia entradas expiradas
     */
    cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        this.cache.forEach((entry, key) => {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        this.cache.forEach(entry => {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        });

        return {
            total: this.cache.size,
            valid: validEntries,
            expired: expiredEntries,
        };
    }
}

// Instancia singleton del cache
export const apiCache = new MemoryCache();

// Cleanup automático cada 5 minutos
if (typeof window === 'undefined') {
    // Solo en el servidor
    setInterval(() => {
        apiCache.cleanup();
    }, 5 * 60 * 1000);
}

/**
 * Helper para usar cache en API routes
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
        ttl?: number;
        force?: boolean;
    } = {}
): Promise<{ data: T; cached: boolean }> {
    const { ttl = 300000, force = false } = options;

    // Si se forzó refresh, skip cache
    if (!force) {
        const cachedData = apiCache.get<T>(key);
        if (cachedData !== null) {
            return { data: cachedData, cached: true };
        }
    }

    // Fetch fresh data
    const freshData = await fetcher();

    // Store in cache
    apiCache.set(key, freshData, ttl);

    return { data: freshData, cached: false };
}
