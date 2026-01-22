'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minThreshold: number;
  maxThreshold: number;
  severity: 'critical' | 'low' | 'warning';
  category: string;
  unitPrice: number;
  estimatedDaysLeft: number;
  lastRestocked: string;
  supplier?: string;
}

interface StockAlertsStats {
  criticalAlerts: number;
  lowStockAlerts: number;
  warningAlerts: number;
  totalProducts: number;
  estimatedLoss: number;
  avgDaysToStockout: number;
  pendingOrders: number;
}

export function useStockAlerts(filters: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stock alerts
  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['stock-alerts', filters],
    queryFn: async () => {
      // Mock data for demonstration
      const mockAlerts: StockAlert[] = [
        {
          id: '1',
          productId: 'prod-1',
          productName: 'Base Líquida Premium',
          currentStock: 3,
          minThreshold: 10,
          maxThreshold: 50,
          severity: 'critical',
          category: 'Maquillaje',
          unitPrice: 45.99,
          estimatedDaysLeft: 2,
          lastRestocked: '2024-11-15',
          supplier: 'Proveedor A'
        },
        {
          id: '2',
          productId: 'prod-2',
          productName: 'Máscara de Pestañas',
          currentStock: 8,
          minThreshold: 15,
          maxThreshold: 40,
          severity: 'low',
          category: 'Maquillaje',
          unitPrice: 28.50,
          estimatedDaysLeft: 5,
          lastRestocked: '2024-11-20',
          supplier: 'Proveedor B'
        },
        {
          id: '3',
          productId: 'prod-3',
          productName: 'Crema Hidratante',
          currentStock: 18,
          minThreshold: 20,
          maxThreshold: 60,
          severity: 'warning',
          category: 'Cuidado de la piel',
          unitPrice: 35.00,
          estimatedDaysLeft: 12,
          lastRestocked: '2024-11-25',
          supplier: 'Proveedor C'
        }
      ];

      // Apply filters
      let filtered = mockAlerts;
      
      if (filters.searchTerm) {
        filtered = filtered.filter(alert => 
          alert.productName.toLowerCase().includes(filters.searchTerm.toLowerCase())
        );
      }
      
      if (filters.severity && filters.severity !== 'all') {
        filtered = filtered.filter(alert => alert.severity === filters.severity);
      }
      
      if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(alert => 
          alert.category.toLowerCase().includes(filters.category.toLowerCase())
        );
      }

      return filtered;
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['stock-alerts-stats', filters],
    queryFn: async () => {
      // Mock stats data
      const mockStats: StockAlertsStats = {
        criticalAlerts: 3,
        lowStockAlerts: 5,
        warningAlerts: 8,
        totalProducts: 150,
        estimatedLoss: 2500.00,
        avgDaysToStockout: 8,
        pendingOrders: 2
      };
      return mockStats;
    },
    staleTime: 60000, // 1 minute
  });

  // Update threshold mutation
  const updateThresholdMutation = useMutation({
    mutationFn: async ({ productId, threshold }: { productId: string; threshold: number }) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alerts-stats'] });
      toast({
        title: 'Umbral actualizado',
        description: 'El umbral del producto ha sido actualizado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el umbral del producto.',
        variant: 'destructive',
      });
    },
  });

  // Create purchase order mutation
  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true, orderId: 'ORDER-' + Date.now() };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alerts-stats'] });
      toast({
        title: 'Orden de compra creada',
        description: `Orden ${data.orderId} creada exitosamente.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'No se pudo crear la orden de compra.',
        variant: 'destructive',
      });
    },
  });

  // Mark as resolved mutation
  const markAsResolvedMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alerts-stats'] });
      toast({
        title: 'Alertas resueltas',
        description: 'Las alertas seleccionadas han sido marcadas como resueltas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'No se pudieron resolver las alertas.',
        variant: 'destructive',
      });
    },
  });

  return {
    alerts: alerts || [],
    stats: stats || null,
    isLoading,
    refreshAlerts: refetch,
    updateThreshold: (productId: string, threshold: number) => 
      updateThresholdMutation.mutate({ productId, threshold }),
    createPurchaseOrder: createPurchaseOrderMutation.mutate,
    markAsResolved: markAsResolvedMutation.mutate,
    isUpdating: updateThresholdMutation.isPending,
    isCreatingOrder: createPurchaseOrderMutation.isPending,
    isResolving: markAsResolvedMutation.isPending,
  };
}