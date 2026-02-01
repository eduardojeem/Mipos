import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
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

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  notes?: string;
  order_source: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  organization_id: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products?: {
    name: string;
    image_url?: string;
  };
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: 'created_at' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  todayRevenue: number;
  avgOrderValue: number;
}

export function useOptimizedOrders(params: OrderListParams = {}) {
  const supabase = createClient();
  
  const memoizedParams = useMemo(() => ({
    page: params.page || 1,
    limit: params.limit || 20,
    status: params.status || 'ALL',
    search: params.search || '',
    sortBy: params.sortBy || 'created_at',
    sortOrder: params.sortOrder || 'desc'
  }), [params.page, params.limit, params.status, params.search, params.sortBy, params.sortOrder]);

  return useQuery({
    queryKey: ['orders', memoizedParams],
    queryFn: async () => {
      const orgId = getOrganizationId();
      if (!orgId) return { orders: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `, { count: 'exact' })
        .eq('organization_id', orgId);

      // Filters
      if (memoizedParams.status && memoizedParams.status !== 'ALL') {
        query = query.eq('status', memoizedParams.status);
      }

      if (memoizedParams.search) {
        // Simple search on customer name or order number
        query = query.or(`customer_name.ilike.%${memoizedParams.search}%,order_number.ilike.%${memoizedParams.search}%,customer_email.ilike.%${memoizedParams.search}%`);
      }

      // Sorting
      query = query.order(memoizedParams.sortBy, { ascending: memoizedParams.sortOrder === 'asc' });

      // Pagination
      const from = (memoizedParams.page - 1) * memoizedParams.limit;
      const to = from + memoizedParams.limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        orders: (data as any[]) || [],
        pagination: {
          page: memoizedParams.page,
          limit: memoizedParams.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / memoizedParams.limit)
        }
      };
    },
    enabled: !!getOrganizationId(),
    staleTime: 30 * 1000, // 30s
    refetchInterval: 60 * 1000 // 1m
  });
}

export function useOrderStats() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['orders-stats'],
    queryFn: async (): Promise<OrderStats> => {
      const orgId = getOrganizationId();
      if (!orgId) return { total: 0, pending: 0, confirmed: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0, todayRevenue: 0, avgOrderValue: 0 };

      // We can do this in one query if we fetch all ID/Status/Total, but might be heavy.
      // Better to do a few counts or use an RPC if available. 
      // For now, let's use separate counts for key statuses as it's safer without RPC.
      
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);

      const [
        { count: total },
        { count: pending },
        { count: confirmed },
        { count: preparing },
        { count: shipped },
        { count: delivered },
        { count: cancelled },
        { data: todayOrders }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'PENDING'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'CONFIRMED'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'PREPARING'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'SHIPPED'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'DELIVERED'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'CANCELLED'),
        supabase.from('orders').select('total').eq('organization_id', orgId).gte('created_at', todayStart.toISOString()).neq('status', 'CANCELLED')
      ]);

      const todayRevenue = todayOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      
      // Avg order value (needs total revenue of all time? or today? Let's assume today for "avg ticket" usually, or simple avg of fetched page? 
      // The interface implies a general stat. Let's calculate from a small sample or if we have a total revenue aggregate.
      // For speed, let's just return 0 or do a quick agg if needed. 
      // Actually, let's calculate based on today's orders for "Avg Ticket Today" which is useful.
      const avgOrderValue = todayOrders && todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

      return {
        total: total || 0,
        pending: pending || 0,
        confirmed: confirmed || 0,
        preparing: preparing || 0,
        shipped: shipped || 0,
        delivered: delivered || 0,
        cancelled: cancelled || 0,
        todayRevenue,
        avgOrderValue
      };
    },
    enabled: !!getOrganizationId(),
    staleTime: 60 * 1000
  });
}

export function useUpdateOrderStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string, status: string }) => {
      const orgId = getOrganizationId();
      if (!orgId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-optimized-summary'] }); // Update main dashboard too
      
      toast({
        title: 'Estado actualizado',
        description: 'El pedido ha sido actualizado correctamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el pedido: ' + error.message,
        variant: 'destructive'
      });
    }
  });
}
