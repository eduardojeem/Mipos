'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import type { Product } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

interface ProductFilters {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

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

// Función auxiliar para construir query optimizada - solo campos esenciales
function getSelectedOrganizationId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem('selected_organization');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.id || parsed?.organization_id || null;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

function buildProductQuery(supabase: SupabaseClient<Database>, filters: {
  search: string;
  categoryId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  let query = supabase
    .from('products')
    .select(`
      id, name, sku, sale_price, cost_price, stock_quantity, 
      min_stock, category_id, images, is_active,
      category:categories!fk_products_category(id, name)
    `, { count: 'exact' });

  const orgId = getSelectedOrganizationId();
  if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  query = query.eq('is_active', true);
  query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

  const from = (filters.page - 1) * filters.limit;
  const to = from + filters.limit - 1;
  query = query.range(from, to);

  return query;
}

export function useOptimizedProducts(filters: ProductFilters = {}): UseOptimizedProductsResult {
  const supabase = createClient();

  // Memoizar filtros para evitar re-renders innecesarios
  const memoizedFilters = useMemo(() => ({
    search: filters.search?.trim() || '',
    categoryId: filters.categoryId || '',
    page: filters.page || 1,
    limit: filters.limit || 25,
    sortBy: filters.sortBy || 'updated_at',
    sortOrder: filters.sortOrder || ('desc' as const)
  }), [
    filters.search,
    filters.categoryId,
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortOrder
  ]);

  // React Query para gestión de estado y caché automático
  const { data, isLoading, error, refetch: refetchQuery } = useQuery({
    queryKey: ['products', memoizedFilters],
    queryFn: async () => {
      const query = buildProductQuery(supabase, memoizedFilters);
      const { data, error: queryError, count } = await query;

      if (queryError) throw new Error(queryError.message);

      return {
        products: (data || []) as Product[],
        count: count || 0
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - considera datos frescos
    gcTime: 10 * 60 * 1000, // 10 minutos - mantiene en caché
    refetchOnWindowFocus: false, // No refrescar al enfoc window
    retry: 1 // Solo 1 reintento en caso de error
  });

  const products = data?.products || [];
  const total = data?.count || 0;

  // Calcular si hay más páginas
  const hasMore = useMemo(() => {
    return products.length < total && products.length > 0;
  }, [products.length, total]);

  const loadMore = useCallback(async () => {
    // Esta funcionalidad requiere modificar los filtros desde el componente padre
    console.warn('loadMore should be called from parent component by updating page filter');
  }, []);

  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const goToPage = useCallback((page: number) => {
    const maxPage = Math.ceil(total / memoizedFilters.limit);
    if (page < 1 || page > maxPage) return memoizedFilters.page;
    return page;
  }, [total, memoizedFilters.limit, memoizedFilters.page]);

  const totalPages = useMemo(() => {
    return Math.ceil(total / memoizedFilters.limit);
  }, [total, memoizedFilters.limit]);

  return {
    products,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    total,
    hasMore,
    refetch,
    loadMore,
    goToPage,
    currentPage: memoizedFilters.page,
    totalPages,
    itemsPerPage: memoizedFilters.limit
  };
}

// Hook optimizado para estadísticas con caché más agresivo
export function useProductStats() {
  const supabase = createClient();
  type StatsProduct = {
    stock_quantity: number;
    min_stock: number | null;
    sale_price: number;
    cost_price: number | null;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['product-stats'],
    queryFn: async () => {
      // Query optimizada - solo campos necesarios para stats
      let query = supabase
        .from('products')
        .select('stock_quantity, min_stock, sale_price, cost_price')
        .eq('is_active', true);

      const orgId = getSelectedOrganizationId();
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const products = (data || []) as StatsProduct[];
      const total = products.length;
      const lowStock = products.filter((p: StatsProduct) =>
        p.stock_quantity > 0 && p.stock_quantity <= ((p.min_stock ?? 5))
      ).length;
      const outOfStock = products.filter((p: StatsProduct) => p.stock_quantity === 0).length;
      const totalValue = products.reduce((sum: number, p: StatsProduct) =>
        sum + (p.stock_quantity * (p.cost_price ?? p.sale_price ?? 0)), 0
      );

      return { total, lowStock, outOfStock, totalValue };
    },
    staleTime: 30 * 60 * 1000, // 30 minutos - stats cambian menos frecuentemente
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false
  });

  return {
    stats: data || { total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
    loading: isLoading
  };
}
