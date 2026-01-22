"use client";

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useCache, globalCache } from './use-cache';
import { getCacheConfig } from './use-cache-config';
import { api } from '@/lib/api';
import { isSupabaseActive } from '@/lib/env';
import { measureReportPerformance, trackReportUsage, isCancelError } from '@/lib/analytics';

// Report types
export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  since?: string;
  productId?: string;
  categoryId?: string;
  customerId?: string;
  supplierId?: string;
  userId?: string;
  status?: string;
}

export interface SalesReportData {
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalProfit: number;
    profitMargin: number;
  };
  salesByDate: Array<{
    date: string;
    sales: number;
    orders: number;
    profit: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    quantity: number;
    profit: number;
  }>;
  salesByCategory: Array<{
    category: string;
    sales: number;
    quantity: number;
  }>;
  salesByCustomer: Array<{
    customerId: string;
    customerName: string;
    sales: number;
    orders: number;
  }>;
}

export interface InventoryReportData {
  summary: {
    totalProducts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    averageStockLevel: number;
  };
  stockLevels: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    value: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  }>;
  categoryBreakdown: Array<{
    category: string;
    totalProducts: number;
    totalValue: number;
    averageStock: number;
  }>;
  stockMovements: Array<{
    date: string;
    productId: string;
    productName: string;
    type: 'in' | 'out';
    quantity: number;
    reason: string;
  }>;
}

export interface CustomerReportData {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    averageOrderValue: number;
    customerRetentionRate: number;
  };
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string;
  }>;
  customerSegments: Array<{
    segment: string;
    count: number;
    totalSpent: number;
    averageOrderValue: number;
  }>;
  acquisitionTrends: Array<{
    date: string;
    newCustomers: number;
    totalCustomers: number;
  }>;
}

export interface FinancialReportData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    grossMargin: number;
  };
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  expenseBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  profitTrends: Array<{
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  }>;
}

// Comparison report types
export type ComparisonDimension = 'overall' | 'product' | 'category';
export type ComparisonGroupBy = 'day' | 'month';
export type ComparisonDetails = boolean;

export interface ComparisonSummary {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  profitMargin: number;
}

export interface ComparisonReportData {
  periodA: {
    summary: ComparisonSummary;
    byDate: Array<{ key: string; orders: number; revenue: number; profit: number }>;
    byCategory?: Array<{ category: string; revenue: number; profit?: number }>;
    byProduct?: Array<{ id: string; name: string; quantity: number; revenue: number; profit?: number }>;
  };
  periodB: {
    summary: ComparisonSummary;
    byDate: Array<{ key: string; orders: number; revenue: number; profit: number }>;
    byCategory?: Array<{ category: string; revenue: number; profit?: number }>;
    byProduct?: Array<{ id: string; name: string; quantity: number; revenue: number; profit?: number }>;
  };
  deltas: {
    ordersChangePct: number;
    revenueChangePct: number;
    profitChangePct: number;
  };
}

export type ReportType = 'sales' | 'inventory' | 'customers' | 'financial' | 'compare';
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

// API functions
const API_BASE = '/api/reports';

// Helper to serialize filters into a stable cache key string
function ensureDefaultDateRange(filters: ReportFilter = {}): ReportFilter {
  const end = filters.endDate ? new Date(filters.endDate) : new Date();
  const start = filters.startDate
    ? new Date(filters.startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const next: ReportFilter = { ...filters };
  if (!filters.startDate) next.startDate = start.toISOString().split('T')[0];
  if (!filters.endDate) next.endDate = end.toISOString().split('T')[0];
  return next;
}

function serializeFilters(filters: ReportFilter = {}): string {
  const applied = ensureDefaultDateRange(filters);
  const entries: Array<[string, string | undefined]> = [
    ['startDate', applied.startDate],
    ['endDate', applied.endDate],
    ['since', applied.since],
    ['productId', applied.productId],
    ['categoryId', applied.categoryId],
    ['customerId', applied.customerId],
    ['supplierId', applied.supplierId],
    ['userId', applied.userId],
    ['status', applied.status],
  ];
  return entries
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

// Helper: resolve selected source from URL or localStorage
function getSelectedSource(): 'supabase' | 'backend' | null {
  try {
    const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const fromQs = qs?.get('source');
    if (fromQs === 'supabase' || fromQs === 'backend') return fromQs as any;
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('reports:source') : null;
    if (stored === 'supabase' || stored === 'backend') return stored as any;
    return null;
  } catch {
    return null;
  }
}

async function fetchReport<T>(
  type: ReportType,
  filters: ReportFilter = {},
  options?: { signal?: AbortSignal }
): Promise<T> {
  const appliedFilters = ensureDefaultDateRange(filters);
  const params: Record<string, string> = { type };
  if (appliedFilters.startDate) params.start_date = appliedFilters.startDate;
  if (appliedFilters.endDate) params.end_date = appliedFilters.endDate;
  if (appliedFilters.since) params.since = appliedFilters.since;
  if (appliedFilters.productId) params.productId = appliedFilters.productId;
  if (appliedFilters.categoryId) params.categoryId = appliedFilters.categoryId;
  if (appliedFilters.customerId) params.customerId = appliedFilters.customerId;
  if (appliedFilters.supplierId) params.supplierId = appliedFilters.supplierId;
  if (appliedFilters.userId) params.userId = appliedFilters.userId;
  if (appliedFilters.status) params.status = appliedFilters.status;
  // Gate para fast-path con Supabase: usar si está activo
  const selectedSource = getSelectedSource();
  const useSupabaseSource = isSupabaseActive() && (
    selectedSource === 'supabase' ||
    process.env.NEXT_PUBLIC_REPORTS_SOURCE === 'supabase' ||
    process.env.REPORTS_SOURCE === 'supabase'
  );
  if (useSupabaseSource) params.source = 'supabase';
  const reportKey = `reports:${type}`;
  // Estructura neutra para fallback en cancelaciones
  const emptyByType = {
    sales: {
      summary: {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalProfit: 0,
        profitMargin: 0,
      },
      salesByDate: [],
      topProducts: [],
      salesByCategory: [],
      salesByCustomer: [],
    },
    inventory: {
      summary: {
        totalProducts: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        averageStockLevel: 0,
      },
      stockLevels: [],
      categoryBreakdown: [],
      stockMovements: [],
    },
    customers: {
      summary: {
        totalCustomers: 0,
        activeCustomers: 0,
        newCustomers: 0,
        averageOrderValue: 0,
        customerRetentionRate: 0,
      },
      topCustomers: [],
      customerSegments: [],
      acquisitionTrends: [],
    },
    financial: {
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        grossMargin: 0,
      },
      revenueByMonth: [],
      expenseBreakdown: [],
      profitTrends: [],
    },
  } as const;
  try {
    const result = await trackReportUsage<T>(
      reportKey,
      () => measureReportPerformance<T>(
        reportKey,
        'fetch',
        async () => {
          const { data } = await api.get('/reports', { params, signal: options?.signal });
          const payload = (data && typeof data === 'object' && 'data' in data) ? (data as any).data : data;
          return payload as T;
        },
        { onCancel: () => emptyByType[type as keyof typeof emptyByType] as unknown as T }
      ),
      { filters }
    );
    return result;
  } catch (error: any) {
    const status = error?.response?.status ?? 0;
    // Neutral fallback en cancelaciones
    if (isCancelError(error)) {
      return emptyByType[type as keyof typeof emptyByType] as unknown as T;
    }
    const isDev = process.env.NODE_ENV !== 'production';
    // Fallback seguro en desarrollo: devolver estructura vacía para no romper la UI
    if (isDev && (status === 500 || status === 0)) {
      console.warn(`[reports] Backend error (${status}) for type="${type}". Returning safe empty dataset in dev.`);
      const empty = emptyByType[type as keyof typeof emptyByType] as unknown as T;
      return empty;
    }
    throw error;
  }
}

async function exportReport(
  type: ReportType,
  format: ExportFormat,
  filters: ReportFilter = {}
): Promise<Blob> {
  const reportKey = `reports:${type}`;
  const blob = await trackReportUsage<Blob>(
    reportKey,
    () => measureReportPerformance<Blob>(reportKey, 'export', async () => {
      // Use Next.js proxy: GET /api/reports/export?type=...&format=...&start_date=...&end_date=...
      const params: Record<string, string | undefined> = {
        type,
        format,
        start_date: filters.startDate,
        end_date: filters.endDate,
        since: filters.since,
        productId: filters.productId,
        categoryId: filters.categoryId,
        customerId: filters.customerId,
        supplierId: filters.supplierId,
        userId: filters.userId,
        status: filters.status,
      };
      const maxRetries = 3;
      let attempt = 0;
      let lastError: any = null;
      while (attempt < maxRetries) {
        try {
          const response = await api.get('/reports/export', {
            params,
            responseType: 'arraybuffer',
          });
          const contentType = response.headers['content-type'] || 'application/octet-stream';
          const buffer = response.data as ArrayBuffer;
          return new Blob([buffer], { type: contentType });
        } catch (err: any) {
          // No reintentar si fue cancelación explícita
          if (isCancelError(err)) throw err;
          const status = err?.response?.status ?? 0;
          const retriable = status === 0 || status === 429 || (status >= 500 && status < 600);
          if (!retriable || attempt === maxRetries - 1) {
            lastError = err;
            break;
          }
          // Exponential backoff con jitter pequeño
          const delayMs = Math.min(3000, 200 * Math.pow(2, attempt)) + Math.floor(Math.random() * 200);
          await new Promise((res) => setTimeout(res, delayMs));
          attempt += 1;
          lastError = err;
        }
      }
      throw lastError;
    }),
    { filters }
  );
  return blob;
}

// Export helpers for testing
export { serializeFilters };
export { exportReport };

async function getReportTypes(signal?: AbortSignal): Promise<Array<{ key: ReportType; label?: string; description?: string }>> {
  const { data } = await api.get('/reports/types', { signal });
  // Backend returns { success, data } or raw array; normalize to [{ key, label, description }]
  const raw = Array.isArray(data) ? data : (data && typeof data === 'object' && 'data' in data ? (data as any).data : []);
  const normalized = Array.isArray(raw)
    ? raw
        .map((t: any) => ({
          key: (t?.key ?? t?.id) as ReportType,
          label: t?.label ?? t?.name ?? (t?.key ?? t?.id),
          description: t?.description ?? '',
        }))
        .filter((t) => Boolean(t.key))
    : [];
  return normalized;
}

// Custom hooks
export function useSalesReport(
  filters: ReportFilter = {},
  options?: { initialFetch?: boolean; refreshOnFocus?: boolean; enabled?: boolean }
) {
  const applied = ensureDefaultDateRange(filters);
  const src = getSelectedSource() || (process.env.NEXT_PUBLIC_REPORTS_SOURCE === 'supabase' ? 'supabase' : 'backend');
  const key = `reports:sales:src=${src}?${serializeFilters(applied)}`;
  const cache = useCache<SalesReportData>(
    key,
    (signal) => fetchReport<SalesReportData>('sales', applied, { signal }),
    {
      endpoint: '/api/reports?type=sales',
      enabled: options?.enabled ?? true,
      initialFetch: options?.initialFetch ?? true,
      refreshOnFocus: options?.refreshOnFocus ?? true,
    }
  );

  // Stale-while-revalidate: si hay datos en caché para este key, refrescar en background
  useEffect(() => {
    if (globalCache.has(key)) {
      const id = setTimeout(() => {
        cache.refresh();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [key, cache]);

  return cache;
}

export function useInventoryReport(
  filters: ReportFilter = {},
  options?: { initialFetch?: boolean; refreshOnFocus?: boolean; enabled?: boolean }
) {
  const applied = ensureDefaultDateRange(filters);
  const src = getSelectedSource() || (process.env.NEXT_PUBLIC_REPORTS_SOURCE === 'supabase' ? 'supabase' : 'backend');
  const key = `reports:inventory:src=${src}?${serializeFilters(applied)}`;
  const cache = useCache<InventoryReportData>(
    key,
    (signal) => fetchReport<InventoryReportData>('inventory', applied, { signal }),
    {
      endpoint: '/api/reports?type=inventory',
      enabled: options?.enabled ?? true,
      initialFetch: options?.initialFetch ?? true,
      refreshOnFocus: options?.refreshOnFocus ?? true,
    }
  );

  // Stale-while-revalidate: si hay datos en caché para este key, refrescar en background
  useEffect(() => {
    if (globalCache.has(key)) {
      const id = setTimeout(() => {
        cache.refresh();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [key, cache]);

  return cache;
}

export function useCustomerReport(
  filters: ReportFilter = {},
  options?: { initialFetch?: boolean; refreshOnFocus?: boolean; enabled?: boolean }
) {
  const applied = ensureDefaultDateRange(filters);
  const src = getSelectedSource() || (process.env.NEXT_PUBLIC_REPORTS_SOURCE === 'supabase' ? 'supabase' : 'backend');
  return useCache<CustomerReportData>(
    `reports:customers:src=${src}?${serializeFilters(applied)}`,
    (signal) => fetchReport<CustomerReportData>('customers', applied, { signal }),
    {
      endpoint: '/api/reports?type=customers',
      enabled: options?.enabled ?? true,
      initialFetch: options?.initialFetch ?? true,
      refreshOnFocus: options?.refreshOnFocus ?? true,
    }
  );
}

export function useFinancialReport(
  filters: ReportFilter = {},
  options?: { initialFetch?: boolean; refreshOnFocus?: boolean; enabled?: boolean }
) {
  const applied = ensureDefaultDateRange(filters);
  const src = getSelectedSource() || (process.env.NEXT_PUBLIC_REPORTS_SOURCE === 'supabase' ? 'supabase' : 'backend');
  return useCache<FinancialReportData>(
    `reports:financial:src=${src}?${serializeFilters(applied)}`,
    (signal) => fetchReport<FinancialReportData>('financial', applied, { signal }),
    {
      endpoint: '/api/reports?type=financial',
      enabled: options?.enabled ?? true,
      initialFetch: options?.initialFetch ?? true,
      refreshOnFocus: options?.refreshOnFocus ?? true,
    }
  );
}

// Fetch comparison report
async function fetchComparisonReport(
  periodA: { startDate: string; endDate: string } & ReportFilter,
  periodB: { startDate: string; endDate: string } & ReportFilter,
  opts: { dimension?: ComparisonDimension; groupBy?: ComparisonGroupBy; details?: ComparisonDetails } = {},
  options?: { signal?: AbortSignal }
): Promise<ComparisonReportData> {
  const reportKey = `reports:compare:${opts.dimension || 'overall'}:${opts.groupBy || 'day'}:${opts.details !== false}`;
  const params: Record<string, string> = {
    start_date_a: periodA.startDate,
    end_date_a: periodA.endDate,
    start_date_b: periodB.startDate,
    end_date_b: periodB.endDate,
    dimension: opts.dimension || 'overall',
    groupBy: opts.groupBy || 'day',
    details: String(opts.details !== false),
  };
  const shared = ['productId', 'categoryId', 'customerId', 'supplierId', 'userId'] as const;
  shared.forEach((key) => {
    const aVal = (periodA as any)[key];
    const bVal = (periodB as any)[key];
    const val = aVal ?? bVal;
    if (val) params[key] = String(val);
  });

  const selectedSource = getSelectedSource();
  if (isSupabaseActive() && selectedSource === 'supabase') {
    params.source = 'supabase';
  }
  const result = await trackReportUsage<ComparisonReportData>(
    reportKey,
    () => measureReportPerformance<ComparisonReportData>(
      reportKey,
      'fetch',
      async () => {
        const { data } = await api.get('/reports/compare', { params, signal: options?.signal });
        const payload = (data && typeof data === 'object' && 'data' in data) ? (data as any).data : data;
        return payload as ComparisonReportData;
      },
      {
        onCancel: () => ({
          periodA: {
            summary: {
              totalOrders: 0,
              totalRevenue: 0,
              totalProfit: 0,
              averageOrderValue: 0,
              profitMargin: 0,
            },
            byDate: [],
            byCategory: [],
            byProduct: [],
          },
          periodB: {
            summary: {
              totalOrders: 0,
              totalRevenue: 0,
              totalProfit: 0,
              averageOrderValue: 0,
              profitMargin: 0,
            },
            byDate: [],
            byCategory: [],
            byProduct: [],
          },
          deltas: {
            ordersChangePct: 0,
            revenueChangePct: 0,
            profitChangePct: 0,
          },
        }) as ComparisonReportData,
      }
    ),
    { filters: { periodA, periodB, opts } }
  );
  return result;
}

export function useCompareReports(
  periodA: { startDate: string; endDate: string } & ReportFilter,
  periodB: { startDate: string; endDate: string } & ReportFilter,
  opts: { dimension?: ComparisonDimension; groupBy?: ComparisonGroupBy; details?: ComparisonDetails } = {},
  options?: { initialFetch?: boolean; refreshOnFocus?: boolean; enabled?: boolean }
) {
  // Progressive loading: fetch base (details=false) then enrich with breakdowns when needed
  const wantsBreakdown = (opts.details ?? true) && (opts.dimension === 'category' || opts.dimension === 'product');
  const detailsFlagInitial = wantsBreakdown ? false : (opts.details ?? true);
  const [detailsFlag, setDetailsFlag] = React.useState<boolean>(detailsFlagInitial);

  const key = `reports:compare?A=${periodA.startDate}-${periodA.endDate}&B=${periodB.startDate}-${periodB.endDate}&d=${opts.dimension || 'overall'}&g=${opts.groupBy || 'day'}&details=${detailsFlag}`;
  const cache = useCache<ComparisonReportData>(
    key,
    (signal) => fetchComparisonReport(periodA, periodB, { ...opts, details: detailsFlag }, { signal }),
    {
      endpoint: '/api/reports/compare',
      enabled: options?.enabled ?? true,
      initialFetch: options?.initialFetch ?? true,
      refreshOnFocus: options?.refreshOnFocus ?? true,
    }
  );

  React.useEffect(() => {
    if (wantsBreakdown && !detailsFlag && cache.data && !cache.loading && !cache.updating) {
      setDetailsFlag(true); // trigger second fetch with breakdowns
    }
  }, [wantsBreakdown, cache.data, cache.loading, cache.updating, detailsFlag]);

  return cache;
}

export function useReportTypes() {
  return useCache(
    'report-types',
    (signal) => getReportTypes(signal),
    {
      endpoint: '/api/reports/types',
      enabled: true,
    }
  );
}

// Export hook
export function useReportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportReportFile = useCallback(async (
    type: ReportType,
    format: ExportFormat,
    filters: ReportFilter = {}
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      const blob = await exportReport(type, format, filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : format;
      link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportComparison = useCallback(async (
    format: ExportFormat,
    periodA: { startDate: string; endDate: string } & ReportFilter,
    periodB: { startDate: string; endDate: string } & ReportFilter,
    opts: { dimension?: ComparisonDimension; groupBy?: ComparisonGroupBy; details?: ComparisonDetails } = {}
  ) => {
    setIsExporting(true);
    setError(null);
    try {
      const params: Record<string, string | undefined> = {
        type: 'compare',
        format,
        start_date_a: periodA.startDate,
        end_date_a: periodA.endDate,
        start_date_b: periodB.startDate,
        end_date_b: periodB.endDate,
        dimension: opts.dimension || 'overall',
        groupBy: opts.groupBy || 'day',
        details: String(opts.details !== false),
        productId: periodA.productId ?? periodB.productId,
        categoryId: periodA.categoryId ?? periodB.categoryId,
        customerId: periodA.customerId ?? periodB.customerId,
        supplierId: periodA.supplierId ?? periodB.supplierId,
        userId: periodA.userId ?? periodB.userId,
      };
      const response = await api.get('/reports/export', {
        params,
        responseType: 'arraybuffer',
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const buffer = response.data as ArrayBuffer;
      const blob = new Blob([buffer], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : format;
      link.download = `compare-report-${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportReport: exportReportFile,
    exportComparison,
    isExporting,
    error,
  };
}

// Combined reports hook with progressive loading
export function useReports(filters: ReportFilter = {}) {
  const [loadedReports, setLoadedReports] = useState<Set<string>>(new Set());
  const [debouncedFilters, setDebouncedFilters] = useState<ReportFilter>(filters);

  // Debounce de cambios de filtros para evitar ráfagas de requests
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), 200);
    return () => clearTimeout(t);
  }, [filters]);

  // Load sales first (most important)
  const salesReport = useSalesReport(debouncedFilters, {
    enabled: true,
    initialFetch: true,
    refreshOnFocus: false,
  });

  // Load inventory in paralelo
  const inventoryReport = useInventoryReport(debouncedFilters, {
    enabled: true,
    initialFetch: true,
    refreshOnFocus: false,
  });

  // Load customer en paralelo
  const customerReport = useCustomerReport(debouncedFilters, {
    enabled: true,
    initialFetch: true,
    refreshOnFocus: false,
  });

  // Load financial en paralelo
  const financialReport = useFinancialReport(debouncedFilters, {
    enabled: true,
    initialFetch: true,
    refreshOnFocus: false,
  });

  // Prefetch en reposo: precargar el preset "Últimos 7 días" para mejorar navegación
  useEffect(() => {
    const idle = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback
      : (cb: Function) => setTimeout(cb as any, 500);

    const abortController = new AbortController();
    const doPrefetch = async () => {
      try {
        const nextFilters = DATE_PRESETS.last7Days.getValue();
        const applied = ensureDefaultDateRange(nextFilters);
        const src = getSelectedSource() || (process.env.NEXT_PUBLIC_REPORTS_SOURCE === 'supabase' ? 'supabase' : 'backend');

        const makeParams = (type: ReportType) => {
          const params: Record<string, string> = { type } as any;
          if (applied.startDate) params.start_date = applied.startDate;
          if (applied.endDate) params.end_date = applied.endDate;
          if (applied.since) params.since = applied.since;
          if (applied.productId) params.productId = String(applied.productId);
          if (applied.categoryId) params.categoryId = String(applied.categoryId);
          if (applied.customerId) params.customerId = String(applied.customerId);
          if (applied.supplierId) params.supplierId = String(applied.supplierId);
          if (applied.userId) params.userId = String(applied.userId);
          if (applied.status) params.status = String(applied.status);
          if (isSupabaseActive() && src === 'supabase') params.source = 'supabase';
          return params;
        };

        const entries: Array<{ type: ReportType; endpoint: string }> = [
          { type: 'sales', endpoint: '/api/reports?type=sales' },
          { type: 'inventory', endpoint: '/api/reports?type=inventory' },
          { type: 'customers', endpoint: '/api/reports?type=customers' },
          { type: 'financial', endpoint: '/api/reports?type=financial' },
        ];

        await Promise.allSettled(entries.map(async ({ type, endpoint }) => {
          const key = `reports:${type}:src=${src}?${serializeFilters(applied)}`;
          if (globalCache.has(key)) return;
          const params = makeParams(type);
          const { data } = await api.get('/reports', { params, signal: abortController.signal });
          const payload = (data && typeof data === 'object' && 'data' in data) ? (data as any).data : data;
          const ttl = getCacheConfig(endpoint).ttl;
          globalCache.set(key, payload, ttl);
        }));
      } catch (e) {
        // No bloquear UI; el prefetch es oportunista
        // console.warn('Prefetch reports failed', e);
      }
    };

    const handle = idle(doPrefetch);
    return () => {
      if ((window as any).cancelIdleCallback && typeof (window as any).cancelIdleCallback === 'function') {
        try { (window as any).cancelIdleCallback(handle); } catch {}
      }
      abortController.abort();
    };
  }, [debouncedFilters]);

  // Track loaded reports
  useEffect(() => {
    if (salesReport.data && !loadedReports.has('sales')) {
      setLoadedReports(prev => new Set([...prev, 'sales']));
    }
  }, [salesReport.data, loadedReports]);

  useEffect(() => {
    if (inventoryReport.data && !loadedReports.has('inventory')) {
      setLoadedReports(prev => new Set([...prev, 'inventory']));
    }
  }, [inventoryReport.data, loadedReports]);

  useEffect(() => {
    if (customerReport.data && !loadedReports.has('customer')) {
      setLoadedReports(prev => new Set([...prev, 'customer']));
    }
  }, [customerReport.data, loadedReports]);

  useEffect(() => {
    if (financialReport.data && !loadedReports.has('financial')) {
      setLoadedReports(prev => new Set([...prev, 'financial']));
    }
  }, [financialReport.data, loadedReports]);

  const isLoading = salesReport.loading ||
                    inventoryReport.loading ||
                    customerReport.loading ||
                    financialReport.loading;

  const error = salesReport.error ||
                inventoryReport.error ||
                customerReport.error ||
                financialReport.error;

  const refetchAll = useCallback(() => {
    setLoadedReports(new Set());
    salesReport.refresh();
    inventoryReport.refresh();
    customerReport.refresh();
    financialReport.refresh();
  }, [salesReport, inventoryReport, customerReport, financialReport]);

  return {
    sales: salesReport,
    inventory: inventoryReport,
    customer: customerReport,
    financial: financialReport,
    isLoading,
    error,
    refetchAll,
    loadedReports: Array.from(loadedReports),
  };
}

// Date range presets
export const DATE_PRESETS = {
  today: {
    label: 'Hoy',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      return { startDate: today, endDate: today };
    },
  },
  yesterday: {
    label: 'Ayer',
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = yesterday.toISOString().split('T')[0];
      return { startDate: date, endDate: date };
    },
  },
  thisWeek: {
    label: 'Esta semana',
    getValue: () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    },
  },
  lastWeek: {
    label: 'Semana pasada',
    getValue: () => {
      const today = new Date();
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return {
        startDate: startOfLastWeek.toISOString().split('T')[0],
        endDate: endOfLastWeek.toISOString().split('T')[0],
      };
    },
  },
  last7Days: {
    label: 'Últimos 7 días',
    getValue: () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return {
        startDate: sevenDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    },
  },
  last30Days: {
    label: 'Últimos 30 días',
    getValue: () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    },
  },
  last90Days: {
    label: 'Últimos 90 días',
    getValue: () => {
      const today = new Date();
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      return {
        startDate: ninetyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    },
  },
  thisMonth: {
    label: 'Este mes',
    getValue: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    },
  },
  lastMonth: {
    label: 'Mes pasado',
    getValue: () => {
      const today = new Date();
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: startOfLastMonth.toISOString().split('T')[0],
        endDate: endOfLastMonth.toISOString().split('T')[0],
      };
    },
  },
  thisYear: {
    label: 'Este año',
    getValue: () => {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return {
        startDate: startOfYear.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    },
  },
  lastYear: {
    label: 'Año pasado',
    getValue: () => {
      const today = new Date();
      const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
      return {
        startDate: startOfLastYear.toISOString().split('T')[0],
        endDate: endOfLastYear.toISOString().split('T')[0],
      };
    },
  },
};
