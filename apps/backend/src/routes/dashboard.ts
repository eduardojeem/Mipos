import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';
import { prisma } from '../index';
import { cache, cacheConfig } from '../config/cache';
import { getEffectiveOrganizationId } from '../middleware/multi-tenant';

const router = Router();

// Type definitions for aggregation results
interface TopProductItem {
  product_id: string;
  totalQuantity: number;
  totalRevenue: number;
}

// Get dashboard statistics
router.get('/stats', requirePermission('dashboard', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const orgId = getEffectiveOrganizationId(req);
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organización no especificada' });
    return;
  }

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  try {
    const cacheKey = `${cacheConfig.keys.dashboardStats}:${orgId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const [thisMonthAgg, lastMonthAgg, totalCustomersCount, topProductsRaw] = await Promise.all([
      // 1. This Month Totals
      prisma.sale.aggregate({
        where: { 
          organizationId: orgId,
          createdAt: { gte: startOfMonth.toISOString() } 
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      // 2. Last Month Totals
      prisma.sale.aggregate({
        where: { 
          organizationId: orgId,
          createdAt: { gte: startOfLastMonth.toISOString(), lte: endOfLastMonth.toISOString() } 
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      // 3. Total Customers
      prisma.customer.count({ where: { organizationId: orgId } }),
      // 4. Top Products (Optimized Raw Query)
      prisma.$queryRaw<any[]>`
        SELECT 
          si.product_id, 
          SUM(si.quantity)::int as "totalQuantity", 
          SUM(si.quantity * si.unit_price)::float as "totalRevenue"
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.organization_id = ${orgId} AND s.created_at >= ${startOfMonth}
        GROUP BY si.product_id
        ORDER BY "totalQuantity" DESC
        LIMIT 10
      `
    ]);

    const topProductsRawTyped = topProductsRaw as TopProductItem[];
    const productIds = topProductsRawTyped.map(p => p.product_id);
    let productsById = new Map();

    if (productIds.length > 0) {
      try {
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true, salePrice: true }
        });
        productsById = new Map(products.map(p => [p.id, { id: p.id, name: p.name, sku: p.sku ?? null, salePrice: p.salePrice }]));
      } catch (err) {
        console.error('Error fetching product details for top products:', err);
      }
    }

    const payload = {
      thisMonth: {
        revenue: thisMonthAgg._sum.total || 0,
        orders: thisMonthAgg._count.id || 0,
      },
      lastMonth: {
        revenue: lastMonthAgg._sum.total || 0,
        orders: lastMonthAgg._count.id || 0,
      },
      customers: totalCustomersCount,
      topProducts: topProductsRawTyped.map(item => ({
        ...item,
        name: productsById.get(item.product_id)?.name || 'Producto Desconocido',
        sku: productsById.get(item.product_id)?.sku || null,
        salePrice: productsById.get(item.product_id)?.salePrice || 0,
      }))
    };

    cache.set(cacheKey, payload, 300); // 5 min
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
}));

// Get today's summary
router.get('/today', requirePermission('dashboard', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const orgId = getEffectiveOrganizationId(req);
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organización no especificada' });
    return;
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  try {
    const [salesAgg, paymentMethodsRaw] = await Promise.all([
      prisma.sale.aggregate({
        where: { 
          organizationId: orgId,
          createdAt: { gte: startOfDay, lte: endOfDay } 
        },
        _sum: { total: true },
        _count: { id: true }
      }),
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: { 
          organizationId: orgId,
          createdAt: { gte: startOfDay, lte: endOfDay } 
        },
        _sum: { total: true },
        _count: { id: true }
      })
    ]);

    const payload = {
      revenue: salesAgg._sum.total || 0,
      orders: salesAgg._count.id || 0,
      paymentMethods: paymentMethodsRaw.map(m => ({
        method: m.paymentMethod,
        total: m._sum.total || 0,
        count: m._count.id || 0
      }))
    };

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching today summary:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen de hoy' });
  }
}));

router.get('/summary', requirePermission('dashboard', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const orgId = getEffectiveOrganizationId(req);
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organización no especificada' });
    return;
  }

  try {
    const range = String((req.query.range as string) || '30d');
    const cacheKey = `dashboard:summary:${orgId}:${range}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const [daily, categories, totals] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT date_trunc('day', created_at) AS day,
               COUNT(*)::int AS orders,
               COALESCE(SUM(total), 0)::float AS revenue
        FROM sales
        WHERE organization_id = ${orgId} AND created_at >= NOW() - INTERVAL '30 days'
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
        WHERE s.organization_id = ${orgId} AND s.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY c.name
        ORDER BY value DESC
        LIMIT 10
      `,
      prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS orders,
               COALESCE(SUM(total), 0)::float AS revenue
        FROM sales
        WHERE organization_id = ${orgId} AND created_at >= NOW() - INTERVAL '30 days'
      `
    ]);

    const payload = {
      dailyRevenue: daily,
      categoryDistribution: categories,
      totals: totals[0] || { orders: 0, revenue: 0 }
    };

    cache.set(cacheKey, payload, 600); // 10 min
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen de ventas' });
  }
}));

// Obtener TODO el Overview consolidado para MainDashboard
router.get('/overview', requirePermission('dashboard', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const orgId = getEffectiveOrganizationId(req);
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organización no especificada' });
    return;
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  try {
    const cacheKey = `dashboard:overview:${orgId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const [
      totalCustomers,
      activeProducts,
      saleStats,
      lowStockProducts,
      recentSales
    ] = await Promise.all([
      // 1. Total de clientes
      prisma.customer.count({ where: { organizationId: orgId } }),
      
      // 2. Productos activos
      prisma.product.count({ where: { organizationId: orgId, isActive: true } }),
      
      // 3. Estadísticas de ventas (hoy vs mes)
      prisma.$queryRaw<any[]>`
        SELECT 
          COALESCE(SUM(CASE WHEN created_at >= ${startOfDay} THEN total ELSE 0 END), 0)::float as "todaySales",
          COUNT(CASE WHEN created_at >= ${startOfDay} THEN 1 END)::int as "todayOrders",
          COALESCE(SUM(CASE WHEN created_at >= ${startOfMonth} THEN total ELSE 0 END), 0)::float as "monthSales"
        FROM sales
        WHERE organization_id = ${orgId}
      `,
      
      // 4. Productos con bajo stock
      prisma.product.findMany({
        where: { 
          organizationId: orgId,
          isActive: true,
          stockQuantity: { lte: prisma.product.fields.minStock } 
        },
        select: { name: true, stockQuantity: true, minStock: true },
        orderBy: { stockQuantity: 'asc' },
        take: 5
      }),
      
      // 5. Ventas recientes
      prisma.sale.findMany({
        where: { organizationId: orgId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { name: true }
          }
        }
      })
    ]);

    const payload = {
      totalCustomers,
      activeProducts,
      todaySales: saleStats[0]?.todaySales || 0,
      todayOrders: saleStats[0]?.todayOrders || 0,
      monthSales: saleStats[0]?.monthSales || 0,
      lowStockProducts: lowStockProducts.map(p => ({
        name: p.name,
        stock: p.stockQuantity,
        minStock: p.minStock
      })),
      webOrders: {
        pending: 0, // Placeholder as status is not in DB yet
        processing: 0,
        shipped: 0,
      },
      recentSales: recentSales.map(s => ({
        id: s.id,
        customerName: s.customer?.name || 'Venta Mostrador',
        total: s.total,
        status: 'COMPLETED', // Placeholder as status is not in DB yet
        date: s.createdAt
      }))
    };

    cache.set(cacheKey, payload, 60);
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen del dashboard' });
  }
}));

export default router;
