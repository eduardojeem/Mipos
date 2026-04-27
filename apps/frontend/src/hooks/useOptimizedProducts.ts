'use client';

import { useMemo, useCallback } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Product } from '@/types';
import api, { getErrorMessage } from '@/lib/api';

interface ProductFilters {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

type ProductsListResponse = {
  products: Product[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
};

type ProductsSummary = {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  recentlyAdded: number;
  topCategory: string;
  lastUpdated?: string;
};

interface UseOptimizedProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  goToPage: (page: number) => number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}

function normalizeFilters(filters: ProductFilters) {
  return {
    search: filters.search?.trim() || '',
    categoryId: filters.categoryId || '',
    page: filters.page || 1,
    limit: filters.limit || 25,
    sortBy: filters.sortBy || 'updated_at',
    sortOrder: filters.sortOrder || ('desc' as const),
    isActive: typeof filters.isActive === 'boolean' ? filters.isActive : true,
  };
}

export function useOptimizedProducts(filters: ProductFilters = {}): UseOptimizedProductsResult {
  const normalizedFilters = useMemo(() => normalizeFilters(filters), [
    filters.search,
    filters.categoryId,
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortOrder,
    filters.isActive,
  ]);

  const { data, isLoading, error, refetch: refetchQuery } = useQuery({
    queryKey: ['products-list', normalizedFilters],
    queryFn: async () => {
      const response = await api.get<ProductsListResponse>('/products/list', {
        params: {
          search: normalizedFilters.search || undefined,
          categoryId: normalizedFilters.categoryId || undefined,
          page: normalizedFilters.page,
          limit: normalizedFilters.limit,
          sortBy: normalizedFilters.sortBy,
          sortOrder: normalizedFilters.sortOrder,
          isActive: normalizedFilters.isActive,
        },
      });

      const payload = response.data || { products: [] };
      const products = Array.isArray(payload.products) ? payload.products : [];
      const pagination = payload.pagination || {};
      const total = Number(pagination.total ?? products.length);
      const totalPages = Math.max(
        1,
        Number(pagination.totalPages ?? (Math.ceil(total / normalizedFilters.limit) || 1))
      );

      return {
        products,
        total,
        totalPages,
        hasMore: Boolean(pagination.hasMore ?? normalizedFilters.page < totalPages),
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const loadMore = useCallback(async () => {
    console.warn('loadMore should be handled by incrementing the page from the parent component');
  }, []);

  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const goToPage = useCallback((page: number) => {
    if (page < 1 || page > totalPages) {
      return normalizedFilters.page;
    }
    return page;
  }, [normalizedFilters.page, totalPages]);

  return {
    products,
    loading: isLoading,
    error: error ? getErrorMessage(error) : null,
    total,
    hasMore: Boolean(data?.hasMore),
    refetch,
    loadMore,
    goToPage,
    currentPage: normalizedFilters.page,
    totalPages,
    itemsPerPage: normalizedFilters.limit,
  };
}

export function useProductStats(filters: Pick<ProductFilters, 'isActive'> = {}) {
  const normalizedStatus = typeof filters.isActive === 'boolean' ? filters.isActive : true;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products-summary', normalizedStatus],
    queryFn: async () => {
      const response = await api.get<ProductsSummary>('/products/summary', {
        params: {
          isActive: normalizedStatus,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    stats: data || {
      totalProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalValue: 0,
      recentlyAdded: 0,
      topCategory: 'N/A',
    },
    loading: isLoading,
    error: error ? getErrorMessage(error) : null,
    refetch,
  };
}
