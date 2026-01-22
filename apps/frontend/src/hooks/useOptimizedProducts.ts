'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { Product } from '@/types';

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

// Función auxiliar para construir query
function buildProductQuery(supabase: any, filters: any) {
  let query = supabase
    .from('products')
    .select(`
      id, name, sku, sale_price, cost_price, stock_quantity, 
      min_stock, category_id, image_url, is_active, created_at, updated_at,
      category:categories!products_category_id_fkey(id, name)
    `, { count: 'exact' });

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  const supabase = createClient();
  
  // Memoizar filtros para evitar re-renders innecesarios
  const memoizedFilters = useMemo(() => ({
    search: filters.search?.trim() || '',
    categoryId: filters.categoryId || '',
    page: filters.page || 1,
    limit: filters.limit || 25,
    sortBy: filters.sortBy || 'updated_at',
    sortOrder: filters.sortOrder || 'desc'
  }), [
    filters.search,
    filters.categoryId,
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortOrder
  ]);
  
  const fetchProducts = useCallback(async (append = false) => {
    if (!append) setLoading(true);
    setError(null);
    
    try {
      const query = buildProductQuery(supabase, memoizedFilters);
      const { data, error: queryError, count } = await query;
      
      if (queryError) throw new Error(queryError.message);
      
      const newProducts = data || [];
      setProducts(prev => append ? [...prev, ...newProducts] : newProducts);
      setTotal(count || 0);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, memoizedFilters]);
  
  // Calcular si hay más páginas
  const hasMore = useMemo(() => {
    return products.length < total && products.length > 0;
  }, [products.length, total]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    // Crear filtros para la siguiente página
    const nextPageFilters = { ...memoizedFilters, page: memoizedFilters.page + 1 };
    
    try {
      const query = buildProductQuery(supabase, nextPageFilters);
      const { data, error: queryError } = await query;
      
      if (queryError) throw new Error(queryError.message);
      
      const newProducts = data || [];
      setProducts(prev => [...prev, ...newProducts]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error loading more products:', err);
    }
  }, [loading, hasMore, memoizedFilters, supabase]);
  
  const refetch = useCallback(async () => {
    await fetchProducts(false);
  }, [fetchProducts]);
  
  // Efecto para cargar datos cuando cambian los filtros
  useEffect(() => {
    fetchProducts(false);
  }, [fetchProducts]);
  
  const goToPage = useCallback((page: number) => {
    if (page < 1 || page > Math.ceil(total / memoizedFilters.limit)) return page;
    // This will trigger a re-fetch through the filters change
    return page;
  }, [total, memoizedFilters.limit]);

  const totalPages = useMemo(() => {
    return Math.ceil(total / memoizedFilters.limit);
  }, [total, memoizedFilters.limit]);

  return {
    products,
    loading,
    error,
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

// Hook para estadísticas rápidas (sin paginación)
export function useProductStats() {
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Query optimizada para estadísticas
        const { data, error } = await supabase
          .from('products')
          .select('stock_quantity, min_stock, sale_price, cost_price')
          .eq('is_active', true);
        
        if (error) throw error;
        
        const products = data || [];
        const total = products.length;
        const lowStock = products.filter((p: any) => 
          p.stock_quantity > 0 && p.stock_quantity <= (p.min_stock || 5)
        ).length;
        const outOfStock = products.filter((p: any) => p.stock_quantity === 0).length;
        const totalValue = products.reduce((sum: number, p: any) => 
          sum + (p.stock_quantity * (p.cost_price || p.sale_price || 0)), 0
        );
        
        setStats({ total, lowStock, outOfStock, totalValue });
      } catch (err) {
        console.error('Error fetching product stats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [supabase]);
  
  return { stats, loading };
}