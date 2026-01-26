import { useState, useEffect, useCallback, useRef } from 'react';
import { useSecureProducts } from '@/hooks/useSecureProducts';
import { useSupabase } from '@/hooks/use-supabase';
import { useProductsStore } from '@/store/products-store';
import { getStockThresholds } from '@/lib/env';
import type { Product, Category } from '@/types';
import { createLogger } from '@/lib/logger';

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  recentlyAdded: number;
  topCategory: string;
}

interface UseProductsDataOptions {
  filters?: any;
  cacheTimeout?: number;
  enableRealtime?: boolean;
  pageSize?: number;
  page?: number;
}

const logger = createLogger('ProductsData');

export function useProductsData(options: UseProductsDataOptions = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    recentlyAdded: 0,
    topCategory: ''
  });

  const categories = useProductsStore(s => s.categories);
  const setCategoriesStore = useCallback((cats: Category[]) => {
    useProductsStore.setState({ categories: cats });
  }, []);

  const setProductsStore = useCallback((products: Product[]) => {
    useProductsStore.setState({ products });
  }, []);

  // Secure products hook
  const secureFilters = {
    search: options.filters?.search,
    categoryId: options.filters?.categoryId,
    supplierId: options.filters?.supplierId,
    supplierName: options.filters?.supplierName,
    minPrice: options.filters?.minPrice,
    maxPrice: options.filters?.maxPrice,
    minStock: options.filters?.minStock,
    maxStock: options.filters?.maxStock,
    isActive: options.filters?.isActive,
    createdAfter: options.filters?.dateFrom,
    createdBefore: options.filters?.dateTo,
    inStock: options.filters?.stockStatus === 'in_stock' ? true : undefined,
    outOfStock: options.filters?.stockStatus === 'out_of_stock' ? true : undefined,
    lowStock: options.filters?.stockStatus === 'low_stock' ? true : undefined,
    critical: options.filters?.stockStatus === 'critical' ? true : undefined,
    lowStockThreshold: getStockThresholds().low,
    criticalThreshold: getStockThresholds().critical,
    includeCategory: true,
    includeSupplier: true
  };

  const {
    products: secureProducts,
    loading: productsLoading,
    error: productsError,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    total,
    hasMore,
    loadMore,
    metrics,
    cacheMetrics,
    clearCache,
    pagination
  } = useSecureProducts({
    enableRealtime: options.enableRealtime ?? true,
    showNotifications: true,
    filters: secureFilters,
    cacheTimeout: options.cacheTimeout ?? 300_000,
    retryAttempts: 3,
    enableMetrics: true,
    countMode: 'estimated',
    pageSize: options.pageSize,
    page: options.page
  });

  // Categories loader
  const { getCategories } = useSupabase();
  const getCategoriesRef = useRef(getCategories);
  useEffect(() => { getCategoriesRef.current = getCategories; }, [getCategories]);

  const loadCategories = useCallback(async () => {
    try {
      const cached = (typeof window !== 'undefined')
        ? localStorage.getItem('products-categories-cache')
        : null;

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.ts && (Date.now() - parsed.ts) < 300_000 && Array.isArray(parsed.data)) {
          setCategoriesStore(parsed.data);
        }
      }
    } catch { /* ignore */ }

    try {
      const { data, error } = await getCategoriesRef.current();
      if (!error && Array.isArray(data)) {
        setCategoriesStore(data);
        try {
          localStorage.setItem('products-categories-cache', JSON.stringify({
            ts: Date.now(),
            data
          }));
        } catch { }
      }
    } catch (e) {
      logger.error('getCategories failed', e);
    }
  }, [setCategoriesStore]);

  // Calculate dashboard stats
  const calculateStats = useCallback((products: Product[]): DashboardStats => {
    const thresholds = getStockThresholds();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const stats = products.reduce((acc, p) => {
      const stock = p.stock_quantity || 0;
      const price = p.sale_price || 0;
      const cost = p.cost_price || 0;
      const createdAt = new Date(p.created_at || 0).getTime();

      acc.totalValue += stock * (cost || price);

      if (stock === 0) acc.outOfStock++;
      else if (stock <= thresholds.low) acc.lowStock++;

      if (createdAt >= weekAgo) acc.recentlyAdded++;

      return acc;
    }, {
      totalValue: 0,
      outOfStock: 0,
      lowStock: 0,
      recentlyAdded: 0
    });

    // Find top category
    const categoryCounts = products.reduce((acc, p) => {
      const catId = p.category_id;
      if (catId) acc[catId] = (acc[catId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategoryId = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    const topCategory = categories.find(c => c.id === topCategoryId)?.name || 'N/A';

    return {
      totalProducts: products.length,
      lowStockProducts: stats.lowStock,
      outOfStockProducts: stats.outOfStock,
      totalValue: Math.round(stats.totalValue),
      recentlyAdded: stats.recentlyAdded,
      topCategory
    };
  }, [categories]);

  // Load initial data (solo una vez al montar)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      await loadCategories();
      try {
        await refetch();
      } catch (e) {
        logger.error(e);
      }
      if (mounted) setIsLoading(false);
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  // Update products store and stats
  useEffect(() => {
    if (productsLoading) return;

    if (productsError) {
      setProductsStore([]);
      setDashboardStats({
        totalProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalValue: 0,
        recentlyAdded: 0,
        topCategory: ''
      });
      setIsLoading(false);
      return;
    }

    if (!secureProducts || secureProducts.length === 0) {
      setProductsStore([]);
      setDashboardStats({
        totalProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalValue: 0,
        recentlyAdded: 0,
        topCategory: ''
      });
      setIsLoading(false);
      return;
    }

    setProductsStore(secureProducts as any);
    setDashboardStats(calculateStats(secureProducts as any));
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secureProducts, productsLoading, productsError]); // Removidas funciones de deps

  return {
    isLoading,
    dashboardStats,
    categories,
    products: secureProducts,
    productsError,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    total,
    hasMore,
    loadMore,
    metrics,
    cacheMetrics,
    clearCache,
    pagination
  };
}
