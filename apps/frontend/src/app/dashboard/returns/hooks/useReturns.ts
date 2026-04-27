'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

export interface ReturnItem {
  id?: string;
  originalSaleItemId?: string | null;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  reason?: string;
}

export interface Return {
  id: string;
  returnNumber: string;
  saleId: string;
  originalSaleId?: string;
  customerId: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: ReturnItem[];
  totalAmount: number;
  reason: string;
  notes?: string;
  /** UI-facing status — 'processed' covers both 'processed' and 'completed' from the backend */
  status: 'pending' | 'approved' | 'processed' | 'completed' | 'rejected';
  refundMethod: string;
  processedAt?: string | null;
  processedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnsStats {
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

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ReturnFilters {
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  originalSaleId?: string;
  refundMethod?: string;
}

export interface CreateReturnData {
  originalSaleId: string;
  customerId?: string;
  reason: string;
  notes?: string;
  refundMethod?: 'cash' | 'card' | 'bank_transfer' | 'other';
  items: Array<{
    originalSaleItemId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    reason?: string;
  }>;
}

interface ReturnsResponse {
  returns: Return[];
  pagination: PaginationInfo;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const typedError = error as {
    response?: {
      data?: {
        error?: string;
        message?: string;
      };
    };
    message?: string;
  };

  return (
    typedError.response?.data?.error ||
    typedError.response?.data?.message ||
    typedError.message ||
    fallback
  );
}

/**
 * Normalize the backend status (COMPLETED/APPROVED/etc.) to the UI-facing
 * lowercase value. Backend uses `COMPLETED` for fully processed returns while
 * the UI refers to them as `processed`.
 */
function normalizeStatus(status: string): Return['status'] {
  const lower = status.toLowerCase();
  if (lower === 'completed') return 'processed';
  return lower as Return['status'];
}

/**
 * Map a UI-facing status to the value the backend expects.
 * `processed` on the UI side means `COMPLETED` in the backend.
 */
function toBackendStatus(status: string): string {
  if (status === 'processed' || status === 'completed') return 'COMPLETED';
  return status.toUpperCase();
}

function normalizeReturn(raw: any): Return {
  return {
    ...raw,
    status: normalizeStatus(raw.status || 'pending'),
  };
}

export function useReturns(
  filters: ReturnFilters = {},
  page: number = 1,
  limit: number = 25
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Translate UI filter status to backend status before querying
  const apiFilters = {
    ...filters,
    status:
      filters.status === 'processed' || filters.status === 'completed'
        ? 'COMPLETED'
        : filters.status?.toUpperCase(),
  };

  const {
    data: returnsData,
    isLoading,
    error,
    isFetching,
  }: UseQueryResult<ReturnsResponse> = useQuery({
    queryKey: ['returns', filters, page, limit],
    queryFn: async () => {
      const response = await api.get('/returns', {
        params: { ...apiFilters, page, limit },
      });
      const data = response.data as { returns: any[]; pagination: PaginationInfo };
      return {
        returns: (data.returns || []).map(normalizeReturn),
        pagination: data.pagination,
      };
    },
    staleTime: 30_000,
    retry: 1,
  });

  const { data: stats }: UseQueryResult<ReturnsStats> = useQuery({
    queryKey: ['returns-stats', filters],
    queryFn: async () => {
      const response = await api.get('/returns/stats', { params: filters });
      return response.data as ReturnsStats;
    },
    staleTime: 60_000,
    retry: 1,
  });

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
        description: 'La devolución fue registrada exitosamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error al crear devolución',
        description: getApiErrorMessage(error, 'No se pudo crear la devolución.'),
        variant: 'destructive',
      });
    },
  });

  const updateReturnMutation = useMutation({
    // ✅ FIX: correct endpoint is PATCH /returns/:id/status
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const backendStatus = toBackendStatus(status);
      const response = await api.patch(`/returns/${id}/status`, { status: backendStatus, notes });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns-stats'] });

      const messages: Record<string, string> = {
        approved: 'Devolución aprobada exitosamente.',
        rejected: 'Devolución rechazada.',
        processed: 'Devolución procesada y stock actualizado.',
        completed: 'Devolución procesada y stock actualizado.',
      };

      toast({
        title: 'Estado actualizado',
        description: messages[variables.status] || 'El estado fue actualizado.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error al actualizar',
        description: getApiErrorMessage(error, 'No se pudo actualizar el estado.'),
        variant: 'destructive',
      });
    },
  });

  const processReturnMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/returns/${id}/process`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: 'Devolución procesada',
        description: 'La devolución fue procesada y el inventario fue actualizado.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error al procesar',
        description: getApiErrorMessage(error, 'No se pudo procesar la devolución.'),
        variant: 'destructive',
      });
    },
  });

  return {
    returns: returnsData?.returns || [],
    pagination: returnsData?.pagination,
    stats: stats || null,
    isLoading,
    isFetching,
    error,
    createReturn: (data: CreateReturnData) => createReturnMutation.mutateAsync(data),
    updateReturn: (id: string, status: string, notes?: string) =>
      updateReturnMutation.mutateAsync({ id, status, notes }),
    processReturn: (id: string) => processReturnMutation.mutateAsync(id),
    isCreating: createReturnMutation.isPending,
    isUpdating: updateReturnMutation.isPending,
    isProcessing: processReturnMutation.isPending,
  };
}
