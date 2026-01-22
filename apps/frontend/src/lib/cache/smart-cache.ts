/*
  SmartCache implementation
  - In-memory cache with optional TTL per entry
  - Pattern-based invalidation
  - Preload critical endpoints via existing API client
*/

import api from '@/lib/api';

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // epoch ms; Infinity for no TTL
}

export interface SmartCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  preload(criticalData: string[]): Promise<void>;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export class DefaultSmartCache implements SmartCache {
  private store = new Map<string, CacheEntry<any>>();
  private defaultTTL = 15 * 60 * 1000; // 15 minutes

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (entry.expiresAt !== Infinity && now > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = typeof ttl === 'number'
      ? (ttl <= 0 ? Infinity : Date.now() + ttl)
      : Date.now() + this.defaultTTL;
    this.store.set(key, { data: value, expiresAt });
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = Array.from(this.store.keys());
    for (const k of keys) {
      if (k.includes(pattern)) {
        this.store.delete(k);
      }
    }
  }

  async preload(criticalData: string[]): Promise<void> {
    // criticalData are endpoint paths (e.g., '/api/products', '/api/categories')
    const tasks = criticalData.map(async (endpoint) => {
      try {
        const res = await api.get(endpoint);
        // Use common response shapes: data or items or products, etc.
        const body = res?.data;
        const value = body?.data ?? body?.items ?? body?.products ?? body?.categories ?? body?.customers ?? body ?? null;
        if (value !== null) {
          await this.set(endpoint, value);
        }
      } catch (e) {
        // Silent failure to avoid blocking startup; cache remains empty for this key
        if (isBrowser()) {
          console.warn(`[SmartCache] Preload failed for ${endpoint}`, e);
        }
      }
    });
    await Promise.allSettled(tasks);
  }
}

// Singleton instance for convenience
export const smartCache = new DefaultSmartCache();