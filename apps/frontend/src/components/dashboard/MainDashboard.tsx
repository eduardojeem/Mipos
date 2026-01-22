"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  ArrowUpRight,
  Clock,
  Target,
  Users,
  Zap,
  Star,
  Maximize2,
  Minimize2,
  Grid3X3,
  List,
  Calculator,
  Minus,
  Eye,
  ChevronRight
} from 'lucide-react'
import { LazyRealtimeCharts } from '@/components/lazy'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { usePerfMetrics } from '@/hooks/usePerfMetrics'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext'
import { ResponsiveStatsCard, ResponsiveTableCard, ResponsiveActionCard } from '@/components/ui/responsive-cards'
import { useDeviceType } from '@/components/ui/responsive-layout'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  gradient: string
  action: () => void
}

// ============================================================================
// COMPONENTES DE CARGA (SKELETONS)
// ============================================================================

const StatCardSkeleton = () => (
  <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-3 w-36" />
      </div>
    </CardContent>
  </Card>
)

const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  </div>
)

// ============================================================================
// COMPONENTE DE TARJETA DE ESTADÍSTICA MEJORADA
// ============================================================================

const EnhancedStatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  gradient,
  description,
  isLoading = false,
  onClick
}: {
  title: string
  value: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  gradient: string
  description?: string
  isLoading?: boolean
  onClick?: () => void
}) => {
  const prefersReducedMotion = usePrefersReducedMotion()
  
  if (isLoading) return <StatCardSkeleton />

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4" />
      case 'down': return <TrendingDown className="w-4 h-4" />
      default: return <Minus className="w-4 h-4" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
      case 'down': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default: return 'text-muted-foreground bg-secondary/50'
    }
  }

  return (
    <motion.div
      initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
      animate={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
      whileHover={!prefersReducedMotion ? { y: -4, scale: 1.02 } : undefined}
      transition={!prefersReducedMotion ? { duration: 0.3, ease: "easeOut" } : undefined}
      onClick={onClick}
      className={cn(onClick && "cursor-pointer")}
    >
      <Card className="relative overflow-hidden border border-border/50 dark:border-slate-800/50 shadow-sm hover:shadow-lg dark:shadow-slate-900/50 dark:hover:shadow-slate-900/70 transition-all duration-300 bg-gradient-to-br from-card to-card/80 dark:from-slate-900/90 dark:to-slate-900/70 group">
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.03] dark:opacity-[0.08] group-hover:opacity-[0.06] dark:group-hover:opacity-[0.12] transition-opacity", gradient)} />
        
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between mb-5">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300",
              `bg-gradient-to-br ${gradient}`
            )}>
              <Icon className="w-7 h-7 text-white" />
            </div>

            {trendValue && (
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                getTrendColor()
              )}>
                {getTrendIcon()}
                <span>{trendValue}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// COMPONENTE DE ACCIÓN RÁPIDA MEJORADA
// ============================================================================

const QuickActionCard = ({ action, index }: { action: QuickAction; index: number }) => {
  const prefersReducedMotion = usePrefersReducedMotion()
  
  return (
    <motion.div
      initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
      animate={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
      transition={!prefersReducedMotion ? { delay: index * 0.05, duration: 0.3 } : undefined}
      whileHover={!prefersReducedMotion ? { scale: 1.03, y: -2 } : undefined}
      whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
      className="group"
    >
      <Card
        className="cursor-pointer border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/80 overflow-hidden h-full"
        onClick={action.action}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300",
              `bg-gradient-to-br ${action.gradient}`
            )}>
              <action.icon className="w-7 h-7 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base mb-1">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {action.description}
              </p>
            </div>
            
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// COMPONENTE DE INDICADOR COMPACTO
// ============================================================================

const CompactIndicator = ({
  icon: Icon,
  label,
  value,
  color,
  bgColor
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  bgColor: string
}) => (
  <div className="bg-gradient-to-br from-card to-card/60 backdrop-blur-sm rounded-2xl p-5 border border-border/50 hover:shadow-md transition-all duration-300 group" role="group" aria-label={label}>
    <div className="flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform", bgColor)}>
        <Icon className={cn("w-6 h-6", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {value}
        </p>
      </div>
    </div>
  </div>
)

// ============================================================================
// COMPONENTE PRINCIPAL DEL DASHBOARD
// ============================================================================

export default function MainDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const fmtCurrency = useCurrencyFormatter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const deviceType = useDeviceType()
  const prefersReducedMotion = usePrefersReducedMotion()
  const perf = usePerfMetrics('MainDashboard')

  // Hook de datos del dashboard
  const {
    data,
    loading: isLoading,
    error,
    lastUpdated,
    refreshData: loadDashboardData
  } = useDashboardData()

  // Métricas del sistema
  const { data: sysMetrics } = useQuery({
    queryKey: ['systemMetrics'],
    queryFn: async () => {
      const res = await api.get('/api/metrics')
      return res.data
    },
    staleTime: 60_000,
  })

  // Marcar inicio de carga
  useEffect(() => {
    perf.mark('dashboard-data-start')
  }, [])

  // Leer pestaña activa desde URL
  useEffect(() => {
    const initialTab = searchParams?.get('tab')
    if (initialTab && ['overview', 'sales', 'products', 'alerts'].includes(initialTab)) {
      setActiveTab(initialTab)
    }
  }, [])

  // Persistir pestaña en URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', activeTab)
    router.replace(`${pathname}?${params.toString()}`)
  }, [activeTab, router, pathname, searchParams])

  // Extraer datos con valores por defecto
  const stats = data?.stats || {
    todaySales: 0,
    monthSales: 0,
    lowStockCount: 0,
    activeCustomers: 0,
    averageTicket: 0,
    efficiency: 0,
    salesPerHour: 0,
    previousDaySales: 0,
    previousMonthSales: 0,
    totalProducts: 0,
    pendingOrders: 0,
    customerSatisfaction: 0,
    conversionRate: 0
  }

  const recentSales = data?.recentSales || []
  const topProducts = data?.topProducts || []
  const lowStockProducts = data?.lowStockProducts || []

  // Acciones rápidas
  const quickActions: QuickAction[] = useMemo(() => ([
    {
      id: '1',
      title: 'Nueva Venta',
      description: 'Registrar una nueva venta',
      icon: ShoppingCart,
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600',
      action: () => router.push('/dashboard/pos')
    },
    {
      id: '2',
      title: 'Gestionar Inventario',
      description: 'Ver y actualizar productos',
      icon: Package,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      action: () => router.push('/dashboard/products?tab=inventory')
    },
    {
      id: '3',
      title: 'Ver Reportes',
      description: 'Análisis y estadísticas',
      icon: BarChart3,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      action: () => router.push('/dashboard/reports')
    },
    {
      id: '4',
      title: 'Gestionar Clientes',
      description: 'Administrar base de clientes',
      icon: Users,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      action: () => router.push('/dashboard/customers')
    }
  ]), [router])

  // Calcular tendencias
  const todayTrend = stats.previousDaySales 
    ? ((stats.todaySales - stats.previousDaySales) / stats.previousDaySales) * 100
    : 0
  
  const monthTrend = stats.previousMonthSales
    ? ((stats.monthSales - stats.previousMonthSales) / stats.previousMonthSales) * 100
    : 0

  // Estado de error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-background dark:to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-lg text-red-900 dark:text-red-100 mb-2">
              Error al cargar el dashboard
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-6">
              {error}
            </p>
            <Button
              onClick={loadDashboardData}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-blue-600 bg-background text-foreground px-4 py-2 rounded-lg absolute top-4 left-4 z-50 shadow-lg"
      >
        Saltar al contenido
      </a>

      {/* Header mejorado */}
      <div className="bg-background/95 backdrop-blur-xl border-b border-border/50 dark:border-slate-800/50 sticky top-16 z-30 shadow-sm dark:shadow-slate-900/50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Título y última actualización */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              {lastUpdated && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Última actualización:</span>
                  <span className="font-medium">{new Date(lastUpdated).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* Controles */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                onClick={loadDashboardData}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="bg-background/50 backdrop-blur-sm border-border hover:bg-background hover:shadow-md transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline ml-2">Actualizar</span>
              </Button>

              {deviceType !== 'mobile' && (
                <Button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  variant="outline"
                  size="sm"
                  className="bg-background/50 backdrop-blur-sm border-border hover:bg-background hover:shadow-md transition-all"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span className="hidden lg:inline ml-2">{isFullscreen ? 'Salir' : 'Pantalla completa'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main
        id="main-content"
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      >
        {isLoading && !data ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Sección de acciones rápidas */}
            <section className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  Acciones Rápidas
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <QuickActionCard key={action.id} action={action} index={index} />
                ))}
              </div>
            </section>

            {/* Métricas principales */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    Métricas Principales
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="px-3"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="px-3"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <EnhancedStatCard
                    title="Ventas de Hoy"
                    value={fmtCurrency(stats.todaySales)}
                    icon={DollarSign}
                    trend={todayTrend > 0 ? 'up' : todayTrend < 0 ? 'down' : 'neutral'}
                    trendValue={`${Math.abs(todayTrend).toFixed(1)}%`}
                    gradient="from-emerald-500 to-emerald-600"
                    description="Comparado con ayer"
                    isLoading={isLoading}
                    onClick={() => router.push('/dashboard/sales')}
                  />

                  <EnhancedStatCard
                    title="Ventas del Mes"
                    value={fmtCurrency(stats.monthSales)}
                    icon={TrendingUp}
                    trend={monthTrend > 0 ? 'up' : monthTrend < 0 ? 'down' : 'neutral'}
                    trendValue={`${Math.abs(monthTrend).toFixed(1)}%`}
                    gradient="from-blue-500 to-blue-600"
                    description="Comparado con el mes anterior"
                    isLoading={isLoading}
                    onClick={() => router.push('/dashboard/reports')}
                  />

                  <EnhancedStatCard
                    title="Ticket Promedio"
                    value={fmtCurrency(stats.averageTicket)}
                    icon={Calculator}
                    gradient="from-purple-500 to-purple-600"
                    description="Valor promedio por venta"
                    isLoading={isLoading}
                  />

                  <EnhancedStatCard
                    title="Productos Activos"
                    value={stats.totalProducts.toString()}
                    icon={Package}
                    gradient="from-orange-500 to-orange-600"
                    description="En inventario"
                    isLoading={isLoading}
                    onClick={() => router.push('/dashboard/products')}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Vista de lista simplificada */}
                  <EnhancedStatCard
                    title="Ventas de Hoy"
                    value={fmtCurrency(stats.todaySales)}
                    icon={DollarSign}
                    trend={todayTrend > 0 ? 'up' : todayTrend < 0 ? 'down' : 'neutral'}
                    trendValue={`${Math.abs(todayTrend).toFixed(1)}%`}
                    gradient="from-emerald-500 to-emerald-600"
                    description="Comparado con ayer"
                    isLoading={isLoading}
                  />
                  <EnhancedStatCard
                    title="Ventas del Mes"
                    value={fmtCurrency(stats.monthSales)}
                    icon={TrendingUp}
                    trend={monthTrend > 0 ? 'up' : monthTrend < 0 ? 'down' : 'neutral'}
                    trendValue={`${Math.abs(monthTrend).toFixed(1)}%`}
                    gradient="from-blue-500 to-blue-600"
                    description="Comparado con el mes anterior"
                    isLoading={isLoading}
                  />
                  <EnhancedStatCard
                    title="Ticket Promedio"
                    value={fmtCurrency(stats.averageTicket)}
                    icon={Calculator}
                    gradient="from-purple-500 to-purple-600"
                    description="Valor promedio por venta"
                    isLoading={isLoading}
                  />
                  <EnhancedStatCard
                    title="Productos Activos"
                    value={stats.totalProducts.toString()}
                    icon={Package}
                    gradient="from-orange-500 to-orange-600"
                    description="En inventario"
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Indicadores secundarios */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                <CompactIndicator
                  icon={AlertTriangle}
                  label="Stock Bajo"
                  value={stats.lowStockCount}
                  color="text-red-600 dark:text-red-400"
                  bgColor="bg-red-100 dark:bg-red-900/30"
                />
                <CompactIndicator
                  icon={Users}
                  label="Clientes Activos"
                  value={stats.activeCustomers}
                  color="text-green-600 dark:text-green-400"
                  bgColor="bg-green-100 dark:bg-green-900/30"
                />
                <CompactIndicator
                  icon={Clock}
                  label="Pendientes"
                  value={stats.pendingOrders}
                  color="text-yellow-600 dark:text-yellow-400"
                  bgColor="bg-yellow-100 dark:bg-yellow-900/30"
                />
                <CompactIndicator
                  icon={Star}
                  label="Satisfacción"
                  value={`${stats.customerSatisfaction}%`}
                  color="text-blue-600 dark:text-blue-400"
                  bgColor="bg-blue-100 dark:bg-blue-900/30"
                />
              </div>
            </section>

            {/* Pestañas de contenido */}
            <section>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-card/80 backdrop-blur-sm border border-border/50 p-1.5 shadow-sm">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Resumen</span>
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Ventas</span>
                  </TabsTrigger>
                  <TabsTrigger value="products" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Package className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Productos</span>
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Alertas</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Resumen */}
                <TabsContent value="overview" className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Gráficos en tiempo real */}
                    <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <PieChart className="w-5 h-5 text-blue-600" />
                          Análisis Visual
                        </CardTitle>
                        <CardDescription>Gráficos de ventas y tendencias</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <LazyRealtimeCharts />
                      </CardContent>
                    </Card>

                    {/* KPIs Operativos */}
                    <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="w-5 h-5 text-green-600" />
                          KPIs Operativos
                        </CardTitle>
                        <CardDescription>Indicadores clave de rendimiento</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-medium">Eficiencia de Ventas</span>
                            <span className="font-bold text-foreground">{stats.efficiency}%</span>
                          </div>
                          <Progress value={stats.efficiency} className="h-3 bg-secondary" />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-medium">Tasa de Conversión</span>
                            <span className="font-bold text-foreground">{stats.conversionRate}%</span>
                          </div>
                          <Progress value={stats.conversionRate} className="h-3 bg-secondary" />
                        </div>

                        <div className="pt-5 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground font-medium">Ventas por Hora</span>
                            <span className="text-2xl font-bold text-foreground">
                              {fmtCurrency(stats.salesPerHour)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Métricas del sistema */}
                  <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        Rendimiento del Sistema
                      </CardTitle>
                      <CardDescription>Métricas de rendimiento y uso de recursos</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-card to-card/60 rounded-xl p-5 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground font-medium">Uptime</span>
                          <span className="text-lg font-bold text-foreground">
                            {sysMetrics?.system?.uptime ? `${Math.round(sysMetrics.system.uptime)}s` : '-'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Requests lentas: {sysMetrics?.queries?.slowRequests ?? '-'}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-card to-card/60 rounded-xl p-5 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground font-medium">Memoria</span>
                          <span className="text-lg font-bold text-foreground">
                            {sysMetrics?.memory?.heap?.usedMB ? `${sysMetrics.memory.heap.usedMB}MB` : '-'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          RSS: {sysMetrics?.memory?.rss?.usedMB ? `${sysMetrics.memory.rss.usedMB}MB` : '-'}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-card to-card/60 rounded-xl p-5 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground font-medium">Consultas</span>
                          <span className="text-lg font-bold text-foreground">
                            {sysMetrics?.queries?.total ?? '-'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg: {sysMetrics?.queries?.avgDurationMs ? `${Math.round(sysMetrics.queries.avgDurationMs)}ms` : '-'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab: Ventas */}
                <TabsContent value="sales" className="space-y-5">
                  <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-green-600" />
                            Ventas Recientes
                          </CardTitle>
                          <CardDescription className="mt-1">Últimas transacciones registradas</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/dashboard/sales')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver todas
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 animate-pulse">
                              <div className="space-y-2 flex-1">
                                <div className="h-4 bg-muted rounded w-32"></div>
                                <div className="h-3 bg-muted rounded w-40"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="h-5 bg-muted rounded w-24"></div>
                                <div className="h-4 bg-muted rounded w-16"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : recentSales.length > 0 ? (
                        <div className="space-y-2">
                          {recentSales.map((sale, index) => (
                            <motion.div
                              key={sale.id}
                              initial={!prefersReducedMotion ? { opacity: 0, x: -20 } : undefined}
                              animate={!prefersReducedMotion ? { opacity: 1, x: 0 } : undefined}
                              transition={!prefersReducedMotion ? { delay: index * 0.05 } : undefined}
                              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-all border border-border/30 hover:border-border/50 group"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="font-semibold text-sm text-foreground">Venta #{sale.id}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  {new Date(sale.created_at).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg text-green-600 dark:text-green-400">
                                  {fmtCurrency(sale.total)}
                                </div>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {sale.payment_method}
                                </Badge>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">No hay ventas recientes</p>
                          <p className="text-xs text-muted-foreground mt-1">Las ventas aparecerán aquí cuando se registren</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab: Productos */}
                <TabsContent value="products" className="space-y-5">
                  <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500" />
                            Productos Más Vendidos
                          </CardTitle>
                          <CardDescription className="mt-1">Top productos por ingresos</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/dashboard/products')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver todos
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 animate-pulse">
                              <div className="space-y-2 flex-1">
                                <div className="h-4 bg-muted rounded w-40"></div>
                                <div className="h-3 bg-muted rounded w-32"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="h-5 bg-muted rounded w-24"></div>
                                <div className="h-4 bg-muted rounded w-12"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : topProducts.length > 0 ? (
                        <div className="space-y-2">
                          {topProducts.map((product, index) => (
                            <motion.div
                              key={product.id}
                              initial={!prefersReducedMotion ? { opacity: 0, x: -20 } : undefined}
                              animate={!prefersReducedMotion ? { opacity: 1, x: 0 } : undefined}
                              transition={!prefersReducedMotion ? { delay: index * 0.05 } : undefined}
                              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50/50 to-yellow-50/30 dark:from-amber-900/10 dark:to-yellow-900/5 hover:from-amber-50 hover:to-yellow-50 dark:hover:from-amber-900/20 dark:hover:to-yellow-900/10 transition-all border border-amber-200/30 dark:border-amber-800/30 hover:border-amber-300/50 dark:hover:border-amber-700/50 group"
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md font-bold text-white text-sm">
                                  #{index + 1}
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-foreground truncate">{product.name}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Package className="w-3 h-3" />
                                    {product.sales_count} ventas • {product.category}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg text-green-600 dark:text-green-400">
                                  {fmtCurrency(product.revenue || 0)}
                                </div>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  Top {index + 1}
                                </Badge>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">No hay datos de productos</p>
                          <p className="text-xs text-muted-foreground mt-1">Los productos más vendidos aparecerán aquí</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab: Alertas */}
                <TabsContent value="alerts" className="space-y-5">
                  <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-card to-card/80">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Alertas de Inventario
                          </CardTitle>
                          <CardDescription className="mt-1">Productos con stock bajo o crítico</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/dashboard/stock-alerts')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver todas
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-900/20 animate-pulse">
                              <div className="space-y-2 flex-1">
                                <div className="h-4 bg-muted rounded w-40"></div>
                                <div className="h-3 bg-muted rounded w-28"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="h-5 bg-muted rounded w-20"></div>
                                <div className="h-4 bg-muted rounded w-16"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : lowStockProducts.length > 0 ? (
                        <div className="space-y-2">
                          {lowStockProducts.map((product, index) => (
                            <motion.div
                              key={product.id}
                              initial={!prefersReducedMotion ? { opacity: 0, x: 20 } : undefined}
                              animate={!prefersReducedMotion ? { opacity: 1, x: 0 } : undefined}
                              transition={!prefersReducedMotion ? { delay: index * 0.05 } : undefined}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-xl transition-all border group",
                                product.urgency === 'high'
                                  ? "bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-900/30 dark:to-red-900/10 border-red-300 dark:border-red-800 hover:from-red-100 hover:to-red-50 dark:hover:from-red-900/40 dark:hover:to-red-900/20"
                                  : "bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/20 dark:to-amber-900/5 border-amber-300 dark:border-amber-800 hover:from-amber-100 hover:to-amber-50 dark:hover:from-amber-900/30 dark:hover:to-amber-900/10"
                              )}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-md",
                                  product.urgency === 'high'
                                    ? "bg-gradient-to-br from-red-500 to-red-600"
                                    : "bg-gradient-to-br from-amber-500 to-amber-600"
                                )}>
                                  <AlertTriangle className="w-5 h-5 text-white" />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-foreground truncate">{product.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {product.category}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={cn(
                                  "font-bold text-lg",
                                  product.urgency === 'high'
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-amber-600 dark:text-amber-400"
                                )}>
                                  {product.current_stock} / {product.min_stock}
                                </div>
                                <Badge
                                  variant={product.urgency === 'high' ? 'destructive' : 'secondary'}
                                  className="text-xs mt-1"
                                >
                                  {product.urgency === 'high' ? 'Urgente' : 'Medio'}
                                </Badge>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="text-sm text-foreground font-medium">¡Todo en orden!</p>
                          <p className="text-xs text-muted-foreground mt-1">No hay alertas de inventario en este momento</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
