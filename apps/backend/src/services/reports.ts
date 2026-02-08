import { PrismaClient } from '@prisma/client';
import jsPDF from 'jspdf';
const autoTable = require('jspdf-autotable');
import * as XLSX from 'xlsx';
import { logger } from '../middleware/logger';
import { REPORT_LIMITS, DISTRIBUTED_CACHE_TTL } from '../config/reports.config';

const prisma = new PrismaClient();

// Report types
export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  // Delta sync support: only fetch changes since this timestamp
  since?: Date;
  productId?: string;
  categoryId?: string;
  customerId?: string;
  supplierId?: string;
  userId?: string;
  status?: string;
}

export interface SalesReportData {
  // Legacy top-level metrics (kept for exports/backwards compatibility)
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;

  // New summary expected by frontend
  summary?: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalProfit: number;
    profitMargin: number;
  };

  // Top products (enhanced)
  topProducts: Array<{
    id: string;
    name: string;
    // Units sold
    quantity: number;
    // Revenue from product
    revenue: number;
    // New fields expected by frontend
    sales?: number; // alias for revenue
    profit?: number;
  }>;

  // Time series by date (enhanced)
  salesByDate: Array<{
    date: string;
    sales: number; // count of sales/orders
    revenue: number;
    profit?: number;
  }>;

  // Category breakdown (enhanced)
  salesByCategory: Array<{
    category: string;
    // Revenue per category
    sales: number;
    // Units sold per category
    quantity?: number;
    revenue?: number; // kept for backwards compatibility
  }>;

  // New: sales grouped by customer
  salesByCustomer?: Array<{
    customerId: string;
    customerName: string;
    sales: number; // revenue
    orders: number; // order count
  }>;
}

export interface InventoryReportData {
  // Legacy fields (kept for exports/backwards compatibility)
  totalProducts: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    value: number;
  }>;
  inventoryValue: number;
  stockMovements: Array<{
    productId?: string;
    productName: string;
    type: string;
    quantity: number;
    date: string;
    reason: string;
  }>;
  categoryBreakdown: Array<{
    category: string;
    products: number;
    value: number;
    // New fields expected by frontend
    totalProducts?: number;
    totalValue?: number;
    averageStock?: number;
  }>;

  // New summary and detailed stock levels expected by frontend
  summary?: {
    totalProducts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    averageStockLevel: number;
  };
  stockLevels?: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    value: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  }>;
}

export interface CustomerReportData {
  // Legacy fields (kept for exports/backwards compatibility)
  totalCustomers: number;
  newCustomers: number;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalPurchases: number;
    totalSpent: number;
    lastPurchase: string;
    // New aliases expected by frontend
    orderCount?: number;
    lastOrderDate?: string;
  }>;
  customersBySegment: Array<{
    segment: string;
    count: number;
    averageSpent: number;
  }>;
  customerRetention: {
    returning: number;
    new: number;
    churnRate: number;
  };

  // New summary and trends expected by frontend
  summary?: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    averageOrderValue: number;
    customerRetentionRate: number;
  };
  customerSegments?: Array<{
    segment: string;
    count: number;
    totalSpent: number;
    averageOrderValue: number;
  }>;
  acquisitionTrends?: Array<{
    date: string;
    newCustomers: number;
    totalCustomers: number;
  }>;
}

export interface FinancialReportData {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  // New summary expected by frontend
  summary?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    grossMargin: number;
  };
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    costs: number;
    profit: number;
  }>;
  expenseBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  // New daily profit/revenue trend expected by frontend
  profitTrends?: Array<{
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  }>;
}

export interface ComparisonSummary {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  profitMargin: number;
}

export interface ComparisonReportData {
  periodA: {
    summary: ComparisonSummary;
    byDate: Array<{ key: string; orders: number; revenue: number; profit: number }>;
    byCategory?: Array<{ category: string; revenue: number; profit?: number }>;
    byProduct?: Array<{ id: string; name: string; quantity: number; revenue: number; profit?: number }>;
  };
  periodB: {
    summary: ComparisonSummary;
    byDate: Array<{ key: string; orders: number; revenue: number; profit: number }>;
    byCategory?: Array<{ category: string; revenue: number; profit?: number }>;
    byProduct?: Array<{ id: string; name: string; quantity: number; revenue: number; profit?: number }>;
  };
  deltas: {
    ordersChangePct: number;
    revenueChangePct: number;
    profitChangePct: number;
  };
}

export interface ComparisonOptions {
  dimension: 'overall' | 'product' | 'category';
  groupBy: 'day' | 'month';
  // When false, omit heavy breakdowns (product/category); useful for progressive loading
  details?: boolean;
}

class ReportsService {
  // Sales Reports
  async generateSalesReport(filters: ReportFilter): Promise<SalesReportData> {
    try {
      logger.info('Generating sales report', { filters });

      const whereClause: any = {};

      // Apply date range and delta 'since'
      if (filters.startDate && filters.endDate) {
        const gteDate = filters.since && filters.startDate
          ? new Date(Math.max(filters.since.getTime(), filters.startDate.getTime()))
          : filters.startDate;
        whereClause.createdAt = { gte: gteDate, lte: filters.endDate };
      } else if (filters.since) {
        whereClause.createdAt = { gte: filters.since };
      }

      if (filters.customerId) {
        whereClause.customerId = filters.customerId;
      }

      if (filters.userId) {
        whereClause.userId = filters.userId;
      }

      const useMV = process.env.USE_MATERIALIZED_VIEWS === '1';
      const simpleDateOnly = !!filters.startDate && !!filters.endDate && !filters.customerId && !filters.userId && !filters.productId && !filters.categoryId && !filters.supplierId;
      if (useMV && simpleDateOnly) {
        // ✅ SEGURO: Validar y sanitizar fechas antes de query
        const start = new Date(filters.startDate!);
        const end = new Date(filters.endDate!);

        // Validar que las fechas sean válidas
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error('Invalid date range provided');
        }

        // ✅ SEGURO: Usar $queryRaw con template literals en lugar de $queryRawUnsafe
        const daily = await prisma.$queryRaw<any[]>`
          SELECT day, orders, revenue, cost 
          FROM mv_sales_daily_overall 
          WHERE day BETWEEN ${start} AND ${end} 
          ORDER BY day ASC
        `;

        const summaryTotalOrders = daily.reduce((acc, d) => acc + Number(d.orders || 0), 0);
        const summaryTotalRevenue = daily.reduce((acc, d) => acc + Number(d.revenue || 0), 0);
        const summaryTotalProfit = daily.reduce((acc, d) => acc + (Number(d.revenue || 0) - Number(d.cost || 0)), 0);
        const summaryAvgOrder = summaryTotalOrders > 0 ? summaryTotalRevenue / summaryTotalOrders : 0;
        const summaryMargin = summaryTotalRevenue > 0 ? (summaryTotalProfit / summaryTotalRevenue) * 100 : 0;

        const salesByDate = daily.map(r => ({
          date: new Date(r.day).toISOString().split('T')[0],
          sales: Number(r.orders || 0),
          revenue: Number(r.revenue || 0),
          profit: Number(r.revenue || 0) - Number(r.cost || 0),
        }));

        // ✅ SEGURO: Query con parámetros template literals
        const byCategory = await prisma.$queryRaw<any[]>`
          SELECT category_name AS category, SUM(revenue) AS revenue, SUM(cost) AS cost 
          FROM mv_sales_daily_category 
          WHERE day BETWEEN ${start} AND ${end} 
          GROUP BY category_name 
          ORDER BY SUM(revenue) DESC
        `;

        const salesByCategory = byCategory.map(r => ({
          category: String(r.category),
          sales: Number(r.revenue || 0),
          quantity: undefined,
          revenue: Number(r.revenue || 0),
        }));

        // ✅ SEGURO: Usar constante para límite
        const byProduct = await prisma.$queryRaw<any[]>`
          SELECT product_id AS id, product_name AS name, 
                 SUM(quantity) AS quantity, SUM(revenue) AS revenue, SUM(cost) AS cost 
          FROM mv_sales_daily_product 
          WHERE day BETWEEN ${start} AND ${end} 
          GROUP BY product_id, product_name 
          ORDER BY SUM(revenue) DESC 
          LIMIT ${REPORT_LIMITS.TOP_PRODUCTS}
        `;

        const topProducts = byProduct.map(r => ({
          id: String(r.id),
          name: String(r.name),
          quantity: Number(r.quantity || 0),
          revenue: Number(r.revenue || 0),
          sales: Number(r.revenue || 0),
          profit: Number(r.revenue || 0) - Number(r.cost || 0),
        }));

        return {
          totalSales: summaryTotalOrders,
          totalRevenue: summaryTotalRevenue,
          averageOrderValue: summaryAvgOrder,
          summary: {
            totalSales: summaryTotalOrders,
            totalOrders: summaryTotalOrders,
            averageOrderValue: summaryAvgOrder,
            totalProfit: summaryTotalProfit,
            profitMargin: Math.round(summaryMargin * 100) / 100,
          },
          topProducts,
          salesByDate: salesByDate,
          salesByCategory,
          salesByCustomer: undefined,
        };
      }

      // Caching: attempt to serve from cache for identical filters
      let sales: any[] | undefined;
      try {
        const { cacheGet } = await import('../lib/distributed-cache');
        const cacheKey = `sales-report:${JSON.stringify({ whereClause })}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
          sales = cached as any[];
        }
      } catch { }

      // Get sales data
      if (!sales) {
        sales = await prisma.sale.findMany({
          where: whereClause,
          include: {
            saleItems: {
              include: {
                product: {
                  include: {
                    category: true
                  }
                }
              }
            },
            customer: true
          }
        });
        try {
          const { cacheSet } = await import('../lib/distributed-cache');
          const cacheKey = `sales-report:${JSON.stringify({ whereClause })}`;
          await cacheSet(cacheKey, sales, 5 * 60 * 1000);
        } catch { }
      }

      // Calculate metrics
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalCosts = sales.reduce((sum, sale) => {
        return sum + sale.saleItems.reduce((itemSum, item) => {
          const cost = item.product?.costPrice ?? 0;
          return itemSum + (cost * item.quantity);
        }, 0);
      }, 0);
      const totalProfit = totalRevenue - totalCosts;
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Top products
      const productSales = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();

      sales.forEach(sale => {
        sale.saleItems.forEach(item => {
          const key = item.product.id;
          const existing = productSales.get(key) || { name: item.product.name, quantity: 0, revenue: 0, profit: 0 };
          existing.quantity += item.quantity;
          existing.revenue += (item.quantity * item.unitPrice);
          const cost = item.product?.costPrice ?? 0;
          existing.profit += (item.unitPrice - cost) * item.quantity;
          productSales.set(key, existing);
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([id, data]) => ({ id, ...data, sales: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, REPORT_LIMITS.TOP_PRODUCTS);

      // Sales by date
      const salesByDate = new Map<string, { sales: number; revenue: number; profit: number }>();

      sales.forEach(sale => {
        const date = sale.createdAt.toISOString().split('T')[0];
        const existing = salesByDate.get(date) || { sales: 0, revenue: 0, profit: 0 };
        existing.sales += 1;
        existing.revenue += sale.total;
        // Compute profit for the sale
        const saleProfit = sale.saleItems.reduce((sum, item) => {
          const cost = item.product?.costPrice ?? 0;
          return sum + (item.unitPrice - cost) * item.quantity;
        }, 0);
        existing.profit += saleProfit;
        salesByDate.set(date, existing);
      });

      const salesByDateArray = Array.from(salesByDate.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Sales by category
      const categoryRevenue = new Map<string, { quantity: number; revenue: number }>();

      sales.forEach(sale => {
        sale.saleItems.forEach(item => {
          const category = item.product.category?.name || 'Uncategorized';
          const existing = categoryRevenue.get(category) || { quantity: 0, revenue: 0 };
          existing.quantity += item.quantity;
          existing.revenue += (item.quantity * item.unitPrice);
          categoryRevenue.set(category, existing);
        });
      });

      const salesByCategory = Array.from(categoryRevenue.entries())
        .map(([category, data]) => ({ category, sales: data.revenue, quantity: data.quantity, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // Group by customer
      const customerMap = new Map<string, { name: string; revenue: number; orders: number }>();
      sales.forEach(sale => {
        const id = sale.customer?.id || 'unknown';
        const name = sale.customer?.name || 'Unknown';
        const existing = customerMap.get(id) || { name, revenue: 0, orders: 0 };
        existing.revenue += sale.total;
        existing.orders += 1;
        customerMap.set(id, existing);
      });
      const salesByCustomer = Array.from(customerMap.entries()).map(([customerId, d]) => ({
        customerId,
        customerName: d.name,
        sales: d.revenue,
        orders: d.orders,
      })).sort((a, b) => b.sales - a.sales).slice(0, REPORT_LIMITS.SALES_BY_CUSTOMER);

      return {
        // legacy
        totalSales,
        totalRevenue,
        averageOrderValue,
        // frontend summary
        summary: {
          totalSales,
          totalOrders: totalSales,
          averageOrderValue,
          totalProfit,
          profitMargin: Math.round(profitMargin * 100) / 100,
        },
        topProducts,
        salesByDate: salesByDateArray,
        salesByCategory,
        salesByCustomer,
      };

    } catch (error) {
      logger.error('Error generating sales report', { error, filters });
      throw error;
    }
  }

  // Inventory Reports
  async generateInventoryReport(filters: ReportFilter): Promise<InventoryReportData> {
    try {
      logger.info('Generating inventory report', { filters });

      const whereClause: any = {};

      if (filters.categoryId) {
        whereClause.categoryId = filters.categoryId;
      }

      if (filters.supplierId) {
        whereClause.supplierId = filters.supplierId;
      }

      // Delta 'since': filter products updated/created since timestamp when no date range
      if (filters.since) {
        whereClause.updatedAt = { gte: filters.since };
      }

      // Get products with inventory data
      let products: any[] | undefined;
      try {
        const { cacheGet } = await import('../lib/distributed-cache');
        const cacheKey = `inventory-report:${JSON.stringify({ whereClause })}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
          products = cached as any[];
        }
      } catch { }

      if (!products) {
        products = await prisma.product.findMany({
          where: whereClause,
          include: {
            category: true
          }
        });
        try {
          const { cacheSet } = await import('../lib/distributed-cache');
          const cacheKey = `inventory-report:${JSON.stringify({ whereClause })}`;
          await cacheSet(cacheKey, products, 5 * 60 * 1000);
        } catch { }
      }

      const totalProducts = products.length;

      // Low stock products
      const lowStockProducts = products
        .filter(product => {
          const currentStock = product.stockQuantity || 0;
          const minStock = product.minStock || 0;
          return currentStock <= minStock;
        })
        .map(product => ({
          id: product.id,
          name: product.name,
          currentStock: product.stockQuantity || 0,
          minStock: product.minStock || 0,
          value: (product.stockQuantity || 0) * product.salePrice
        }))
        .sort((a, b) => (a.currentStock / Math.max(a.minStock, 1)) - (b.currentStock / Math.max(b.minStock, 1)));

      // Total inventory value
      const inventoryValue = products.reduce((sum, product) => {
        return sum + ((product.stockQuantity || 0) * product.salePrice);
      }, 0);

      // Stock movements (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stockMovements = await prisma.inventoryMovement.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        include: {
          product: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100
      });

      const stockMovementsData = stockMovements.map(movement => ({
        productId: movement.product.id,
        productName: movement.product.name,
        type: String(movement.type).toLowerCase(),
        quantity: movement.quantity,
        date: movement.createdAt.toISOString().split('T')[0],
        reason: movement.reason || 'N/A'
      }));

      // Category breakdown
      const categoryBreakdown = new Map<string, { products: number; value: number; stockSum: number }>();

      products.forEach(product => {
        const category = product.category?.name || 'Uncategorized';
        const existing = categoryBreakdown.get(category) || { products: 0, value: 0, stockSum: 0 };
        const stockQty = product.stockQuantity || 0;
        existing.products += 1;
        existing.value += stockQty * product.salePrice;
        existing.stockSum += stockQty;
        categoryBreakdown.set(category, existing);
      });

      const categoryBreakdownArray = Array.from(categoryBreakdown.entries())
        .map(([category, data]) => ({
          category,
          products: data.products,
          value: data.value,
          totalProducts: data.products,
          totalValue: data.value,
          averageStock: data.products > 0 ? data.stockSum / data.products : 0
        }))
        .sort((a, b) => b.value - a.value);

      // Build stock levels detailed array
      const stockLevels = products.map(product => {
        const currentStock = product.stockQuantity || 0;
        const minStock = product.minStock || 0;
        const status: 'in_stock' | 'low_stock' | 'out_of_stock' = currentStock <= 0
          ? 'out_of_stock'
          : currentStock <= minStock
            ? 'low_stock'
            : 'in_stock';
        return {
          id: product.id,
          name: product.name,
          currentStock,
          minStock,
          maxStock: (product as any).maxStock ?? 0,
          value: currentStock * product.salePrice,
          status,
        };
      });

      const outOfStockItems = stockLevels.filter(p => p.status === 'out_of_stock').length;
      const lowStockItems = stockLevels.filter(p => p.status === 'low_stock').length;
      const averageStockLevel = totalProducts > 0
        ? (products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0) / totalProducts)
        : 0;

      return {
        totalProducts,
        lowStockProducts,
        inventoryValue,
        stockMovements: stockMovementsData,
        categoryBreakdown: categoryBreakdownArray,
        summary: {
          totalProducts,
          totalValue: inventoryValue,
          lowStockItems,
          outOfStockItems,
          averageStockLevel,
        },
        stockLevels,
      };

    } catch (error) {
      logger.error('Error generating inventory report', { error, filters });
      throw error;
    }
  }

  // Customer Reports
  async generateCustomerReport(filters: ReportFilter): Promise<CustomerReportData> {
    try {
      logger.info('Generating customer report', { filters });

      const whereClause: any = {};

      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: filters.startDate,
          lte: filters.endDate
        };
      }

      // Get customers with sales data
      const customers = await prisma.customer.findMany({
        include: {
          sales: {
            where: filters.startDate && filters.endDate ? {
              createdAt: {
                gte: filters.startDate,
                lte: filters.endDate
              }
            } : undefined
          }
        }
      });

      const totalCustomers = customers.length;

      // New customers (if date range provided)
      let newCustomers = 0;
      if (filters.startDate && filters.endDate) {
        newCustomers = customers.filter(customer =>
          customer.createdAt >= filters.startDate! && customer.createdAt <= filters.endDate!
        ).length;
      }

      // Top customers
      const topCustomers = customers
        .map(customer => {
          const totalPurchases = customer.sales.length;
          const totalSpent = customer.sales.reduce((sum, sale) => sum + sale.total, 0);
          const lastPurchase = customer.sales.length > 0
            ? Math.max(...customer.sales.map(sale => sale.createdAt.getTime()))
            : 0;

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            totalPurchases,
            totalSpent,
            lastPurchase: lastPurchase > 0 ? new Date(lastPurchase).toISOString().split('T')[0] : 'Never',
            orderCount: totalPurchases,
            lastOrderDate: lastPurchase > 0 ? new Date(lastPurchase).toISOString().split('T')[0] : 'Never'
          };
        })
        .filter(customer => customer.totalPurchases > 0)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, REPORT_LIMITS.TOP_CUSTOMERS);

      // Customer segmentation
      const segments = {
        high: customers.filter(c => c.sales.reduce((sum, s) => sum + s.total, 0) > 1000).length,
        medium: customers.filter(c => {
          const total = c.sales.reduce((sum, s) => sum + s.total, 0);
          return total >= 500 && total <= 1000;
        }).length,
        low: customers.filter(c => {
          const total = c.sales.reduce((sum, s) => sum + s.total, 0);
          return total > 0 && total < 500;
        }).length
      };

      const customersBySegment = [
        { segment: 'High Value (>$1000)', count: segments.high, averageSpent: 1500 },
        { segment: 'Medium Value ($500-$1000)', count: segments.medium, averageSpent: 750 },
        { segment: 'Low Value (<$500)', count: segments.low, averageSpent: 250 }
      ];

      // Build enhanced segments expected by frontend (approximate totals)
      const customerSegments = customersBySegment.map(seg => ({
        segment: seg.segment,
        count: seg.count,
        totalSpent: seg.count * seg.averageSpent,
        averageOrderValue: seg.averageSpent,
      }));

      // Customer retention
      const returningCustomers = customers.filter(c => c.sales.length > 1).length;
      const newCustomersCount = customers.filter(c => c.sales.length === 1).length;
      const churnRate = totalCustomers > 0 ? ((totalCustomers - returningCustomers) / totalCustomers) * 100 : 0;

      const customerRetention = {
        returning: returningCustomers,
        new: newCustomersCount,
        churnRate: Math.round(churnRate * 100) / 100
      };

      // Summary expected by frontend
      const activeCustomers = customers.filter(c => c.sales.length > 0).length;
      const totalOrders = customers.reduce((sum, c) => sum + c.sales.length, 0);
      const totalSpentAll = customers.reduce((sum, c) => sum + c.sales.reduce((s, sale) => s + sale.total, 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpentAll / totalOrders : 0;
      const customerRetentionRate = activeCustomers > 0 ? (returningCustomers / activeCustomers) * 100 : 0;

      // Acquisition trends by day in range
      let acquisitionTrends: Array<{ date: string; newCustomers: number; totalCustomers: number }> = [];
      if (filters.startDate && filters.endDate) {
        const byDate = new Map<string, { newCount: number; total: number }>();
        customers.forEach(c => {
          const createdDate = c.createdAt.toISOString().split('T')[0];
          const entry = byDate.get(createdDate) || { newCount: 0, total: 0 };
          entry.newCount += 1;
          byDate.set(createdDate, entry);
        });
        // Accumulate total customers over time
        const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
        let runningTotal = 0;
        acquisitionTrends = dates.map(date => {
          const entry = byDate.get(date)!;
          runningTotal += entry.newCount;
          return { date, newCustomers: entry.newCount, totalCustomers: runningTotal };
        });
      }

      return {
        totalCustomers,
        newCustomers,
        topCustomers,
        customersBySegment,
        customerRetention,
        summary: {
          totalCustomers,
          activeCustomers,
          newCustomers,
          averageOrderValue,
          customerRetentionRate: Math.round(customerRetentionRate * 100) / 100,
        },
        customerSegments,
        acquisitionTrends,
      };

    } catch (error) {
      logger.error('Error generating customer report', { error, filters });
      throw error;
    }
  }

  // Financial Reports
  async generateFinancialReport(filters: ReportFilter): Promise<FinancialReportData> {
    try {
      logger.info('Generating financial report', { filters });

      const whereClause: any = {};

      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: filters.startDate,
          lte: filters.endDate
        };
      }

      // Get sales data
      const sales = await prisma.sale.findMany({
        where: whereClause,
        include: {
          saleItems: {
            include: {
              product: true
            }
          }
        }
      });

      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

      // Calculate costs (simplified - using product cost)
      const totalCosts = sales.reduce((sum, sale) => {
        return sum + sale.saleItems.reduce((itemSum, item) => {
          return itemSum + (item.product.costPrice * item.quantity);
        }, 0);
      }, 0);

      const grossProfit = totalRevenue - totalCosts;
      const netProfit = grossProfit; // Simplified - would include operating expenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Revenue by month
      const monthlyData = new Map<string, { revenue: number; costs: number }>();

      sales.forEach(sale => {
        const month = sale.createdAt.toISOString().substring(0, 7); // YYYY-MM
        const existing = monthlyData.get(month) || { revenue: 0, costs: 0 };
        existing.revenue += sale.total;

        const saleCosts = sale.saleItems.reduce((sum, item) => {
          return sum + (item.product.costPrice * item.quantity);
        }, 0);
        existing.costs += saleCosts;

        monthlyData.set(month, existing);
      });

      const revenueByMonth = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          costs: data.costs,
          profit: data.revenue - data.costs
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Profit trends by day
      const dailyData = new Map<string, { revenue: number; costs: number }>();
      sales.forEach(sale => {
        const day = sale.createdAt.toISOString().split('T')[0];
        const existing = dailyData.get(day) || { revenue: 0, costs: 0 };
        existing.revenue += sale.total;
        const saleCosts = sale.saleItems.reduce((sum, item) => sum + ((item.product?.costPrice ?? 0) * item.quantity), 0);
        existing.costs += saleCosts;
        dailyData.set(day, existing);
      });
      const profitTrends = Array.from(dailyData.entries())
        .map(([date, d]) => ({
          date,
          revenue: d.revenue,
          expenses: d.costs,
          profit: d.revenue - d.costs,
          margin: d.revenue > 0 ? ((d.revenue - d.costs) / d.revenue) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Expense breakdown (simplified)
      const expenseBreakdown = [
        { category: 'Cost of Goods Sold', amount: totalCosts, percentage: totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0 },
        { category: 'Operating Expenses', amount: 0, percentage: 0 }, // Would be calculated from actual expense data
        { category: 'Marketing', amount: 0, percentage: 0 },
        { category: 'Other', amount: 0, percentage: 0 }
      ];

      return {
        totalRevenue,
        totalCosts,
        grossProfit,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        summary: {
          totalRevenue,
          totalExpenses: totalCosts,
          netProfit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          grossMargin: Math.round(grossMargin * 100) / 100,
        },
        revenueByMonth,
        expenseBreakdown,
        profitTrends,
      };

    } catch (error) {
      logger.error('Error generating financial report', { error, filters });
      throw error;
    }
  }

  async generateComparisonReport(
    filtersA: ReportFilter,
    filtersB: ReportFilter,
    options: ComparisonOptions
  ): Promise<ComparisonReportData> {
    try {
      logger.info('Generating comparison report', { filtersA, filtersB, options });

      const useMV = process.env.USE_MATERIALIZED_VIEWS === '1';
      const details = options.details !== false; // default true

      // Build cache key
      const cacheKey = [
        'reports:compare',
        options.dimension,
        options.groupBy,
        `A=${filtersA.startDate?.toISOString() || ''}-${filtersA.endDate?.toISOString() || ''}`,
        `B=${filtersB.startDate?.toISOString() || ''}-${filtersB.endDate?.toISOString() || ''}`,
        `p=${filtersA.productId || filtersB.productId || ''}`,
        `c=${filtersA.categoryId || filtersB.categoryId || ''}`,
        `cust=${filtersA.customerId || filtersB.customerId || ''}`,
        `sup=${filtersA.supplierId || filtersB.supplierId || ''}`,
        `u=${filtersA.userId || filtersB.userId || ''}`,
        `details=${details}`
      ].join('|');

      // Try distributed cache
      try {
        const { cacheGet } = await import('../lib/distributed-cache');
        const cached = await cacheGet<ComparisonReportData>(cacheKey);
        if (cached) return cached;
      } catch { }

      // Use MV only when simple filters (date-only) or for overall aggregates
      const simpleFilters = !filtersA.productId && !filtersA.categoryId && !filtersA.customerId && !filtersA.supplierId && !filtersA.userId
        && !filtersB.productId && !filtersB.categoryId && !filtersB.customerId && !filtersB.supplierId && !filtersB.userId;

      if (useMV && simpleFilters) {
        const startA = filtersA.startDate ? new Date(filtersA.startDate) : undefined;
        const endA = filtersA.endDate ? new Date(filtersA.endDate) : undefined;
        const startB = filtersB.startDate ? new Date(filtersB.startDate) : undefined;
        const endB = filtersB.endDate ? new Date(filtersB.endDate) : undefined;

        const dailyA = await prisma.$queryRawUnsafe<any[]>(
          'SELECT day, orders, revenue, cost FROM mv_sales_daily_overall WHERE day BETWEEN $1 AND $2 ORDER BY day ASC',
          startA, endA
        );
        const dailyB = await prisma.$queryRawUnsafe<any[]>(
          'SELECT day, orders, revenue, cost FROM mv_sales_daily_overall WHERE day BETWEEN $1 AND $2 ORDER BY day ASC',
          startB, endB
        );

        const summaryA: ComparisonSummary = {
          totalOrders: dailyA.reduce((acc, d) => acc + Number(d.orders || 0), 0),
          totalRevenue: dailyA.reduce((acc, d) => acc + Number(d.revenue || 0), 0),
          totalProfit: dailyA.reduce((acc, d) => acc + (Number(d.revenue || 0) - Number(d.cost || 0)), 0),
          averageOrderValue: 0,
          profitMargin: 0
        };
        summaryA.averageOrderValue = summaryA.totalOrders > 0 ? summaryA.totalRevenue / summaryA.totalOrders : 0;
        summaryA.profitMargin = summaryA.totalRevenue > 0 ? (summaryA.totalProfit / summaryA.totalRevenue) * 100 : 0;

        const summaryB: ComparisonSummary = {
          totalOrders: dailyB.reduce((acc, d) => acc + Number(d.orders || 0), 0),
          totalRevenue: dailyB.reduce((acc, d) => acc + Number(d.revenue || 0), 0),
          totalProfit: dailyB.reduce((acc, d) => acc + (Number(d.revenue || 0) - Number(d.cost || 0)), 0),
          averageOrderValue: 0,
          profitMargin: 0
        };
        summaryB.averageOrderValue = summaryB.totalOrders > 0 ? summaryB.totalRevenue / summaryB.totalOrders : 0;
        summaryB.profitMargin = summaryB.totalRevenue > 0 ? (summaryB.totalProfit / summaryB.totalRevenue) * 100 : 0;

        const toKey = (d: Date) => options.groupBy === 'month'
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          : d.toISOString().split('T')[0];

        const byDateA = dailyA.reduce((acc: Array<{ key: string; orders: number; revenue: number; profit: number }>, row) => {
          const key = toKey(new Date(row.day));
          const existing = acc.find(e => e.key === key);
          const profit = Number(row.revenue || 0) - Number(row.cost || 0);
          if (existing) {
            existing.orders += Number(row.orders || 0);
            existing.revenue += Number(row.revenue || 0);
            existing.profit += profit;
          } else {
            acc.push({ key, orders: Number(row.orders || 0), revenue: Number(row.revenue || 0), profit });
          }
          return acc;
        }, []).sort((a, b) => a.key.localeCompare(b.key));

        const byDateB = dailyB.reduce((acc: Array<{ key: string; orders: number; revenue: number; profit: number }>, row) => {
          const key = toKey(new Date(row.day));
          const existing = acc.find(e => e.key === key);
          const profit = Number(row.revenue || 0) - Number(row.cost || 0);
          if (existing) {
            existing.orders += Number(row.orders || 0);
            existing.revenue += Number(row.revenue || 0);
            existing.profit += profit;
          } else {
            acc.push({ key, orders: Number(row.orders || 0), revenue: Number(row.revenue || 0), profit });
          }
          return acc;
        }, []).sort((a, b) => a.key.localeCompare(b.key));

        let byCategoryA: Array<{ category: string; revenue: number; profit?: number }> | undefined;
        let byCategoryB: Array<{ category: string; revenue: number; profit?: number }> | undefined;
        let byProductA: Array<{ id: string; name: string; quantity: number; revenue: number; profit?: number }> | undefined;
        let byProductB: Array<{ id: string; name: string; quantity: number; revenue: number; profit?: number }> | undefined;

        if (details && options.dimension === 'category') {
          const catA = await prisma.$queryRawUnsafe<any[]>(
            'SELECT category_name AS category, SUM(revenue) AS revenue, SUM(cost) AS cost FROM mv_sales_daily_category WHERE day BETWEEN $1 AND $2 GROUP BY category_name ORDER BY SUM(revenue) DESC',
            startA, endA
          );
          const catB = await prisma.$queryRawUnsafe<any[]>(
            'SELECT category_name AS category, SUM(revenue) AS revenue, SUM(cost) AS cost FROM mv_sales_daily_category WHERE day BETWEEN $1 AND $2 GROUP BY category_name ORDER BY SUM(revenue) DESC',
            startB, endB
          );
          byCategoryA = catA.map(r => ({ category: String(r.category), revenue: Number(r.revenue || 0), profit: Number(r.revenue || 0) - Number(r.cost || 0) }));
          byCategoryB = catB.map(r => ({ category: String(r.category), revenue: Number(r.revenue || 0), profit: Number(r.revenue || 0) - Number(r.cost || 0) }));
        } else if (details && options.dimension === 'product') {
          const prodA = await prisma.$queryRawUnsafe<any[]>(
            'SELECT product_id AS id, product_name AS name, SUM(quantity) AS quantity, SUM(revenue) AS revenue, SUM(cost) AS cost FROM mv_sales_daily_product WHERE day BETWEEN $1 AND $2 GROUP BY product_id, product_name ORDER BY SUM(revenue) DESC LIMIT 50',
            startA, endA
          );
          const prodB = await prisma.$queryRawUnsafe<any[]>(
            'SELECT product_id AS id, product_name AS name, SUM(quantity) AS quantity, SUM(revenue) AS revenue, SUM(cost) AS cost FROM mv_sales_daily_product WHERE day BETWEEN $1 AND $2 GROUP BY product_id, product_name ORDER BY SUM(revenue) DESC LIMIT 50',
            startB, endB
          );
          byProductA = prodA.map(r => ({ id: String(r.id), name: String(r.name), quantity: Number(r.quantity || 0), revenue: Number(r.revenue || 0), profit: Number(r.revenue || 0) - Number(r.cost || 0) }));
          byProductB = prodB.map(r => ({ id: String(r.id), name: String(r.name), quantity: Number(r.quantity || 0), revenue: Number(r.revenue || 0), profit: Number(r.revenue || 0) - Number(r.cost || 0) }));
        }

        const deltas = {
          ordersChangePct: this.changePct(summaryA.totalOrders, summaryB.totalOrders),
          revenueChangePct: this.changePct(summaryA.totalRevenue, summaryB.totalRevenue),
          profitChangePct: this.changePct(summaryA.totalProfit, summaryB.totalProfit),
        };

        const result: ComparisonReportData = {
          periodA: { summary: summaryA, byDate: byDateA, byCategory: byCategoryA, byProduct: byProductA },
          periodB: { summary: summaryB, byDate: byDateB, byCategory: byCategoryB, byProduct: byProductB },
          deltas,
        };

        try {
          const { cacheSet } = await import('../lib/distributed-cache');
          await cacheSet(cacheKey, result, 5 * 60 * 1000);
        } catch { }

        return result;
      }

      // Fallback original path with Prisma includes
      const [salesA, salesB] = await Promise.all([
        prisma.sale.findMany({
          where: this.buildSaleWhere(filtersA),
          include: { saleItems: { include: { product: { include: { category: true } } } } },
        }),
        prisma.sale.findMany({
          where: this.buildSaleWhere(filtersB),
          include: { saleItems: { include: { product: { include: { category: true } } } } },
        }),
      ]);

      const summaryA = this.computeSummary(salesA);
      const summaryB = this.computeSummary(salesB);

      const byDateA = this.groupByDate(salesA, options.groupBy);
      const byDateB = this.groupByDate(salesB, options.groupBy);

      let byCategoryA: Array<{ category: string; revenue: number; profit?: number }> | undefined;
      let byCategoryB: Array<{ category: string; revenue: number; profit?: number }> | undefined;
      let byProductA: Array<{ id: string; name: string; quantity: number; revenue: number; profit?: number }> | undefined;
      let byProductB: Array<{ id: string; name: string; quantity: number; revenue: number; profit?: number }> | undefined;

      if (details && options.dimension === 'category') {
        byCategoryA = this.groupByCategory(salesA);
        byCategoryB = this.groupByCategory(salesB);
      } else if (details && options.dimension === 'product') {
        byProductA = this.groupByProduct(salesA);
        byProductB = this.groupByProduct(salesB);
      }

      const deltas = {
        ordersChangePct: this.changePct(summaryA.totalOrders, summaryB.totalOrders),
        revenueChangePct: this.changePct(summaryA.totalRevenue, summaryB.totalRevenue),
        profitChangePct: this.changePct(summaryA.totalProfit, summaryB.totalProfit),
      };

      const result: ComparisonReportData = {
        periodA: { summary: summaryA, byDate: byDateA, byCategory: byCategoryA, byProduct: byProductA },
        periodB: { summary: summaryB, byDate: byDateB, byCategory: byCategoryB, byProduct: byProductB },
        deltas,
      };

      try {
        const { cacheSet } = await import('../lib/distributed-cache');
        await cacheSet(cacheKey, result, 5 * 60 * 1000);
      } catch { }

      return result;
    } catch (error) {
      logger.error('Error generating comparison report', { error, filtersA, filtersB, options });
      throw error;
    }
  }

  private buildSaleWhere(filters: ReportFilter): any {
    const whereClause: any = {};
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = { gte: filters.startDate, lte: filters.endDate };
    }
    if (filters.customerId) whereClause.customerId = filters.customerId;
    if (filters.userId) whereClause.userId = filters.userId;
    return whereClause;
  }

  private computeSummary(sales: any[]): ComparisonSummary {
    const totalOrders = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalCosts = sales.reduce((sum, sale) => {
      return sum + sale.saleItems.reduce((itemSum: number, item: any) => {
        const cost = item.product?.costPrice ?? 0;
        return itemSum + cost * item.quantity;
      }, 0);
    }, 0);
    const totalProfit = totalRevenue - totalCosts;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return {
      totalOrders,
      totalRevenue,
      totalProfit,
      averageOrderValue,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  }

  private groupByDate(sales: any[], groupBy: 'day' | 'month') {
    const map = new Map<string, { orders: number; revenue: number; profit: number }>();
    for (const sale of sales) {
      const key = groupBy === 'month'
        ? `${sale.createdAt.getFullYear()}-${String(sale.createdAt.getMonth() + 1).padStart(2, '0')}`
        : sale.createdAt.toISOString().split('T')[0];
      const revenue = sale.total;
      const costs = sale.saleItems.reduce((sum: number, item: any) => sum + (item.product?.costPrice ?? 0) * item.quantity, 0);
      const profit = revenue - costs;
      const current = map.get(key) || { orders: 0, revenue: 0, profit: 0 };
      current.orders += 1;
      current.revenue += revenue;
      current.profit += profit;
      map.set(key, current);
    }
    return Array.from(map.entries()).map(([key, val]) => ({ key, orders: val.orders, revenue: val.revenue, profit: val.profit }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  private groupByCategory(sales: any[]) {
    const map = new Map<string, { revenue: number; profit: number }>();
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        const category = item.product?.category?.name || 'Uncategorized';
        const revenue = item.quantity * item.salePrice;
        const cost = (item.product?.costPrice ?? 0) * item.quantity;
        const profit = revenue - cost;
        const current = map.get(category) || { revenue: 0, profit: 0 };
        current.revenue += revenue;
        current.profit += profit;
        map.set(category, current);
      }
    }
    return Array.from(map.entries()).map(([category, val]) => ({ category, revenue: val.revenue, profit: val.profit }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private groupByProduct(sales: any[]) {
    const map = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        const id = item.product?.id || item.productId;
        const name = item.product?.name || 'Unknown';
        const unitPrice = item.unitPrice ?? item.salePrice ?? item.product?.salePrice ?? 0;
        const revenue = item.quantity * unitPrice;
        const cost = (item.product?.costPrice ?? 0) * item.quantity;
        const profit = revenue - cost;
        const current = map.get(id) || { name, quantity: 0, revenue: 0, profit: 0 };
        current.quantity += item.quantity;
        current.revenue += revenue;
        current.profit += profit;
        map.set(id, current);
      }
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, name: v.name, quantity: v.quantity, revenue: v.revenue, profit: v.profit }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50);
  }

  private changePct(a: number, b: number) {
    if (a === 0 && b === 0) return 0;
    if (a === 0) return 100;
    return Math.round(((b - a) / a) * 100 * 100) / 100;
  }

  // Export to PDF
  async exportToPDF(reportType: string, data: any, filters: ReportFilter): Promise<Buffer> {
    try {
      logger.info('Exporting report to PDF', { reportType, filters });

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFontSize(20);
      doc.text(`${reportType} Report`, pageWidth / 2, 20, { align: 'center' });

      // Date range
      if (filters.startDate && filters.endDate) {
        doc.setFontSize(12);
        doc.text(
          `Period: ${filters.startDate.toDateString()} - ${filters.endDate.toDateString()}`,
          pageWidth / 2,
          30,
          { align: 'center' }
        );
      }

      let yPosition = 50;

      switch (reportType.toLowerCase()) {
        case 'sales':
          yPosition = this.addSalesDataToPDF(doc, data as SalesReportData, yPosition);
          break;
        case 'inventory':
          yPosition = this.addInventoryDataToPDF(doc, data as InventoryReportData, yPosition);
          break;
        case 'customer':
          yPosition = this.addCustomerDataToPDF(doc, data as CustomerReportData, yPosition);
          break;
        case 'financial':
          yPosition = this.addFinancialDataToPDF(doc, data as FinancialReportData, yPosition);
          break;
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      return Buffer.from(doc.output('arraybuffer'));

    } catch (error) {
      logger.error('Error exporting to PDF', { error, reportType });
      throw error;
    }
  }

  // Export to Excel
  async exportToExcel(reportType: string, data: any, filters: ReportFilter): Promise<Buffer> {
    try {
      logger.info('Exporting report to Excel', { reportType, filters });

      const workbook = XLSX.utils.book_new();

      switch (reportType.toLowerCase()) {
        case 'sales':
          this.addSalesDataToExcel(workbook, data as SalesReportData);
          break;
        case 'inventory':
          this.addInventoryDataToExcel(workbook, data as InventoryReportData);
          break;
        case 'customer':
          this.addCustomerDataToExcel(workbook, data as CustomerReportData);
          break;
        case 'financial':
          this.addFinancialDataToExcel(workbook, data as FinancialReportData);
          break;
      }

      // Add metadata sheet
      const metadata = [
        ['Report Type', reportType],
        ['Generated On', new Date().toLocaleString()],
        ['Start Date', filters.startDate?.toDateString() || 'N/A'],
        ['End Date', filters.endDate?.toDateString() || 'N/A']
      ];

      const metadataSheet = XLSX.utils.aoa_to_sheet(metadata);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

      return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));

    } catch (error) {
      logger.error('Error exporting to Excel', { error, reportType });
      throw error;
    }
  }

  // Export to JSON
  async exportToJSON(data: any): Promise<Buffer> {
    try {
      const json = JSON.stringify(data, null, 2);
      return Buffer.from(json, 'utf-8');
    } catch (error) {
      logger.error('Error exporting to JSON', { error });
      throw error;
    }
  }

  // Export to CSV
  async exportToCSV(reportType: string, data: any, filters: ReportFilter): Promise<Buffer> {
    try {
      logger.info('Exporting report to CSV', { reportType, filters });

      const lines: string[] = [];

      // Metadata
      lines.push(`# ${reportType} Report`);
      lines.push(`# Generated On,${this.sanitizeCSVValue(new Date().toLocaleString())}`);
      lines.push(`# Start Date,${this.sanitizeCSVValue(filters.startDate?.toDateString() || 'N/A')}`);
      lines.push(`# End Date,${this.sanitizeCSVValue(filters.endDate?.toDateString() || 'N/A')}`);
      lines.push('');

      switch (reportType.toLowerCase()) {
        case 'sales': {
          const d = data as SalesReportData;
          lines.push('Summary');
          lines.push(this.toCSVRow(['totalSales', d.totalSales]));
          lines.push(this.toCSVRow(['totalRevenue', d.totalRevenue]));
          lines.push(this.toCSVRow(['averageOrderValue', d.averageOrderValue]));
          if (d.summary) {
            lines.push(this.toCSVRow(['totalOrders', d.summary.totalOrders]));
            lines.push(this.toCSVRow(['totalProfit', d.summary.totalProfit]));
            lines.push(this.toCSVRow(['profitMargin', d.summary.profitMargin]));
          }
          lines.push('');

          if (d.topProducts?.length) {
            lines.push('Top Products');
            lines.push(this.toCSVRow(['id', 'name', 'quantity', 'revenue', 'profit']));
            for (const p of d.topProducts) {
              lines.push(this.toCSVRow([p.id, p.name, p.quantity, p.revenue, p.profit ?? '']));
            }
            lines.push('');
          }

          if (d.salesByDate?.length) {
            lines.push('Sales By Date');
            lines.push(this.toCSVRow(['date', 'sales', 'revenue', 'profit']));
            for (const s of d.salesByDate) {
              lines.push(this.toCSVRow([s.date, s.sales, s.revenue, s.profit ?? '']));
            }
            lines.push('');
          }

          if (d.salesByCategory?.length) {
            lines.push('Sales By Category');
            lines.push(this.toCSVRow(['category', 'sales', 'quantity', 'revenue']));
            for (const c of d.salesByCategory) {
              lines.push(this.toCSVRow([c.category, c.sales, c.quantity ?? '', c.revenue ?? '']));
            }
            lines.push('');
          }
          break;
        }
        case 'inventory': {
          const d = data as InventoryReportData;
          lines.push('Summary');
          lines.push(this.toCSVRow(['totalProducts', d.totalProducts]));
          lines.push(this.toCSVRow(['inventoryValue', d.inventoryValue]));
          if (d.summary) {
            lines.push(this.toCSVRow(['lowStockItems', d.summary.lowStockItems]));
            lines.push(this.toCSVRow(['outOfStockItems', d.summary.outOfStockItems]));
            lines.push(this.toCSVRow(['averageStockLevel', d.summary.averageStockLevel]));
          }
          lines.push('');

          if (d.lowStockProducts?.length) {
            lines.push('Low Stock Products');
            lines.push(this.toCSVRow(['id', 'name', 'currentStock', 'minStock', 'value']));
            for (const p of d.lowStockProducts) {
              lines.push(this.toCSVRow([p.id, p.name, p.currentStock, p.minStock, p.value]));
            }
            lines.push('');
          }

          if (d.stockMovements?.length) {
            lines.push('Stock Movements');
            lines.push(this.toCSVRow(['productId', 'productName', 'type', 'quantity', 'date', 'reason']));
            for (const m of d.stockMovements) {
              lines.push(this.toCSVRow([m.productId ?? '', m.productName, m.type, m.quantity, m.date, m.reason]));
            }
            lines.push('');
          }

          if (d.categoryBreakdown?.length) {
            lines.push('Category Breakdown');
            lines.push(this.toCSVRow(['category', 'products', 'value', 'totalProducts', 'totalValue', 'averageStock']));
            for (const c of d.categoryBreakdown) {
              lines.push(this.toCSVRow([c.category, c.products, c.value, c.totalProducts ?? '', c.totalValue ?? '', c.averageStock ?? '']));
            }
            lines.push('');
          }

          if (d.stockLevels?.length) {
            lines.push('Stock Levels');
            lines.push(this.toCSVRow(['id', 'name', 'currentStock', 'minStock', 'maxStock', 'value', 'status']));
            for (const s of d.stockLevels) {
              lines.push(this.toCSVRow([s.id, s.name, s.currentStock, s.minStock, s.maxStock, s.value, s.status]));
            }
            lines.push('');
          }
          break;
        }
        case 'customer': {
          const d = data as CustomerReportData;
          lines.push('Summary');
          lines.push(this.toCSVRow(['totalCustomers', d.totalCustomers]));
          lines.push(this.toCSVRow(['newCustomers', d.newCustomers]));
          lines.push(this.toCSVRow(['retentionReturning', d.customerRetention.returning]));
          lines.push(this.toCSVRow(['retentionNew', d.customerRetention.new]));
          lines.push(this.toCSVRow(['churnRate', d.customerRetention.churnRate]));
          if (d.summary) {
            lines.push(this.toCSVRow(['activeCustomers', d.summary.activeCustomers]));
            lines.push(this.toCSVRow(['averageOrderValue', d.summary.averageOrderValue]));
            lines.push(this.toCSVRow(['customerRetentionRate', d.summary.customerRetentionRate]));
          }
          lines.push('');

          if (d.topCustomers?.length) {
            lines.push('Top Customers');
            lines.push(this.toCSVRow(['id', 'name', 'email', 'totalPurchases', 'totalSpent', 'lastPurchase', 'orderCount', 'lastOrderDate']));
            for (const c of d.topCustomers) {
              lines.push(this.toCSVRow([c.id, c.name, c.email, c.totalPurchases, c.totalSpent, c.lastPurchase, c.orderCount ?? '', c.lastOrderDate ?? '']));
            }
            lines.push('');
          }

          if (d.customersBySegment?.length) {
            lines.push('Customers By Segment');
            lines.push(this.toCSVRow(['segment', 'count', 'averageSpent']));
            for (const s of d.customersBySegment) {
              lines.push(this.toCSVRow([s.segment, s.count, s.averageSpent]));
            }
            lines.push('');
          }

          if (d.customerSegments?.length) {
            lines.push('Customer Segments');
            lines.push(this.toCSVRow(['segment', 'count', 'totalSpent', 'averageOrderValue']));
            for (const s of d.customerSegments) {
              lines.push(this.toCSVRow([s.segment, s.count, s.totalSpent, s.averageOrderValue]));
            }
            lines.push('');
          }

          if (d.acquisitionTrends?.length) {
            lines.push('Acquisition Trends');
            lines.push(this.toCSVRow(['date', 'newCustomers', 'totalCustomers']));
            for (const a of d.acquisitionTrends) {
              lines.push(this.toCSVRow([a.date, a.newCustomers, a.totalCustomers]));
            }
            lines.push('');
          }
          break;
        }
        case 'financial': {
          const d = data as FinancialReportData;
          lines.push('Summary');
          lines.push(this.toCSVRow(['totalRevenue', d.totalRevenue]));
          lines.push(this.toCSVRow(['totalCosts', d.totalCosts]));
          lines.push(this.toCSVRow(['grossProfit', d.grossProfit]));
          lines.push(this.toCSVRow(['netProfit', d.netProfit]));
          lines.push(this.toCSVRow(['profitMargin', d.profitMargin]));
          if (d.summary) {
            lines.push(this.toCSVRow(['totalExpenses', d.summary.totalExpenses]));
            lines.push(this.toCSVRow(['grossMargin', d.summary.grossMargin]));
          }
          lines.push('');

          if (d.revenueByMonth?.length) {
            lines.push('Revenue By Month');
            lines.push(this.toCSVRow(['month', 'revenue', 'costs', 'profit']));
            for (const r of d.revenueByMonth) {
              lines.push(this.toCSVRow([r.month, r.revenue, r.costs, r.profit]));
            }
            lines.push('');
          }

          if (d.expenseBreakdown?.length) {
            lines.push('Expense Breakdown');
            lines.push(this.toCSVRow(['category', 'amount', 'percentage']));
            for (const e of d.expenseBreakdown) {
              lines.push(this.toCSVRow([e.category, e.amount, e.percentage]));
            }
            lines.push('');
          }

          if (d.profitTrends?.length) {
            lines.push('Profit Trends');
            lines.push(this.toCSVRow(['date', 'revenue', 'expenses', 'profit', 'margin']));
            for (const p of d.profitTrends) {
              lines.push(this.toCSVRow([p.date, p.revenue, p.expenses, p.profit, p.margin]));
            }
            lines.push('');
          }
          break;
        }
      }

      const csv = lines.join('\n');
      return Buffer.from(csv, 'utf-8');

    } catch (error) {
      logger.error('Error exporting to CSV', { error, reportType });
      throw error;
    }
  }

  private toCSVRow(values: any[]): string {
    return values.map(v => this.sanitizeCSVValue(v)).join(',');
  }

  private sanitizeCSVValue(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // Helper methods for PDF generation
  private addSalesDataToPDF(doc: jsPDF, data: SalesReportData, yPosition: number): number {
    // Summary
    doc.setFontSize(14);
    doc.text('Sales Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Total Sales: ${data.totalSales}`, 20, yPosition);
    doc.text(`Total Revenue: $${data.totalRevenue.toFixed(2)}`, 20, yPosition + 10);
    doc.text(`Average Order Value: $${data.averageOrderValue.toFixed(2)}`, 20, yPosition + 20);
    yPosition += 40;

    // Top Products Table
    if (data.topProducts.length > 0) {
      doc.setFontSize(12);
      doc.text('Top Products', 20, yPosition);
      yPosition += 10;

      autoTable(doc, {
        startY: yPosition,
        head: [['Product', 'Quantity Sold', 'Revenue']],
        body: data.topProducts.map(product => [
          product.name,
          product.quantity.toString(),
          `$${product.revenue.toFixed(2)}`
        ])
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    return yPosition;
  }

  private addInventoryDataToPDF(doc: jsPDF, data: InventoryReportData, yPosition: number): number {
    // Summary
    doc.setFontSize(14);
    doc.text('Inventory Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Total Products: ${data.totalProducts}`, 20, yPosition);
    doc.text(`Inventory Value: $${data.inventoryValue.toFixed(2)}`, 20, yPosition + 10);
    doc.text(`Low Stock Items: ${data.lowStockProducts.length}`, 20, yPosition + 20);
    yPosition += 40;

    // Low Stock Table
    if (data.lowStockProducts.length > 0) {
      doc.setFontSize(12);
      doc.text('Low Stock Products', 20, yPosition);
      yPosition += 10;

      autoTable(doc, {
        startY: yPosition,
        head: [['Product', 'Current Stock', 'Min Stock', 'Value']],
        body: data.lowStockProducts.slice(0, 10).map(product => [
          product.name,
          product.currentStock.toString(),
          product.minStock.toString(),
          `$${product.value.toFixed(2)}`
        ])
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    return yPosition;
  }

  private addCustomerDataToPDF(doc: jsPDF, data: CustomerReportData, yPosition: number): number {
    // Summary
    doc.setFontSize(14);
    doc.text('Customer Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Total Customers: ${data.totalCustomers}`, 20, yPosition);
    doc.text(`New Customers: ${data.newCustomers}`, 20, yPosition + 10);
    doc.text(`Churn Rate: ${data.customerRetention.churnRate}%`, 20, yPosition + 20);
    yPosition += 40;

    // Top Customers Table
    if (data.topCustomers.length > 0) {
      doc.setFontSize(12);
      doc.text('Top Customers', 20, yPosition);
      yPosition += 10;

      autoTable(doc, {
        startY: yPosition,
        head: [['Customer', 'Purchases', 'Total Spent', 'Last Purchase']],
        body: data.topCustomers.slice(0, 10).map(customer => [
          customer.name,
          customer.totalPurchases.toString(),
          `$${customer.totalSpent.toFixed(2)}`,
          customer.lastPurchase
        ])
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    return yPosition;
  }

  private addFinancialDataToPDF(doc: jsPDF, data: FinancialReportData, yPosition: number): number {
    // Summary
    doc.setFontSize(14);
    doc.text('Financial Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Total Revenue: $${data.totalRevenue.toFixed(2)}`, 20, yPosition);
    doc.text(`Total Costs: $${data.totalCosts.toFixed(2)}`, 20, yPosition + 10);
    doc.text(`Gross Profit: $${data.grossProfit.toFixed(2)}`, 20, yPosition + 20);
    doc.text(`Profit Margin: ${data.profitMargin}%`, 20, yPosition + 30);
    yPosition += 50;

    return yPosition;
  }

  // Helper methods for Excel generation
  private addSalesDataToExcel(workbook: XLSX.WorkBook, data: SalesReportData): void {
    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Sales', data.summary?.totalSales ?? data.totalSales],
      ['Total Orders', data.summary?.totalOrders ?? data.totalSales],
      ['Total Revenue', data.totalRevenue],
      ['Total Profit', data.summary?.totalProfit ?? 'N/A'],
      ['Profit Margin', data.summary ? `${data.summary.profitMargin}%` : 'N/A'],
      ['Average Order Value', data.summary?.averageOrderValue ?? data.averageOrderValue]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Top Products sheet
    if (data.topProducts.length > 0) {
      const productsData = [
        ['Product ID', 'Product Name', 'Quantity Sold', 'Revenue', 'Profit'],
        ...data.topProducts.map(product => [product.id, product.name, product.quantity, product.revenue, product.profit ?? ''])
      ];
      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');
    }

    // Sales by Date sheet
    if (data.salesByDate.length > 0) {
      const dateData = [
        ['Date', 'Sales Count', 'Revenue', 'Profit'],
        ...data.salesByDate.map(item => [item.date, item.sales, item.revenue, item.profit ?? ''])
      ];
      const dateSheet = XLSX.utils.aoa_to_sheet(dateData);
      XLSX.utils.book_append_sheet(workbook, dateSheet, 'Sales by Date');
    }
  }

  private addInventoryDataToExcel(workbook: XLSX.WorkBook, data: InventoryReportData): void {
    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Products', data.totalProducts],
      ['Inventory Value', data.inventoryValue],
      ['Low Stock Items', data.lowStockProducts.length]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Low Stock sheet
    if (data.lowStockProducts.length > 0) {
      const lowStockData = [
        ['Product ID', 'Product Name', 'Current Stock', 'Min Stock', 'Value'],
        ...data.lowStockProducts.map(product => [
          product.id, product.name, product.currentStock, product.minStock, product.value
        ])
      ];
      const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
      XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock');
    }
  }

  private addCustomerDataToExcel(workbook: XLSX.WorkBook, data: CustomerReportData): void {
    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Customers', data.totalCustomers],
      ['New Customers', data.newCustomers],
      ['Returning Customers', data.customerRetention.returning],
      ['Churn Rate', `${data.customerRetention.churnRate}%`]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Top Customers sheet
    if (data.topCustomers.length > 0) {
      const customersData = [
        ['Customer ID', 'Name', 'Email', 'Total Purchases', 'Total Spent', 'Last Purchase'],
        ...data.topCustomers.map(customer => [
          customer.id, customer.name, customer.email,
          customer.totalPurchases, customer.totalSpent, customer.lastPurchase
        ])
      ];
      const customersSheet = XLSX.utils.aoa_to_sheet(customersData);
      XLSX.utils.book_append_sheet(workbook, customersSheet, 'Top Customers');
    }
  }

  private addFinancialDataToExcel(workbook: XLSX.WorkBook, data: FinancialReportData): void {
    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Revenue', data.totalRevenue],
      ['Total Costs', data.totalCosts],
      ['Gross Profit', data.grossProfit],
      ['Net Profit', data.netProfit],
      ['Profit Margin', `${data.profitMargin}%`]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Monthly Revenue sheet
    if (data.revenueByMonth.length > 0) {
      const monthlyData = [
        ['Month', 'Revenue', 'Costs', 'Profit'],
        ...data.revenueByMonth.map(item => [item.month, item.revenue, item.costs, item.profit])
      ];
      const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Revenue');
    }
  }
}

export const reportsService = new ReportsService();