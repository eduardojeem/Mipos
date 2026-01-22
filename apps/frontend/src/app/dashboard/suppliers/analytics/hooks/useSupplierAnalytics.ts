import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Supplier } from '@/types/suppliers';

export interface AnalyticsMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  totalSpent: number;
  averageOrderValue: number;
  topPerformers: SupplierWithMetrics[];
  categoryDistribution: CategoryData[];
  monthlyTrends: MonthlyTrend[];
  performanceMetrics: PerformanceMetrics;
  recentActivity: RecentActivity[];
}

export interface SupplierWithMetrics extends Supplier {
  performanceScore: number;
  reliability: number;
  monthlyData: MonthlyData[];
  totalPurchases: number;
  totalOrders: number;
  averageOrderValue: number;
  lastPurchaseDate: string;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  purchases: number;
  orders: number;
  suppliers: number;
  averageOrderValue: number;
}

export interface PerformanceMetrics {
  excellent: number; // 90-100
  good: number;      // 70-89
  average: number;   // 50-69
  poor: number;      // 0-49
}

export interface MonthlyData {
  month: string;
  purchases: number;
  orders: number;
}

export interface RecentActivity {
  id: string;
  type: 'new_supplier' | 'large_order' | 'performance_change' | 'contract_renewal';
  supplierId: string;
  supplierName: string;
  description: string;
  amount?: number;
  timestamp: string;
  severity: 'info' | 'warning' | 'success' | 'error';
}

interface UseSupplierAnalyticsOptions {
  timeRange?: '3months' | '6months' | '12months' | '24months';
  category?: string;
  refreshInterval?: number;
}

export function useSupplierAnalytics(options: UseSupplierAnalyticsOptions = {}) {
  const {
    timeRange = '12months',
    category = 'all',
    refreshInterval = 5 * 60 * 1000, // 5 minutes
  } = options;

  const [data, setData] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);


  const supabase = createClient();

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    const months = {
      '3months': 3,
      '6months': 6,
      '12months': 12,
      '24months': 24,
    }[timeRange];

    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
    return { startDate, endDate: now };
  }, [timeRange]);

  // Fetch analytics data with retry logic
  const fetchAnalytics = useCallback(async (attempt = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch suppliers with purchase data
      let suppliersQuery = supabase
        .from('suppliers')
        .select(`
          *,
          purchases:purchases(
            id,
            total_amount,
            created_at,
            status
          )
        `)
        .eq('is_active', true);

      if (category !== 'all') {
        suppliersQuery = suppliersQuery.eq('category', category);
      }

      const { data: suppliersData, error: suppliersError } = await suppliersQuery;

      if (suppliersError) {
        throw new Error(`Error fetching suppliers: ${suppliersError.message}`);
      }

      // Process suppliers data
      const processedSuppliers: SupplierWithMetrics[] = (suppliersData || []).map((supplier: any) => {
        const purchases = supplier.purchases || [];
        const recentPurchases = purchases.filter((p: any) => 
          new Date(p.created_at) >= dateRange.startDate
        );

        const totalPurchases = recentPurchases.reduce((sum: number, p: any) => 
          sum + (p.total_amount || 0), 0
        );
        const totalOrders = recentPurchases.length;
        const averageOrderValue = totalOrders > 0 ? totalPurchases / totalOrders : 0;

        // Calculate performance score (simplified)
        const performanceScore = Math.min(100, Math.max(0, 
          (totalOrders * 10) + 
          (averageOrderValue / 1000) + 
          (supplier.rating || 0) * 10
        ));

        // Generate monthly data
        const monthlyData: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
          
          const monthPurchases = recentPurchases.filter((p: any) => {
            const purchaseDate = new Date(p.created_at);
            return purchaseDate.getMonth() === date.getMonth() && 
                   purchaseDate.getFullYear() === date.getFullYear();
          });

          monthlyData.push({
            month: monthName,
            purchases: monthPurchases.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
            orders: monthPurchases.length,
          });
        }

        return {
          ...supplier,
          performanceScore: Math.round(performanceScore),
          reliability: Math.min(100, performanceScore + Math.random() * 10),
          monthlyData,
          totalPurchases,
          totalOrders,
          averageOrderValue,
          lastPurchaseDate: recentPurchases.length > 0 
            ? recentPurchases[recentPurchases.length - 1].created_at 
            : supplier.created_at,
        };
      });

      // Calculate metrics
      const totalSuppliers = processedSuppliers.length;
      const activeSuppliers = processedSuppliers.filter(s => s.totalOrders > 0).length;
      const totalSpent = processedSuppliers.reduce((sum, s) => sum + s.totalPurchases, 0);
      const totalOrdersCount = processedSuppliers.reduce((sum, s) => sum + s.totalOrders, 0);
      const averageOrderValue = totalOrdersCount > 0 ? totalSpent / totalOrdersCount : 0;

      // Top performers
      const topPerformers = processedSuppliers
        .sort((a, b) => b.performanceScore - a.performanceScore)
        .slice(0, 10);

      // Category distribution
      const categoryMap = new Map<string, number>();
      processedSuppliers.forEach(supplier => {
        const cat = supplier.category || 'Sin categoría';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });

      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];
      const categoryDistribution: CategoryData[] = Array.from(categoryMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
        percentage: (value / totalSuppliers) * 100,
      }));

      // Monthly trends
      const monthlyTrends: MonthlyTrend[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
        
        const monthData = processedSuppliers.reduce((acc, supplier) => {
          const monthSupplierData = supplier.monthlyData.find(m => m.month === monthName);
          if (monthSupplierData) {
            acc.purchases += monthSupplierData.purchases;
            acc.orders += monthSupplierData.orders;
            if (monthSupplierData.orders > 0) acc.suppliers += 1;
          }
          return acc;
        }, { purchases: 0, orders: 0, suppliers: 0 });

        monthlyTrends.push({
          month: monthName,
          purchases: monthData.purchases,
          orders: monthData.orders,
          suppliers: monthData.suppliers,
          averageOrderValue: monthData.orders > 0 ? monthData.purchases / monthData.orders : 0,
        });
      }

      // Performance metrics
      const performanceMetrics: PerformanceMetrics = {
        excellent: processedSuppliers.filter(s => s.performanceScore >= 90).length,
        good: processedSuppliers.filter(s => s.performanceScore >= 70 && s.performanceScore < 90).length,
        average: processedSuppliers.filter(s => s.performanceScore >= 50 && s.performanceScore < 70).length,
        poor: processedSuppliers.filter(s => s.performanceScore < 50).length,
      };

      // Recent activity (mock for now)
      const recentActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'new_supplier',
          supplierId: 'new-1',
          supplierName: 'Nuevo Proveedor XYZ',
          description: 'Nuevo proveedor registrado en el sistema',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          severity: 'success',
        },
        {
          id: '2',
          type: 'large_order',
          supplierId: topPerformers[0]?.id || 'top-1',
          supplierName: topPerformers[0]?.name || 'Proveedor Principal',
          description: 'Orden grande procesada exitosamente',
          amount: 50000,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          severity: 'info',
        },
      ];

      const analytics: AnalyticsMetrics = {
        totalSuppliers,
        activeSuppliers,
        totalSpent,
        averageOrderValue,
        topPerformers,
        categoryDistribution,
        monthlyTrends,
        performanceMetrics,
        recentActivity,
      };

      setData(analytics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Error fetching analytics (attempt ${attempt + 1}):`, err);
      
      // Retry logic with exponential backoff
      if (attempt < 3) {
        const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        setTimeout(() => {
          fetchAnalytics(attempt + 1);
        }, delay);
      } else {
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar analytics');
        setLoading(false);
      }
    } finally {
      if (attempt === 0) {
        setLoading(false);
      }
    }
  }, [dateRange.startDate, dateRange.endDate, category]);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchAnalytics();

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, category, refreshInterval]);

  // Refresh function
  const refresh = () => {
    fetchAnalytics();
  };

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}