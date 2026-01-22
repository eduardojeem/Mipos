'use client';

import { useCallback, useEffect, useRef } from 'react';
import AdvancedCache from '../services/AdvancedCache';

export function useAdvancedCache() {
  const cache = useRef<AdvancedCache | null>(null);

  useEffect(() => {
    cache.current = AdvancedCache.getInstance({
      dbName: 'products-advanced-cache',
      version: 1,
      defaultTTL: 10 * 60 * 1000, // 10 minutes
      maxSize: 500
    });

    // Cleanup expired entries on mount
    cache.current.cleanup();

    return () => {
      // Don't destroy on unmount as it's a singleton
    };
  }, []);

  const set = useCallback(async <T>(key: string, data: T, ttl?: number, metadata?: Record<string, any>) => {
    return cache.current?.set(key, data, ttl, metadata);
  }, []);

  const get = useCallback(async <T>(key: string): Promise<T | null> => {
    return cache.current?.get<T>(key) || null;
  }, []);

  const has = useCallback(async (key: string): Promise<boolean> => {
    return cache.current?.has(key) || false;
  }, []);

  const remove = useCallback(async (key: string) => {
    return cache.current?.delete(key);
  }, []);

  const clear = useCallback(async () => {
    return cache.current?.clear();
  }, []);

  const getOrSet = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<T> => {
    if (!cache.current) {
      return fetcher();
    }
    return cache.current.getOrSet(key, fetcher, ttl, metadata);
  }, []);

  const setMany = useCallback(async <T>(entries: Array<{ key: string; data: T; ttl?: number; metadata?: Record<string, any> }>) => {
    return cache.current?.setMany(entries);
  }, []);

  const getMany = useCallback(async <T>(keys: string[]): Promise<Array<{ key: string; data: T | null }>> => {
    return cache.current?.getMany<T>(keys) || [];
  }, []);

  const getStats = useCallback(async () => {
    return cache.current?.getStats();
  }, []);

  const cleanup = useCallback(async () => {
    return cache.current?.cleanup();
  }, []);

  return {
    set,
    get,
    has,
    remove,
    clear,
    getOrSet,
    setMany,
    getMany,
    getStats,
    cleanup
  };
}

// Hook for caching API responses
export function useApiCache() {
  const { getOrSet, set, get, remove } = useAdvancedCache();

  const cacheApiCall = useCallback(async <T>(
    endpoint: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> => {
    const cacheKey = `api:${endpoint}`;
    return getOrSet(cacheKey, fetcher, ttl, { type: 'api', endpoint });
  }, [getOrSet]);

  const invalidateApiCache = useCallback(async (endpoint: string) => {
    const cacheKey = `api:${endpoint}`;
    return remove(cacheKey);
  }, [remove]);

  const cacheApiResponse = useCallback(async <T>(endpoint: string, data: T, ttl?: number) => {
    const cacheKey = `api:${endpoint}`;
    return set(cacheKey, data, ttl, { type: 'api', endpoint });
  }, [set]);

  const getApiCache = useCallback(async <T>(endpoint: string): Promise<T | null> => {
    const cacheKey = `api:${endpoint}`;
    return get<T>(cacheKey);
  }, [get]);

  return {
    cacheApiCall,
    invalidateApiCache,
    cacheApiResponse,
    getApiCache
  };
}
