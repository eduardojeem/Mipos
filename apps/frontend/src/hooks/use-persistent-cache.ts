import { useState, useEffect, useCallback } from 'react';

interface PersistentCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PersistentCache {
  private storageKey = 'pos-persistent-cache';
  private memoryCache = new Map<string, any>();

  constructor() {
    // Avoid touching localStorage during SSR
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      if (typeof window === 'undefined') return;
      const stored = window.localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Load valid entries into memory cache
        Object.entries(data).forEach(([key, entry]) => {
          const typedEntry = entry as PersistentCacheEntry<any>;
          if (this.isValid(typedEntry)) {
            this.memoryCache.set(key, typedEntry.data);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }

  private saveToStorage() {
    try {
      if (typeof window === 'undefined') return;
      const stored = window.localStorage.getItem(this.storageKey);
      const existingData = stored ? JSON.parse(stored) : {};
      
      // Clean up expired entries before saving
      const cleanedData: Record<string, PersistentCacheEntry<any>> = {};
      Object.entries(existingData).forEach(([key, entry]) => {
        const typedEntry = entry as PersistentCacheEntry<any>;
        if (this.isValid(typedEntry)) {
          cleanedData[key] = typedEntry;
        }
      });

      window.localStorage.setItem(this.storageKey, JSON.stringify(cleanedData));
    } catch (error) {
      console.warn('Failed to save persistent cache:', error);
    }
  }

  private isValid<T>(entry: PersistentCacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000) { // Default 24 hours
    const entry: PersistentCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Update memory cache
    this.memoryCache.set(key, data);

    // Update localStorage
    try {
      if (typeof window === 'undefined') return;
      const stored = window.localStorage.getItem(this.storageKey);
      const existingData = stored ? JSON.parse(stored) : {};
      existingData[key] = entry;
      window.localStorage.setItem(this.storageKey, JSON.stringify(existingData));
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
    }
  }

  get<T>(key: string): T | null {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // Check localStorage
    try {
      if (typeof window === 'undefined') {
        // On SSR, localStorage is unavailable
        return null;
      }
      const stored = window.localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        const entry = data[key] as PersistentCacheEntry<T>;
        
        if (entry && this.isValid(entry)) {
          // Load back into memory cache
          this.memoryCache.set(key, entry.data);
          return entry.data;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve from persistent cache:', error);
    }

    return null;
  }

  delete(key: string) {
    this.memoryCache.delete(key);
    
    try {
      if (typeof window === 'undefined') return;
      const stored = window.localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        delete data[key];
        window.localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    } catch (error) {
      console.warn('Failed to delete from persistent cache:', error);
    }
  }

  clear() {
    this.memoryCache.clear();
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  cleanup() {
    this.saveToStorage(); // This will clean expired entries
    this.loadFromStorage(); // Reload clean data
  }
}

// Global persistent cache instance
const globalPersistentCache = new PersistentCache();

// Cleanup expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalPersistentCache.cleanup();
  }, 10 * 60 * 1000); // Every 10 minutes
}

interface UsePersistentCacheOptions {
  ttl?: number;
  enabled?: boolean;
}

export function usePersistentCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UsePersistentCacheOptions = {}
) {
  const {
    ttl = 24 * 60 * 60 * 1000, // Default 24 hours
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // Check persistent cache first
    if (!forceRefresh) {
      const cachedData = globalPersistentCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        return cachedData;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      globalPersistentCache.set(key, result, ttl);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, enabled]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    globalPersistentCache.delete(key);
    setData(null);
  }, [key]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate
  };
}

export { globalPersistentCache };