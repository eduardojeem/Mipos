import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { CACHE_CONFIG } from '@/config/sales.config';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export interface SalesSummary {
  todaySales: number;
  todayCount: number;
  weekSales: number;
  weekCount: number;
  monthSales: number;
  monthCount: number;
  avgTicket: number;
  topPaymentMethod: string;
  growthPercentage: number;
}

export interface RecentSale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  customer_name?: string;
  status: string;
}

export function useSalesSummary() {
  const supabase = createClient();
  const orgId = useCurrentOrganizationId();

  return useQuery({
    queryKey: ['sales-summary-optimized', orgId],
    queryFn: async (): Promise<SalesSummary> => {
      if (!orgId) return { todaySales: 0, todayCount: 0, weekSales: 0, weekCount: 0, monthSales: 0, monthCount: 0, avgTicket: 0, topPaymentMethod: 'N/A', growthPercentage: 0 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const weekStart = new Date();
      weekStart.setDate(today.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [
        { data: todayData },
        { data: weekData },
        { data: monthData }
      ] = await Promise.all([
        supabase.from('sales').select('total, payment_method').eq('organization_id', orgId).gte('created_at', todayISO),
        supabase.from('sales').select('total').eq('organization_id', orgId).gte('created_at', weekStart.toISOString()),
        supabase.from('sales').select('total').eq('organization_id', orgId).gte('created_at', monthStart.toISOString())
      ]);

      const calculateTotal = (data: any[]) => data?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;

      const todaySales = calculateTotal(todayData || []);
      const todayCount = todayData?.length || 0;

      const weekSales = calculateTotal(weekData || []);
      const weekCount = weekData?.length || 0;

      const monthSales = calculateTotal(monthData || []);
      const monthCount = monthData?.length || 0;

      const avgTicket = todayCount > 0 ? todaySales / todayCount : 0;

      // Top Payment Method (Simplified)
      const paymentMethods: Record<string, number> = {};
      todayData?.forEach((sale: any) => {
        const method = sale.payment_method || 'UNKNOWN';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });
      const topPaymentMethod = Object.entries(paymentMethods).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return {
        todaySales,
        todayCount,
        weekSales,
        weekCount,
        monthSales,
        monthCount,
        avgTicket,
        topPaymentMethod,
        growthPercentage: 0 // Requires historical comparison, skipping for speed
      };
    },
    enabled: !!orgId,
    staleTime: CACHE_CONFIG.SUMMARY_STALE_TIME,
    refetchInterval: CACHE_CONFIG.REFETCH_INTERVAL
  });
}

export function useRecentSales(limit = 10) {
  const supabase = createClient();
  const orgId = useCurrentOrganizationId();

  return useQuery({
    queryKey: ['recent-sales-optimized', orgId, limit],
    queryFn: async (): Promise<{ sales: RecentSale[]; total: number }> => {
      if (!orgId) return { sales: [], total: 0 };

      const { data, count, error } = await supabase
        .from('sales')
        .select(`
          id,
          total,
          payment_method,
          created_at,
          status,
          customer:customers(name)
        `, { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const sales = (data || []).map((sale: any) => ({
        id: sale.id,
        total_amount: sale.total,
        payment_method: sale.payment_method,
        created_at: sale.created_at,
        customer_name: sale.customer?.name || 'Cliente General',
        status: sale.status || 'COMPLETED'
      }));

      return {
        sales,
        total: count || 0
      };
    },
    enabled: !!orgId,
    staleTime: CACHE_CONFIG.RECENT_STALE_TIME,
    refetchInterval: CACHE_CONFIG.RECENT_REFETCH_INTERVAL
  });
}
