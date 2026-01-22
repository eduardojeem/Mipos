// src/hooks/useSecureProducts.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { SecureSupabaseClient } from '@/lib/supabase-secure';
import { createClient as createPublicClient } from '@/lib/supabase';
import { getStockThresholds } from '@/lib/env';
import type { Database } from '@/types/supabase';
import { ProductWithRelations as Product, ProductFilters, ProductSort, QueryMetrics } from '@/types/product.unified';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';

// ---------- Tipos locales ----------
interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: ProductSort;
  filters?: ProductFilters;
  retryAttempts?: number;
  timeout?: number;
  useConnectionPool?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseSecureProductsOptions {
  enabled?: boolean;
  realtime?: boolean;
  enableRealtime?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
  showNotifications?: boolean;
  timeout?: number;
  useConnectionPool?: boolean;
  enableMetrics?: boolean;
  filters?: ProductFilters;
  countMode?: 'exact' | 'estimated' | 'planned';
  pageSize?: number;
  page?: number;
}

interface UseSecureProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  metrics: QueryMetrics[];

  fetchProducts: (options?: PaginationOptions) => Promise<void>;
  createProduct: (product: Database['public']['Tables']['products']['Insert']) => Promise<Product | null>;
  updateProduct: (id: string, updates: Database['public']['Tables']['products']['Update']) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;

  invalidateCache: () => void;
  getCacheMetrics: () => any;
  clearCache: () => void;

  refetch: (options?: PaginationOptions) => Promise<void>;
  total: number;
  hasMore: boolean;
  loadMore: () => void;
  cacheMetrics: () => any;

  subscribeToChanges: () => () => void;
}

// ---------- thresholds cache helpers ----------
let thresholdsCache: { low: number; critical: number } | null = null;
let thresholdsCacheTs = 0;
async function fetchStoreThresholds(client: any): Promise<{ low: number; critical: number } | null> {
  const now = Date.now();
  if (thresholdsCache && now - thresholdsCacheTs < 300_000) return thresholdsCache;
  try {
    const { data, error } = await client
      .from('store_settings')
      .select('low_stock_threshold, critical_stock_threshold')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const low = Number((data as any)?.low_stock_threshold);
    const critRaw = Number((data as any)?.critical_stock_threshold);
    const base = getStockThresholds();
    const resolvedLow = Number.isFinite(low) && low > 0 ? low : base.low;
    const resolvedCritical = Number.isFinite(critRaw) && critRaw > 0 ? critRaw : Math.max(1, Math.floor(resolvedLow / 2));
    thresholdsCache = { low: resolvedLow, critical: resolvedCritical };
    thresholdsCacheTs = now;
    return thresholdsCache;
  } catch {
    const fb = getStockThresholds();
    thresholdsCache = { low: fb.low, critical: fb.critical };
    thresholdsCacheTs = now;
    return thresholdsCache;
  }
}

// ---------- Utilidades: cache simple ----------
class ProductCache {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;
  private defaultTimeout: number;

  constructor(defaultTimeout: number = 5 * 60 * 1000) {
    this.defaultTimeout = defaultTimeout;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.data;
  }

  set<T>(key: string, data: T, timeout?: number): void {
    const expiresAt = Date.now() + (timeout ?? this.defaultTimeout);
    this.cache.set(key, { data, timestamp: Date.now(), expiresAt });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }

  getMetrics() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total === 0 ? 0 : this.hits / total
    };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }
}

// deterministic stringify (simple)
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

// single public supabase client for fallback
const publicSupabase = createPublicClient();

// ---------- small helpers ----------
function safeNumber(v: any, fallback = 1) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function escapeLike(str: string) {
  // escape % and _ for ilike patterns
  return str.replace(/[%_]/g, s => `\\${s}`);
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

// ---------- Hook principal (HÍBRIDA) ----------
export function useSecureProducts(options: UseSecureProductsOptions = {}): UseSecureProductsReturn {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ 
    page: options.page ?? 1, 
    pageSize: options.pageSize ?? 20, 
    total: 0, 
    totalPages: 1, 
    hasMore: false 
  });
  const [metrics, setMetrics] = useState<QueryMetrics[]>([]);

  const cacheRef = useRef<ProductCache>(new ProductCache(options.cacheTimeout ?? 5 * 60 * 1000));
  const supabaseRef = useRef<SecureSupabaseClient | null>(null);
  const subscriptionRef = useRef<() => void | null>(null);
  const mountedRef = useRef(true);
  const usingSecureRef = useRef(false);

  // Attempt to initialize SecureSupabaseClient, fallback to public client
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      if (!user) return;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) {
        console.warn('[useSecureProducts] Supabase env missing; using public client fallback');
        usingSecureRef.current = false;
        return;
      }

      try {
        // try to read session from public client
        let accessToken: string | undefined = undefined;
        try {
          const { data } = await publicSupabase.auth.getSession();
          accessToken = data?.session?.access_token ?? undefined;
        } catch (e) {
          // ignore session read errors (we still can proceed)
        }

        if (cancelled) return;

        supabaseRef.current = new SecureSupabaseClient({
          url: supabaseUrl,
          anonKey,
          jwtToken: accessToken,
          connectionPool: {
            maxConnections: 10,
            connectionTimeout: 30000,
            idleTimeout: 60000,
            retryAttempts: 3,
            retryDelay: 1000,
            enableAutoReconnect: true,
            reconnectInterval: 5000,
            maxReconnectAttempts: 5,
            heartbeatInterval: 30000
          },
          performance: { enableMetrics: Boolean(options.enableMetrics), slowQueryThreshold: 1000, maxRetries: 3 },
          security: { enableRLS: true, rowLevelSecurity: true, preparedStatements: true }
        });

        usingSecureRef.current = true;
        console.log('[useSecureProducts] SecureSupabaseClient initialized (hybrid mode)');
      } catch (err) {
        // fallback quietly to public client
        usingSecureRef.current = false;
        supabaseRef.current = null;
        console.warn('[useSecureProducts] SecureSupabaseClient init failed; falling back to public client', err);
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (subscriptionRef.current) subscriptionRef.current();
    };
  }, [user, options.enableMetrics]);

  // cache cleanup
  useEffect(() => {
    const id = setInterval(() => cacheRef.current.cleanup(), 60_000);
    return () => clearInterval(id);
  }, []);

  const generateCacheKey = useCallback((prefix: string, params: any) => `${prefix}:${stableStringify(params ?? {})}`, []);

  // Improved error handler: handles {} and nested supabase errors
  const handleError = useCallback((err: any, context = '') => {
    // Normalize common Supabase error shapes
    const nestedErr =
      err?.error ??
      err?.data?.error ??
      err?.message ??
      err?.details ??
      err?.hint ??
      (typeof err === 'object' && Object.keys(err).length === 0 ? 'Unknown Supabase error (empty object)' : null);

    const pretty = nestedErr ?? (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));

    // console for devs: include raw and pretty
    console.error(`[useSecureProducts] Error in ${context}:`, pretty, 'rawError:', err);

    if (mountedRef.current) setError(String(pretty));

    if (options.showNotifications !== false) {
      toast.error(String(pretty).slice(0, 260), { description: context, duration: 5000 });
    }
  }, [options.showNotifications]);

  // Core executor with timeout + retry
  async function executeWithTimeoutAndRetry<T>(
    fn: () => Promise<T>,
    timeout = 30_000,
    retries = 2,
    retryDelayBase = 300
  ): Promise<T> {
    let lastErr: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // timeout race
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Query timeout')), timeout))
        ]);
        return result as T;
      } catch (err) {
        lastErr = err;
        // last attempt -> throw
        if (attempt === retries) throw lastErr;
        // backoff
        await sleep(retryDelayBase * Math.pow(2, attempt));
      }
    }
    throw lastErr;
  }

  // sanitize and coerce pagination input
  const sanitizePagination = useCallback((p?: number, ps?: number) => {
    const page = safeNumber(p ?? pagination.page, 1);
    const pageSize = safeNumber(ps ?? pagination.pageSize, 20);
    return { page, pageSize };
  }, [pagination.page, pagination.pageSize]);

  // fetchProducts
  const fetchProducts = useCallback(async (opts?: PaginationOptions) => {
    // allow fetching even when not authenticated; RLS will enforce access

    // Merge options with state
    const requestedPage = opts?.page;
    const requestedPageSize = opts?.pageSize;
    const { page, pageSize } = sanitizePagination(requestedPage, requestedPageSize);
    const sortBy = opts?.sortBy ?? undefined;
    const filters = opts?.filters ?? options.filters ?? undefined;

    const cacheKey = generateCacheKey('products', { page, pageSize, sortBy, filters });
    const cached = cacheRef.current.get<{ products: Product[]; pagination: any }>(cacheKey);
    if (cached) {
      if (mountedRef.current) {
        setProducts(cached.products);
        setPagination(cached.pagination);
      }
      return;
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const offset = (page - 1) * pageSize;
      const client = supabaseRef.current?.getClient ? supabaseRef.current.getClient() : publicSupabase;

      // Build safe select clause
      let selectQuery = '*';
      const selectParts: string[] = ['*'];
      if (filters?.includeCategory) selectParts.push('category:categories!products_category_id_fkey(*)');
      selectQuery = selectParts.join(', ');
      let query: any = client.from('products').select(selectQuery, { count: options.countMode ?? 'exact' }).range(offset, offset + pageSize - 1);

      // guard and apply filters
      if (filters) {
        // category: prefer categoryId field name in filters
        if ((filters as any).categoryId) query = query.eq('category_id', (filters as any).categoryId);
        if ((filters as any).supplierId) query = query.eq('supplier_id', (filters as any).supplierId);
        // search: build safe OR for ilike; escape wildcards
        if ((filters as any).search) {
          const raw = String((filters as any).search).trim();
          if (raw.length > 0) {
            const escaped = escapeLike(raw);
            const orClause = `name.ilike.%${escaped}%,sku.ilike.%${escaped}%`;
            try {
              query = query.or(orClause);
            } catch (e) {
              query = query.ilike('name', `%${raw}%`).or(`sku.ilike.%${escaped}%`);
            }
          }
        }
        if ((filters as any).supplierName) {
          const raw = String((filters as any).supplierName).trim();
          if (raw.length > 0) {
            const escaped = escapeLike(raw);
            const { data: supIds } = await client.from('suppliers').select('id').ilike('name', `%${escaped}%`);
            const ids = (supIds || []).map((r: any) => r.id).filter(Boolean);
            if (ids.length === 0) {
              if (mountedRef.current) {
                setProducts([]);
                setPagination({ page, pageSize, total: 0, totalPages: 1, hasMore: false });
              }
              cacheRef.current.set(cacheKey, { products: [], pagination: { page, pageSize, total: 0, totalPages: 1, hasMore: false } }, options.cacheTimeout);
              return;
            }
            try {
              query = query.in('supplier_id', ids);
            } catch (e) {
              // ignore supplierName filter if type mismatch
            }
          }
        }
        if (Number.isFinite((filters as any).minPrice)) query = query.gte('sale_price', (filters as any).minPrice);
        if (Number.isFinite((filters as any).maxPrice)) query = query.lte('sale_price', (filters as any).maxPrice);
        if (Number.isFinite((filters as any).minStock)) query = query.gte('stock_quantity', (filters as any).minStock);
        if (Number.isFinite((filters as any).maxStock)) query = query.lte('stock_quantity', (filters as any).maxStock);
        if ((filters as any).isActive !== undefined) query = query.eq('is_active', (filters as any).isActive);
        if ((filters as any).createdAfter) query = query.gte('created_at', (filters as any).createdAfter);
        if ((filters as any).createdBefore) query = query.lte('created_at', (filters as any).createdBefore);

        // lowStock/outOfStock/inStock/critical semantics
        if ((filters as any).lowStock) {
          const t = await fetchStoreThresholds(client);
          const lowT = t?.low ?? (filters as any).lowStockThreshold ?? getStockThresholds().low;
          query = query.gt('stock_quantity', 0);
          query = query.lte('stock_quantity', lowT);
        }
        if ((filters as any).outOfStock) query = query.eq('stock_quantity', 0);
        if ((filters as any).inStock) query = query.gt('stock_quantity', 0);
        if ((filters as any).critical) {
          const t = await fetchStoreThresholds(client);
          const critT = t?.critical ?? (filters as any).criticalThreshold ?? getStockThresholds().critical;
          query = query.gt('stock_quantity', 0);
          query = query.lte('stock_quantity', critT);
        }
      }

      // apply sort safely
      if (sortBy?.field) {
        // Basic whitelist check: only allow certain fields to avoid SQL injection
        const allowedFields = new Set(['name', 'sku', 'sale_price', 'cost_price', 'stock_quantity', 'created_at', 'updated_at', 'category_id', 'supplier_id']);
        if (allowedFields.has(sortBy.field)) {
          query = query.order(sortBy.field, { ascending: sortBy.direction === 'asc' });
        } else {
          // ignore unknown sort field (safe fallback)
        }
      }

      // Execute with timeout + retry
      const timeout = opts?.timeout ?? options.timeout ?? 30_000;
      const retryAttempts = opts?.retryAttempts ?? options.retryAttempts ?? 2;

      const response = await executeWithTimeoutAndRetry(async () => {
        // Execute Supabase query directly
        const { data, error, count } = await query;

        if (error) throw error;

        const total = count || 0;
        const totalPages = Math.ceil(total / pageSize);

        return {
          list: data || [],
          pag: {
            page,
            pageSize,
            total,
            totalPages,
            hasMore: page < totalPages
          }
        } as any;
      }, timeout, retryAttempts);

      const list = (response as any)?.list || [];
      const pag = (response as any)?.pag || { page, pageSize, total: 0, totalPages: 1, hasMore: false };

      const result = { products: list as Product[], pagination: pag };

      if (mountedRef.current) {
        setProducts(result.products);
        setPagination(result.pagination);
      }

      // cache set
      cacheRef.current.set(cacheKey, result, options.cacheTimeout);

      // metrics
      try {
        const metricsFromClient = (supabaseRef.current as any)?.getMetrics?.() as QueryMetrics[] | undefined;
        if (metricsFromClient && metricsFromClient.length) setMetrics(prev => [...prev.slice(-9), ...metricsFromClient]);
      } catch {
        // ignore metrics retrieval errors
      }
    } catch (err) {
      try {
        const msg = String((err as any)?.message || (err as any)?.error || (err as any)?.details || '').toLowerCase();
        const offlineLikely = (typeof navigator !== 'undefined' && !navigator.onLine) || /offline|failed to fetch|network/.test(msg);
        if (offlineLikely) {
          const cached = cacheRef.current.get<{ products: Product[]; pagination: any }>(cacheKey);
          if (cached) {
            if (mountedRef.current) {
              setProducts(cached.products);
              setPagination(cached.pagination);
              setError(null);
            }
            return;
          }
          if (mountedRef.current) {
            setProducts([]);
            setPagination({ page, pageSize, total: 0, totalPages: 1, hasMore: false });
            setError(null);
          }
          return;
        }
      } catch { }
      handleError(err, 'fetchProducts');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [
    generateCacheKey,
    options.cacheTimeout,
    options.filters,
    options.timeout,
    options.retryAttempts,
    options.countMode,
    sanitizePagination,
    handleError
  ]);

  // create / update / delete with safe client usage
  const createProduct = useCallback(async (productData: any) => {
    if (!user) return null;
    if (!hasPermission('products', 'write')) {
      setError('Permiso insuficiente para crear productos');
      return null;
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticProduct = {
      ...productData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stock_quantity: productData.stock_quantity ?? 0,
      sale_price: productData.sale_price ?? 0,
      cost_price: productData.cost_price ?? 0,
    } as Product;

    setProducts(prev => [optimisticProduct, ...prev]);
    setLoading(true);
    setError(null);

    try {
      const { productsAPI } = await import('@/lib/api');
      const data = await productsAPI.create(productData);

      // Replace optimistic product with real one
      if (mountedRef.current) {
        setProducts(prev => prev.map(p => p.id === tempId ? (data as Product) : p));
      }

      cacheRef.current.invalidate('^products:');
      toast.success('Product created');
      return data as Product;
    } catch (err) {
      // Rollback
      if (mountedRef.current) {
        setProducts(prev => prev.filter(p => p.id !== tempId));
      }
      handleError(err, 'createProduct');
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, hasPermission, handleError]);

  const updateProduct = useCallback(async (id: string, updates: any) => {
    if (!user) return null;
    if (!hasPermission('products', 'write')) {
      setError('Permiso insuficiente para actualizar productos');
      return null;
    }

    // Optimistic update
    const previousProducts = [...products];
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } as Product : p));

    setLoading(true);
    setError(null);

    try {
      const { productsAPI } = await import('@/lib/api');
      const data = await productsAPI.update(id, updates);

      // Update with real server data
      if (mountedRef.current) {
        setProducts(prev => prev.map(p => p.id === id ? (data as Product) : p));
      }

      cacheRef.current.invalidate('^products:');
      toast.success('Product updated');
      return data as Product;
    } catch (err) {
      // Rollback
      if (mountedRef.current) {
        setProducts(previousProducts);
      }
      handleError(err, 'updateProduct');
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, hasPermission, handleError, products]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!user) return false;
    if (!hasPermission('products', 'write')) {
      setError('Permiso insuficiente para eliminar productos');
      return false;
    }

    // Optimistic update
    const previousProducts = [...products];
    setProducts(prev => prev.filter(p => p.id !== id));

    setLoading(true);
    setError(null);

    try {
      const { productsAPI } = await import('@/lib/api');
      await productsAPI.delete([id]);

      cacheRef.current.invalidate('^products:');
      toast.success('Product deleted');
      return true;
    } catch (err) {
      // Rollback
      if (mountedRef.current) {
        setProducts(previousProducts);
      }
      handleError(err, 'deleteProduct');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, hasPermission, handleError, products]);

  const invalidateCache = useCallback(() => {
    cacheRef.current.invalidate();
    toast.info('Cache invalidated');
  }, []);

  const getCacheMetrics = useCallback(() => cacheRef.current.getMetrics(), []);

  // realtime subscription using underlying client.channel if available
  const subscribeToChanges = useCallback(() => {
    const should = options.enableRealtime ?? options.realtime ?? false;
    if (!should) return () => { };
    const client = supabaseRef.current?.getClient ? supabaseRef.current.getClient() : publicSupabase;

    if (typeof (client as any).channel !== 'function') return () => { };

    const channel = (client as any).channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload: any) => {
        console.log('[useSecureProducts] Realtime payload', payload);
        cacheRef.current.invalidate('^products:');
        if (options.showNotifications !== false) {
          if (payload.eventType === 'INSERT') toast.success('New product added');
          if (payload.eventType === 'UPDATE') toast.info('Product updated');
          if (payload.eventType === 'DELETE') toast.warning('Product deleted');
        }
        // fetch current page (best-effort)
        fetchProducts({ page: pagination.page, pageSize: pagination.pageSize });
      })
      .subscribe();

    subscriptionRef.current = () => {
      try {
        if (typeof (client as any).removeChannel === 'function') (client as any).removeChannel(channel);
        else if (typeof channel.unsubscribe === 'function') channel.unsubscribe();
      } catch (e) {
        console.warn('[useSecureProducts] Could not remove channel', e);
      }
    };

    return subscriptionRef.current;
  }, [options.realtime, options.enableRealtime, options.showNotifications, pagination.page, pagination.pageSize, fetchProducts]);

  // auto-fetch on mount (or when user changes)
  useEffect(() => {
    if (options.enabled === false) return;
    fetchProducts();
  }, [options.enabled, fetchProducts]);

  // re-fetch when external page or pageSize options change
  useEffect(() => {
    if (options.page !== undefined || options.pageSize !== undefined) {
      const targetPage = options.page ?? pagination.page;
      const targetPageSize = options.pageSize ?? pagination.pageSize;
      fetchProducts({ page: targetPage, pageSize: targetPageSize });
    }
  }, [options.page, options.pageSize, fetchProducts, pagination.page, pagination.pageSize]);

  // re-fetch when internal page changes (for loadMore)
  useEffect(() => {
    if (options.page === undefined) {
      fetchProducts({ page: pagination.page, pageSize: pagination.pageSize });
    }
  }, [pagination.page, pagination.pageSize, fetchProducts, options.page]);

  // setup realtime
  useEffect(() => {
    const should = options.enableRealtime ?? options.realtime ?? false;
    if (!should) return;
    if (!user) return;
    const unsubscribe = subscribeToChanges();
    return () => { try { unsubscribe?.(); } catch { } };
  }, [options.realtime, options.enableRealtime, user, subscribeToChanges]);

  return {
    products,
    loading,
    error,
    pagination,
    metrics,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    invalidateCache,
    getCacheMetrics,
    subscribeToChanges,
    refetch: fetchProducts,
    total: pagination.total,
    hasMore: pagination.hasMore,
    loadMore: () => {
      if (!pagination.hasMore || loading) return;
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    },
    cacheMetrics: getCacheMetrics,
    clearCache: invalidateCache
  } as UseSecureProductsReturn;
}
