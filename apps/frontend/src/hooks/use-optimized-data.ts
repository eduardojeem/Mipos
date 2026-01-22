'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

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

// Cache global para compartir entre componentes
const globalCache = new Map<string, CacheEntry<any>>();
// Nuevo: deduplicación de peticiones en vuelo por cacheKey
const inflightRequests = new Map<string, Promise<any>>();

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
  const supabase = createClient();

  const productsQuery = useQuery({
    queryKey: ['pos', 'products'],
    queryFn: async () => {
      // Primario: consulta directa sin relaciones anidadas
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (!error && Array.isArray(data)) {
        return data;
      }

      console.warn('[POS] Supabase products query failed, falling back to API:', (error as any)?.message || error);

      // Fallback: API protegida del POS
      try {
        const res = await fetch('/api/pos/products?limit=500');
        if (res.ok) {
          const json = await res.json();
          const items = json?.products || json?.data || [];
          // Mapear nombre de categoría si viene del API
          return (Array.isArray(items) ? items : []).map((p: any) => ({
            ...p,
            category: p?.category_name ? { id: p?.category_id, name: p?.category_name } : undefined,
          }));
        }
        console.error('[POS] Fallback API /api/pos/products responded with status', res.status);
      } catch (apiErr) {
        console.error('[POS] Fallback API /api/pos/products error:', apiErr);
      }

      // Si todo falla, propagar el error original para manejo superior
      if (error) {
        const anyErr: any = error as any;
        console.error('Error fetching products in usePOSData:', error);
        console.error('Supabase error props:', {
          message: anyErr?.message,
          code: anyErr?.code,
          details: anyErr?.details,
          hint: anyErr?.hint,
        });
        try { console.error('Error details:', JSON.stringify(error, null, 2)); } catch { }
        throw error;
      }
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ['pos', 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const customersQuery = useQuery({
    queryKey: ['pos', 'customers'],
    queryFn: async () => {
      // Intento 1: Supabase directo
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name'); // Cambiado de full_name a name para mayor seguridad

      if (!error && Array.isArray(data)) {
        return data;
      }

      console.warn('[POS] Supabase customers query failed, falling back to API:', error?.message);

      // Intento 2: Fallback a API
      try {
        const res = await fetch('/api/customers');
        if (res.ok) {
          const json = await res.json();
          return json?.data || json || [];
        }
      } catch (apiErr) {
        console.error('[POS] Fallback API /api/customers error:', apiErr);
      }

      if (error) throw error;
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const salesStatsQuery = useQuery({
    queryKey: ['pos', 'sales-stats'],
    queryFn: async () => {
      const res = await fetch('/api/sales-stats');
      if (!res.ok) {
        throw new Error(`Sales stats API error: ${res.status}`);
      }
      const json = await res.json();
      const obj = (json && typeof json === 'object' && !Array.isArray(json))
        ? (json.stats ?? json.data ?? json)
        : {};
      return obj;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const loading = productsQuery.isLoading || categoriesQuery.isLoading || customersQuery.isLoading || salesStatsQuery.isLoading;
  const error = productsQuery.error || categoriesQuery.error || customersQuery.error || salesStatsQuery.error;

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
    queryClient.removeQueries({ queryKey: ['pos', 'products'] });
    queryClient.removeQueries({ queryKey: ['pos', 'categories'] });
    queryClient.removeQueries({ queryKey: ['pos', 'customers'] });
    queryClient.removeQueries({ queryKey: ['pos', 'sales-stats'] });
  }, [queryClient]);

  return {
    products: Array.isArray(productsQuery.data) ? productsQuery.data : [],
    categories: Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [],
    customers: Array.isArray(customersQuery.data) ? customersQuery.data : [],
    salesStats: (salesStatsQuery.data && typeof salesStatsQuery.data === 'object' && !Array.isArray(salesStatsQuery.data))
      ? salesStatsQuery.data
      : { total_sales: 0, transaction_count: 0, average_ticket: 0, top_selling_product: '' },
    loading,
    error,
    refetchAll,
    clearAllCache,
    isStale: productsQuery.isStale || categoriesQuery.isStale || customersQuery.isStale || salesStatsQuery.isStale,
  };
}

// Hook para precargar datos críticos
export function usePreloadCriticalData() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const preloadData = useCallback(async () => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['pos', 'products'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name');

          if (!error && Array.isArray(data)) return data;

          try {
            const res = await fetch('/api/pos/products?limit=500');
            if (res.ok) {
              const json = await res.json();
              const items = json?.products || json?.data || [];
              return (Array.isArray(items) ? items : []).map((p: any) => ({
                ...p,
                category: p?.category_name ? { id: p?.category_id, name: p?.category_name } : undefined,
              }));
            }
          } catch { }
          if (error) throw error;
          return data || [];
        },
        staleTime: 10 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['pos', 'categories'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

          if (error) throw error;
          return data || [];
        },
        staleTime: 15 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
      }),
    ]);
  }, [queryClient, supabase]);

  useEffect(() => {
    preloadData();
  }, [preloadData]);

  return { preloadData };
}
