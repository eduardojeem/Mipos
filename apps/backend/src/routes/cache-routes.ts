import { Router, Request, Response } from 'express';
import { getCachedPrismaClient } from '../config/cache';
import { PrismaClient } from '@prisma/client';
import { 
  getCacheMetrics, 
  performCacheHealthCheck, 
  warmSpecificCache,
  batchInvalidateCache 
} from '../utils/cache-utils';

const router = Router();
const prisma = new PrismaClient();
const cachedPrisma = getCachedPrismaClient(prisma);

/**
 * GET /api/cache/stats
 * Get cache statistics and metrics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const metrics = getCacheMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/cache/health
 * Perform cache health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await performCacheHealthCheck();
    
    const statusCode = healthCheck.healthy ? 200 : 503;
    res.status(statusCode).json({
      success: healthCheck.healthy,
      data: healthCheck
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cache/clear
 * Clear all cache entries
 */
router.post('/clear', async (req: Request, res: Response) => {
  try {
    const statsBefore = cachedPrisma.getCacheStats();
    cachedPrisma.clearCache();
    const statsAfter = cachedPrisma.getCacheStats();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      data: {
        before: statsBefore,
        after: statsAfter
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cache/warm
 * Warm cache with frequently accessed data
 */
router.post('/warm', async (req: Request, res: Response) => {
  try {
    const { types } = req.body;
    
    // Default warming configuration
    const warmConfig = {
      categories: true,
      dashboardStats: true,
      lowStockProducts: { threshold: 10 },
      recentSales: { limit: 20 },
      topProducts: { days: 30, limit: 10 },
      ...types
    };
    
    const startTime = Date.now();
    const results = await warmSpecificCache(warmConfig);
    const duration = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({
      success: true,
      message: 'Cache warming completed',
      data: {
        duration,
        successful,
        failed,
        total: results.length,
        cacheStats: cachedPrisma.getCacheStats()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Cache warming failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cache/invalidate
 * Invalidate specific cache entries
 */
router.post('/invalidate', async (req: Request, res: Response) => {
  try {
    const { type, identifiers } = req.body;
    
    switch (type) {
      case 'products':
        if (Array.isArray(identifiers)) {
          await batchInvalidateCache({ products: identifiers });
        } else if (identifiers) {
          cachedPrisma.invalidateProductCache(identifiers);
        } else {
          // Invalidate all product cache
          cachedPrisma.invalidateProductCache();
        }
        break;
        
      case 'categories':
        cachedPrisma.invalidateCategoryCache();
        break;
        
      case 'sales':
        cachedPrisma.invalidateSalesCache();
        break;
        
      case 'users':
        if (Array.isArray(identifiers)) {
          await batchInvalidateCache({ users: identifiers });
        } else if (identifiers) {
          cachedPrisma.invalidateUserCache(identifiers);
        }
        break;
        
      case 'all':
        cachedPrisma.clearCache();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid invalidation type',
          validTypes: ['products', 'categories', 'sales', 'users', 'all']
        });
    }
    
    res.json({
      success: true,
      message: `Cache invalidated for type: ${type}`,
      data: {
        type,
        identifiers,
        cacheStats: cachedPrisma.getCacheStats()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Cache invalidation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/cache/keys
 * Get all cache keys (for debugging)
 */
router.get('/keys', async (req: Request, res: Response) => {
  try {
    const stats = cachedPrisma.getCacheStats();
    
    res.json({
      success: true,
      data: {
        keys: stats.keys,
        count: stats.size,
        maxSize: stats.maxSize
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cache/test
 * Test cache performance with sample queries
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const tests = [
      {
        name: 'Categories',
        operation: () => cachedPrisma.getCategories()
      },
      {
        name: 'Dashboard Stats',
        operation: () => cachedPrisma.getDashboardStats()
      },
      {
        name: 'Low Stock Products',
        operation: () => cachedPrisma.getLowStockProducts(5)
      },
      {
        name: 'Recent Sales',
        operation: () => cachedPrisma.getRecentSales(10)
      }
    ];
    
    const results = [];
    
    for (const test of tests) {
      // First call (should hit database)
      const start1 = Date.now();
      await test.operation();
      const duration1 = Date.now() - start1;
      
      // Second call (should hit cache)
      const start2 = Date.now();
      await test.operation();
      const duration2 = Date.now() - start2;
      
      const improvement = duration1 > 0 ? Math.round(((duration1 - duration2) / duration1) * 100) : 0;
      
      results.push({
        name: test.name,
        firstCall: duration1,
        secondCall: duration2,
        improvement: `${improvement}%`
      });
    }
    
    res.json({
      success: true,
      message: 'Cache performance test completed',
      data: {
        results,
        cacheStats: cachedPrisma.getCacheStats()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Cache performance test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/cache/config
 * Get cache configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    // This would typically come from your cache configuration
    const config = {
      ttl: {
        short: 60000,      // 1 minute
        medium: 300000,    // 5 minutes
        long: 900000,      // 15 minutes
        veryLong: 3600000  // 1 hour
      },
      maxSize: 1000,
      cleanupInterval: 300000, // 5 minutes
      enabled: true
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;