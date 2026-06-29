import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '@/lib/api'
import { getSupabaseClient } from '@/lib/supabase-singleton'
import { isSupabaseActive } from '@/lib/env'
import { useAuth } from '@/hooks/use-auth'
import type { DashboardOverviewData, DashboardSummaryData } from '@/lib/dashboard/types'
import type { StockAlertItem, StockAlertsResponse } from '@/lib/stock-alerts'

export interface DashboardStats {
  todaySales: number
  monthSales: number
  lowStockCount: number
  activeCustomers: number
  averageTicket: number
  efficiency: number
  salesPerHour: number
  previousDaySales?: number
  previousMonthSales?: number
  growthRate?: number
  totalProducts: number
  pendingOrders: number
  customerSatisfaction: number
  conversionRate: number
}

export interface RecentSale {
  id: string
  total: number
  payment_method: string
  created_at: string
  customer_name?: string
  items_count?: number
}

export interface TopProduct {
  id: string
  name: string
  sales_count: number
  revenue: number
  category?: string
  image?: string
}

export interface LowStockProduct {
  id: string
  name: string
  current_stock: number
  min_stock: number
  category?: string
  urgency?: 'high' | 'medium' | 'low'
}

interface DashboardData {
  stats: DashboardStats
  recentSales: RecentSale[]
  topProducts: TopProduct[]
  lowStockProducts: LowStockProduct[]
}

interface UseDashboardDataOptions {
  refreshInterval?: number
  enableRealtime?: boolean
  cacheTimeout?: number
}

interface CacheEntry {
  data: DashboardData
  timestamp: number
  expiresAt: number
}

interface RequestOptions {
  signal?: AbortSignal
}

interface DashboardOverviewApiResponse {
  success?: boolean
  data?: DashboardOverviewData
}

interface DashboardSummaryApiResponse {
  success?: boolean
  data?: DashboardSummaryData
}

// Cache global para datos del dashboard
const dashboardCache = new Map<string, CacheEntry>()
const inflightRequests = new Map<string, Promise<DashboardData>>()

function buildEmptyStats(): DashboardStats {
  return {
    todaySales: 0,
    monthSales: 0,
    lowStockCount: 0,
    activeCustomers: 0,
    averageTicket: 0,
    efficiency: 0,
    salesPerHour: 0,
    previousDaySales: 0,
    previousMonthSales: 0,
    growthRate: 0,
    totalProducts: 0,
    pendingOrders: 0,
    customerSatisfaction: 0,
    conversionRate: 0
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isCanceledError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { code?: string; name?: string }
    return maybeError.code === 'ERR_CANCELED' || maybeError.name === 'CanceledError'
  }

  return false
}

function mapOverviewToStats(
  overview: DashboardOverviewData | null | undefined,
  overrides: Partial<DashboardStats> = {}
): DashboardStats {
  const base = buildEmptyStats()

  if (!overview) {
    return {
      ...base,
      ...overrides
    }
  }

  const todaySales = toNumber(overview.todaySales)
  const todaySalesCount = toNumber(overview.todaySalesCount)
  const previousMonthSales = toNumber(overrides.previousMonthSales)
  const monthSales = toNumber(overview.monthSales)

  return {
    ...base,
    todaySales,
    monthSales,
    lowStockCount: toNumber(overview.lowStockCount),
    activeCustomers: toNumber(overview.totalCustomers),
    averageTicket: toNumber(overview.averageTicket) || (todaySalesCount > 0 ? todaySales / todaySalesCount : 0),
    previousDaySales: toNumber(overrides.previousDaySales),
    previousMonthSales,
    growthRate: previousMonthSales > 0
      ? ((monthSales - previousMonthSales) / previousMonthSales) * 100
      : 0,
    totalProducts: toNumber(overview.totalProducts),
    pendingOrders: toNumber(overview.activeOrders),
    customerSatisfaction: toNumber(overrides.customerSatisfaction),
    conversionRate: toNumber(overrides.conversionRate),
    efficiency: toNumber(overrides.efficiency),
    salesPerHour: toNumber(overrides.salesPerHour)
  }
}

function mapOverviewToRecentSales(
  overview: DashboardOverviewData | null | undefined,
  limit: number
): RecentSale[] {
  return (overview?.recentSales ?? [])
    .slice(0, limit)
    .map((sale) => ({
      id: sale.id,
      total: toNumber(sale.total),
      payment_method: String(sale.payment_method || 'cash'),
      created_at: sale.created_at,
      customer_name: sale.customer_name || 'Cliente General',
      items_count: 0
    }))
}

function mapSummaryToTopProducts(
  summary: DashboardSummaryData | null | undefined,
  limit: number
): TopProduct[] {
  return (summary?.topProducts ?? [])
    .slice(0, limit)
    .map((product) => ({
      id: product.id,
      name: product.name,
      sales_count: toNumber(product.sales),
      revenue: toNumber(product.revenue),
      category: product.category || undefined
    }))
}

function mapStockAlertSeverityToUrgency(
  severity: StockAlertItem['severity']
): LowStockProduct['urgency'] {
  switch (severity) {
    case 'critical':
      return 'high'
    case 'low':
      return 'medium'
    default:
      return 'low'
  }
}

function mapStockAlertsToLowStockProducts(
  response: StockAlertsResponse | null | undefined,
  limit: number
): LowStockProduct[] {
  return (response?.alerts ?? response?.data ?? [])
    .slice(0, limit)
    .map((alert) => ({
      id: alert.productId || alert.id,
      name: alert.productName,
      current_stock: toNumber(alert.currentStock),
      min_stock: toNumber(alert.minThreshold),
      category: alert.category || 'Sin categoria',
      urgency: mapStockAlertSeverityToUrgency(alert.severity)
    }))
}

/**
 * Helper: extrae el organizationId de localStorage de forma segura.
 * Centralizado para evitar duplicación en cada función.
 */
function getOrganizationId(): string | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem('selected_organization')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return parsed?.id || parsed?.organization_id || null
    } catch {
      return raw
    }
  } catch {
    return null
  }
}

/**
 * Helper: normaliza la lista de top productos proveniente del endpoint REST.
 * Evita duplicar el mismo bloque any[] en múltiples lugares.
 */
function normalizeTopProducts(rawList: unknown, limit: number): TopProduct[] {
  const list: unknown[] = Array.isArray(rawList) ? rawList : []
  return list
    .map((item) => {
      const p = item as Record<string, unknown>
      return {
        id: String(p['id'] ?? p['productId'] ?? ''),
        name: String(p['name'] ?? 'Producto desconocido'),
        sales_count: Number(p['totalQuantity'] ?? (p['_sum'] as Record<string, unknown>)?.['quantity'] ?? 0),
        revenue: Number(p['totalRevenue'] ?? 0),
        category: p['category'] ? String(p['category']) : undefined,
        image: p['image'] ? String(p['image']) : undefined,
      } satisfies TopProduct
    })
    .slice(0, limit)
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const {
    refreshInterval = 30000, // 30 segundos
    enableRealtime = true,
    cacheTimeout = 120000
  } = options

  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>({
    stats: buildEmptyStats(),
    recentSales: [],
    topProducts: [],
    lowStockProducts: []
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Track whether the initial load has completed — background refreshes
  // should not show the full loading state to avoid the "page reloads" UX.
  const initialLoadDoneRef = useRef(false)

  // Generar clave de cache basada en el usuario
  const cacheKey = useMemo(() => {
    return `dashboard_${user?.id || 'anonymous'}`
  }, [user?.id])

  // Función para obtener datos desde cache
  const getFromCache = useCallback((): DashboardData | null => {
    const cached = dashboardCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }
    return null
  }, [cacheKey])

  // Función para guardar en cache
  const saveToCache = useCallback((data: DashboardData) => {
    const now = Date.now()
    dashboardCache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + cacheTimeout
    })
  }, [cacheKey, cacheTimeout])

  const loadOverviewResponse = useCallback(async (requestOptions: RequestOptions = {}): Promise<DashboardOverviewData | null> => {
    const { data: response } = await api.get<DashboardOverviewApiResponse>('/dashboard/overview', {
      signal: requestOptions.signal
    })
    return response?.data ?? null
  }, [])

  const loadSummaryResponse = useCallback(async (
    range: '24h' | '7d' | '30d' | '90d' | '1y' = '30d',
    requestOptions: RequestOptions = {}
  ): Promise<DashboardSummaryData | null> => {
    const { data: response } = await api.get<DashboardSummaryApiResponse>('/dashboard/summary', {
      params: { range },
      signal: requestOptions.signal
    })
    return response?.data ?? null
  }, [])

  const loadDashboardStats = useCallback(async (requestOptions: RequestOptions = {}): Promise<DashboardStats> => {
    if (isSupabaseActive()) {
      try {
        const [overview, summary] = await Promise.all([
          loadOverviewResponse(requestOptions),
          loadSummaryResponse('30d', requestOptions)
        ])

        return mapOverviewToStats(overview, {
          previousMonthSales: toNumber(summary?.totals.previousRevenue)
        })
      } catch (error) {
        if (isCanceledError(error)) {
          throw error
        }
      }
    }

    try {
      const [{ data: dash }, { data: today }] = await Promise.all([
        api.get('/dashboard/stats', { signal: requestOptions.signal }).catch(() => ({ data: null })),
        api.get('/sales-stats/today', { signal: requestOptions.signal }).catch(() => ({ data: null }))
      ])
      const d = dash?.data || {}
      const t = today?.data || {}
      const monthTotal = Number(d?.thisMonthSales?.total || 0)
      const lastMonthTotal = Number(d?.lastMonthSales?.total || 0)
      const todayTotal = Number(t?.totalRevenue || 0)
      return {
        todaySales: todayTotal,
        monthSales: monthTotal,
        lowStockCount: 0,
        activeCustomers: Number(d?.totalCustomers || 0),
        averageTicket: 0,
        efficiency: 0,
        salesPerHour: 0,
        previousDaySales: 0,
        previousMonthSales: lastMonthTotal,
        growthRate: 0,
        totalProducts: 0,
        pendingOrders: 0,
        customerSatisfaction: 0,
        conversionRate: 0
      }
    } catch (error) {
      if (isCanceledError(error)) {
        throw error
      }
      return await fetchDashboardStats()
    }
  }, [loadOverviewResponse, loadSummaryResponse])

  // Función para cargar ventas recientes con paginación
  const loadRecentSales = useCallback(async (
    limit: number = 10,
    requestOptions: RequestOptions = {}
  ): Promise<RecentSale[]> => {
    if (isSupabaseActive()) {
      try {
        const overview = await loadOverviewResponse(requestOptions)
        return mapOverviewToRecentSales(overview, limit)
      } catch (error) {
        if (isCanceledError(error)) {
          throw error
        }
      }
    }
    try {
      const { data } = await api.get('/sales', {
        signal: requestOptions.signal,
        params: { page: 1, limit, order: 'created_at.desc' }
      })
      const list: unknown[] = data?.sales || data?.data || []
      const recentSales: RecentSale[] = list.map((item) => {
        const sale = item as Record<string, unknown>
        const saleItems = Array.isArray(sale['sale_items']) ? (sale['sale_items'] as Record<string, unknown>[]) : []
        return {
          id: String(sale['id'] ?? ''),
          total: Number(sale['total'] ?? sale['subtotal'] ?? 0),
          payment_method: String(sale['payment_method'] ?? sale['paymentMethod'] ?? 'CASH'),
          created_at: String(sale['created_at'] ?? sale['createdAt'] ?? new Date().toISOString()),
          customer_name: String((sale['customers'] as Record<string, unknown>)?.['name'] ?? (sale['customer'] as Record<string, unknown>)?.['name'] ?? 'Cliente General'),
          items_count: saleItems.length > 0
            ? saleItems.reduce((sum, it) => sum + Number(it['quantity'] ?? 0), 0)
            : Number(sale['items_count'] ?? 0)
        }
      })
      return recentSales
    } catch (error) {
      if (isCanceledError(error)) {
        throw error
      }
      return []
    }
  }, [loadOverviewResponse])

  const loadTopProducts = useCallback(async (
    limit: number = 5,
    requestOptions: RequestOptions = {}
  ): Promise<TopProduct[]> => {
    if (isSupabaseActive()) {
      try {
        const summary = await loadSummaryResponse('30d', requestOptions)
        return mapSummaryToTopProducts(summary, limit)
      } catch (error) {
        if (isCanceledError(error)) {
          throw error
        }
      }
    }
    try {
      const { data } = await api.get('/dashboard/stats', { signal: requestOptions.signal })
      return normalizeTopProducts(data?.data?.topProducts, limit)
    } catch (error) {
      if (isCanceledError(error)) {
        throw error
      }
      return []
    }
  }, [loadSummaryResponse])

  // Función para cargar productos con stock bajo
  const loadLowStockProducts = useCallback(async (
    limit: number = 10,
    requestOptions: RequestOptions = {}
  ): Promise<LowStockProduct[]> => {
    if (isSupabaseActive()) {
      try {
        const { data: response } = await api.get<StockAlertsResponse>('/stock-alerts', {
          params: { limit },
          signal: requestOptions.signal
        })
        return mapStockAlertsToLowStockProducts(response, limit)
      } catch (error) {
        if (isCanceledError(error)) {
          throw error
        }
      }
    }
    try {
      const { data } = await api.get('/products/low-stock', { signal: requestOptions.signal })
      const list: unknown[] = data?.products || data?.data || []
      const normalized: LowStockProduct[] = list.map((item) => {
        const p = item as Record<string, unknown>
        const current = Number(p['currentStock'] ?? p['stockQuantity'] ?? p['current_stock'] ?? p['stock_quantity'] ?? 0)
        const min = Number(p['minStock'] ?? p['min_stock'] ?? 0)
        const ratio = min > 0 ? current / min : 1
        const cat = p['category']
        return {
          id: String(p['id'] ?? ''),
          name: String(p['name'] ?? ''),
          current_stock: current,
          min_stock: min,
          category: (typeof cat === 'object' && cat !== null
            ? String((cat as Record<string, unknown>)['name'] ?? '')
            : String(cat ?? '')) || 'Sin categoría',
          urgency: ratio < 0.3 ? 'high' as const : ratio < 0.6 ? 'medium' as const : 'low' as const
        }
      })
      return normalized
    } catch (error) {
      if (isCanceledError(error)) {
        throw error
      }
      return []
    }
  }, [])

  const loadSummarySnapshot = useCallback(async (
    topProductsLimit: number = 5,
    requestOptions: RequestOptions = {}
  ): Promise<{ topProducts: TopProduct[]; previousMonthSales: number }> => {
    if (isSupabaseActive()) {
      try {
        const summary = await loadSummaryResponse('30d', requestOptions)
        return {
          topProducts: mapSummaryToTopProducts(summary, topProductsLimit),
          previousMonthSales: toNumber(summary?.totals.previousRevenue)
        }
      } catch (error) {
        if (isCanceledError(error)) {
          throw error
        }
      }
    }

    return {
      topProducts: await loadTopProducts(topProductsLimit, requestOptions),
      previousMonthSales: 0
    }
  }, [loadSummaryResponse, loadTopProducts])

  const loadOverviewSnapshot = useCallback(async (
    recentSalesLimit: number = 10,
    requestOptions: RequestOptions = {}
  ): Promise<Pick<DashboardData, 'stats' | 'recentSales'>> => {
    if (isSupabaseActive()) {
      try {
        const overview = await loadOverviewResponse(requestOptions)
        return {
          stats: mapOverviewToStats(overview),
          recentSales: mapOverviewToRecentSales(overview, recentSalesLimit)
        }
      } catch (error) {
        if (isCanceledError(error)) {
          throw error
        }
      }
    }

    const [stats, recentSales] = await Promise.all([
      loadDashboardStats(requestOptions),
      loadRecentSales(recentSalesLimit, requestOptions)
    ])

    return { stats, recentSales }
  }, [loadDashboardStats, loadOverviewResponse, loadRecentSales])

  const loadDashboardData = useCallback(async (useCache: boolean = true): Promise<void> => {
    try {
      setError(null)

      if (useCache) {
        const cachedData = getFromCache()
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          setLastUpdated(new Date())
        }
      }

      if (inflightRequests.has(cacheKey)) {
        const result = await inflightRequests.get(cacheKey)!
        saveToCache(result)
        setData(result)
        setLastUpdated(new Date())
        setLoading(false)
        return
      }

      if (!initialLoadDoneRef.current) {
        setLoading(true)
      }

      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller

      const fetchPromise = (async (): Promise<DashboardData> => {
        const overviewPromise = loadOverviewSnapshot(10, { signal: controller.signal })
        const summaryPromise = loadSummarySnapshot(5, { signal: controller.signal })
        const lowStockProductsPromise = loadLowStockProducts(10, { signal: controller.signal })

        const overviewData = await overviewPromise
        setData((prev) => ({
          ...prev,
          stats: overviewData.stats,
          recentSales: overviewData.recentSales
        }))
        setLastUpdated(new Date())

        const [summaryData, lowStockProducts] = await Promise.all([
          summaryPromise,
          lowStockProductsPromise
        ])

        return {
          stats: {
            ...overviewData.stats,
            previousMonthSales: summaryData.previousMonthSales,
            growthRate: summaryData.previousMonthSales > 0
              ? ((overviewData.stats.monthSales - summaryData.previousMonthSales) / summaryData.previousMonthSales) * 100
              : 0,
            lowStockCount: lowStockProducts.length || overviewData.stats.lowStockCount
          },
          recentSales: overviewData.recentSales,
          topProducts: summaryData.topProducts,
          lowStockProducts
        }
      })()

      inflightRequests.set(cacheKey, fetchPromise)

      const newData = await fetchPromise
      inflightRequests.delete(cacheKey)

      saveToCache(newData)
      setData(newData)
      setLastUpdated(new Date())
      initialLoadDoneRef.current = true
    } catch (err) {
      inflightRequests.delete(cacheKey)
      if (isCanceledError(err)) {
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Error loading dashboard data'
      setError(errorMessage)
      console.error('Dashboard data loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, getFromCache, saveToCache, loadLowStockProducts, loadOverviewSnapshot, loadSummarySnapshot])

  // Función para refrescar datos forzando recarga
  const refreshData = useCallback(async (): Promise<void> => {
    await loadDashboardData(false)
  }, [loadDashboardData])

  // Función para invalidar cache
  const invalidateCache = useCallback((): void => {
    dashboardCache.delete(cacheKey)
  }, [cacheKey])

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (user) {
      loadDashboardData(true)
    }
  }, [user, loadDashboardData])

  // Efecto para actualizaciones automáticas con Realtime o polling
  useEffect(() => {
    if (!enableRealtime || !user) return
    if (isSupabaseActive()) {
      // ⭐ Singleton reutilizado para el canal realtime
      const supabase = getSupabaseClient()
      const orgId = getOrganizationId()

      // Debounce: evitar recargar en cada evento individual
      // Si hay una ráfaga de ventas, esperamos 3s antes de recargar
      let debounceTimer: ReturnType<typeof setTimeout> | null = null
      const scheduleReload = () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          loadDashboardData(true)
          debounceTimer = null
        }, 3000) // 3 segundos de debounce
      }

      // Build realtime channel with organization filter to avoid
      // receiving changes from other tenants
      const channelBuilder = supabase.channel('dashboard-sync')

      if (orgId) {
        channelBuilder
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'sales',
            filter: `organization_id=eq.${orgId}`
          }, scheduleReload)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `organization_id=eq.${orgId}`
          }, scheduleReload)
      } else {
        channelBuilder
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, scheduleReload)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleReload)
      }

      const channel = channelBuilder.subscribe()
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        supabase.removeChannel(channel)
      }
    }
    // Fallback: polling solo cuando Supabase Realtime no está activo
    const interval = setInterval(() => {
      loadDashboardData(true)
    }, refreshInterval)
    return () => clearInterval(interval)
  }, [enableRealtime, refreshInterval, user, loadDashboardData])

  // Métricas derivadas optimizadas
  const derivedMetrics = useMemo(() => {
    const todayGrowth = data.stats.previousDaySales 
      ? ((data.stats.todaySales - data.stats.previousDaySales) / data.stats.previousDaySales) * 100
      : 0

    const monthGrowth = data.stats.previousMonthSales 
      ? ((data.stats.monthSales - data.stats.previousMonthSales) / data.stats.previousMonthSales) * 100
      : 0

    return {
      todayGrowth: todayGrowth.toFixed(1),
      monthGrowth: monthGrowth.toFixed(1),
      efficiencyProgress: (data.stats.efficiency / 100) * 100,
      conversionProgress: data.stats.conversionRate,
      satisfactionStars: Math.round(data.stats.customerSatisfaction),
      criticalStockCount: data.lowStockProducts.filter(p => p.urgency === 'high').length,
      totalRevenue: data.topProducts.reduce((sum, product) => sum + product.revenue, 0)
    }
  }, [data])

  return {
    data,
    loading,
    error,
    lastUpdated,
    derivedMetrics,
    refreshData,
    invalidateCache,
    loadDashboardData
  }
}

// Hook para estadísticas específicas con cache independiente
export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const stats = await fetchDashboardStats()
      setStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return { stats, loading, error, refreshStats: loadStats }
}
async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    if (isSupabaseActive()) {
      const [overview, summary] = await Promise.all([
        api.get<DashboardOverviewApiResponse>('/dashboard/overview'),
        api.get<DashboardSummaryApiResponse>('/dashboard/summary', { params: { range: '30d' } })
      ])

      return mapOverviewToStats(overview.data?.data, {
        previousMonthSales: toNumber(summary.data?.data?.totals.previousRevenue)
      })
    }

    const { data: resp } = await api.get('/sales-stats')
    const s = resp?.stats || resp?.data || {}
    const todaySales = Number(s.total_sales || 0)
    const monthSales = Number(s.total_sales || 0)
    const averageTicket = Number(s.average_ticket || 0)
    return {
      ...buildEmptyStats(),
      todaySales,
      monthSales,
      averageTicket
    }
  } catch (error) {
    return buildEmptyStats()
  }
}
