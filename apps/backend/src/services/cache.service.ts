import { logger } from '../middleware/logger';

export interface CacheConfig {
  ttl: number;
  prefix: string;
  maxMemory?: string;
}

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
    
    logger.info('In-memory cache service initialized', { prefix: config.prefix });
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Cache cleanup completed', { cleaned, remaining: this.cache.size });
    }
  }

  private getKey(key: string): string {
    return `${this.config.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    if (entry.expiry < Date.now()) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    logger.debug('Cache hit', { key, ttl: this.config.ttl });
    return entry.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = this.getKey(key);
    const expiry = Date.now() + ((ttl || this.config.ttl) * 1000);
    
    this.cache.set(cacheKey, { value, expiry });
    logger.debug('Cache set', { key, ttl: ttl || this.config.ttl });
  }

  async delete(key: string): Promise<void> {
    const cacheKey = this.getKey(key);
    this.cache.delete(cacheKey);
    logger.debug('Cache delete', { key });
  }

  async deletePattern(pattern: string): Promise<void> {
    const prefix = `${this.config.prefix}:${pattern}`;
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix.replace('*', ''))) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    logger.debug('Cache delete pattern', { pattern, deletedCount });
  }

  async clear(): Promise<void> {
    const prefix = `${this.config.prefix}:`;
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    logger.info('Cache cleared', { deletedCount });
  }

  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory?: string;
  }> {
    const keys = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(`${this.config.prefix}:`)
    ).length;
    
    return {
      connected: true,
      keys,
      memory: `${Math.round(JSON.stringify(Array.from(this.cache.entries())).length / 1024)}KB`
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }

  // Cache decorator for methods
  static cached<T extends any[], R>(
    config: CacheConfig,
    keyFn: (...args: T) => string,
    ttl?: number
  ) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      const cache = new CacheService(config);

      descriptor.value = async function (...args: T): Promise<R> {
        const cacheKey = keyFn(...args);

        // Try to get from cache first
        const cached = await cache.get<R>(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // Execute method and cache result
        const result = await method.apply(this, args);
        await cache.set(cacheKey, result, ttl);

        return result;
      };
    };
  }
}

// Product-specific cache service
export class ProductCacheService extends CacheService {
  constructor() {
    super({
      ttl: parseInt(process.env.PRODUCT_CACHE_TTL || '300'), // 5 minutes default
      prefix: 'products',
      maxMemory: process.env.CACHE_MAX_MEMORY || '512mb'
    });
  }

  // Cache keys for different product operations
  getProductKey(id: string): string {
    return `product:${id}`;
  }

  getProductsListKey(filters: Record<string, any>): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `list:${sortedFilters}`;
  }

  getSearchKey(query: string, filters: Record<string, any>): string {
    const filterStr = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `search:${query}:${filterStr}`;
  }

  getCategoryProductsKey(categoryId: string): string {
    return `category:${categoryId}`;
  }

  // Invalidate related caches when product is updated
  async invalidateProduct(productId: string, categoryId?: string): Promise<void> {
    const promises = [
      this.delete(this.getProductKey(productId)),
      this.deletePattern('list:*'), // Invalidate all lists
      this.deletePattern('search:*') // Invalidate all searches
    ];

    if (categoryId) {
      promises.push(this.delete(this.getCategoryProductsKey(categoryId)));
    }

    await Promise.all(promises);
  }

  // Invalidate category-related caches
  async invalidateCategory(categoryId: string): Promise<void> {
    await Promise.all([
      this.delete(this.getCategoryProductsKey(categoryId)),
      this.deletePattern('list:*'), // Lists might include category filters
      this.deletePattern('search:*') // Searches might include category filters
    ]);
  }
}

// Global cache instance
export const productCache = new ProductCacheService();