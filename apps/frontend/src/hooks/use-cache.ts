'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCacheConfig } from './use-cache-config';

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
  lastAccessed: number;
}

// Cache configuration
interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // Time to live in milliseconds
  cleanupInterval: number;
}

// In-memory cache implementation
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 500,                    // Increased from 200 for better performance
      defaultTTL: 30 * 60 * 1000,     // 30 minutes (was 15 minutes)
      cleanupInterval: 5 * 60 * 1000, // 5 minutes (was 2 minutes)
      ...config
    };

    this.startCleanup();
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      hits: 0,
      lastAccessed: now
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = now;
    
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: entries.length > 0 ? entries.reduce((sum, entry) => sum + entry.hits, 0) / entries.length : 0,
      expired: entries.filter(entry => now > entry.expiresAt).length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(entry => entry.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(entry => entry.timestamp)) : null
    };
  }

  private evictOldest(): void {
    // Use LRU eviction: remove least recently accessed entries
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    // Batch delete expired entries
    keysToDelete.forEach(key => this.cache.delete(key));

    // Log cleanup stats in development
    if (process.env.NODE_ENV === 'development' && keysToDelete.length > 0) {
      console.debug(`[cache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  get defaultTTL(): number {
    return this.config.defaultTTL;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Global cache instance
const globalCache = new MemoryCache();
// Track in-flight requests by cache key to dedupe concurrent fetches across components
const inflightRequests = new Map<string, Promise<any>>();

// Hook for basic caching
export function useCache<T>(
  key: string,
  fetcher: (signal?: AbortSignal) => Promise<T>,
  options: {
    ttl?: number;
    enabled?: boolean;
    refreshInterval?: number;
    endpoint?: string; // For automatic cache config lookup
    initialFetch?: boolean; // Control first fetch on mount
    refreshOnFocus?: boolean; // Revalidate when window regains focus
  } = {}
) {
  const {
    ttl: optionsTtl,
    enabled = true,
    refreshInterval,
    endpoint,
    initialFetch = true,
    refreshOnFocus = false
  } = options;

  // Get cache configuration based on endpoint or use provided options
  const cacheConfig = endpoint ? getCacheConfig(endpoint) : null;
  const ttl = optionsTtl || cacheConfig?.ttl || globalCache.defaultTTL;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(false);
  // Keep latest fetcher in a ref to avoid recreating fetchData on every render
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    const hasCached = globalCache.has(key);
    // Check cache first when not forcing refresh
    if (!forceRefresh) {
      const cachedData = globalCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        return cachedData;
      }
    } else {
      // If we are forcing refresh and cache exists, mark as updating, not full loading
      if (hasCached) {
        setUpdating(true);
      }
    }

    // Only set full loading if we don't have cached data
    if (!hasCached) {
      setLoading(true);
    }
    setError(null);

    // If another component is already fetching this key, await that promise
    const existing = inflightRequests.get(key) as Promise<T> | undefined;
    if (existing) {
      try {
        const result = await existing;
        // Avoid state updates if unmounted
        if (!mountedRef.current) return result;
        const cachedData = globalCache.get<T>(key);
        if (cachedData) {
          setData(cachedData);
          return cachedData;
        }
        setData(result);
        return result;
      } catch (err) {
        // Detect and silence cancellation errors when awaiting an existing in-flight request
        const name = (err as any)?.name;
        const code = (err as any)?.code;
        const message = (err as any)?.message || '';
        const isCanceled = (
          name === 'AbortError' ||
          code === 'ERR_CANCELED' ||
          message.includes('aborted') ||
          message.toLowerCase().includes('canceled')
        );
        if (isCanceled) {
          // Do not mark error state; return cached data if present or undefined
          const cachedData = globalCache.get<T>(key);
          if (cachedData) {
            return cachedData;
          }
          return undefined as unknown as T;
        }
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setUpdating(false);
        }
      }
    }

    // Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const currentFetcher = fetcherRef.current;
      const promise = (async () => {
        const result = await currentFetcher(controller.signal);
        globalCache.set(key, result, ttl);
        return result;
      })();
      inflightRequests.set(key, promise as Promise<any>);
      const result = await promise;
      // Avoid state updates if unmounted
      if (!mountedRef.current) return result;
      setData(result);
      return result;
    } catch (err) {
      // If aborted/canceled, do not treat as an error
      const name = (err as any)?.name;
      const code = (err as any)?.code;
      const message = (err as any)?.message || '';
      if (
        name === 'AbortError' ||
        code === 'ERR_CANCELED' ||
        message.includes('aborted') ||
        message.toLowerCase().includes('canceled')
      ) {
        // Silenciar cancelaciones: no propagar como error ni rechazar la promesa
        // Si hay datos en caché, devolverlos; si no, salir sin actualizar estado
        const cachedData = globalCache.get<T>(key);
        if (cachedData) {
          return cachedData;
        }
        return undefined as unknown as T;
      }
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      inflightRequests.delete(key);
      if (mountedRef.current) {
        setLoading(false);
        setUpdating(false);
      }
    }
  }, [key, ttl, enabled]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    globalCache.delete(key);
    setData(null);
  }, [key]);

  useEffect(() => {
    mountedRef.current = true;
    if (initialFetch) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, initialFetch]);

  useEffect(() => {
    if (refreshInterval && enabled) {
      refreshTimer.current = setInterval(() => {
        fetchData(true);
      }, refreshInterval);

      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current);
        }
      };
    }
  }, [fetchData, refreshInterval, enabled]);

  // Revalidate on window focus if enabled
  useEffect(() => {
    if (!refreshOnFocus || !enabled) return;
    const onFocus = () => {
      fetchData(true);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchData, refreshOnFocus, enabled]);

  return {
    data,
    loading,
    updating,
    error,
    refresh,
    invalidate,
    isStale: !globalCache.has(key)
  };
}

// Hook for query caching with dependencies
export function useQueryCache<T, TParams extends any[]>(
  queryKey: string,
  queryFn: (...params: TParams) => Promise<T>,
  params: TParams,
  options: {
    ttl?: number;
    enabled?: boolean;
    staleTime?: number;
  } = {}
) {
  const { ttl, enabled = true, staleTime = 0 } = options;
  const cacheKey = useMemo(() => 
    `${queryKey}:${JSON.stringify(params)}`, 
    [queryKey, params]
  );

  const fetcher = useCallback(() => 
    queryFn(...params), 
    [queryFn, params]
  );

  return useCache(cacheKey, fetcher, { ttl, enabled });
}

// Hook for mutation with cache invalidation
export function useMutationCache<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateKeys?: string[];
    updateCache?: (data: TData, variables: TVariables) => void;
  } = {}
) {
  const { onSuccess, onError, invalidateKeys = [], updateCache } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      
      // Invalidate specified cache keys
      invalidateKeys.forEach(key => {
        globalCache.delete(key);
      });

      // Update cache if provided
      updateCache?.(result, variables);
      
      onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error, variables);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, onSuccess, onError, invalidateKeys, updateCache]);

  return {
    mutate,
    loading,
    error
  };
}

// Hook for local storage caching
export function useLocalStorageCache<T>(
  key: string,
  initialValue: T,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    ttl?: number;
  } = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    ttl
  } = options;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const parsed = JSON.parse(item);
      
      // Check TTL if provided
      if (ttl && parsed.expiresAt && Date.now() > parsed.expiresAt) {
        window.localStorage.removeItem(key);
        return initialValue;
      }

      return parsed.data !== undefined ? deserialize(parsed.data) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        const dataToStore = {
          data: serialize(valueToStore),
          timestamp: Date.now(),
          ...(ttl && { expiresAt: Date.now() + ttl })
        };
        window.localStorage.setItem(key, JSON.stringify(dataToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serialize, storedValue, ttl]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

// Hook for session storage caching
export function useSessionStorageCache<T>(
  key: string,
  initialValue: T,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  } = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      
      const item = window.sessionStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, serialize(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, serialize, storedValue]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

// Hook for cache statistics
export function useCacheStats() {
  const [stats, setStats] = useState(globalCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(globalCache.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearCache = useCallback(() => {
    globalCache.clear();
    setStats(globalCache.getStats());
  }, []);

  return {
    stats,
    clearCache
  };
}

// Export cache instance for direct access
export { globalCache };