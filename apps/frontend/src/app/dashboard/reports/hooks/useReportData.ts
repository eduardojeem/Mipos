'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  category?: string;
  status?: string;
  customerId?: string;
  productId?: string;
  branchId?: string;
  posId?: string;
  paymentMethod?: string;
}

export interface SalesData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    quantity: number;
  }>;
  salesByDate: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  salesByCategory: Array<{
    category: string;
    sales: number;
    percentage: number;
  }>;
  trends?: {
    salesPct: number;
    ordersPct: number;
    aovPct: number;
  };
  previousPeriod?: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
}

export interface InventoryData {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  stockLevels: Array<{
    id: string;
    name: string;
    stock: number;
    status: 'low' | 'normal' | 'high';
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    value: number;
  }>;
}

export interface CustomerData {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  customerLifetimeValue: number;
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    orders: number;
  }>;
  customerSegments: Array<{
    segment: string;
    count: number;
    percentage: number;
  }>;
  trends?: {
    newCustomersPct: number;
  };
  previousPeriod?: {
    newCustomers: number;
  };
}

export interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  expenseBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  trends?: {
    revenuePct: number;
    expensesPct: number;
    profitPct: number;
    marginPct: number;
  };
  previousPeriod?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
}

interface UseReportDataOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useSalesReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = filters.startDate.toISOString().split('T')[0];
      const endDate = filters.endDate.toISOString().split('T')[0];

      // Obtener ventas totales
      let salesQuery = supabase
        .from('sales')
        .select('id,total_amount,total,status,created_at,customer_id,branch_id,pos_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (filters.status) {
        salesQuery = salesQuery.eq('status', filters.status);
      }

      if (filters.customerId) {
        salesQuery = salesQuery.eq('customer_id', filters.customerId);
      }
      // Aplicar filtros branch/pos si existen las columnas
      try {
        if (filters.branchId) {
          salesQuery = salesQuery.eq('branch_id', filters.branchId);
        }
        if (filters.posId) {
          salesQuery = salesQuery.eq('pos_id', filters.posId);
        }
        if (filters.paymentMethod) {
          salesQuery = salesQuery.eq('payment_method', filters.paymentMethod);
        }
      } catch { }

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) throw salesError;

      // Si no hay ventas, devolver estructura vacía
      if (!salesData || salesData.length === 0) {
        setData({
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          topProducts: [],
          salesByDate: [],
          salesByCategory: [],
          trends: { salesPct: 0, ordersPct: 0, aovPct: 0 }
        });
        return;
      }

      // Procesar datos de ventas
      const totalSales = salesData?.reduce((sum: number, sale: any) => {
        const t = (sale.total_amount ?? sale.total ?? 0) as number;
        return sum + t;
      }, 0) || 0;
      const totalOrders = salesData?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Cargar items de venta y productos asociados de forma secuencial
      const saleIds = salesData.map((s: any) => s.id).filter(Boolean);
      let saleItems: Array<{ sale_id: string; product_id: string; quantity: number; unit_price?: number; total_price?: number }> = [];
      if (saleIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select('sale_id,product_id,quantity,unit_price,total_price')
          .in('sale_id', saleIds);
        if (itemsError) throw itemsError;
        saleItems = (itemsData || []) as any[];
      }

      const productIds = Array.from(new Set(saleItems.map(i => i.product_id).filter(Boolean)));
      const productsMap = new Map<string, { id: string; name: string; category_id?: string }>();
      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id,name,category_id')
          .in('id', productIds);
        if (productsError) throw productsError;
        (productsData || []).forEach((p: any) => {
          productsMap.set(p.id, { id: p.id, name: p.name, category_id: p.category_id });
        });
      }

      // Top productos
      const productSales = new Map<string, { name: string; sales: number; quantity: number }>();
      saleItems.forEach((item: any) => {
        const productId = item.product_id || 'unknown';
        const product = productsMap.get(productId);
        const productName = product?.name || 'Desconocido';
        const qty = Number(item.quantity ?? 0);
        const price = Number(item.unit_price ?? (item as any).price ?? 0);
        const totalPrice = Number(item.total_price ?? price * qty);
        const existing = productSales.get(productId) || { name: productName, sales: 0, quantity: 0 };
        existing.sales += totalPrice;
        existing.quantity += qty;
        productSales.set(productId, existing);
      });

      const topProducts = Array.from(productSales.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);

      // Ventas por fecha
      const salesByDateMap = new Map<string, { sales: number; orders: number }>();
      salesData?.forEach((sale: any) => {
        const date = new Date(sale.created_at as string).toISOString().split('T')[0];
        const existing = salesByDateMap.get(date) || { sales: 0, orders: 0 };
        const t = (sale.total_amount ?? sale.total ?? 0) as number;
        existing.sales += t;
        existing.orders += 1;
        salesByDateMap.set(date, existing);
      });

      const salesByDate = Array.from(salesByDateMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Ventas por categoría
      const categorySales = new Map<string, number>();
      saleItems.forEach((item: any) => {
        const product = productsMap.get(item.product_id || '');
        const category = product?.category_id || 'Sin categoría';
        const qty = Number(item.quantity ?? 0);
        const price = Number(item.unit_price ?? (item as any).price ?? 0);
        const amount = Number(item.total_price ?? price * qty);
        categorySales.set(category, (categorySales.get(category) || 0) + amount);
      });

      const salesByCategory = Array.from(categorySales.entries())
        .map(([category, sales]) => ({
          category,
          sales,
          percentage: (sales / totalSales) * 100,
        }))
        .sort((a, b) => b.sales - a.sales);

      // Calcular período anterior para tendencias
      const periodDays = Math.max(1, Math.ceil((filters.endDate.getTime() - filters.startDate.getTime()) / (24 * 60 * 60 * 1000)));
      const prevEnd = new Date(filters.startDate.getTime());
      const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
      let prevQuery = supabase
        .from('sales')
        .select('id,total_amount,total,status,created_at')
        .gte('created_at', prevStart.toISOString().split('T')[0])
        .lte('created_at', prevEnd.toISOString().split('T')[0]);
      if (filters.status) prevQuery = prevQuery.eq('status', filters.status);
      try {
        if (filters.branchId) prevQuery = prevQuery.eq('branch_id', filters.branchId);
        if (filters.posId) prevQuery = prevQuery.eq('pos_id', filters.posId);
        if (filters.paymentMethod) prevQuery = prevQuery.eq('payment_method', filters.paymentMethod);
      } catch { }
      const { data: prevData } = await prevQuery;
      const prevTotalSales = prevData?.reduce((sum: number, s: any) => sum + (s.total_amount ?? s.total ?? 0), 0) || 0;
      const prevTotalOrders = prevData?.length || 0;
      const prevAOV = prevTotalOrders > 0 ? prevTotalSales / prevTotalOrders : 0;
      const pct = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);
      const trends = {
        salesPct: pct(totalSales, prevTotalSales),
        ordersPct: pct(totalOrders, prevTotalOrders),
        aovPct: pct(averageOrderValue, prevAOV),
      };

      setData({
        totalSales,
        totalOrders,
        averageOrderValue,
        topProducts,
        salesByDate,
        salesByCategory,
        trends,
        previousPeriod: {
          totalSales: prevTotalSales,
          totalOrders: prevTotalOrders,
          averageOrderValue: prevAOV
        }
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error al cargar datos de ventas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, enabled, supabase, toast]);

  useEffect(() => {
    fetchData();

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

export function useInventoryReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      let productsQuery = supabase.from('products').select('id,name,stock_quantity,min_stock,sale_price,category_id,branch_id');

      if (filters.category) {
        productsQuery = productsQuery.eq('category_id', filters.category);
      }

      if (filters.productId) {
        productsQuery = productsQuery.eq('id', filters.productId);
      }
      try {
        if (filters.branchId) productsQuery = productsQuery.eq('branch_id', filters.branchId);
      } catch { }

      const { data: productsData, error: productsError } = await productsQuery;

      if (productsError) throw productsError;

      const totalProducts = productsData?.length || 0;
      const lowStockItems = productsData?.filter((p: any) => {
        const stock = Number(p.stock_quantity ?? p.stock ?? 0);
        const min = Number(p.min_stock ?? 10);
        return stock > 0 && stock <= min;
      }).length || 0;
      const outOfStockItems = productsData?.filter((p: any) => {
        const stock = Number(p.stock_quantity ?? p.stock ?? 0);
        return stock === 0;
      }).length || 0;
      const totalValue = productsData?.reduce((sum: number, p: any) => {
        const price = Number(p.sale_price ?? p.price ?? 0);
        const stock = Number(p.stock_quantity ?? p.stock ?? 0);
        return sum + price * stock;
      }, 0) || 0;

      const stockLevels = productsData?.map((p: any) => {
        const stock = Number(p.stock_quantity ?? p.stock ?? 0);
        const min = Number(p.min_stock ?? 10);
        const status = stock === 0 ? 'low' : stock <= min ? 'low' : 'normal';
        return { id: p.id, name: p.name, stock, status };
      }) || [];

      const categoryBreakdown = new Map<string, { count: number; value: number }>();
      productsData?.forEach((p: any) => {
        const category = p.category_id || 'Sin categoría';
        const price = Number(p.sale_price ?? p.price ?? 0);
        const stock = Number(p.stock_quantity ?? p.stock ?? 0);
        const existing = categoryBreakdown.get(category) || { count: 0, value: 0 };
        existing.count += 1;
        existing.value += price * stock;
        categoryBreakdown.set(category, existing);
      });

      const categoryBreakdownArray = Array.from(categoryBreakdown.entries()).map(([category, data]) => ({
        category,
        ...data,
      }));

      setData({
        totalProducts,
        lowStockItems,
        outOfStockItems,
        totalValue,
        stockLevels,
        categoryBreakdown: categoryBreakdownArray,
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error al cargar datos de inventario',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, enabled, supabase, toast]);

  useEffect(() => {
    fetchData();

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

export function useCustomerReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = filters.startDate.toISOString().split('T')[0];
      const endDate = filters.endDate.toISOString().split('T')[0];

      let customersQuery = supabase.from('customers').select('*, sales(total, created_at, branch_id, pos_id)');

      if (filters.customerId) {
        customersQuery = customersQuery.eq('id', filters.customerId);
      }

      const { data: customersData, error: customersError } = await customersQuery;

      if (customersError) throw customersError;

      const totalCustomers = customersData?.length || 0;
      const newCustomers =
        customersData?.filter((c: any) => {
          const createdAt = new Date(c.created_at as string);
          return createdAt >= filters.startDate && createdAt <= filters.endDate;
        }).length || 0;

      const activeCustomers =
        customersData?.filter((c: any) => {
          return c.sales?.some((s: any) => {
            const saleDate = new Date(s.created_at);
            const inDate = saleDate >= filters.startDate && saleDate <= filters.endDate;
            const inBranch = filters.branchId ? s.branch_id === filters.branchId : true;
            const inPos = filters.posId ? s.pos_id === filters.posId : true;
            return inDate && inBranch && inPos;
          });
        }).length || 0;

      const topCustomers =
        customersData
          ?.map((c: any) => {
            const relevantSales = (c.sales || []).filter((s: any) => {
              const saleDate = new Date(s.created_at);
              const inDate = saleDate >= filters.startDate && saleDate <= filters.endDate;
              const inBranch = filters.branchId ? s.branch_id === filters.branchId : true;
              const inPos = filters.posId ? s.pos_id === filters.posId : true;
              return inDate && inBranch && inPos;
            });
            const totalSpent = relevantSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0) || 0;
            const orders = relevantSales.length || 0;
            return {
              id: c.id,
              name: c.name || 'Sin nombre',
              totalSpent,
              orders,
            };
          })
          .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
          .slice(0, 10) || [];

      const customerLifetimeValue = totalCustomers > 0 ? topCustomers.reduce((sum: number, c: any) => sum + c.totalSpent, 0) / totalCustomers : 0;

      // Segmentos de clientes (ejemplo simple)
      const customerSegments = [
        { segment: 'VIP', count: topCustomers.filter((c: any) => c.totalSpent > 10000).length, percentage: 0 },
        { segment: 'Regular', count: topCustomers.filter((c: any) => c.totalSpent > 1000 && c.totalSpent <= 10000).length, percentage: 0 },
        { segment: 'Nuevo', count: newCustomers, percentage: 0 },
      ].map((s: any) => ({
        ...s,
        percentage: (s.count / totalCustomers) * 100,
      }));

      // Calcular tendencias
      const periodDays = Math.max(1, Math.ceil((filters.endDate.getTime() - filters.startDate.getTime()) / (24 * 60 * 60 * 1000)));
      const prevEnd = new Date(filters.startDate.getTime());
      const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

      const prevNewCustomers = customersData?.filter((c: any) => {
        const createdAt = new Date(c.created_at as string);
        return createdAt >= prevStart && createdAt <= prevEnd;
      }).length || 0;

      const newCustomersPct = prevNewCustomers > 0
        ? ((newCustomers - prevNewCustomers) / prevNewCustomers) * 100
        : (newCustomers > 0 ? 100 : 0);

      setData({
        totalCustomers,
        newCustomers,
        activeCustomers,
        customerLifetimeValue,
        topCustomers,
        customerSegments,
        trends: {
          newCustomersPct,
        },
        previousPeriod: {
          newCustomers: prevNewCustomers,
        },
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error al cargar datos de clientes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, enabled, supabase, toast]);

  useEffect(() => {
    fetchData();

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

export function useFinancialReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = filters.startDate.toISOString().split('T')[0];
      const endDate = filters.endDate.toISOString().split('T')[0];

      // Obtener ventas (ingresos)
      let salesQ = supabase
        .from('sales')
        .select('id,total_amount,total,created_at,status,branch_id,pos_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['COMPLETED', 'completed']);
      try {
        if (filters.branchId) salesQ = salesQ.eq('branch_id', filters.branchId);
        if (filters.posId) salesQ = salesQ.eq('pos_id', filters.posId);
      } catch { }
      const { data: salesData, error: salesError } = await salesQ;

      if (salesError) throw salesError;

      const totalRevenue = salesData?.reduce((sum: number, sale: any) => {
        const t = (sale.total_amount ?? sale.total ?? 0) as number;
        return sum + t;
      }, 0) || 0;

      // Obtener gastos (si existe tabla de expenses)
      let expQ = supabase
        .from('expenses')
        .select('amount, category, created_at, branch_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      try {
        if (filters.branchId) expQ = expQ.eq('branch_id', filters.branchId);
      } catch { }
      const { data: expensesData } = await expQ;

      const totalExpenses = expensesData?.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Ingresos por mes
      const revenueByMonthMap = new Map<string, { revenue: number; expenses: number }>();
      salesData?.forEach((sale: any) => {
        const month = new Date(sale.created_at as string).toISOString().slice(0, 7);
        const existing = revenueByMonthMap.get(month) || { revenue: 0, expenses: 0 };
        existing.revenue += (sale.total_amount ?? sale.total ?? 0) as number;
        revenueByMonthMap.set(month, existing);
      });

      expensesData?.forEach((expense: any) => {
        const month = new Date(expense.created_at as string).toISOString().slice(0, 7);
        const existing = revenueByMonthMap.get(month) || { revenue: 0, expenses: 0 };
        existing.expenses += Number(expense.amount ?? 0);
        revenueByMonthMap.set(month, existing);
      });

      const revenueByMonth = Array.from(revenueByMonthMap.entries())
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Desglose de gastos por categoría
      const expensesByCategory = new Map<string, number>();
      expensesData?.forEach((expense: any) => {
        const category = expense.category || 'Sin categoría';
        expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + Number(expense.amount ?? 0));
      });

      const expenseBreakdown = Array.from(expensesByCategory.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / totalExpenses) * 100,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Comparación con período anterior
      const periodDays = Math.max(1, Math.ceil((filters.endDate.getTime() - filters.startDate.getTime()) / (24 * 60 * 60 * 1000)));
      const prevEnd = new Date(filters.startDate.getTime());
      const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
      let prevSalesQ = supabase
        .from('sales')
        .select('id,total_amount,total,created_at,status,branch_id,pos_id')
        .gte('created_at', prevStart.toISOString().split('T')[0])
        .lte('created_at', prevEnd.toISOString().split('T')[0])
        .in('status', ['COMPLETED', 'completed']);
      try {
        if (filters.branchId) prevSalesQ = prevSalesQ.eq('branch_id', filters.branchId);
        if (filters.posId) prevSalesQ = prevSalesQ.eq('pos_id', filters.posId);
      } catch { }
      const { data: prevSales } = await prevSalesQ;
      let prevExpQ = supabase
        .from('expenses')
        .select('amount, category, created_at, branch_id')
        .gte('created_at', prevStart.toISOString().split('T')[0])
        .lte('created_at', prevEnd.toISOString().split('T')[0]);
      try {
        if (filters.branchId) prevExpQ = prevExpQ.eq('branch_id', filters.branchId);
      } catch { }
      const { data: prevExpenses } = await prevExpQ;
      const prevRevenue = prevSales?.reduce((sum: number, s: any) => sum + (s.total_amount ?? s.total ?? 0), 0) || 0;
      const prevExpensesTotal = prevExpenses?.reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0) || 0;
      const prevProfit = prevRevenue - prevExpensesTotal;
      const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;
      const pct = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);
      const trends = {
        revenuePct: pct(totalRevenue, prevRevenue),
        expensesPct: pct(totalExpenses, prevExpensesTotal),
        profitPct: pct(netProfit, prevProfit),
        marginPct: pct(profitMargin, prevMargin),
      };

      setData({
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        revenueByMonth,
        expenseBreakdown,
        trends,
        previousPeriod: {
          totalRevenue: prevRevenue,
          totalExpenses: prevExpensesTotal,
          netProfit: prevProfit,
          profitMargin: prevMargin
        }
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error al cargar datos financieros',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, enabled, supabase, toast]);

  useEffect(() => {
    fetchData();

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
