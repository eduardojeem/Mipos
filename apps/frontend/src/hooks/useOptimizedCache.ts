'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  priority: 'high' | 'medium' | 'low';
  accessCount: number;
  lastAccessed: number;
}

class OptimizedCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly config = {
    maxSize: 2000,                        // ✅ Aumentado de 500
    highPriorityTTL: 5 * 60 * 1000,     // 5 min para datos críticos
    mediumPriorityTTL: 15 * 60 * 1000,  // 15 min para datos frecuentes
    lowPriorityTTL: 60 * 60 * 1000,     // 1h para datos estáticos
    cleanupInterval: 10 * 60 * 1000,    // Cleanup cada 10 min (menos frecuente)
  };
  
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startCleanup();
  }
  
  set<T>(key: string, data: T, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const now = Date.now();
    const ttl = this.config[`${priority}PriorityTTL`];
    
    // Limpiar cache si está lleno
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      priority,
      accessCount: 0,
      lastAccessed: now
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    
    // Verificar expiración
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    // Actualizar estadísticas de acceso
    entry.accessCount++;
    entry.lastAccessed = now;
    
    return entry.data;
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
  
  // Eviction strategy: LRU con prioridad
  private evictLRU(): void {
    const entries = Array.from(this.cache.entries());
    
    // Primero intentar eliminar entradas de baja prioridad
    const lowPriority = entries
      .filter(([, entry]) => entry.priority === 'low')
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    if (lowPriority.length > 0) {
      this.cache.delete(lowPriority[0][0]);
      return;
    }
    
    // Luego entradas de prioridad media menos accedidas
    const mediumPriority = entries
      .filter(([, entry]) => entry.priority === 'medium')
      .sort((a, b) => {
        // Combinar último acceso y frecuencia de acceso
        const scoreA = a[1].lastAccessed + (a[1].accessCount * 1000);
        const scoreB = b[1].lastAccessed + (b[1].accessCount * 1000);
        return scoreA - scoreB;
      });
    
    if (mediumPriority.length > 0) {
      this.cache.delete(mediumPriority[0][0]);
      return;
    }
    
    // Como último recurso, eliminar la entrada más antigua
    const oldest = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) {
      this.cache.delete(oldest[0]);
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
    
    if (process.env.NODE_ENV === 'development' && keysToDelete.length > 0) {
      console.debug(`[OptimizedCache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }
  
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: entries.length > 0 ? 
        entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length : 0,
      expired: entries.filter(entry => now > entry.expiresAt).length,
      byPriority: {
        high: entries.filter(e => e.priority === 'high').length,
        medium: entries.filter(e => e.priority === 'medium').length,
        low: entries.filter(e => e.priority === 'low').length,
      }
    };
  }
  
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Instancia global del cache optimizado
const optimizedCache = new OptimizedCache();

export function useOptimizedCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    priority?: 'high' | 'medium' | 'low';
    enabled?: boolean;
  } = {}
) {
  const { priority = 'medium', enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = optimizedCache.get<T>(key);
      if (cached) {
        setData(cached);
        return cached;
      }
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      
      if (!controller.signal.aborted && mountedRef.current) {
        optimizedCache.set(key, result, priority);
        setData(result);
      }
      
      return result;
    } catch (err) {
      if (!controller.signal.aborted && mountedRef.current) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [key, fetcher, priority, enabled]);
  
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);
  
  const invalidate = useCallback(() => {
    optimizedCache.delete(key);
    setData(null);
  }, [key]);
  
  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    isStale: !optimizedCache.has(key)
  };
}

// Hook para estadísticas del cache
export function useCacheStats() {
  const [stats, setStats] = useState(optimizedCache.getStats());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(optimizedCache.getStats());
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const clearCache = useCallback(() => {
    optimizedCache.clear();
    setStats(optimizedCache.getStats());
  }, []);
  
  return {
    stats,
    clearCache
  };
}

// Export cache instance for direct access if needed
export { optimizedCache };