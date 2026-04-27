'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import type { StockAlertsResponse } from '@/lib/stock-alerts';

function invalidateStockAlertQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
  void queryClient.invalidateQueries({ queryKey: ['stock-alerts-config'] });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
  void queryClient.invalidateQueries({ queryKey: ['products-list'] });
  void queryClient.invalidateQueries({ queryKey: ['products-summary'] });
}

export function useStockAlerts(filters: {
  filters?: {
    search?: string;
    severity?: string;
    category?: string;
    supplier?: string;
  };
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId();

  const query = useQuery({
    queryKey: ['stock-alerts', organizationId, filters.filters || {}],
    enabled: Boolean(organizationId),
    staleTime: 30_000,
    queryFn: async () => {
      const response = await api.get<StockAlertsResponse>('/stock-alerts', {
        params: filters.filters,
      });

      return response.data;
    },
  });

  const updateThresholdMutation = useMutation({
    mutationFn: async ({ productId, threshold }: { productId: string; threshold: number }) => {
      const response = await api.patch(`/stock-alerts/${productId}/threshold`, {
        minThreshold: threshold,
      });

      return response.data;
    },
    onSuccess: () => {
      invalidateStockAlertQueries(queryClient);
      toast({
        title: 'Umbral actualizado',
        description: 'El minimo del producto se sincronizo con el sistema.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el umbral del producto.',
        variant: 'destructive',
      });
    },
  });

  const bulkUpdateThresholdsMutation = useMutation({
    mutationFn: async ({
      productIds,
      threshold,
    }: {
      productIds: string[];
      threshold: number;
    }) => {
      const response = await api.patch('/stock-alerts/bulk-threshold', {
        productIds,
        minThreshold: threshold,
      });

      return response.data;
    },
    onSuccess: (data) => {
      invalidateStockAlertQueries(queryClient);
      toast({
        title: 'Umbrales aplicados',
        description: `Se actualizaron ${data?.updated ?? 0} productos.`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar los umbrales seleccionados.',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let supabase: ReturnType<typeof createSupabaseClient> | null = null;

    try {
      supabase = createSupabaseClient();
    } catch {
      supabase = null;
    }

    if (!supabase) {
      return;
    }

    const sync = () => invalidateStockAlertQueries(queryClient);

    const channel = supabase
      .channel(`stock-alerts-${organizationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `organization_id=eq.${organizationId}`,
      }, sync)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_movements',
        filter: `organization_id=eq.${organizationId}`,
      }, sync)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'settings',
        filter: `organization_id=eq.${organizationId}`,
      }, sync)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  return {
    alerts: query.data?.data || [],
    stats: query.data?.stats || null,
    trends: query.data?.trends || [],
    filterOptions: query.data?.filters || { categories: [], suppliers: [] },
    lastUpdated: query.data?.lastUpdated || null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refreshAlerts: query.refetch,
    updateThreshold: (productId: string, threshold: number) =>
      updateThresholdMutation.mutateAsync({ productId, threshold }),
    bulkUpdateThresholds: (productIds: string[], threshold: number) =>
      bulkUpdateThresholdsMutation.mutateAsync({ productIds, threshold }),
    isUpdating: updateThresholdMutation.isPending,
    isBulkUpdating: bulkUpdateThresholdsMutation.isPending,
  };
}
