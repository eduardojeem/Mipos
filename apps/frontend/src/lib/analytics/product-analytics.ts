/**
 * Product Analytics Calculations
 * Provides data transformations for analytics dashboard
 */

import type { Product, Category } from '@/types';

export interface SalesTrendData {
  date: string;
  sales: number;
  revenue: number;
}

export interface CategoryDistribution {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface StockLevel {
  status: 'critical' | 'low' | 'normal' | 'high';
  count: number;
  percentage: number;
  color: string;
}

export interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  sales: number;
  image?: string;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  profit: number;
  growth: number;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6'
};

/**
 * Calculate sales trend over time
 * @param products - Array of products
 * @returns Sales trend data for last 30 days
 */
export function calculateSalesTrend(products: Product[]): SalesTrendData[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Group products by creation date
  const salesByDate = new Map<string, { sales: number; revenue: number }>();
  
  // Initialize all dates with 0
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    salesByDate.set(dateStr, { sales: 0, revenue: 0 });
  }
  
  // Aggregate actual data
  products.forEach(product => {
    const createdAt = new Date(product.created_at || now);
    if (createdAt >= thirtyDaysAgo) {
      const dateStr = createdAt.toISOString().split('T')[0];
      const current = salesByDate.get(dateStr) || { sales: 0, revenue: 0 };
      
      salesByDate.set(dateStr, {
        sales: current.sales + 1,
        revenue: current.revenue + (product.sale_price || 0)
      });
    }
  });
  
  // Convert to array and sort by date
  return Array.from(salesByDate.entries())
    .map(([date, data]) => ({
      date,
      sales: data.sales,
      revenue: Math.round(data.revenue)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate category distribution
 * @param products - Array of products
 * @param categories - Array of categories
 * @returns Category distribution data
 */
export function calculateCategoryDistribution(
  products: Product[],
  categories: Category[]
): CategoryDistribution[] {
  const total = products.length;
  if (total === 0) return [];
  
  // Count products per category
  const categoryCounts = new Map<string, number>();
  
  products.forEach(product => {
    const categoryId = product.category_id;
    if (categoryId) {
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
    }
  });
  
  // Map to category names and calculate percentages
  const colorPalette = [
    COLORS.primary, COLORS.success, COLORS.warning, 
    COLORS.purple, COLORS.pink, COLORS.indigo, COLORS.teal
  ];
  
  return Array.from(categoryCounts.entries())
    .map(([categoryId, count], index) => {
      const category = categories.find(c => c.id === categoryId);
      return {
        name: category?.name || 'Sin categoría',
        value: count,
        percentage: Math.round((count / total) * 100),
        color: colorPalette[index % colorPalette.length]
      };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculate stock levels distribution
 * @param products - Array of products
 * @param thresholds - Stock thresholds
 * @returns Stock level distribution
 */
export function calculateStockLevels(
  products: Product[],
  thresholds = { critical: 5, low: 20, high: 100 }
): StockLevel[] {
  const total = products.length;
  if (total === 0) return [];
  
  const levels = {
    critical: 0,
    low: 0,
    normal: 0,
    high: 0
  };
  
  products.forEach(product => {
    const stock = product.stock_quantity || 0;
    
    if (stock === 0 || stock <= thresholds.critical) {
      levels.critical++;
    } else if (stock <= thresholds.low) {
      levels.low++;
    } else if (stock <= thresholds.high) {
      levels.normal++;
    } else {
      levels.high++;
    }
  });
  
  return [
    {
      status: 'critical' as const,
      count: levels.critical,
      percentage: Math.round((levels.critical / total) * 100),
      color: COLORS.danger
    },
    {
      status: 'low' as const,
      count: levels.low,
      percentage: Math.round((levels.low / total) * 100),
      color: COLORS.warning
    },
    {
      status: 'normal' as const,
      count: levels.normal,
      percentage: Math.round((levels.normal / total) * 100),
      color: COLORS.success
    },
    {
      status: 'high' as const,
      count: levels.high,
      percentage: Math.round((levels.high / total) * 100),
      color: COLORS.primary
    }
  ].filter(level => level.count > 0) as StockLevel[];
}

/**
 * Get top products by revenue
 * @param products - Array of products
 * @param limit - Number of top products to return
 * @returns Top products sorted by revenue
 */
export function getTopProducts(
  products: Product[],
  limit: number = 10
): TopProduct[] {
  return products
    .map(product => ({
      id: product.id,
      name: product.name,
      revenue: (product.sale_price || 0) * (product.stock_quantity || 0),
      sales: product.stock_quantity || 0,
      image: product.image_url
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Calculate monthly revenue for last 12 months
 * @param products - Array of products
 * @returns Monthly revenue data
 */
export function calculateMonthlyRevenue(products: Product[]): MonthlyRevenue[] {
  const now = new Date();
  const monthlyData = new Map<string, { revenue: number; profit: number }>();
  
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.set(monthKey, { revenue: 0, profit: 0 });
  }
  
  // Aggregate product data
  products.forEach(product => {
    const createdAt = new Date(product.created_at || now);
    const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthlyData.has(monthKey)) {
      const current = monthlyData.get(monthKey)!;
      const revenue = (product.sale_price || 0) * (product.stock_quantity || 0);
      const cost = (product.cost_price || 0) * (product.stock_quantity || 0);
      
      monthlyData.set(monthKey, {
        revenue: current.revenue + revenue,
        profit: current.profit + (revenue - cost)
      });
    }
  });
  
  // Convert to array and calculate growth
  const result: MonthlyRevenue[] = [];
  let previousRevenue = 0;
  
  Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([month, data]) => {
      const growth = previousRevenue > 0 
        ? Math.round(((data.revenue - previousRevenue) / previousRevenue) * 100)
        : 0;
      
      result.push({
        month,
        revenue: Math.round(data.revenue),
        profit: Math.round(data.profit),
        growth
      });
      
      previousRevenue = data.revenue;
    });
  
  return result;
}

/**
 * Calculate product performance metrics
 * @param products - Array of products
 * @returns Performance metrics
 */
export function calculateProductMetrics(products: Product[]) {
  const total = products.length;
  if (total === 0) {
    return {
      averagePrice: 0,
      averageStock: 0,
      totalValue: 0,
      profitMargin: 0
    };
  }
  
  const totals = products.reduce((acc, product) => {
    const price = product.sale_price || 0;
    const cost = product.cost_price || 0;
    const stock = product.stock_quantity || 0;
    
    return {
      price: acc.price + price,
      stock: acc.stock + stock,
      value: acc.value + (price * stock),
      cost: acc.cost + (cost * stock)
    };
  }, { price: 0, stock: 0, value: 0, cost: 0 });
  
  const profitMargin = totals.value > 0
    ? Math.round(((totals.value - totals.cost) / totals.value) * 100)
    : 0;
  
  return {
    averagePrice: Math.round(totals.price / total),
    averageStock: Math.round(totals.stock / total),
    totalValue: Math.round(totals.value),
    profitMargin
  };
}
