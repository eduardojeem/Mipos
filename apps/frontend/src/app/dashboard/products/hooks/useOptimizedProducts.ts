'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'low_stock' | 'critical';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseOptimizedProductsOptions {
  filters?: ProductFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

// Products Summary Hook
export function useProductsSummary() {
  return useQuery({
    queryKey: ['products-summary'],
    queryFn: async () => {
      const response = await fetch('/api/products/summary');
      if (!response.ok) throw new Error('Failed to fetch products summary');
      return response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
    retry: 1,
  });
}

// Products List Hook
export function useProductsList(options: UseOptimizedProductsOptions = {}) {
  const { filters = {}, page = 1, limit = 25, enabled = true } = options;

  return useQuery({
    queryKey: ['products-list', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/products/list?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products list');
      return response.json();
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Categories Hook
export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const response = await fetch('/api/products/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (categories change less frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

// Product CRUD Mutations
export function useProductMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProduct = useMutation({
    mutationFn: async (productData: any) => {
      const response = await api.post('/products', productData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch products data
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      toast({
        title: 'Éxito',
        description: 'Producto creado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el producto',
        variant: 'destructive',
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/products/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      toast({
        title: 'Éxito',
        description: 'Producto actualizado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el producto',
        variant: 'destructive',
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      const wasDeactivated = data?.action === 'deactivated';
      if (wasDeactivated) {
        toast({
          title: 'Producto desactivado',
          description: 'Tiene historial relacionado y se marco como inactivo',
        });
        return;
      }
      toast({
        title: 'Éxito',
        description: 'Producto eliminado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el producto',
        variant: 'destructive',
      });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.post('/products/bulk-delete', { ids });
      return response.data;
    },
    onSuccess: (data, ids) => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      const deleted = Number(data?.results?.deleted || 0);
      const deactivated = Number(data?.results?.deactivated || 0);
      if (deleted || deactivated) {
        toast({
          title: 'Exito',
          description: `${deleted} eliminados, ${deactivated} desactivados`,
        });
        return;
      }
      toast({
        title: 'Éxito',
        description: `${ids.length} productos eliminados correctamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron eliminar los productos',
        variant: 'destructive',
      });
    },
  });

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    bulkDelete,
  };
}

// Combined hook for easier usage
export function useOptimizedProducts(options: UseOptimizedProductsOptions = {}) {
  const summary = useProductsSummary();
  const productsList = useProductsList(options);
  const categories = useProductCategories();
  const mutations = useProductMutations();

  return {
    // Data
    summary: summary.data,
    products: productsList.data?.products || [],
    categories: categories.data?.categories || [],
    pagination: productsList.data?.pagination,
    
    // Loading states
    isLoadingSummary: summary.isLoading,
    isLoadingProducts: productsList.isLoading,
    isLoadingCategories: categories.isLoading,
    
    // Error states
    summaryError: summary.error,
    productsError: productsList.error,
    categoriesError: categories.error,
    
    // Actions
    refetchSummary: summary.refetch,
    refetchProducts: productsList.refetch,
    refetchCategories: categories.refetch,
    
    // Mutations
    ...mutations,
    
    // Computed values
    hasMore: productsList.data?.pagination?.hasMore || false,
    totalProducts: productsList.data?.pagination?.total || 0,
    currentPage: productsList.data?.pagination?.page || 1,
    totalPages: productsList.data?.pagination?.totalPages || 0,
  };
}
