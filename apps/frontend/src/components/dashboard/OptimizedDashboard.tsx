"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Minus,
  LayoutDashboard
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { LazyRealtimeCharts } from '@/components/lazy'
import InteractiveFilters, { FilterState } from './InteractiveFilters'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useIsAdmin } from '@/hooks/use-auth'

interface DashboardStats {
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
}

interface RecentSale {
  id: string
  total: number
  payment_method: string
  created_at: string
  customer_name?: string
}

interface TopProduct {
  id: string
  name: string
  sales_count: number
  revenue: number
}

interface LowStockProduct {
  id: string
  name: string
  current_stock: number
  min_stock: number
  category?: string
  urgency?: 'high' | 'medium' | 'low'
}

// Configuración de paginación
const PAGINATION_CONFIG = {
  RECENT_SALES_LIMIT: 10,
  TOP_PRODUCTS_LIMIT: 5,
  LOW_STOCK_LIMIT: 20,
  SALES_BATCH_SIZE: 100
}

// Componente de Loading Skeleton mejorado
const StatCardSkeleton = () => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
)

// Componente de tarjeta de estadística mejorado
const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  description, 
  progress,
  target,
  loading = false 
}: {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ElementType
  description?: string
  progress?: number
  target?: number
  loading?: boolean
}) => {
  if (loading) return <StatCardSkeleton />

  const changeColor = changeType === 'positive' ? 'text-green-600' : 
                     changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
  
  const ChangeIcon = changeType === 'positive' ? ArrowUpRight : 
                     changeType === 'negative' ? ArrowDownRight : Activity

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors duration-300" />
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {change && (
          <div className={`flex items-center text-xs ${changeColor} mb-2`}>
            <ChangeIcon className="h-3 w-3 mr-1" />
            {change}
          </div>
        )}
        
        {progress !== undefined && target && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progreso</span>
              <span>{Math.round(progress)}% de meta</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function OptimizedDashboard() {
  const { user } = useAuth()
  const isAdmin = useIsAdmin()
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthSales: 0,
    lowStockCount: 0,
    activeCustomers: 0,
    averageTicket: 0,
    efficiency: 0,
    salesPerHour: 0
  })

  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreSales, setHasMoreSales] = useState(true)
  const [salesPage, setSalesPage] = useState(0)

  const [filters, setFilters] = useState({
    dateRange: { from: null as Date | null, to: null as Date | null },
    categories: [] as string[],
    priceRange: [0, 1000] as [number, number],
    searchTerm: '',
    sortBy: 'name' as 'name' | 'price' | 'sales' | 'stock' | 'date',
    sortOrder: 'asc' as 'asc' | 'desc',
    productStatus: 'all' as 'all' | 'active' | 'low_stock' | 'out_of_stock'
  })

  // Función optimizada para cargar estadísticas con caché
  const loadStats = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Usar Promise.allSettled para manejar errores individuales
      const [todaySalesResult, monthSalesResult, lowStockResult, activeCustomersResult] = await Promise.allSettled([
        // Ventas de hoy con agregación en la consulta
        supabase
          .from('sales')
          .select('total')
          .gte('created_at', today)
          .eq('user_id', user.id),

        // Ventas del mes con agregación en la consulta
        supabase
          .from('sales')
          .select('total')
          .gte('created_at', startOfMonth)
          .eq('user_id', user.id),

        // Productos con bajo stock (limitado para performance)
        supabase
          .from('products')
          .select('id, name, stock, min_stock')
          .lt('stock', 'min_stock')
          .eq('user_id', user.id)
          .limit(PAGINATION_CONFIG.LOW_STOCK_LIMIT),

        // Clientes activos (últimos 30 días) con distinct
        supabase
          .from('sales')
          .select('customer_name')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .eq('user_id', user.id)
          .not('customer_name', 'is', null)
      ])

      // Procesar resultados de manera segura
      const todayTotal = todaySalesResult.status === 'fulfilled' 
        ? todaySalesResult.value.data?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0 
        : 0

      const monthTotal = monthSalesResult.status === 'fulfilled'
        ? monthSalesResult.value.data?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0
        : 0

      const lowStockData = lowStockResult.status === 'fulfilled' 
        ? lowStockResult.value.data || []
        : []

      const uniqueCustomers = activeCustomersResult.status === 'fulfilled'
        ? new Set(activeCustomersResult.value.data?.map((sale: any) => sale.customer_name)).size
        : 0

      const todaySalesCount = todaySalesResult.status === 'fulfilled' 
        ? todaySalesResult.value.data?.length || 0
        : 0

      setStats({
        todaySales: todayTotal,
        monthSales: monthTotal,
        lowStockCount: lowStockData.length,
        activeCustomers: uniqueCustomers,
        averageTicket: todaySalesCount ? todayTotal / todaySalesCount : 0,
        efficiency: Math.min(100, (todayTotal / 1000) * 100), // Meta diaria de $1000
        salesPerHour: todayTotal / 8 // Asumiendo 8 horas de trabajo
      })

      setLowStockProducts(lowStockData)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Función optimizada para cargar ventas recientes con paginación
  const loadRecentSales = async (page = 0, append = false) => {
    if (!user) return

    try {
      const supabase = createClient()
      
      const { data, count } = await supabase
        .from('sales')
        .select('id, total, payment_method, created_at, customer_name', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * PAGINATION_CONFIG.RECENT_SALES_LIMIT, (page + 1) * PAGINATION_CONFIG.RECENT_SALES_LIMIT - 1)

      if (data) {
        if (append) {
          setRecentSales(prev => [...prev, ...data])
        } else {
          setRecentSales(data)
        }
        
        // Verificar si hay más datos
        const totalLoaded = (page + 1) * PAGINATION_CONFIG.RECENT_SALES_LIMIT
        setHasMoreSales(count ? totalLoaded < count : false)
      }
    } catch (error) {
      console.error('Error loading recent sales:', error)
    }
  }

  // Función para cargar más ventas (lazy loading)
  const loadMoreSales = async () => {
    if (loadingMore || !hasMoreSales) return
    
    setLoadingMore(true)
    const nextPage = salesPage + 1
    await loadRecentSales(nextPage, true)
    setSalesPage(nextPage)
    setLoadingMore(false)
  }

  // Función optimizada para cargar productos top con agregación
  const loadTopProducts = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      
      // Usar una consulta más eficiente con agregación
      const { data } = await supabase
        .rpc('get_top_products', { 
          user_id_param: user.id, 
          limit_param: PAGINATION_CONFIG.TOP_PRODUCTS_LIMIT 
        } as any)

      if (data) {
        setTopProducts(data)
      } else {
        // Fallback a la consulta original si la función RPC no existe
        const { data: fallbackData } = await supabase
          .from('sale_items')
          .select(`
            product_id,
            quantity,
            price,
            products!inner (name, user_id)
          `)
          .eq('products.user_id', user.id)
          .limit(PAGINATION_CONFIG.SALES_BATCH_SIZE)

        // Procesar datos de manera eficiente
        const productStats = new Map<string, TopProduct>()
        
        fallbackData?.forEach((item: any) => {
          const productId = item.product_id
          const existing = productStats.get(productId)
          
          if (existing) {
            existing.sales_count += item.quantity
            existing.revenue += item.quantity * item.price
          } else {
            productStats.set(productId, {
              id: productId,
              name: (item.products as any)?.name || 'Producto desconocido',
              sales_count: item.quantity,
              revenue: item.quantity * item.price
            })
          }
        })

        const topProductsArray = Array.from(productStats.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, PAGINATION_CONFIG.TOP_PRODUCTS_LIMIT)

        setTopProducts(topProductsArray)
      }
    } catch (error) {
      console.error('Error loading top products:', error)
    }
  }

  // Cargar datos iniciales con optimización
  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      
      setLoading(true)
      
      // Cargar datos críticos primero
      await loadStats()
      
      // Cargar datos secundarios en paralelo
      await Promise.allSettled([
        loadRecentSales(0, false),
        loadTopProducts()
      ])
      
      setLoading(false)
    }

    loadData()
  }, [user])

  const [refreshing, setRefreshing] = useState(false)

  // Función para refrescar datos
  const refreshData = async () => {
    setRefreshing(true)
    setSalesPage(0)
    setHasMoreSales(true)
    
    await Promise.allSettled([
      loadStats(),
      loadRecentSales(0, false),
      loadTopProducts()
    ])
    
    setRefreshing(false)
  }

  // Función para cargar productos con bajo stock
  const loadLowStockProducts = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      
      const { data } = await supabase
        .from('products')
        .select('*')
        .lt('stock', 10)
        .order('stock', { ascending: true })
        .limit(10)

      setLowStockProducts(data || [])
    } catch (error) {
      console.error('Error loading low stock products:', error)
    }
  }

  // Configurar suscripciones en tiempo real
  useEffect(() => {
    if (!user) return

    const supabase = createClient()

    const salesSubscription = supabase
      .channel('sales_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        loadStats()
        loadRecentSales()
      })
      .subscribe()

    const productsSubscription = supabase
      .channel('products_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadStats()
        loadTopProducts()
        loadLowStockProducts()
      })
      .subscribe()

    return () => {
      salesSubscription.unsubscribe()
      productsSubscription.unsubscribe()
    }
  }, [user])

  // Componente de tarjeta de estadística
  const StatsCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    description 
  }: {
    title: string
    value: string | number
    icon: React.ElementType
    trend?: 'up' | 'down'
    trendValue?: string
    description?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && trendValue && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trend === 'up' ? (
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
            )}
            <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
              {trendValue}
            </span>
            {description && <span className="ml-1">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Calcular métricas mejoradas con comparaciones
  const calculateGrowthMetrics = (current: number, previous: number) => {
    if (previous === 0) return { change: '+100%', type: 'positive' as const }
    const growth = ((current - previous) / previous) * 100
    return {
      change: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
      type: growth >= 0 ? 'positive' as const : 'negative' as const
    }
  }

  const todayGrowth = stats.previousDaySales ? 
    calculateGrowthMetrics(stats.todaySales, stats.previousDaySales) : 
    { change: 'N/A', type: 'neutral' as const }

  const monthGrowth = stats.previousMonthSales ? 
    calculateGrowthMetrics(stats.monthSales, stats.previousMonthSales) : 
    { change: 'N/A', type: 'neutral' as const }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">BeautyPOS</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sistema de Cosméticos · Panel optimizado
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <LayoutDashboard className="h-3 w-3" />
              Administrador
            </Badge>
          </div>
        )}
      </div>

      {/* Admin Quick Actions - Solo visible para administradores */}
      {isAdmin && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  Panel de Administración
                </CardTitle>
                <CardDescription>Acciones rápidas para administradores</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Button variant="outline" size="sm" className="gap-2 justify-start">
                <Users className="h-4 w-4" />
                Gestionar Usuarios
              </Button>
              <Button variant="outline" size="sm" className="gap-2 justify-start">
                <Package className="h-4 w-4" />
                Inventario Completo
              </Button>
              <Button variant="outline" size="sm" className="gap-2 justify-start">
                <BarChart3 className="h-4 w-4" />
                Reportes Avanzados
              </Button>
              <Button variant="outline" size="sm" className="gap-2 justify-start">
                <Activity className="h-4 w-4" />
                Configuración Sistema
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas Hoy"
          value={`$${stats.todaySales.toFixed(2)}`}
          change={stats.previousDaySales ? 
            `${((stats.todaySales - stats.previousDaySales) / stats.previousDaySales * 100).toFixed(1)}% vs ayer` : 
            undefined
          }
          changeType={stats.previousDaySales && stats.todaySales > stats.previousDaySales ? 'positive' : 'negative'}
          icon={DollarSign}
          description="Ingresos del día actual"
          loading={loading}
        />
        
        <StatCard
          title="Ventas del Mes"
          value={`$${stats.monthSales.toFixed(2)}`}
          change={stats.previousMonthSales ? 
            `${((stats.monthSales - stats.previousMonthSales) / stats.previousMonthSales * 100).toFixed(1)}% vs mes anterior` : 
            undefined
          }
          changeType={stats.previousMonthSales && stats.monthSales > stats.previousMonthSales ? 'positive' : 'negative'}
          icon={TrendingUp}
          description="Ingresos del mes actual"
          loading={loading}
        />
        
        <StatCard
          title="Productos Bajo Stock"
          value={stats.lowStockCount}
          changeType="negative"
          icon={AlertTriangle}
          description="Productos por debajo del mínimo"
          loading={loading}
        />
        
        <StatCard
          title="Clientes Activos"
          value={stats.activeCustomers}
          change="Últimos 30 días"
          changeType="neutral"
          icon={Users}
          description="Clientes con compras recientes"
          loading={loading}
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Ticket Promedio"
          value={`$${stats.averageTicket.toFixed(2)}`}
          icon={ShoppingCart}
          description="Valor promedio por venta"
          loading={loading}
        />
        
        <StatCard
          title="Eficiencia Diaria"
          value={`${Math.round(stats.efficiency)}%`}
          icon={Target}
          description="Progreso hacia meta diaria"
          progress={stats.efficiency}
          target={100}
          loading={loading}
        />
        
        <StatCard
          title="Ventas por Hora"
          value={`$${stats.salesPerHour.toFixed(2)}`}
          icon={Clock}
          description="Promedio de ingresos por hora"
          loading={loading}
        />
      </div>

      {/* Gráficos en tiempo real */}
      <LazyRealtimeCharts />

      {/* Tabs mejorados para diferentes vistas */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Actividad reciente mejorada */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                    <CardDescription>Últimas ventas realizadas</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Ver todas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {recentSales.map((sale, index) => (
                    <div 
                      key={sale.id} 
                      className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                        index !== recentSales.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {sale.customer_name || 'Cliente anónimo'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(sale.total)}</p>
                        <Badge 
                          variant={sale.payment_method === 'efectivo' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {sale.payment_method}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {/* Botón para cargar más ventas */}
                  {hasMoreSales && (
                    <div className="p-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadMoreSales}
                        disabled={loadingMore}
                        className="w-full gap-2"
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Cargando...
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="h-4 w-4" />
                            Cargar más ventas
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top productos mejorado */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Top Productos</CardTitle>
                    <CardDescription>Productos más vendidos este mes</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Ver ranking
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {topProducts.map((product, index) => (
                    <div 
                      key={product.id} 
                      className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                        index !== topProducts.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold
                          ${index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                            index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                            index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            'bg-muted text-muted-foreground'}
                        `}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{product.sales_count} unidades</span>
                            <span>•</span>
                            <span>Ingresos: ${product.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">${product.revenue.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          ${(product.revenue / product.sales_count).toFixed(2)}/u
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          {/* Análisis de ventas detallado */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Método de Pago</CardTitle>
                <CardDescription>Distribución de métodos de pago</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    recentSales.reduce((acc, sale) => {
                      const method = sale.payment_method
                      if (!acc[method]) {
                        acc[method] = { count: 0, total: 0 }
                      }
                      acc[method].count++
                      acc[method].total += sale.total
                      return acc
                    }, {} as Record<string, { count: number; total: number }>)
                  ).map(([method, data]) => (
                    <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{method}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.count} transacciones
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${data.total.toFixed(2)}</p>
                        <Badge variant="outline">
                          {((data.total / stats.todaySales) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historial de Ventas</CardTitle>
                <CardDescription>Todas las ventas recientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {sale.customer_name || 'Cliente anónimo'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.created_at).toLocaleString()}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {sale.payment_method}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">${sale.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  
                  {hasMoreSales && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMoreSales}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Cargando...
                          </>
                        ) : (
                          'Cargar más ventas'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {/* Análisis de productos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Productos Más Vendidos</CardTitle>
                <CardDescription>Ranking de productos por ingresos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.sales_count} unidades vendidas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">${product.revenue.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(product.revenue / product.sales_count).toFixed(2)}/unidad
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis de Inventario</CardTitle>
                <CardDescription>Estado del inventario</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{topProducts.length}</p>
                      <p className="text-sm text-muted-foreground">Productos Activos</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</p>
                      <p className="text-sm text-muted-foreground">Bajo Stock</p>
                    </div>
                  </div>
                  
                  {lowStockProducts.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Productos Críticos</h4>
                      <div className="space-y-2">
                        {lowStockProducts.slice(0, 3).map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded">
                            <span className="text-sm font-medium">{product.name}</span>
                            <Badge variant="destructive" className="text-xs">
                              {product.current_stock} restantes
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Alertas de bajo stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Productos con Bajo Stock
              </CardTitle>
              <CardDescription>
                Productos que requieren reabastecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <p className="text-muted-foreground">
                  ¡Excelente! No hay productos con bajo stock.
                </p>
              ) : (
                <div className="space-y-4">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock actual: {product.current_stock} | Mínimo: {product.min_stock}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        Bajo Stock
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}