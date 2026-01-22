import { PrismaClient } from '@prisma/client';
import { getCachedPrismaClient } from './cache';

// Example usage of the caching layer in your application

const prisma = new PrismaClient();
const cachedPrisma = getCachedPrismaClient(prisma);

// Example 1: Using cached categories in a REST API endpoint
export async function getCategoriesHandler(req: any, res: any) {
  try {
    // This will use cache on subsequent calls
    const categories = await cachedPrisma.getCategories();
    
    res.json({
      success: true,
      data: categories,
      cached: true // You can track if data came from cache
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
}

// Example 2: Using cached dashboard stats
export async function getDashboardStatsHandler(req: any, res: any) {
  try {
    const stats = await cachedPrisma.getDashboardStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
}

// Example 3: Using cached product queries with parameters
export async function getProductsByCategoryHandler(req: any, res: any) {
  try {
    const { categoryId, limit = 50 } = req.query;
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Category ID is required'
      });
    }
    
    const products = await cachedPrisma.getProductsByCategory(categoryId, parseInt(limit));
    
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
}

// Example 4: Cache invalidation after data modification
export async function createProductHandler(req: any, res: any) {
  try {
    const { name, sku, categoryId, costPrice, salePrice, stockQuantity } = req.body;
    
    // Create the product using regular Prisma client
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        categoryId,
        costPrice,
        salePrice,
        stockQuantity
      },
      include: { category: true }
    });
    
    // Invalidate related caches
    cachedPrisma.invalidateProductCache(sku, categoryId);
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create product'
    });
  }
}

// Example 5: Cache invalidation after category modification
export async function updateCategoryHandler(req: any, res: any) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const category = await prisma.category.update({
      where: { id },
      data: { name, description }
    });
    
    // Invalidate category cache
    cachedPrisma.invalidateCategoryCache();
    
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
}

// Example 6: Cache invalidation after sales
export async function createSaleHandler(req: any, res: any) {
  try {
    const { userId, customerId, items, subtotal, discount, tax, total, paymentMethod } = req.body;
    
    // Create sale with transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          userId,
          customerId,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod
        }
      });
      
      // Create sale items
      for (const item of items) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }
        });
        
        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity }
          }
        });
      }
      
      return newSale;
    });
    
    // Invalidate sales and product caches
    cachedPrisma.invalidateSalesCache();
    items.forEach((item: any) => {
      cachedPrisma.invalidateProductCache(undefined, item.categoryId);
    });
    
    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create sale'
    });
  }
}

// Example 7: Using cached user profile
export async function getUserProfileHandler(req: any, res: any) {
  try {
    const { userId } = req.params;
    
    const user = await cachedPrisma.getUserProfile(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
}

// Example 8: Cache monitoring endpoint
export async function getCacheStatsHandler(req: any, res: any) {
  try {
    const stats = cachedPrisma.getCacheStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats'
    });
  }
}

// Example 9: Cache management endpoint (admin only)
export async function clearCacheHandler(req: any, res: any) {
  try {
    // Add authentication/authorization check here
    // if (!req.user.isAdmin) { ... }
    
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

// Example 10: Middleware for automatic cache invalidation
export function cacheInvalidationMiddleware(req: any, res: any, next: any) {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // If the request was successful and modified data
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method.toLowerCase();
      const path = req.path;
      
      // Auto-invalidate based on the endpoint
      if (method === 'post' || method === 'put' || method === 'delete') {
        if (path.includes('/products')) {
          cachedPrisma.invalidateProductCache();
        } else if (path.includes('/categories')) {
          cachedPrisma.invalidateCategoryCache();
        } else if (path.includes('/sales')) {
          cachedPrisma.invalidateSalesCache();
        }
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// Example 11: React Hook for cached data (if using Next.js API routes)
export function useCachedCategories() {
  // This would be used in a React component
  // const { data, error, isLoading } = useSWR('/api/categories', fetcher);
  // return { categories: data?.data, error, isLoading };
}

// Example 12: Background cache warming
export async function warmCache() {
  console.log('🔥 Warming up cache...');
  
  try {
    // Pre-load frequently accessed data
    await Promise.all([
      cachedPrisma.getCategories(),
      cachedPrisma.getDashboardStats(),
      cachedPrisma.getLowStockProducts(),
      cachedPrisma.getRecentSales(20)
    ]);
    
    console.log('✅ Cache warmed successfully');
  } catch (error) {
    console.error('❌ Failed to warm cache:', error);
  }
}

// Example 13: Scheduled cache cleanup (if using cron jobs)
export async function scheduledCacheCleanup() {
  console.log('🧹 Running scheduled cache cleanup...');
  
  try {
    const statsBefore = cachedPrisma.getCacheStats();
    console.log('Cache size before cleanup:', statsBefore.size);
    
    // The cleanup happens automatically, but you can force it
    // cache.cleanup() is called internally
    
    const statsAfter = cachedPrisma.getCacheStats();
    console.log('Cache size after cleanup:', statsAfter.size);
    
    console.log('✅ Cache cleanup completed');
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
  }
}

export {
  cachedPrisma,
  prisma
};