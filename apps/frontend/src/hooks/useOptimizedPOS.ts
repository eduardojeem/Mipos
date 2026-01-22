'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useCallback } from 'react';

interface POSFilters {
  search?: string;
  categoryId?: string;
  activeOnly?: boolean;
}

// Optimized POS Products Hook
export function usePOSProducts(filters: POSFilters = {}) {
  return useQuery({
    queryKey: ['pos-products', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '500', // Reasonable limit for POS
        activeOnly: (filters.activeOnly !== false).toString()
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);

      const response = await fetch(`/api/pos/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch POS products');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - products don't change frequently during POS session
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // Don't refetch when switching tabs during POS operation
    retry: 2,
  });
}

// Optimized POS Customers Hook
export function usePOSCustomers(search?: string) {
  return useQuery({
    queryKey: ['pos-customers', search],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '100',
        activeOnly: 'true'
      });

      if (search) params.append('search', search);

      const response = await fetch(`/api/pos/customers?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch POS customers');
      return response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!search || search === '', // Always enabled, but empty search returns all
    retry: 1,
  });
}

// POS Stats Hook
export function usePOSStats() {
  return useQuery({
    queryKey: ['pos-stats'],
    queryFn: async () => {
      const response = await fetch('/api/pos/stats');
      if (!response.ok) throw new Error('Failed to fetch POS stats');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retry: 1,
  });
}

// Recent Sales Hook
export function usePOSRecentSales(limit = 20) {
  return useQuery({
    queryKey: ['pos-recent-sales', limit],
    queryFn: async () => {
      const response = await fetch(`/api/pos/sales?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch recent sales');
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    retry: 1,
  });
}

// POS Sale Processing Hook
export function usePOSSaleMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleData: any) => {
      const response = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process sale');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['pos-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pos-recent-sales'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] }); // Stock might have changed
      
      toast({
        title: 'Venta Procesada',
        description: `Venta ${data.saleNumber} procesada exitosamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al Procesar Venta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Quick Customer Creation Hook
export function usePOSCustomerMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customerData: any) => {
      const response = await fetch('/api/pos/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate customers queries
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
      
      toast({
        title: 'Cliente Creado',
        description: `Cliente ${data.customer.name} creado exitosamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al Crear Cliente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Combined POS Data Hook
export function useOptimizedPOSData(filters: POSFilters = {}) {
  const products = usePOSProducts(filters);
  const customers = usePOSCustomers();
  const stats = usePOSStats();
  const recentSales = usePOSRecentSales(10);

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      products.refetch(),
      customers.refetch(),
      stats.refetch(),
      recentSales.refetch()
    ]);
  }, [products, customers, stats, recentSales]);

  return {
    // Data
    products: products.data?.products || [],
    productsByCategory: products.data?.byCategory || {},
    customers: customers.data?.customers || [],
    wholesaleCustomers: customers.data?.wholesale || [],
    retailCustomers: customers.data?.retail || [],
    stats: stats.data || {},
    recentSales: recentSales.data?.sales || [],
    
    // Loading states
    isLoadingProducts: products.isLoading,
    isLoadingCustomers: customers.isLoading,
    isLoadingStats: stats.isLoading,
    isLoadingRecentSales: recentSales.isLoading,
    
    // Error states
    productsError: products.error,
    customersError: customers.error,
    statsError: stats.error,
    recentSalesError: recentSales.error,
    
    // Actions
    refetchProducts: products.refetch,
    refetchCustomers: customers.refetch,
    refetchStats: stats.refetch,
    refetchRecentSales: recentSales.refetch,
    refetchAll,
    
    // Metadata
    productsMetadata: products.data?.metadata,
    customersMetadata: customers.data?.metadata,
    
    // Computed values
    totalProducts: products.data?.total || 0,
    totalCustomers: customers.data?.total || 0,
    inStockProducts: products.data?.metadata?.inStock || 0,
    lowStockProducts: products.data?.metadata?.lowStock || 0,
  };
}

// POS Cache Management
export function usePOSCacheManager() {
  const queryClient = useQueryClient();

  const clearPOSCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['pos-products'] });
    queryClient.removeQueries({ queryKey: ['pos-customers'] });
    queryClient.removeQueries({ queryKey: ['pos-stats'] });
    queryClient.removeQueries({ queryKey: ['pos-recent-sales'] });
  }, [queryClient]);

  const prefetchPOSData = useCallback(async () => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['pos-products', {}],
        queryFn: async () => {
          const response = await fetch('/api/pos/products?limit=500&activeOnly=true');
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['pos-customers', ''],
        queryFn: async () => {
          const response = await fetch('/api/pos/customers?limit=100&activeOnly=true');
          return response.json();
        },
        staleTime: 3 * 60 * 1000,
      }),
    ]);
  }, [queryClient]);

  return {
    clearPOSCache,
    prefetchPOSData,
  };
}
