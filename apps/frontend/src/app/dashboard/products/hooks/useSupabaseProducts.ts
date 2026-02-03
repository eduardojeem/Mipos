'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useSupabase } from '@/hooks/use-supabase';
import type { Product, Category } from '@/types';
import type { ProductFilters as UnifiedProductFilters } from '@/hooks/use-products';
import type { CreateProductData, UpdateProductData } from '@/types/supabase';
import { createLogger } from '@/lib/logger';
import { toast } from '@/lib/toast';

type StockStatus = 'out_of_stock' | 'low_stock' | 'in_stock' | 'critical';
interface CompatibleFilters extends Partial<UnifiedProductFilters> {
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  stockStatus?: StockStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'name' | 'sku' | 'sale_price' | 'stock_quantity' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  createdAfter?: string;
  createdBefore?: string;
  sort_direction?: 'asc' | 'desc';
}

interface UseSupabaseProductsOptions {
  filters?: Partial<UnifiedProductFilters>;
  enableRealtime?: boolean;
  pageSize?: number;
  page?: number;
}

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  recentlyAdded: number;
  topCategory: string;
}

const logger = createLogger('SupabaseProducts');

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

export function useSupabaseProducts(options: UseSupabaseProductsOptions = {}) {
  const {
    filters = {},
    enableRealtime = false,
    pageSize = 25,
    page = 1
  } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    recentlyAdded: 0,
    topCategory: ''
  });

  const {
    getCategories,
    createProduct: supabaseCreateProduct,
    updateProduct: supabaseUpdateProduct,
    deleteProduct: supabaseDeleteProduct,
    supabase
  } = useSupabase();

  // Refs to prevent stale closures
  const filtersRef = useRef(filters);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);

  // Update refs when props change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  // Fetch global stats from API
  const fetchGlobalStats = useCallback(async () => {
    try {
      const orgId = getSelectedOrganizationId();
      const response = await fetch('/api/products/summary', {
        headers: orgId ? { 'x-organization-id': orgId } : undefined
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const stats = await response.json();
      setDashboardStats(stats);
    } catch (err) {
      logger.error('Error fetching global stats:', err);
    }
  }, []);

  // Load categories (cached)
  const loadCategories = useCallback(async () => {
    try {
      // Try cache first
      const cached = localStorage.getItem('supabase-categories-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.timestamp && (Date.now() - parsed.timestamp) < 300_000) {
          setCategories(parsed.data);
          return parsed.data;
        }
      }

      const { data, error } = await getCategories();
      if (error) {
        logger.error('Error loading categories:', error);
        return [];
      }

      const categoriesData = data || [];
      setCategories(categoriesData);

      // Cache for 5 minutes
      localStorage.setItem('supabase-categories-cache', JSON.stringify({
        data: categoriesData,
        timestamp: Date.now()
      }));

      return categoriesData;
    } catch (err) {
      logger.error('Error in loadCategories:', err);
      return [];
    }
  }, [getCategories]);

  // Build query with filters
  const buildQuery = useCallback(() => {
    const cf = filtersRef.current as CompatibleFilters;
    const currentPage = pageRef.current;
    const currentPageSize = pageSizeRef.current;

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories!products_category_id_fkey(id, name),
        supplier:suppliers!products_supplier_id_fkey(id, name)
      `, { count: 'estimated' });

    const orgId = getSelectedOrganizationId();
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    // Apply filters
    if (cf.search) {
      query = query.or(`name.ilike.%${cf.search}%,sku.ilike.%${cf.search}%,description.ilike.%${cf.search}%`);
    }

    const categoryId = cf.categoryId ?? cf.category_id;
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const supplierId = cf.supplierId ?? cf.supplier_id;
    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const minPrice = cf.minPrice ?? cf.min_price;
    if (minPrice !== undefined) {
      query = query.gte('sale_price', minPrice);
    }

    const maxPrice = cf.maxPrice ?? cf.max_price;
    if (maxPrice !== undefined) {
      query = query.lte('sale_price', maxPrice);
    }

    const minStock = cf.minStock ?? cf.min_stock;
    if (minStock !== undefined) {
      query = query.gte('stock_quantity', minStock);
    }

    const maxStock = cf.maxStock ?? cf.max_stock;
    if (maxStock !== undefined) {
      query = query.lte('stock_quantity', maxStock);
    }

    const isActive = cf.isActive ?? cf.is_active;
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    if (cf.stockStatus) {
      switch (cf.stockStatus) {
        case 'out_of_stock':
          query = query.eq('stock_quantity', 0);
          break;
        case 'low_stock':
          query = query.gt('stock_quantity', 0).lte('stock_quantity', 5);
          break;
        case 'in_stock':
          query = query.gt('stock_quantity', 5);
          break;
        case 'critical':
          query = query.lte('stock_quantity', 2);
          break;
      }
    }

    const dateFrom = cf.dateFrom ?? cf.created_after ?? cf.createdAfter;
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    const dateTo = cf.dateTo ?? cf.created_before ?? cf.createdBefore;
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Sorting
    const sortBy = cf.sortBy ?? cf.sort_by ?? 'created_at';
    const sortOrder = cf.sortOrder ?? cf.sort_direction ?? 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (currentPage - 1) * currentPageSize;
    const to = from + currentPageSize - 1;
    query = query.range(from, to);

    return query;
  }, [supabase]);

  // Load products with current filters
  const loadProducts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const query = buildQuery();
      const { data, error, count } = await query;

      if (error) {
        const msg = (() => {
          if (error && typeof error === 'object' && Object.keys(error).length === 0) {
            return 'Unknown Supabase error (empty object)';
          }
          if (typeof error === 'object' && error !== null) {
            const e = error as { message?: unknown; details?: unknown };
            return String(e.message ?? e.details ?? '');
          }
          return String(error);
        })();
        logger.error('Error loading products:', { error, message: msg });
        setError(msg);
        return;
      }

      const productsData = data || [];
      setProducts(productsData);
      setTotal(count || 0);

      const currentPage = pageRef.current;
      const currentPageSize = pageSizeRef.current;
      setHasMore((count || 0) > currentPage * currentPageSize);

      // Load categories and stats
      await loadCategories();

      // Fetch stats (independent of pagination)
      fetchGlobalStats();

    } catch (err) {
      logger.error('Error in loadProducts:', err);
      setError('Error loading products');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [buildQuery, loadCategories, fetchGlobalStats]);

  // Refetch function
  const refetch = useCallback(async (newOptions?: { page?: number; pageSize?: number }) => {
    if (newOptions?.page) {
      pageRef.current = newOptions.page;
    }
    if (newOptions?.pageSize) {
      pageSizeRef.current = newOptions.pageSize;
    }
    await loadProducts();
  }, [loadProducts]);

  // Load more function
  const loadMoreProducts = useCallback(async () => {
    if (!hasMore || isLoading) return;

    pageRef.current = pageRef.current + 1;
    await loadProducts(false);
  }, [hasMore, isLoading, loadProducts]);

  // CRUD operations
  const createProduct = useCallback(async (productData: CreateProductData) => {
    try {
      const result = await supabaseCreateProduct(productData);
      if (result) {
        toast.success('Producto creado exitosamente');
        await refetch();
        return true;
      }
      return false;
    } catch (err) {
      logger.error('Error creating product:', err);
      toast.error('Error al crear producto');
      return false;
    }
  }, [supabaseCreateProduct, refetch]);

  const updateProduct = useCallback(async (id: string, productData: UpdateProductData) => {
    try {
      const result = await supabaseUpdateProduct(id, productData);
      if (result) {
        toast.success('Producto actualizado exitosamente');
        await refetch();
        return true;
      }
      return false;
    } catch (err) {
      logger.error('Error updating product:', err);
      toast.error('Error al actualizar producto');
      return false;
    }
  }, [supabaseUpdateProduct, refetch]);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const result = await supabaseDeleteProduct(id);
      if (result) {
        toast.success('Producto eliminado exitosamente');
        await refetch();
        return true;
      }
      return false;
    } catch (err) {
      logger.error('Error deleting product:', err);
      toast.error('Error al eliminar producto');
      return false;
    }
  }, [supabaseDeleteProduct, refetch]);

  // Clear cache
  const clearCache = useCallback(() => {
    localStorage.removeItem('supabase-categories-cache');
    toast.info('Cache limpiado');
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload: RealtimePostgresChangesPayload<Product>) => {
          logger.log('Real-time update:', payload);
          // Refresh data on changes
          loadProducts(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, supabase, loadProducts]);

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      await loadProducts();
    };
    initialLoad();
  }, [loadProducts]);

  // Pagination object
  const pagination = {
    page: pageRef.current,
    pageSize: pageSizeRef.current,
    total
  };

  return {
    // Data
    products,
    categories,
    isLoading,
    error,
    total,
    hasMore,
    dashboardStats,
    pagination,

    // Actions
    refetch,
    loadMore: loadMoreProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    clearCache
  };
}
