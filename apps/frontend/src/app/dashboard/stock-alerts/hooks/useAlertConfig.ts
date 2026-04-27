'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import type { StockAlertConfig } from '@/lib/stock-alerts';

export function useAlertConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId();

  const query = useQuery({
    queryKey: ['stock-alerts-config', organizationId],
    enabled: Boolean(organizationId),
    staleTime: 300_000,
    queryFn: async () => {
      const response = await api.get<{ success: true; data: StockAlertConfig }>('/stock-alerts/config');
      return response.data.data;
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: StockAlertConfig) => {
      const response = await api.put<{ success: true; data: StockAlertConfig }>(
        '/stock-alerts/config',
        newConfig
      );

      return response.data.data;
    },
    onSuccess: (config) => {
      queryClient.setQueryData(['stock-alerts-config', organizationId], config);
      void queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: 'Configuracion actualizada',
        description: 'La politica de alertas quedo sincronizada con Supabase.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuracion de alertas.',
        variant: 'destructive',
      });
    },
  });

  return {
    config: query.data || null,
    isLoading: query.isLoading,
    updateConfig: (config: StockAlertConfig) => updateConfigMutation.mutateAsync(config),
    isUpdating: updateConfigMutation.isPending,
  };
}
