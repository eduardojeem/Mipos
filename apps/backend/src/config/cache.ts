import { PrismaClient, Product, Category, Sale, User } from '@prisma/client';

// Type aliases used by cache methods
type ProductWithCategory = Product & { category: Category | null };
type TopSellingAgg = { productId: string; _sum: { quantity: number | null }; _count: { id: number } };
type EnrichedTopSelling = TopSellingAgg & { product: ProductWithCategory | null };
type RecentSaleItemProduct = { name: string; sku: string };
type RecentSale = Sale & {
  user: { fullName: string; email: string };
  customer: { name: string; email: string };
  saleItems: Array<{ product: RecentSaleItemProduct }>;
};
type UserProfile = Pick<User, 'id' | 'email' | 'fullName' | 'phone' | 'bio' | 'avatar' | 'location' | 'role' | 'lastLogin' | 'createdAt'>;

// Simple in-memory cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl: number = 300000): void { // Default 5 minutes
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Cache configuration
export const cacheConfig = {
  // Cache TTL in milliseconds - Extended for better performance
  ttl: {
    short: 300000,     // 5 minutes (was 1 minute)
    medium: 900000,    // 15 minutes (was 5 minutes)
    long: 3600000,     // 1 hour (was 15 minutes)
    veryLong: 14400000, // 4 hours (was 1 hour)
    static: 86400000   // 24 hours for rarely changing data
  },
  
  // Cache keys
  keys: {
    categories: 'categories:all',
    productsBySku: (sku: string) => `products:sku:${sku}`,
    productsByCategory: (categoryId: string) => `products:category:${categoryId}`,
    lowStockProducts: 'products:low-stock',
    dashboardStats: 'dashboard:stats',
    topSellingProducts: (days: number) => `products:top-selling:${days}`,
    recentSales: (limit: number) => `sales:recent:${limit}`,
    userProfile: (userId: string) => `users:profile:${userId}`
  }
};

// Global cache instance
export const cache = new MemoryCache(1000);

// Cache wrapper for Prisma queries
export class CachedPrismaClient {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    
    // Setup periodic cleanup
    setInterval(() => {
      cache.cleanup();
    }, 60000); // Cleanup every minute
  }

  // Cached category queries
  async getCategories(): Promise<Category[]> {
    const cacheKey = cacheConfig.keys.categories;
    
    let categories = cache.get<Category[]>(cacheKey);
    if (categories) {
      return categories;
    }

    categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    cache.set(cacheKey, categories, cacheConfig.ttl.static); // Categories rarely change
    return categories;
  }

  // Cached product queries
  async getProductBySku(sku: string): Promise<ProductWithCategory | null> {
    const cacheKey = cacheConfig.keys.productsBySku(sku);
    
    let product = cache.get<ProductWithCategory>(cacheKey);
    if (product) {
      return product;
    }

    product = await this.prisma.product.findUnique({
      where: { sku },
      include: { category: true }
    });

    if (product) {
      cache.set(cacheKey, product, cacheConfig.ttl.long); // Products change less frequently
    }

    return product;
  }

  async getProductsByCategory(categoryId: string, limit: number = 50): Promise<ProductWithCategory[]> {
    const cacheKey = `${cacheConfig.keys.productsByCategory(categoryId)}:${limit}`;
    
    let products = cache.get<ProductWithCategory[]>(cacheKey);
    if (products) {
      return products;
    }

    products = await this.prisma.product.findMany({
      where: { categoryId },
      include: { category: true },
      take: limit,
      orderBy: { name: 'asc' }
    });

    cache.set(cacheKey, products, cacheConfig.ttl.medium); // Product lists change more often
    return products;
  }

  async getLowStockProducts(threshold: number = 10): Promise<ProductWithCategory[]> {
    const cacheKey = `${cacheConfig.keys.lowStockProducts}:${threshold}`;
    
    let products = cache.get<ProductWithCategory[]>(cacheKey);
    if (products) {
      return products;
    }

    products = await this.prisma.product.findMany({
      where: {
        stockQuantity: { lte: threshold }
      },
      include: { category: true },
      orderBy: { stockQuantity: 'asc' }
    });

    cache.set(cacheKey, products, cacheConfig.ttl.medium); // Low stock changes frequently but not constantly
    return products;
  }

  // Cached dashboard statistics
  async getDashboardStats(): Promise<{ totalProducts: number; totalCategories: number; lowStockCount: number; todaySales: number; todayRevenue: number; }> {
    const cacheKey = cacheConfig.keys.dashboardStats;
    
    let stats = cache.get<{ totalProducts: number; totalCategories: number; lowStockCount: number; todaySales: number; todayRevenue: number; }>(cacheKey);
    if (stats) {
      return stats;
    }

    const [
      totalProducts,
      totalCategories,
      lowStockCount,
      todaySales,
      totalRevenue
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.category.count(),
      this.prisma.product.count({ where: { stockQuantity: { lte: 10 } } }),
      this.prisma.sale.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      this.prisma.sale.aggregate({
        _sum: { total: true },
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    stats = {
      totalProducts,
      totalCategories,
      lowStockCount,
      todaySales,
      todayRevenue: totalRevenue._sum.total || 0
    };

    cache.set(cacheKey, stats, cacheConfig.ttl.medium); // Dashboard stats change throughout the day
    return stats;
  }

  // Cached top selling products
  async getTopSellingProducts(days: number = 30, limit: number = 10): Promise<EnrichedTopSelling[]> {
    const cacheKey = `${cacheConfig.keys.topSellingProducts(days)}:${limit}`;
    
    const cached = cache.get<EnrichedTopSelling[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      _count: { id: true },
      where: {
        // Prisma relation filter uses `is` for nested object
        sale: {
          is: {
            createdAt: { gte: startDate }
          }
        }
      },
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: limit
    });

    // Enrich with product details
    const enrichedProducts: EnrichedTopSelling[] = await Promise.all(
      (grouped as TopSellingAgg[]).map(async (item) => {
        // Lookup product details by ID to match groupBy output
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          include: { category: true }
        });
        return {
          ...item,
          product
        };
      })
    );

    cache.set(cacheKey, enrichedProducts, cacheConfig.ttl.long); // Top selling products change slowly
    return enrichedProducts;
  }

  // Cached recent sales
  async getRecentSales(limit: number = 20): Promise<RecentSale[]> {
    const cacheKey = cacheConfig.keys.recentSales(limit);
    
    let sales = cache.get<RecentSale[]>(cacheKey);
    if (sales) {
      return sales;
    }

    sales = await this.prisma.sale.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true } },
        customer: { select: { name: true, email: true } },
        saleItems: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        }
      }
    });

    cache.set(cacheKey, sales, cacheConfig.ttl.medium); // Recent sales change regularly but not constantly
    return sales;
  }

  // Cached user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = cacheConfig.keys.userProfile(userId);
    
    let user = cache.get<UserProfile>(cacheKey);
    if (user) {
      return user;
    }

    user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        bio: true,
        avatar: true,
        location: true,
        role: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (user) {
      cache.set<UserProfile>(cacheKey, user as UserProfile, cacheConfig.ttl.veryLong); // User profiles change infrequently
    }

    return user;
  }

  // Smart cache invalidation methods
  invalidateProductCache(sku?: string, categoryId?: string, options: { skipRelated?: boolean } = {}) {
    if (sku) {
      cache.delete(cacheConfig.keys.productsBySku(sku));
      
      // Only invalidate category-specific cache if we know the category
      if (categoryId) {
        cache.delete(cacheConfig.keys.productsByCategory(categoryId));
      }
    }
    
    if (categoryId) {
      cache.delete(cacheConfig.keys.productsByCategory(categoryId));
    }
    
    // Only invalidate related caches if not skipped (for bulk operations)
    if (!options.skipRelated) {
      cache.delete(cacheConfig.keys.lowStockProducts);
      cache.delete(cacheConfig.keys.dashboardStats);
    }
  }

  invalidateCategoryCache(categoryId?: string) {
    if (categoryId) {
      // Only invalidate specific category products
      cache.delete(cacheConfig.keys.productsByCategory(categoryId));
    } else {
      // Full category cache invalidation
      cache.delete(cacheConfig.keys.categories);
      cache.delete(cacheConfig.keys.dashboardStats);
    }
  }

  invalidateSalesCache(selective: { recentOnly?: boolean, statsOnly?: boolean } = {}) {
    if (selective.recentOnly) {
      // Only invalidate recent sales cache
      const stats = cache.getStats();
      stats.keys.forEach(key => {
        if (key.includes('sales:recent:')) {
          cache.delete(key);
        }
      });
    } else if (selective.statsOnly) {
      // Only invalidate dashboard stats
      cache.delete(cacheConfig.keys.dashboardStats);
    } else {
      // Clear all sales-related cache entries
      const stats = cache.getStats();
      stats.keys.forEach(key => {
        if (key.includes('sales:') || key.includes('dashboard:') || key.includes('top-selling:')) {
          cache.delete(key);
        }
      });
    }
  }

  // Batch invalidation for bulk operations
  batchInvalidateProducts(skus: string[], categoryIds: string[] = []) {
    // Invalidate specific products without triggering related cache invalidation
    skus.forEach(sku => {
      this.invalidateProductCache(sku, undefined, { skipRelated: true });
    });
    
    // Invalidate category caches
    categoryIds.forEach(categoryId => {
      cache.delete(cacheConfig.keys.productsByCategory(categoryId));
    });
    
    // Invalidate related caches only once at the end
    cache.delete(cacheConfig.keys.lowStockProducts);
    cache.delete(cacheConfig.keys.dashboardStats);
  }

  invalidateUserCache(userId: string) {
    cache.delete(cacheConfig.keys.userProfile(userId));
  }

  // Get cache statistics
  getCacheStats() {
    return cache.getStats();
  }

  // Clear all cache
  clearCache() {
    cache.clear();
  }

  // Cache warming - preload critical data
  async warmCache() {
    console.log('🔥 Warming cache with critical data...');
    
    try {
      // Warm categories (most static data)
      await this.getCategories();
      
      // Warm dashboard stats
      await this.getDashboardStats();
      
      // Warm recent sales
      await this.getRecentSales(20);
      
      // Warm low stock products
      await this.getLowStockProducts();
      
      // Warm top selling products for common periods
      await this.getTopSellingProducts(7, 10);  // Last week
      await this.getTopSellingProducts(30, 10); // Last month
      
      console.log('✅ Cache warming completed successfully');
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    }
  }
}

// Export singleton instance
let cachedPrismaInstance: CachedPrismaClient | null = null;

export function getCachedPrismaClient(prisma: PrismaClient): CachedPrismaClient {
  if (!cachedPrismaInstance) {
    cachedPrismaInstance = new CachedPrismaClient(prisma);
  }
  return cachedPrismaInstance;
}

// Utility function to create cache key
export function createCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}