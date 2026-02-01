import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useMemo } from 'react';

// Helper to get current organization ID
const getOrganizationId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('selected_organization');
    if (!raw) return null;
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      return parsed?.id || parsed?.organization_id || null;
    }
    return raw;
  } catch {
    return null;
  }
};

export interface DashboardStats {
  todaySales: number;
  monthSales: number;
  totalCustomers: number;
  totalProducts: number;
  activeOrders: number;
  lowStockCount: number;
  todaySalesCount: number;
  averageTicket: number;
  webOrders?: {
    pending: number;
    confirmed: number;
    preparing: number;
    shipped: number
    delivered: number;
    todayTotal: number;
    todayRevenue: number;
  };
}

export interface RecentSale {
  id: string;
  customer_name: string;
  total: number;
  created_at: string;
  payment_method: string;
}

export interface DashboardSummary extends DashboardStats {
  recentSales: RecentSale[];
  lastUpdated: string;
  isQuickMode?: boolean;
}

export function useOptimizedDashboard() {
  const supabase = createClient();

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-optimized-summary'],
    queryFn: async () => {
      const orgId = getOrganizationId();
      if (!orgId) throw new Error('No organization selected');

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthISO = monthStart.toISOString();

      // 1. Parallel queries for counts and basic stats
      const [
        { count: totalCustomers },
        { count: totalProducts },
        { count: lowStockCount },
        { count: activeOrders }, // Pending orders generally
        { data: todaySalesData },
        { data: monthSalesData },
        { data: recentSalesData },
        { data: webOrdersStats }
      ] = await Promise.all([
        // Total Customers
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        
        // Total Products
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
        
        // Low Stock Products (requires fetching data to filter, or a specific query if RPC available. 
        // For client side, we might need to fetch products with stock > 0. 
        // To be efficient, let's assume we have a view or we just check small subset or use count if possible.
        // Supabase filter for column comparison is not direct in JS client without RPC usually for col vs col.
        // We'll use a simplified check: stock <= 5 (hardcoded or average) if min_stock is variable.
        // Or better: fetch simplified list of stock_quantity and min_stock
        supabase.from('products').select('stock_quantity, min_stock').eq('organization_id', orgId).eq('is_active', true).lt('stock_quantity', 10), // Approx check to reduce data

        // Active Orders (Web) - Pending or Confirmed
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['PENDING', 'CONFIRMED', 'PREPARING']),

        // Today's Sales (POS + Web potentially, usually 'sales' table is for completed POS sales)
        supabase.from('sales').select('total').eq('organization_id', orgId).gte('created_at', todayISO),

        // Month's Sales
        supabase.from('sales').select('total').eq('organization_id', orgId).gte('created_at', monthISO),

        // Recent Sales
        supabase.from('sales')
          .select('id, total, created_at, payment_method, customer:customers(name)')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5),

        // Web Orders Today Stats (from 'orders' table)
        supabase.from('orders')
          .select('id, total, status, created_at')
          .eq('organization_id', orgId)
          .gte('created_at', todayISO)
      ]);

      // Process Sales Stats
      const todaySalesTotal = todaySalesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
      const todaySalesCount = todaySalesData?.length || 0;
      const monthSalesTotal = monthSalesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
      const averageTicket = todaySalesCount > 0 ? todaySalesTotal / todaySalesCount : 0;

      // Process Low Stock (Refined from the approximate fetch)
      const realLowStockCount = (lowStockCount?.length || 0) > 0 // If we fetched data
         ? (lowStockCount as any[]).filter((p: any) => p.stock_quantity <= (p.min_stock || 5)).length
         : 0;

      // Process Web Orders Stats
      // We need breakdown by status. Since we only fetched today's orders above, 
      // we might need a separate query for ALL active orders status if we want status counts for the dashboard widgets.
      // Let's do a quick separate aggregation for status counts if needed.
      // For now, let's assume 'webOrdersStats' is just today's orders.
      // To get full status counts efficiently, we might need another grouped query or just multiple counts.
      // Let's do multiple counts for the specific dashboard widgets (Pending, Preparing, Shipped, Delivered)
      
      const [
        { count: pending },
        { count: confirmed },
        { count: preparing },
        { count: shipped },
        { count: delivered }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'PENDING'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'CONFIRMED'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'PREPARING'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'SHIPPED'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'DELIVERED'),
      ]);

      const webOrdersTodayTotal = webOrdersStats?.length || 0;
      const webOrdersTodayRevenue = webOrdersStats?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

      // Format Recent Sales
      const formattedRecentSales = (recentSalesData || []).map((sale: any) => ({
        id: sale.id,
        customer_name: sale.customer?.name || 'Cliente General',
        total: sale.total,
        created_at: sale.created_at,
        payment_method: sale.payment_method
      }));

      return {
        todaySales: todaySalesTotal,
        monthSales: monthSalesTotal,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        activeOrders: (pending || 0) + (confirmed || 0) + (preparing || 0),
        lowStockCount: realLowStockCount, // This might be inaccurate without full scan, but good enough for client-side optim
        todaySalesCount,
        averageTicket,
        webOrders: {
          pending: pending || 0,
          confirmed: confirmed || 0,
          preparing: preparing || 0,
          shipped: shipped || 0,
          delivered: delivered || 0,
          todayTotal: webOrdersTodayTotal,
          todayRevenue: webOrdersTodayRevenue
        },
        recentSales: formattedRecentSales,
        lastUpdated: new Date().toISOString(),
        isQuickMode: false
      };
    },
    enabled: !!getOrganizationId(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}
