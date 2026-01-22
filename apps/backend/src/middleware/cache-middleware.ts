import { Request, Response, NextFunction } from 'express';
import { getCachedPrismaClient } from '../config/cache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const cachedPrisma = getCachedPrismaClient(prisma);

interface CacheInvalidationRule {
  path: RegExp;
  methods: string[];
  invalidate: (req: Request) => void;
}

// Define cache invalidation rules
const invalidationRules: CacheInvalidationRule[] = [
  // Product operations
  {
    path: /^\/api\/products/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    invalidate: (req) => {
      const { sku, categoryId } = req.body || {};
      const skuParam = req.params.sku;
      cachedPrisma.invalidateProductCache(skuParam || sku, categoryId);
    }
  },

  // Category operations
  {
    path: /^\/api\/categories/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    invalidate: (req) => {
      const categoryId = req.params.categoryId || req.body?.id;
      if (req.method === 'DELETE' || req.method === 'PUT') {
        // For delete/update, invalidate specific category if available
        cachedPrisma.invalidateCategoryCache(categoryId);
      } else {
        // For new categories, invalidate all categories
        cachedPrisma.invalidateCategoryCache();
      }
    }
  },

  // Sales operations
  {
    path: /^\/api\/sales/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    invalidate: (req) => {
      // For new sales, only invalidate recent sales and stats
      if (req.method === 'POST') {
        cachedPrisma.invalidateSalesCache({ recentOnly: true });
        cachedPrisma.invalidateSalesCache({ statsOnly: true });
      } else {
        // For updates/deletes, full invalidation
        cachedPrisma.invalidateSalesCache();
      }
    }
  },

  // User operations
  {
    path: /^\/api\/users/,
    methods: ['PUT', 'PATCH', 'DELETE'],
    invalidate: (req) => {
      const userId = req.params.userId || req.body?.userId;
      if (userId) {
        cachedPrisma.invalidateUserCache(userId);
      }
    }
  },

  // Inventory operations
  {
    path: /^\/api\/inventory/,
    methods: ['POST', 'PUT', 'PATCH'],
    invalidate: (req) => {
      const { sku, productId } = req.body || {};
      const skuParam = req.params.sku;
      cachedPrisma.invalidateProductCache(skuParam || sku);
      // Also invalidate dashboard stats as inventory affects low stock
      cachedPrisma.invalidateSalesCache();
    }
  }
];

/**
 * Middleware for automatic cache invalidation
 * Automatically invalidates relevant cache entries based on API operations
 */
export function cacheInvalidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Store original res.json to intercept successful responses
  const originalJson = res.json;

  res.json = function(body: any) {
    // Only invalidate cache on successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        // Find matching invalidation rules
        const matchingRules = invalidationRules.filter(rule => 
          rule.path.test(req.path) && rule.methods.includes(req.method)
        );

        // Execute invalidation for each matching rule
        matchingRules.forEach(rule => {
          try {
            rule.invalidate(req);
          } catch (error) {
            console.warn('Cache invalidation error:', error);
          }
        });

        if (matchingRules.length > 0) {
          console.log(`Cache invalidated for ${req.method} ${req.path}`);
        }
      } catch (error) {
        console.error('Cache invalidation middleware error:', error);
      }
    }

    // Call original json method
    return originalJson.call(this, body);
  };

  next();
}

/**
 * Middleware to add cache headers for GET requests
 */
export function cacheHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.method === 'GET') {
    // Add cache-related headers
    res.set({
      'Cache-Control': 'private, max-age=60', // 1 minute browser cache
      'X-Cache-Strategy': 'server-side-memory'
    });
  }
  next();
}

/**
 * Middleware to provide cache statistics endpoint
 */
export function cacheStatsHandler(req: Request, res: Response) {
  try {
    const stats = cachedPrisma.getCacheStats();
    res.json({
      success: true,
      data: {
        ...stats,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
}

/**
 * Middleware to clear cache (admin only)
 */
export function cacheClearHandler(req: Request, res: Response) {
  try {
    cachedPrisma.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
}

/**
 * Middleware for cache warming on application startup
 */
export async function warmCache() {
  console.log('Warming cache...');
  
  try {
    const startTime = Date.now();
    
    // Warm frequently accessed data
    await Promise.all([
      cachedPrisma.getCategories(),
      cachedPrisma.getDashboardStats(),
      cachedPrisma.getLowStockProducts(10),
      cachedPrisma.getRecentSales(10)
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`Cache warmed successfully in ${duration}ms`);
  } catch (error) {
    console.error('Cache warming failed:', error);
  }
}

/**
 * Express router setup with cache middleware
 */
export function setupCacheMiddleware(app: any) {
  // Add cache invalidation middleware globally
  app.use(cacheInvalidationMiddleware);
  
  // Add cache headers for GET requests
  app.use(cacheHeadersMiddleware);
  
  // Add cache management endpoints
  app.get('/api/cache/stats', cacheStatsHandler);
  app.post('/api/cache/clear', cacheClearHandler);
  
  console.log('Cache middleware configured');
}

export default {
  cacheInvalidationMiddleware,
  cacheHeadersMiddleware,
  cacheStatsHandler,
  cacheClearHandler,
  warmCache,
  setupCacheMiddleware
};