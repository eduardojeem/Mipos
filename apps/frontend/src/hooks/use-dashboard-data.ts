import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '@/lib/api'
import { getSupabaseClient } from '@/lib/supabase-singleton'
import { isSupabaseActive } from '@/lib/env'
import { useAuth } from '@/hooks/use-auth'

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

// Cache global para datos del dashboard
const dashboardCache = new Map<string, CacheEntry>()
const inflightRequests = new Map<string, Promise<DashboardData>>()

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
    stats: {
      todaySales: 0,
      monthSales: 0,
      lowStockCount: 0,
      activeCustomers: 0,
      averageTicket: 0,
      efficiency: 0,
      salesPerHour: 0,
      totalProducts: 0,
      pendingOrders: 0,
      customerSatisfaction: 0,
      conversionRate: 0
    },
    recentSales: [],
    topProducts: [],
    lowStockProducts: []
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  const loadFastStats = useCallback(async (): Promise<DashboardStats> => {
    if (isSupabaseActive()) {
      // ⭐ Preferir RPC consolidada: 1 llamada en lugar de 6 queries separadas
      try {
        const supabase = getSupabaseClient()
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const orgId = getOrganizationId()
        const [{ data: today }, { data: counts }] = await Promise.all([
          supabase.rpc('get_today_sales_summary', { date_start: startOfDay, org_id: orgId }).single(),
          supabase.rpc('get_dashboard_counts', { org_id: orgId }).single()
        ])
        const todayRpc = today as { total_sales?: number; sales_count?: number } | null
        const countsRpc = counts as { products_count?: number; low_stock_count?: number; customers_count?: number } | null
        const todayTotal = Number(todayRpc?.total_sales || 0)
        const todayCount = Number(todayRpc?.sales_count || 0)
        const averageTicket = todayCount ? todayTotal / todayCount : 0
        const totalProducts = Number(countsRpc?.products_count || 0)
        const lowStockCount = Number(countsRpc?.low_stock_count || 0)
        const activeCustomers = Number(countsRpc?.customers_count || 0)
        return {
          todaySales: todayTotal,
          monthSales: todayTotal,
          lowStockCount,
          activeCustomers,
          averageTicket,
          efficiency: 0,
          salesPerHour: 0,
          previousDaySales: 0,
          previousMonthSales: 0,
          growthRate: 0,
          totalProducts,
          pendingOrders: 0,
          customerSatisfaction: 0,
          conversionRate: 0
        }
      } catch {
        // RPC no disponible, caer al endpoint REST
      }
    }
    try {
      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller
      const { data: summary } = await api.get('/dashboard/fast-summary', { signal: controller.signal })
      const s = summary || {}
      const todayTotal = Number(s?.todaySales || 0)
      const monthTotal = Number(s?.monthSales || todayTotal || 0)
      const averageTicket = Number(s?.averageTicket || 0)
      return {
        todaySales: todayTotal,
        monthSales: monthTotal,
        lowStockCount: Number(s?.lowStockCount || 0),
        activeCustomers: Number(s?.totalCustomers || 0),
        averageTicket,
        efficiency: 0,
        salesPerHour: 0,
        previousDaySales: 0,
        previousMonthSales: 0,
        growthRate: 0,
        totalProducts: Number(s?.totalProducts || 0),
        pendingOrders: Number(s?.activeOrders || 0),
        customerSatisfaction: 0,
        conversionRate: 0
      }
    } catch {
      return await fetchDashboardStats()
    }
  }, [])

  const loadDashboardStats = useCallback(async (): Promise<DashboardStats> => {
    if (isSupabaseActive()) {
      // ⭐ Reutiliza el singleton — NO crea nueva instancia en cada llamada
      const supabase = getSupabaseClient()
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

      const orgId = getOrganizationId()

      // Tipos de las filas que retorna Supabase para estas queries
      type SaleRow = { total: number | null; created_at: string; customer_name?: string | null }
      type StockRow = { id: string; stock_quantity: number | null; min_stock: number | null }

      const todayQuery = supabase.from('sales')
        .select('total, created_at')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .eq('organization_id', orgId ?? '')
      const monthQuery = supabase.from('sales')
        .select('total, created_at')
        .gte('created_at', startOfMonth)
        .eq('organization_id', orgId ?? '')
      const lastMonthQuery = supabase.from('sales')
        .select('total, created_at')
        .gte('created_at', startOfLastMonth)
        .lte('created_at', endOfLastMonth)
        .eq('organization_id', orgId ?? '')
      const lowStockQuery = supabase.from('products')
        .select('id, stock_quantity, min_stock')
        .eq('organization_id', orgId ?? '')
      const activeSalesQuery = supabase.from('sales')
        .select('customer_name, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('organization_id', orgId ?? '')
      const totalProductsQuery = supabase.from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId ?? '')

      const [{ data: todaySales }, { data: monthSales }, { data: lastMonthSales }, { data: lowStock }, { data: activeSales }, { count: totalProducts }] = await Promise.all([
        todayQuery, monthQuery, lastMonthQuery, lowStockQuery, activeSalesQuery, totalProductsQuery
      ])

      const todayTotal = (todaySales as SaleRow[] | null || []).reduce((s, v) => s + (v.total ?? 0), 0)
      const monthTotal = (monthSales as SaleRow[] | null || []).reduce((s, v) => s + (v.total ?? 0), 0)
      const lastMonthTotal = (lastMonthSales as SaleRow[] | null || []).reduce((s, v) => s + (v.total ?? 0), 0)
      const activeCustomers = new Set((activeSales as SaleRow[] | null || []).map(v => v.customer_name).filter(Boolean)).size
      const todayCount = (todaySales ?? []).length
      const averageTicket = todayCount ? todayTotal / todayCount : 0
      // Filter low stock in memory since PostgREST can't do column-to-column comparison
      const lowStockFiltered = (lowStock as StockRow[] | null || []).filter((p) => {
        const stock = p.stock_quantity ?? 0
        const min = p.min_stock ?? 0
        return stock <= min
      })

      return {
        todaySales: todayTotal,
        monthSales: monthTotal,
        lowStockCount: lowStockFiltered.length,
        activeCustomers,
        averageTicket,
        efficiency: 0,
        salesPerHour: 0,
        previousDaySales: 0,
        previousMonthSales: lastMonthTotal,
        growthRate: 0,
        totalProducts: Number(totalProducts || 0),
        pendingOrders: 0,
        customerSatisfaction: 0,
        conversionRate: 0
      }
    }
    try {
      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller
      const [{ data: dash }, { data: today }] = await Promise.all([
        api.get('/dashboard/stats', { signal: controller.signal }).catch(() => ({ data: null })),
        api.get('/sales-stats/today', { signal: controller.signal }).catch(() => ({ data: null }))
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
    } catch {
      return await fetchDashboardStats()
    }
  }, [])

  // Función para cargar ventas recientes con paginación
  const loadRecentSales = useCallback(async (limit: number = 10): Promise<RecentSale[]> => {
    if (isSupabaseActive()) {
      // ⭐ Singleton reutilizado
      const supabase = getSupabaseClient()
      let query = supabase
        .from('sales')
        .select('id, total, payment_method, created_at, customer_name')
        .order('created_at', { ascending: false })
        .limit(limit)

      try {
        const orgId = getOrganizationId()
        if (orgId) query = query.eq('organization_id', orgId)
      } catch {}

      const { data } = await query
      type SaleDbRow = { id: string; total: number | null; payment_method: string | null; created_at: string; customer_name?: string | null }
      return (data as SaleDbRow[] | null || []).map((sale) => ({
        id: sale.id,
        total: sale.total ?? 0,
        payment_method: sale.payment_method ?? 'CASH',
        created_at: sale.created_at,
        customer_name: sale.customer_name ?? 'Cliente General',
        items_count: 0
      }))
    }
    try {
      const { data } = await api.get('/sales', {
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
    } catch {
      return []
    }
  }, [])

  const loadTopProducts = useCallback(async (limit: number = 5): Promise<TopProduct[]> => {
    if (isSupabaseActive()) {
      const supabase = getSupabaseClient()
      const orgId = getOrganizationId()
      
      type SaleItemRow = {
        product_id: string
        quantity: number | null
        unit_price: number | null
        products: { name: string; organization_id: string } | null
      }

      const baseQuery = supabase
        .from('sale_items')
        .select('product_id, quantity, unit_price, products!inner(name, organization_id)')
        .limit(100)

      const { data, error } = orgId
        ? await baseQuery.eq('products.organization_id', orgId)
        : await baseQuery

      if (error) {
        try {
          const controller = new AbortController()
          abortRef.current?.abort()
          abortRef.current = controller
          const { data: apiData } = await api.get('/dashboard/stats', { signal: controller.signal })
          return normalizeTopProducts(apiData?.data?.topProducts, limit)
        } catch {
          return []
        }
      }
      const stats = new Map<string, TopProduct>();
      (data as SaleItemRow[] | null || []).forEach((it) => {
        const id = it.product_id
        const name = it.products?.name ?? 'Producto desconocido'
        const revenue = (it.quantity ?? 0) * (it.unit_price ?? 0)
        const existing = stats.get(id)
        if (existing) {
          existing.sales_count += it.quantity ?? 0
          existing.revenue += revenue
        } else {
          stats.set(id, { id, name, sales_count: it.quantity ?? 0, revenue })
        }
      })
      return Array.from(stats.values()).sort((a, b) => b.revenue - a.revenue).slice(0, limit)
    }
    try {
      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller
      const { data } = await api.get('/dashboard/stats', { signal: controller.signal })
      return normalizeTopProducts(data?.data?.topProducts, limit)
    } catch {
      return []
    }
  }, [])

  // Función para cargar productos con stock bajo
  const loadLowStockProducts = useCallback(async (limit: number = 10): Promise<LowStockProduct[]> => {
    if (isSupabaseActive()) {
      // ⭐ Singleton reutilizado
      const supabase = getSupabaseClient()
      const orgId = getOrganizationId()

      // Fetch products with stock info — filter in memory since PostgREST
      // doesn't support column-to-column comparison (stock_quantity <= min_stock)
      let query = supabase
        .from('products')
        .select('id, name, stock_quantity, min_stock, category_id, category:categories(name)')
        .eq('is_active', true)
        .order('stock_quantity', { ascending: true })
        .limit(50) // Fetch more than needed, filter in memory
      
      if (orgId) {
        query = query.eq('organization_id', orgId)
      }

      const { data } = await query
      
      type ProductStockRow = {
        id: string
        name: string
        stock_quantity: number | null
        min_stock: number | null
        category_id: string | null
        category: { name: string } | null
      }
      return (data as ProductStockRow[] | null || [])
        .filter((p) => {
          const stock = p.stock_quantity ?? 0
          const min = p.min_stock ?? 0
          return min > 0 && stock <= min
        })
        .slice(0, limit)
        .map((p) => {
          const current = p.stock_quantity ?? 0
          const min = p.min_stock ?? 0
          const ratio = min > 0 ? current / min : 1
          return {
            id: p.id,
            name: p.name,
            current_stock: current,
            min_stock: min,
            category: p.category?.name ?? 'Sin categoría',
            urgency: ratio < 0.3 ? 'high' as const : ratio < 0.6 ? 'medium' as const : 'low' as const
          }
        })
    }
    try {
      const { data } = await api.get('/products/low-stock')
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
    } catch {
      return []
    }
  }, [])

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

      setLoading(true)

      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller

      const fastStats = await loadFastStats()
      const partial: DashboardData = {
        stats: fastStats,
        recentSales: [],
        topProducts: [],
        lowStockProducts: []
      }
      setData(prev => ({ ...partial, recentSales: prev.recentSales, topProducts: prev.topProducts, lowStockProducts: prev.lowStockProducts }))
      setLastUpdated(new Date())

      const fetchPromise = (async (): Promise<DashboardData> => {
        const [stats, recentSales, topProducts, lowStockProducts] = await Promise.all([
          loadDashboardStats(),
          loadRecentSales(10),
          loadTopProducts(5),
          loadLowStockProducts(10)
        ])
        return { stats, recentSales, topProducts, lowStockProducts }
      })()

      inflightRequests.set(cacheKey, fetchPromise)

      const newData = await fetchPromise
      inflightRequests.delete(cacheKey)

      saveToCache(newData)
      setData(newData)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading dashboard data'
      setError(errorMessage)
      console.error('Dashboard data loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, getFromCache, saveToCache, loadFastStats, loadDashboardStats, loadRecentSales, loadTopProducts, loadLowStockProducts])

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
    const { data: resp } = await api.get('/sales-stats')
    const s = resp?.stats || resp?.data || {}
    const todaySales = Number(s.total_sales || 0)
    const monthSales = Number(s.total_sales || 0)
    const averageTicket = Number(s.average_ticket || 0)
    return {
      todaySales,
      monthSales,
      lowStockCount: 0,
      activeCustomers: 0,
      averageTicket,
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
  } catch (error) {
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
}
