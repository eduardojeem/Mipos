'use client';

interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version: string;
  metadata?: Record<string, any>;
}

interface CacheConfig {
  dbName: string;
  version: number;
  defaultTTL: number; // Default TTL in milliseconds
  maxSize: number; // Maximum number of entries
}

const logger = createLogger('AdvancedCache');

class AdvancedCache {
  private static instance: AdvancedCache;
  private db: IDBDatabase | null = null;
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private initPromise: Promise<void> | null = null;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      dbName: 'products-cache',
      version: 1,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      ...config
    };
  }

  static getInstance(config?: Partial<CacheConfig>): AdvancedCache {
    if (!this.instance) {
      this.instance = new AdvancedCache(config);
    }
    return this.instance;
  }

  // Initialize IndexedDB
  private async initDB(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        logger.warn('IndexedDB not available, using memory cache only');
        resolve();
        return;
      }

      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for cache entries
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // Set cache entry
  async set<T>(key: string, data: T, ttl?: number, metadata?: Record<string, any>): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      version: '1.0',
      metadata
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);
    this.cleanupMemoryCache();

    // Store in IndexedDB
    try {
      await this.initDB();
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.put(entry);
      }
    } catch (error) {
      logger.warn('Failed to store in IndexedDB:', error);
    }
  }

  // Get cache entry
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isEntryValid(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Check IndexedDB
    try {
      await this.initDB();
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const request = store.get(key);

        return new Promise((resolve) => {
          request.onsuccess = () => {
            const entry = request.result as CacheEntry<T>;
            if (entry && this.isEntryValid(entry)) {
              // Update memory cache
              this.memoryCache.set(key, entry);
              resolve(entry.data);
            } else {
              // Remove expired entry
              if (entry) {
                this.delete(key);
              }
              resolve(null);
            }
          };

          request.onerror = () => {
            logger.warn('Failed to get from IndexedDB:', request.error);
            resolve(null);
          };
        });
      }
    } catch (error) {
      logger.warn('Failed to access IndexedDB:', error);
    }

    return null;
  }

  // Check if entry exists and is valid
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  // Delete cache entry
  async delete(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from IndexedDB
    try {
      await this.initDB();
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.delete(key);
      }
    } catch (error) {
      logger.warn('Failed to delete from IndexedDB:', error);
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear IndexedDB
    try {
      await this.initDB();
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.clear();
      }
    } catch (error) {
      logger.warn('Failed to clear IndexedDB:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    memoryEntries: number;
    dbEntries: number;
    totalSize: number;
    hitRate: number;
  }> {
    let dbEntries = 0;
    let totalSize = 0;

    try {
      await this.initDB();
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const countRequest = store.count();

        dbEntries = await new Promise((resolve) => {
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => resolve(0);
        });

        // Calculate approximate size
        const allRequest = store.getAll();
        const entries = await new Promise<CacheEntry[]>((resolve) => {
          allRequest.onsuccess = () => resolve(allRequest.result || []);
          allRequest.onerror = () => resolve([]);
        });

        totalSize = entries.reduce((size, entry) => {
          return size + JSON.stringify(entry).length;
        }, 0);
      }
    } catch (error) {
      logger.warn('Failed to get cache stats:', error);
    }

    return {
      memoryEntries: this.memoryCache.size,
      dbEntries,
      totalSize,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }

  // Cleanup expired entries
  async cleanup(): Promise<void> {
    const now = Date.now();

    // Cleanup memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isEntryValid(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Cleanup IndexedDB
    try {
      await this.initDB();
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(now - this.config.defaultTTL);

        const request = index.openCursor(range);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry = cursor.value as CacheEntry;
            if (!this.isEntryValid(entry)) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      }
    } catch (error) {
      logger.warn('Failed to cleanup IndexedDB:', error);
    }
  }

  // Cache with automatic refresh
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    try {
      const data = await fetcher();
      await this.set(key, data, ttl, metadata);
      return data;
    } catch (error) {
      logger.error('Failed to fetch data for cache:', error);
      throw error;
    }
  }

  // Batch operations
  async setMany<T>(entries: Array<{ key: string; data: T; ttl?: number; metadata?: Record<string, any> }>): Promise<void> {
    const promises = entries.map(entry =>
      this.set(entry.key, entry.data, entry.ttl, entry.metadata)
    );
    await Promise.all(promises);
  }

  async getMany<T>(keys: string[]): Promise<Array<{ key: string; data: T | null }>> {
    const promises = keys.map(async key => ({
      key,
      data: await this.get<T>(key)
    }));
    return Promise.all(promises);
  }

  // Private helper methods
  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  private cleanupMemoryCache(): void {
    if (this.memoryCache.size > this.config.maxSize) {
      // Remove oldest entries
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, entries.length - this.config.maxSize);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  // Destroy cache instance
  destroy(): void {
    this.memoryCache.clear();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }
}

export default AdvancedCache;