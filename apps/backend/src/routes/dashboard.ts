import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';
import { prisma } from '../index';
import { cache, cacheConfig } from '../config/cache';

// Type definitions for aggregation results
interface TopProductItem {
  productId: string;
  totalQuantity: number;
  totalRevenue: number;
}

const router = Router();

// Get dashboard statistics
router.get('/stats', requirePermission('dashboard', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  try {
    const cached = cache.get<any>(cacheConfig.keys.dashboardStats);
    if (cached) {
      return res.json({ success: true, data: cached });
    }
    // Run independent queries in parallel
    const [thisMonthAgg, lastMonthAgg, totalCustomersCount, topProductsRaw] = await Promise.all([
      // 1. This Month Totals
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth.toISOString() } },
        _sum: { total: true },
        _count: { id: true },
      }),
      // 2. Last Month Totals
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfLastMonth.toISOString(), lte: endOfLastMonth.toISOString() } },
        _sum: { total: true },
        _count: { id: true },
      }),
      // 3. Total Customers
      prisma.customer.count(),
      // 4. Top Products (Optimized Raw Query)
      prisma.$queryRaw<any[]>`
        SELECT 
          si.product_id as "productId", 
          SUM(si.quantity)::int as "totalQuantity", 
          SUM(si.quantity * si.unit_price)::float as "totalRevenue"
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.created_at >= ${startOfMonth}
        GROUP BY si.product_id
        ORDER BY "totalQuantity" DESC
        LIMIT 10
      `
    ]);

    // Process Top Products
    const topProducts: TopProductItem[] = topProductsRaw.map(p => ({
      productId: p.productId,
      totalQuantity: p.totalQuantity || 0,
      totalRevenue: p.totalRevenue || 0
    }));

    // Fetch details for top products
    const productIds = topProducts.map(tp => tp.productId).filter(Boolean);
    let productsById = new Map<string, { id: string; name: string; sku: string | null; salePrice: number }>();

    if (productIds.length > 0) {
      try {
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true, salePrice: true }
        });
        productsById = new Map(products.map(p => [p.id, { id: p.id, name: p.name, sku: p.sku ?? null, salePrice: p.salePrice }]));
      } catch (e) {
        console.warn('⚠️ Dashboard Stats: Error fetching product details', e);
      }
    }

    const topProductsWithDetails = topProducts.map(item => {
      const product = item.productId ? productsById.get(item.productId) : undefined;
      return {
        id: product?.id ?? item.productId ?? '',
        name: product?.name ?? 'Producto desconocido',
        sku: product?.sku ?? '',
        salePrice: product?.salePrice ?? 0,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue
      };
    });

    const stats = {
      thisMonthSales: {
        total: thisMonthAgg._sum.total || 0,
        count: thisMonthAgg._count.id || 0
      },
      lastMonthSales: {
        total: lastMonthAgg._sum.total || 0,
        count: lastMonthAgg._count.id || 0
      },
      topProducts: topProductsWithDetails,
      totalCustomers: totalCustomersCount
    };

    cache.set(cacheConfig.keys.dashboardStats, stats, cacheConfig.ttl.short);
    res.json({ success: true, data: stats });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas del dashboard' });
  }
}));

// Get today's summary
router.get('/today', requirePermission('dashboard', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  try {
    // Optimized: Use aggregate instead of fetching all rows
    const [salesAgg, paymentMethodsRaw] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfDay.toISOString(), lte: endOfDay.toISOString() } },
        _sum: { total: true },
        _count: { id: true }
      }),
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: { createdAt: { gte: startOfDay.toISOString(), lte: endOfDay.toISOString() } },
        _sum: { total: true },
        _count: { id: true }
      })
    ]);

    const summary = {
      totalRevenue: salesAgg._sum.total || 0,
      salesCount: salesAgg._count.id || 0,
      paymentMethods: paymentMethodsRaw.map(pm => ({
        method: pm.paymentMethod,
        total: pm._sum.total || 0,
        count: pm._count.id || 0
      }))
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching today summary:', error);
    res.status(500).json({ success: false, error: 'Error al obtener resumen del día' });
  }
}));

router.get('/summary', requirePermission('dashboard', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  try {
    const range = String((req.query.range as string) || '30d');
    const cacheKey = `dashboard:summary:${range}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }
    // Run all 3 heavy analytical queries in parallel
    const [daily, categories, totals] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT date_trunc('day', created_at) AS day,
               COUNT(*)::int AS orders,
               COALESCE(SUM(total), 0)::float AS revenue
        FROM sales
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT c.name AS name,
               COALESCE(SUM(si.quantity * si.unit_price), 0)::float AS value
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        JOIN categories c ON c.id = p.category_id
        WHERE s.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY c.name
        ORDER BY value DESC
        LIMIT 10
      `,
      prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS orders,
               COALESCE(SUM(total), 0)::float AS revenue
        FROM sales
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `
    ]);

    const payload = {
      daily,
      categories,
      totals: totals[0] || { orders: 0, revenue: 0 }
    };
    cache.set(cacheKey, payload, cacheConfig.ttl.short);
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
}));

export default router;
