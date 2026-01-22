import { getCachedPrismaClient } from '../config/cache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const cachedPrisma = getCachedPrismaClient(prisma);

/**
 * Cache utility functions for common operations
 */

/**
 * Batch cache invalidation for multiple entities
 */
export async function batchInvalidateCache(operations: {
  products?: string[];
  categories?: boolean;
  sales?: boolean;
  users?: string[];
}) {
  const promises: Promise<void>[] = [];

  if (operations.products) {
    operations.products.forEach(sku => {
      promises.push(Promise.resolve(cachedPrisma.invalidateProductCache(sku)));
    });
  }

  if (operations.categories) {
    promises.push(Promise.resolve(cachedPrisma.invalidateCategoryCache()));
  }

  if (operations.sales) {
    promises.push(Promise.resolve(cachedPrisma.invalidateSalesCache()));
  }

  if (operations.users) {
    operations.users.forEach(userId => {
      promises.push(Promise.resolve(cachedPrisma.invalidateUserCache(userId)));
    });
  }

  await Promise.all(promises);
}

/**
 * Cache warming for specific data types
 */
export async function warmSpecificCache(types: {
  categories?: boolean;
  dashboardStats?: boolean;
  lowStockProducts?: { threshold?: number };
  recentSales?: { limit?: number };
  topProducts?: { days?: number; limit?: number };
}) {
  const promises: Promise<any>[] = [];

  if (types.categories) {
    promises.push(cachedPrisma.getCategories());
  }

  if (types.dashboardStats) {
    promises.push(cachedPrisma.getDashboardStats());
  }

  if (types.lowStockProducts) {
    promises.push(cachedPrisma.getLowStockProducts(types.lowStockProducts.threshold || 10));
  }

  if (types.recentSales) {
    promises.push(cachedPrisma.getRecentSales(types.recentSales.limit || 10));
  }

  if (types.topProducts) {
    promises.push(cachedPrisma.getTopSellingProducts(
      types.topProducts.days || 30,
      types.topProducts.limit || 10
    ));
  }

  const results = await Promise.allSettled(promises);
  
  // Log any failures
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`Cache warming failed for operation ${index}:`, result.reason);
    }
  });

  return results;
}

/**
 * Get cache performance metrics
 */
export function getCacheMetrics() {
  const stats = cachedPrisma.getCacheStats();
  const memoryUsage = process.memoryUsage();
  
  return {
    cache: stats,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    },
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  };
}

/**
 * Cache health check
 */
export async function performCacheHealthCheck() {
  const startTime = Date.now();
  const results = {
    healthy: true,
    checks: {} as Record<string, { success: boolean; duration: number; error?: string }>
  };

  // Test basic cache operations
  const checks = [
    {
      name: 'categories',
      operation: () => cachedPrisma.getCategories()
    },
    {
      name: 'dashboardStats',
      operation: () => cachedPrisma.getDashboardStats()
    },
    {
      name: 'cacheStats',
      operation: () => cachedPrisma.getCacheStats()
    }
  ];

  for (const check of checks) {
    const checkStart = Date.now();
    try {
      await check.operation();
      results.checks[check.name] = {
        success: true,
        duration: Date.now() - checkStart
      };
    } catch (error) {
      results.healthy = false;
      results.checks[check.name] = {
        success: false,
        duration: Date.now() - checkStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return {
    ...results,
    totalDuration: Date.now() - startTime
  };
}

/**
 * Scheduled cache cleanup
 */
export function schedulePeriodicCleanup(intervalMinutes: number = 30) {
  const interval = intervalMinutes * 60 * 1000; // Convert to milliseconds
  
  const cleanup = () => {
    try {
      // Get cache stats before cleanup
      const statsBefore = cachedPrisma.getCacheStats();
      
      // Perform cleanup (this is handled internally by the cache)
      // We can add custom cleanup logic here if needed
      
      const statsAfter = cachedPrisma.getCacheStats();
      
      console.log(`Cache cleanup completed. Size: ${statsBefore.size} -> ${statsAfter.size}`);
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  };

  // Run cleanup immediately
  cleanup();
  
  // Schedule periodic cleanup
  const intervalId = setInterval(cleanup, interval);
  
  console.log(`Cache cleanup scheduled every ${intervalMinutes} minutes`);
  
  return intervalId;
}

/**
 * Cache key generator utilities
 */
export const CacheKeys = {
  product: (sku: string) => `products:sku:${sku}`,
  productsByCategory: (categoryId: string, limit?: number) => 
    `products:category:${categoryId}${limit ? `:limit:${limit}` : ''}`,
  lowStockProducts: (threshold: number) => `products:lowstock:${threshold}`,
  categories: () => 'categories:all',
  dashboardStats: () => 'dashboard:stats',
  recentSales: (limit: number) => `sales:recent:${limit}`,
  topProducts: (days: number, limit: number) => `sales:top:${days}d:${limit}`,
  userProfile: (userId: string) => `users:profile:${userId}`,
  
  // Pattern matching for invalidation
  patterns: {
    allProducts: /^products:/,
    allSales: /^sales:/,
    allUsers: /^users:/,
    allCategories: /^categories:/,
    productsByCategory: (categoryId: string) => new RegExp(`^products:category:${categoryId}`),
    userSpecific: (userId: string) => new RegExp(`^users:.*:${userId}`)
  }
};

/**
 * Cache debugging utilities
 */
export const CacheDebug = {
  logCacheOperation: (operation: string, key: string, hit: boolean, duration: number) => {
    console.log(`[CACHE] ${operation} - Key: ${key} - ${hit ? 'HIT' : 'MISS'} - ${duration}ms`);
  },
  
  dumpCacheContents: () => {
    const stats = cachedPrisma.getCacheStats();
    console.log('Cache Contents:', {
      size: stats.size,
      maxSize: stats.maxSize,
      keys: stats.keys
    });
  },
  
  measureCachePerformance: async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number; fromCache: boolean }> => {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    
    // Heuristic: if operation took less than 5ms, likely from cache
    const fromCache = duration < 5;
    
    console.log(`[PERF] ${operationName}: ${duration}ms ${fromCache ? '(cached)' : '(db)'}`);
    
    return { result, duration, fromCache };
  }
};

/**
 * Export all utilities
 */
export default {
  batchInvalidateCache,
  warmSpecificCache,
  getCacheMetrics,
  performCacheHealthCheck,
  schedulePeriodicCleanup,
  CacheKeys,
  CacheDebug
};