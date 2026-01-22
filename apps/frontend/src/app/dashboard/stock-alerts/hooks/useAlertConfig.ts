'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

interface AlertConfig {
  globalMinThreshold: number;
  globalMaxThreshold: number;
  criticalThreshold: number;
  warningThreshold: number;
  enableEmailAlerts: boolean;
  enablePushNotifications: boolean;
  autoCreateOrders: boolean;
  checkFrequency: 'hourly' | 'daily' | 'weekly';
}

export function useAlertConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current config
  const { data: config, isLoading } = useQuery({
    queryKey: ['alert-config'],
    queryFn: async () => {
      // Mock config data
      const mockConfig: AlertConfig = {
        globalMinThreshold: 10,
        globalMaxThreshold: 100,
        criticalThreshold: 5,
        warningThreshold: 20,
        enableEmailAlerts: true,
        enablePushNotifications: true,
        autoCreateOrders: false,
        checkFrequency: 'daily'
      };
      return mockConfig;
    },
    staleTime: 300000, // 5 minutes
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: AlertConfig) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, config: newConfig };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['alert-config'], data.config);
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alerts-stats'] });
      toast({
        title: 'Configuración actualizada',
        description: 'La configuración de alertas ha sido guardada exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración.',
        variant: 'destructive',
      });
    },
  });

  return {
    config: config || null,
    isLoading,
    updateConfig: updateConfigMutation.mutate,
    isUpdating: updateConfigMutation.isPending,
  };
}