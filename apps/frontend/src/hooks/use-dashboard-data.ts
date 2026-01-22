import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase'
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
      const supabase = createClient()
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const [{ data: today }, { data: counts }] = await Promise.all([
        supabase.rpc('get_today_sales_summary', { date_start: startOfDay }).single(),
        supabase.rpc('get_dashboard_counts').single()
      ])
      const todayTotal = Number((today as any)?.total_sales || 0)
      const todayCount = Number((today as any)?.sales_count || 0)
      const averageTicket = todayCount ? todayTotal / todayCount : 0
      const totalProducts = Number((counts as any)?.products_count || 0)
      const lowStockCount = Number((counts as any)?.low_stock_count || 0)
      const activeCustomers = Number((counts as any)?.customers_count || 0)
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
      const supabase = createClient()
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

      const [{ data: todaySales }, { data: monthSales }, { data: lastMonthSales }, { data: lowStock }, { data: activeSales }, { count: totalProducts }] = await Promise.all([
        supabase.from('sales').select('total, created_at').gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('sales').select('total, created_at').gte('created_at', startOfMonth),
        supabase.from('sales').select('total, created_at').gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth),
        supabase.from('products').select('id, stock, min_stock').lt('stock', 'min_stock'),
        supabase.from('sales').select('customer_name, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('products').select('id', { count: 'exact', head: true })
      ])

      const todayTotal = (todaySales || []).reduce((s: number, v: any) => s + (v.total || 0), 0)
      const monthTotal = (monthSales || []).reduce((s: number, v: any) => s + (v.total || 0), 0)
      const lastMonthTotal = (lastMonthSales || []).reduce((s: number, v: any) => s + (v.total || 0), 0)
      const activeCustomers = new Set((activeSales || []).map((v: any) => v.customer_name).filter(Boolean)).size
      const todayCount = (todaySales || []).length
      const averageTicket = todayCount ? todayTotal / todayCount : 0

      return {
        todaySales: todayTotal,
        monthSales: monthTotal,
        lowStockCount: (lowStock || []).length,
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
      const supabase = createClient()
      const { data } = await supabase
        .from('sales')
        .select('id, total, payment_method, created_at, customer_name')
        .order('created_at', { ascending: false })
        .limit(limit)
      return (data || []).map((sale: any) => ({
        id: sale.id,
        total: sale.total || 0,
        payment_method: sale.payment_method || 'CASH',
        created_at: sale.created_at,
        customer_name: sale.customer_name || 'Cliente General',
        items_count: 0
      }))
    }
    try {
      const { data } = await api.get('/sales', {
        params: { page: 1, limit, order: 'created_at.desc' }
      })
      const list = data?.sales || data?.data || []
      const recentSales: RecentSale[] = (list as any[]).map((sale: any) => ({
        id: sale.id,
        total: sale.total || sale.subtotal || 0,
        payment_method: sale.payment_method || sale.paymentMethod || 'CASH',
        created_at: sale.created_at || sale.createdAt || new Date().toISOString(),
        customer_name: sale.customers?.name || sale.customer?.name || 'Cliente General',
        items_count: Array.isArray(sale.sale_items)
          ? sale.sale_items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0)
          : sale.items_count || 0
      }))
      return recentSales
    } catch {
      return []
    }
  }, [])

  const loadTopProducts = useCallback(async (limit: number = 5): Promise<TopProduct[]> => {
    if (isSupabaseActive()) {
      const supabase = createClient()
      const canQuery = typeof (supabase as any)?.from === 'function'
      if (!canQuery) {
        try {
          const controller = new AbortController()
          abortRef.current?.abort()
          abortRef.current = controller
          const { data } = await api.get('/dashboard/stats', { signal: controller.signal })
          const list = data?.data?.topProducts || []
          const normalized: TopProduct[] = (list as any[])
            .map((p: any) => ({
              id: p.id || p.productId,
              name: p.name || 'Producto desconocido',
              sales_count: Number(p.totalQuantity || p._sum?.quantity || 0),
              revenue: Number(p.totalRevenue || 0),
              category: p.category || undefined,
              image: p.image || undefined
            }))
            .slice(0, limit)
          return normalized
        } catch {
          return []
        }
      }
      const { data, error } = await (supabase as any)
        .from('sale_items')
        .select('product_id, quantity, price, products!inner(name)')
        .limit(500);
      if (error) {
        try {
          const controller = new AbortController()
          abortRef.current?.abort()
          abortRef.current = controller
          const { data } = await api.get('/dashboard/stats', { signal: controller.signal })
          const list = data?.data?.topProducts || []
          const normalized: TopProduct[] = (list as any[])
            .map((p: any) => ({
              id: p.id || p.productId,
              name: p.name || 'Producto desconocido',
              sales_count: Number(p.totalQuantity || p._sum?.quantity || 0),
              revenue: Number(p.totalRevenue || 0),
              category: p.category || undefined,
              image: p.image || undefined
            }))
            .slice(0, limit)
          return normalized
        } catch {
          return []
        }
      }
      const stats = new Map<string, TopProduct>();
      (data || []).forEach((it: any) => {
        const id = it.product_id
        const name = it.products?.name || 'Producto desconocido'
        const revenue = (it.quantity || 0) * (it.price || 0)
        const existing = stats.get(id)
        if (existing) {
          existing.sales_count += it.quantity || 0
          existing.revenue += revenue
        } else {
          stats.set(id, { id, name, sales_count: it.quantity || 0, revenue })
        }
      })
      return Array.from(stats.values()).sort((a, b) => b.revenue - a.revenue).slice(0, limit)
    }
    try {
      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller
      const { data } = await api.get('/dashboard/stats', { signal: controller.signal })
      const list = data?.data?.topProducts || []
      const normalized: TopProduct[] = (list as any[])
        .map((p: any) => ({
          id: p.id || p.productId,
          name: p.name || 'Producto desconocido',
          sales_count: Number(p.totalQuantity || p._sum?.quantity || 0),
          revenue: Number(p.totalRevenue || 0),
          category: p.category || undefined,
          image: p.image || undefined
        }))
        .slice(0, limit)
      return normalized
    } catch {
      return []
    }
  }, [])

  // Función para cargar productos con stock bajo
  const loadLowStockProducts = useCallback(async (limit: number = 10): Promise<LowStockProduct[]> => {
    if (isSupabaseActive()) {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('id, name, stock, min_stock, category')
        .lt('stock', 'min_stock')
        .order('stock', { ascending: true })
        .limit(limit)
      return (data || []).map((p: any) => {
        const current = p.stock || 0
        const min = p.min_stock || 0
        const ratio = min > 0 ? current / min : 1
        return {
          id: p.id,
          name: p.name,
          current_stock: current,
          min_stock: min,
          category: p.category || 'Sin categoría',
          urgency: ratio < 0.3 ? 'high' : ratio < 0.6 ? 'medium' : 'low'
        }
      })
    }
    try {
      const { data } = await api.get('/products/low-stock')
      const list = data?.products || data?.data || []
      const normalized: LowStockProduct[] = (list as any[]).map((p: any) => {
        const current = p.currentStock ?? p.stockQuantity ?? p.current_stock ?? p.stock_quantity ?? 0
        const min = p.minStock ?? p.min_stock ?? 0
        const ratio = min > 0 ? current / min : 1
        return {
          id: p.id,
          name: p.name,
          current_stock: current,
          min_stock: min,
          category: p.category?.name || p.category || 'Sin categoría',
          urgency: ratio < 0.3 ? 'high' : ratio < 0.6 ? 'medium' : 'low'
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
  }, [cacheKey, getFromCache, saveToCache, loadDashboardStats, loadRecentSales, loadTopProducts, loadLowStockProducts])

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

  // Efecto para actualizaciones automáticas
  useEffect(() => {
    if (!enableRealtime || !user) return
    if (isSupabaseActive()) {
      const supabase = createClient()
      const channel = supabase
        .channel('dashboard-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
          loadDashboardData(true)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          loadDashboardData(true)
        })
        .subscribe()
      return () => {
        supabase.removeChannel(channel)
      }
    }
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
