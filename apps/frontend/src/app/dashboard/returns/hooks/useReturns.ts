'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

interface Return {
  id: string;
  returnNumber: string;
  saleId: string;
  customerId: string;
  customerName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    reason: string;
  }>;
  totalAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

interface ReturnsStats {
  totalReturns: number;
  totalAmount: number;
  pendingReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  avgProcessingTime: number;
  returnRate: number;
}

export function useReturns(filters: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch returns
  const { data: returns, isLoading } = useQuery({
    queryKey: ['returns', filters],
    queryFn: async () => {
      const response = await api.get('/returns', { params: filters });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['returns-stats', filters],
    queryFn: async () => {
      const response = await api.get('/returns/stats', { params: filters });
      return response.data;
    },
    staleTime: 60000, // 1 minute
  });

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      const response = await api.post('/returns', returnData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns-stats'] });
      toast({
        title: 'Devolución creada',
        description: 'La devolución ha sido creada exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Error al crear la devolución.',
        variant: 'destructive',
      });
    },
  });

  // Update return mutation
  const updateReturnMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await api.patch(`/returns/${id}`, { status, notes });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns-stats'] });
      
      const statusMessages = {
        approved: 'Devolución aprobada',
        rejected: 'Devolución rechazada',
        processed: 'Devolución procesada'
      };
      
      toast({
        title: statusMessages[variables.status as keyof typeof statusMessages] || 'Estado actualizado',
        description: 'El estado de la devolución ha sido actualizado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Error al actualizar la devolución.',
        variant: 'destructive',
      });
    },
  });

  // Process return mutation
  const processReturnMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/returns/${id}/process`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); // Update inventory
      toast({
        title: 'Devolución procesada',
        description: 'La devolución ha sido procesada y el inventario actualizado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Error al procesar la devolución.',
        variant: 'destructive',
      });
    },
  });

  return {
    returns: returns || [],
    stats: stats || null,
    isLoading,
    createReturn: createReturnMutation.mutate,
    updateReturn: (id: string, status: string, notes?: string) => 
      updateReturnMutation.mutate({ id, status, notes }),
    processReturn: processReturnMutation.mutate,
    isCreating: createReturnMutation.isPending,
    isUpdating: updateReturnMutation.isPending,
    isProcessing: processReturnMutation.isPending,
  };
}