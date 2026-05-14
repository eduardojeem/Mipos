'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import type { Category, Customer, Product } from '@/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseOptimizedDataOptions {
  cacheKey: string;
  cacheDuration?: number; // en milisegundos
  retryAttempts?: number;
  retryDelay?: number;
  staleWhileRevalidate?: boolean;
  onError?: (error: Error) => void;
  networkTimeoutMs?: number; // tiempo máximo por request
}

interface UseOptimizedDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
  isStale: boolean;
}

type PosCategory = Category;

export type POSProduct = Product & {
  category?: PosCategory;
  in_stock: boolean;
  low_stock: boolean;
  has_wholesale: boolean;
  price: number;
  stock: number;
};

type PosSalesStats = {
  total_sales: number;
  transaction_count: number;
  average_ticket: number;
  top_selling_product: string;
};

function normalizePosCategory(
  category: unknown,
  categoryId: string,
  categoryMap?: Map<string, Category>
): PosCategory | null {
  if (category && typeof category === 'object') {
    const rawCategory = category as Record<string, unknown>;
    const id = String(rawCategory.id || categoryId || '');
    const name = String(rawCategory.name || 'Sin categoria');
    return id
      ? {
          id,
          name,
          is_active: true,
          created_at: '',
          updated_at: '',
        }
      : null;
  }

  if (categoryId) {
    const fallback = categoryMap?.get(categoryId);
    if (fallback?.id) {
      return {
        id: String(fallback.id),
        name: String(fallback.name || 'Sin categoria'),
        description: fallback.description,
        is_active: fallback.is_active,
        organization_id: fallback.organization_id,
        parent_id: fallback.parent_id,
        created_at: fallback.created_at,
        updated_at: fallback.updated_at,
        _count: fallback._count,
      };
    }
  }

  return null;
}

function normalizePosProduct(
  rawProduct: Record<string, unknown>,
  categoryMap?: Map<string, Category>
): POSProduct {
  const categoryId = String(rawProduct.category_id || '');
  const salePrice = Number(rawProduct.sale_price || 0);
  const stockQuantity = Number(rawProduct.stock_quantity || 0);
  const minStock = Number(rawProduct.min_stock || 0);
  const wholesalePrice =
    rawProduct.wholesale_price === null || rawProduct.wholesale_price === undefined
      ? undefined
      : Number(rawProduct.wholesale_price);
  const category = normalizePosCategory(rawProduct.category, categoryId, categoryMap);

  return {
    id: String(rawProduct.id || ''),
    name: String(rawProduct.name || ''),
    sku: String(rawProduct.sku || ''),
    description: typeof rawProduct.description === 'string' ? rawProduct.description : undefined,
    cost_price: Number(rawProduct.cost_price || 0),
    sale_price: salePrice,
    offer_price:
      rawProduct.offer_price === null || rawProduct.offer_price === undefined
        ? undefined
        : Number(rawProduct.offer_price),
    wholesale_price: wholesalePrice,
    min_wholesale_quantity:
      rawProduct.min_wholesale_quantity === null || rawProduct.min_wholesale_quantity === undefined
        ? undefined
        : Number(rawProduct.min_wholesale_quantity),
    stock_quantity: stockQuantity,
    min_stock: minStock,
    max_stock:
      rawProduct.max_stock === null || rawProduct.max_stock === undefined
        ? undefined
        : Number(rawProduct.max_stock),
    category_id: categoryId,
    supplier_id: typeof rawProduct.supplier_id === 'string' ? rawProduct.supplier_id : undefined,
    barcode: typeof rawProduct.barcode === 'string' ? rawProduct.barcode : undefined,
    image_url: typeof rawProduct.image_url === 'string' ? rawProduct.image_url : undefined,
    is_active: Boolean(rawProduct.is_active),
    regular_price:
      rawProduct.regular_price === null || rawProduct.regular_price === undefined
        ? undefined
        : Number(rawProduct.regular_price),
    brand: typeof rawProduct.brand === 'string' ? rawProduct.brand : undefined,
    created_at: typeof rawProduct.created_at === 'string' ? rawProduct.created_at : '',
    updated_at: typeof rawProduct.updated_at === 'string' ? rawProduct.updated_at : '',
    category: category || undefined,
    price: salePrice,
    stock: stockQuantity,
    in_stock: stockQuantity > 0,
    low_stock: stockQuantity <= Math.max(minStock, 1),
    has_wholesale: (wholesalePrice || 0) > 0,
  };
}

// Cache global para compartir entre componentes
const globalCache = new Map<string, CacheEntry<unknown>>();
// Nuevo: deduplicación de peticiones en vuelo por cacheKey
const inflightRequests = new Map<string, Promise<unknown>>();

// Función para limpiar cache expirado
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, entry] of globalCache.entries()) {
    if (now > entry.expiresAt) {
      globalCache.delete(key);
    }
  }
};

// Limpiar cache cada 5 minutos
setInterval(cleanExpiredCache, 5 * 60 * 1000);

export function useOptimizedData<T>(
  fetchFn: () => Promise<T>,
  options: UseOptimizedDataOptions
): UseOptimizedDataReturn<T> {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutos por defecto
    retryAttempts = 3,
    retryDelay = 1000,
    staleWhileRevalidate = true,
    onError,
    networkTimeoutMs = 8000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track current data without causing loadData to re-create on state change
  const dataRef = useRef<T | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Hold onError in a ref to avoid changing loadData dependencies
  const onErrorRef = useRef<((error: Error) => void) | undefined>(undefined);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Hold fetchFn in a ref to keep loadData stable even if parent recreates it
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);
  // Función para obtener datos del cache
  const getCachedData = useCallback((): CacheEntry<T> | null => {
    const cached = globalCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.expiresAt) {
      globalCache.delete(cacheKey);
      return null;
    }

    return cached as CacheEntry<T>;
  }, [cacheKey]);

  // Función para guardar en cache
  const setCachedData = useCallback((newData: T) => {
    const now = Date.now();
    globalCache.set(cacheKey, {
      data: newData,
      timestamp: now,
      expiresAt: now + cacheDuration
    });
  }, [cacheKey, cacheDuration]);

  // Función para verificar si los datos están obsoletos
  const checkIfStale = useCallback(() => {
    const cached = getCachedData();
    if (!cached) return false;

    const now = Date.now();
    const staleThreshold = cached.timestamp + (cacheDuration * 0.8); // 80% del tiempo de cache
    return now > staleThreshold;
  }, [getCachedData, cacheDuration]);

  // Función principal de fetch con reintentos
  const fetchWithRetry = useCallback(async (attempt = 1): Promise<T> => {
    try {
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      let timer: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Abortar la operación en curso para evitar fugas
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          const err = new Error('Network timeout');
          reject(err);
        }, networkTimeoutMs);
      });

      const result = await Promise.race([fetchFnRef.current(), timeoutPromise]);
      if (timer) clearTimeout(timer);
      return result as T;
    } catch (err) {
      const error = err as Error;

      // Si es un error de cancelación, no reintentar
      if (error.name === 'AbortError') {
        throw error;
      }

      // Reintentar si no hemos alcanzado el límite
      if (attempt < retryAttempts) {
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, retryDelay * attempt);
        });
        return fetchWithRetry(attempt + 1);
      }

      throw error;
    }
  }, [retryAttempts, retryDelay, networkTimeoutMs]);

  // Función principal de carga de datos
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);

      // Verificar cache primero
      if (!forceRefresh) {
        const cached = getCachedData();
        if (cached) {
          setData(cached.data);
          setIsStale(checkIfStale());

          // Si staleWhileRevalidate está habilitado y los datos están obsoletos,
          // cargar en background
          if (staleWhileRevalidate && checkIfStale()) {
            loadData(true).catch(() => { }); // Silenciar errores en background
          }
          return;
        }
      }

      setLoading(true);

      // Dedupe: reutilizar petición en vuelo si existe
      let request = inflightRequests.get(cacheKey) as Promise<T> | undefined;
      if (!request) {
        request = fetchWithRetry().then((result) => {
          setCachedData(result);
          return result;
        }).finally(() => {
          inflightRequests.delete(cacheKey);
        });
        inflightRequests.set(cacheKey, request);
      }

      const result = await request;
      setData(result);
      setIsStale(false);

    } catch (err) {
      const error = err as Error;

      // Si es cancelación, no actualizar el estado de error
      if (error.name === 'AbortError') {
        return;
      }

      setError(error);
      onErrorRef.current?.(error);

      // Si hay datos en cache y falló la recarga, mantener los datos obsoletos
      if (staleWhileRevalidate) {
        const cached = getCachedData();
        if (cached && !dataRef.current) {
          setData(cached.data);
          setIsStale(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [
    getCachedData,
    checkIfStale,
    staleWhileRevalidate,
    fetchWithRetry,
    setCachedData,
    cacheKey
  ]);

  // Función para refetch manual
  const refetch = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  // Función para limpiar cache
  const clearCache = useCallback(() => {
    globalCache.delete(cacheKey);
    setData(null);
    setIsStale(false);
  }, [cacheKey]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();

    // Cleanup al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    isStale
  };
}

// Hook especializado para datos del POS
export function usePOSData() {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId();

  const productsQuery = useQuery<POSProduct[]>({
    queryKey: ['pos', 'products', organizationId ?? 'no-org'],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        const res = await fetch('/api/pos/products?limit=500', {
          headers: { 'x-organization-id': organizationId }
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.error) {
            console.warn('[POS] API /api/pos/products returned logical error:', json?.error, json?.details);
            throw new Error(String(json.error));
          }
          const items = json?.products || json?.data || [];
          // Mapear nombre de categoría si viene del API
          return Array.isArray(items)
            ? items.map((product) => normalizePosProduct(product as Record<string, unknown>))
            : [];
        }
        let apiMessage = `POS products API responded with status ${res.status}`;
        try {
          const json = await res.json();
          if (json?.error) {
            apiMessage = String(json.error);
          }
        } catch { }
        throw new Error(apiMessage);
      } catch (apiErr) {
        console.error('[POS] API /api/pos/products failed:', apiErr);
        throw apiErr instanceof Error ? apiErr : new Error('Could not fetch POS products');
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,  // los productos del POS se actualizan por realtime
  });

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['pos', 'categories', organizationId ?? 'no-org'],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        const res = await fetch('/api/categories?limit=200&status=active', {
          headers: { 'x-organization-id': organizationId }
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.error) {
            console.warn('[POS] API /api/categories returned logical error:', json?.error, json?.details);
            throw new Error(String(json.error));
          }
          const items = json?.categories || json?.data || [];
          if (Array.isArray(items)) {
            return items;
          }
        }
        let apiMessage = `Categories API responded with status ${res.status}`;
        try {
          const json = await res.json();
          if (json?.error) {
            apiMessage = String(json.error);
          }
        } catch { }
        throw new Error(apiMessage);
      } catch (apiErr) {
        console.error('[POS] API /api/categories failed:', apiErr);
        throw apiErr instanceof Error ? apiErr : new Error('Could not fetch POS categories');
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,  // las categorías se actualizan por realtime
  });

  const customersQuery = useQuery<Customer[]>({
    queryKey: ['pos', 'customers', organizationId ?? 'no-org'],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        const res = await fetch('/api/pos/customers?limit=300', {
          headers: { 'x-organization-id': organizationId }
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.error) {
            console.warn('[POS] API /api/pos/customers returned logical error:', json?.error, json?.details);
            throw new Error(String(json.error));
          }
          const items = json?.customers || json?.data || [];
          if (Array.isArray(items)) {
            return items;
          }
        }
        let apiMessage = `POS customers API responded with status ${res.status}`;
        try {
          const json = await res.json();
          if (json?.error) {
            apiMessage = String(json.error);
          }
        } catch { }
        throw new Error(apiMessage);
      } catch (apiErr) {
        console.error('[POS] API /api/pos/customers failed:', apiErr);
        throw apiErr instanceof Error ? apiErr : new Error('Could not fetch POS customers');
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const salesStatsQuery = useQuery<PosSalesStats>({
    queryKey: ['pos', 'sales-stats', organizationId ?? 'no-org'],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      if (!organizationId) {
        return {
          total_sales: 0,
          transaction_count: 0,
          average_ticket: 0,
          top_selling_product: '',
        };
      }

      try {
        const res = await fetch('/api/pos/stats', {
          headers: { 'x-organization-id': organizationId }
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.error) {
            console.warn('[POS] API /api/pos/stats returned logical error:', json?.error, json?.details);
            throw new Error(String(json.error));
          }
          return {
            total_sales: Number(json?.todaySales || 0),
            transaction_count: Number(json?.todayTransactions || 0),
            average_ticket: Number(json?.averageTicket || 0),
            top_selling_product: json?.topProducts?.[0]?.name || ''
          };
        }
        let apiMessage = `POS stats API responded with status ${res.status}`;
        try {
          const json = await res.json();
          if (json?.error) {
            apiMessage = String(json.error);
          }
        } catch { }
        throw new Error(apiMessage);
      } catch (apiErr) {
        console.error('[POS] API /api/pos/stats failed:', apiErr);
        throw apiErr instanceof Error ? apiErr : new Error('Could not fetch POS stats');
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const loading = productsQuery.isLoading || categoriesQuery.isLoading;
  const secondaryLoading = customersQuery.isLoading || salesStatsQuery.isLoading;
  const error = productsQuery.error || categoriesQuery.error || customersQuery.error || salesStatsQuery.error;
  const categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
  const categoryMap = new Map<string, (typeof categories)[number]>(
    categories
      .filter((category) => category?.id)
      .map((category) => [String(category.id), category])
  );
  const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const normalizedProducts: POSProduct[] = products.map((product) =>
    normalizePosProduct(product as unknown as Record<string, unknown>, categoryMap)
  );

  const { refetch: refetchProducts } = productsQuery;
  const { refetch: refetchCategories } = categoriesQuery;
  const { refetch: refetchCustomers } = customersQuery;
  const { refetch: refetchSalesStats } = salesStatsQuery;
  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      refetchProducts(),
      refetchCategories(),
      refetchCustomers(),
      refetchSalesStats(),
    ]);
  }, [refetchProducts, refetchCategories, refetchCustomers, refetchSalesStats]);

  const clearAllCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['pos'] });
  }, [queryClient]);

  return {
    products: normalizedProducts,
    categories,
    customers: Array.isArray(customersQuery.data) ? customersQuery.data : [],
    salesStats: (salesStatsQuery.data && typeof salesStatsQuery.data === 'object' && !Array.isArray(salesStatsQuery.data))
      ? salesStatsQuery.data
      : { total_sales: 0, transaction_count: 0, average_ticket: 0, top_selling_product: '' },
    loading,
    secondaryLoading,
    error,
    refetchAll,
    clearAllCache,
    isStale: productsQuery.isStale || categoriesQuery.isStale || customersQuery.isStale || salesStatsQuery.isStale,
  };
}

// Hook para precargar datos críticos
export function usePreloadCriticalData() {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId();

  const preloadData = useCallback(async () => {
    if (!organizationId) return;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        // Query key unificada con usePOSData para reutilizar cache
        queryKey: ['pos', 'products', organizationId ?? 'no-org'],
        queryFn: async () => {
          const res = await fetch('/api/pos/products?limit=500', {
            headers: { 'x-organization-id': organizationId }
          });
          if (!res.ok) {
            throw new Error(`POS products preload failed with status ${res.status}`);
          }

          const json = await res.json();
          if (json?.error) {
            throw new Error(String(json.error));
          }

          const items = json?.products || json?.data || [];
          return (Array.isArray(items) ? items : []).map((p: Record<string, unknown>) => ({
            ...p,
            category: p?.['category_name'] ? { id: p?.['category_id'], name: p?.['category_name'] } : p?.['category'],
          }));
        },
        staleTime: 2 * 60 * 1000,   // igual que usePOSData → reutiliza cache
        gcTime: 10 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        // Query key unificada con usePOSData para reutilizar cache
        queryKey: ['pos', 'categories', organizationId ?? 'no-org'],
        queryFn: async () => {
          const res = await fetch('/api/categories?limit=200&status=active', {
            headers: { 'x-organization-id': organizationId }
          });
          if (!res.ok) {
            throw new Error(`POS categories preload failed with status ${res.status}`);
          }

          const json = await res.json();
          if (json?.error) {
            throw new Error(String(json.error));
          }

          const items = json?.categories || json?.data || [];
          return Array.isArray(items) ? items : [];
        },
        staleTime: 5 * 60 * 1000,   // igual que usePOSData → reutiliza cache
        gcTime: 15 * 60 * 1000,
      }),
    ]);
  }, [organizationId, queryClient]);

  useEffect(() => {
    preloadData();
  }, [preloadData]);

  return { preloadData };
}

