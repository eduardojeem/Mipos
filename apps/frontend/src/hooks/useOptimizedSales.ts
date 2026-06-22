import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { CACHE_CONFIG } from '@/config/sales.config';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export interface RecentSale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  customer_name?: string;
  status: string;
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
    refetchInterval: false, // Realtime handles updates via query invalidation
  });
}
