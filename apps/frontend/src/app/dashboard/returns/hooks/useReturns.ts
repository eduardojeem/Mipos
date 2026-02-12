'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

// ✅ Proper TypeScript interfaces (no 'any')
interface ReturnItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

interface Return {
  id: string;
  returnNumber: string;
  saleId: string;
  originalSaleId: string;
  customerId: string | null;
  customerName: string;
  items: ReturnItem[];
  totalAmount: number;
  total: number;
  reason: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  refundMethod: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

interface ReturnsStats {
  totalReturns: number;
  totalAmount: number;
  pendingReturns: number;
  pendingAmount: number;
  approvedReturns: number;
  approvedAmount: number;
  rejectedReturns: number;
  rejectedAmount: number;
  completedReturns: number;
  completedAmount: number;
  avgProcessingTime: number;
  returnRate: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ReturnsResponse {
  returns: Return[];
  pagination: PaginationInfo;
}

interface ReturnFilters {
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  originalSaleId?: string;
}

interface CreateReturnData {
  saleId: string;
  customerId?: string;
  reason: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    reason?: string;
  }>;
}

// ✅ Updated hook with pagination support
export function useReturns(
  filters: ReturnFilters = {},
  page: number = 1,
  limit: number = 25
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch returns with pagination
  const {
    data: returnsData,
    isLoading,
    error
  }: UseQueryResult<ReturnsResponse> = useQuery({
    queryKey: ['returns', filters, page, limit],
    queryFn: async () => {
      console.log('🔍 [useReturns] Fetching returns with params:', { filters, page, limit });
      try {
        const response = await api.get('/returns', {
          params: { ...filters, page, limit }
        });
        console.log('🔍 [useReturns] Response:', response.data);
        return response.data;
      } catch (err: any) {
        console.error('🔍 [useReturns] Error fetching returns:', err);
        console.error('🔍 [useReturns] Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          url: err.config?.url
        });
        throw err;
      }
    },
    staleTime: 30000, // 30 seconds
    retry: false, // Disable retry to see errors immediately
  });

  // Fetch stats
  const {
    data: stats
  }: UseQueryResult<ReturnsStats> = useQuery({
    queryKey: ['returns-stats', filters],
    queryFn: async () => {
      console.log('🔍 [useReturns] Fetching stats with filters:', filters);
      try {
        const response = await api.get('/returns/stats', { params: filters });
        console.log('🔍 [useReturns] Stats response:', response.data);
        return response.data;
      } catch (err: any) {
        console.error('🔍 [useReturns] Error fetching stats:', err);
        console.error('🔍 [useReturns] Stats error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        throw err;
      }
    },
    staleTime: 60000, // 1 minute
    retry: false,
  });

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (returnData: CreateReturnData) => {
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

  // Update return status mutation
  const updateReturnMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const backendStatus = status === 'processed' ? 'COMPLETED' : String(status).toUpperCase();
      const response = await api.patch(`/returns/${id}/status`, { status: backendStatus, notes });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns-stats'] });

      const statusMessages: Record<string, string> = {
        approved: 'Devolución aprobada',
        rejected: 'Devolución rechazada',
        processed: 'Devolución procesada',
        COMPLETED: 'Devolución procesada'
      };

      const msgKey = variables.status === 'processed' ? 'processed' : variables.status;
      toast({
        title: statusMessages[msgKey] || 'Estado actualizado',
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

  // Process return mutation - uses new endpoint
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
    returns: returnsData?.returns || [],
    pagination: returnsData?.pagination,
    stats: stats || null,
    isLoading,
    error,
    createReturn: createReturnMutation.mutate,
    updateReturn: (id: string, status: string, notes?: string) =>
      updateReturnMutation.mutate({ id, status, notes }),
    processReturn: processReturnMutation.mutate,
    isCreating: createReturnMutation.isPending,
    isUpdating: updateReturnMutation.isPending,
    isProcessing: processReturnMutation.isPending,
  };
}

// Export types for use in components
export type { Return, ReturnItem, ReturnsStats, ReturnFilters, PaginationInfo, CreateReturnData };
