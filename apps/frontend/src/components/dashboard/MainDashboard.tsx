"use client"

import React, { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    ShoppingCart,
    AlertTriangle,
    Users,
    Zap,
    ArrowUpRight,
    Clock,
    Star,
    Eye,
    ChevronRight,
    Plus,
    FileText,
    BarChart3,
    ShoppingBag,
    Truck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext'
import { useQueryClient } from '@tanstack/react-query'
import { RealtimeCharts } from './RealtimeCharts'
import { useOptimizedDashboard, DashboardSummary, DashboardStats, RecentSale } from '@/hooks/useOptimizedDashboard'

// ===================================================================
// INTERFACES (Replaced by hook imports)
// ===================================================================
// kept local for now if needed or removed if fully replaced.
// Since I imported them, I can remove the local definitions to avoid conflicts or just use the imported ones.

interface QuickAction {
    id: string
    title: string
    description: string
    icon: React.ElementType
    gradient: string
    action: () => void
    notification?: number
}

// ===================================================================
// COMPONENTES DE CARGA (SKELETONS)
// ===================================================================

const StatCardSkeleton = () => (
    <Card className="relative overflow-hidden border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl">
        <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
            </div>
        </CardContent>
    </Card>
)

// ===================================================================
// TARJETA DE ESTADÍSTICA GLASSMORPHISM
// ===================================================================

const GlassStatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    gradient,
    isLoading = false,
    onClick
}: {
    title: string
    value: string
    icon: React.ElementType
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    gradient: string
    isLoading?: boolean
    onClick?: () => void
}) => {
    if (isLoading) return <StatCardSkeleton />

    const getTrendIcon = () => {
        switch (trend) {
            case 'up': return <TrendingUp className="w-3.5 h-3.5" />
            case 'down': return <TrendingDown className="w-3.5 h-3.5" />
            default: return null
        }
    }

    const getTrendColor = () => {
        switch (trend) {
            case 'up': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            case 'down': return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20'
            default: return 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClick}
            className={cn(onClick && "cursor-pointer")}
        >
            <Card className="relative group overflow-hidden border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300">
                {/* Gradient overlay - sutil */}
                <div className={cn("absolute inset-0 opacity-[0.02] dark:opacity-[0.05] group-hover:opacity-[0.04] dark:group-hover:opacity-[0.08] transition-opacity bg-gradient-to-br", gradient)} />

                {/* Glassmorphism border effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/60 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <CardContent className="p-6 relative">
                    <div className="flex items-start justify-between mb-5">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-black/5 dark:shadow-black/20 group-hover:shadow-xl transition-all duration-300 bg-gradient-to-br",
                            gradient
                        )}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>

                        {trendValue && (
                            <div className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                                getTrendColor()
                            )}>
                                {getTrendIcon()}
                                <span>{trendValue}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                            {title}
                        </p>
                        <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                            {value}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ===================================================================
// TARJETA DE ACCIÓN RÁPIDA
// ===================================================================

const QuickActionCard = ({ action, index }: { action: QuickAction; index: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="group relative"
        >
            <Card
                className="cursor-pointer border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md shadow-black/5 dark:shadow-black/20 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300 overflow-hidden h-full"
                onClick={action.action}
            >
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-11 h-11 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 bg-gradient-to-br relative",
                            action.gradient
                        )}>
                            <action.icon className="w-5 h-5 text-white" />
                            {action.notification && action.notification > 0 && (
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-xs font-bold text-white">
                                        {action.notification > 9 ? '9+' : action.notification}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                    {action.title}
                                </h3>
                                {action.notification && action.notification > 0 && (
                                    <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs px-1.5 py-0.5 h-5 animate-pulse">
                                        {action.notification}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                                {action.description}
                            </p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================

export default function MainDashboard() {
    const router = useRouter()
    const fmtCurrency = useCurrencyFormatter()
    const queryClient = useQueryClient()

    // Ultra-fast dashboard data with optimized Supabase Hook
    const { data: dashboardData, isLoading, refetch, error } = useOptimizedDashboard();

    // Quick stats fallback removed - Hook handles it
    const quickStats = null;

    // Extract data with fallbacks
    const currentData = dashboardData;
    const stats: DashboardStats = currentData ? {
        todaySales: currentData.todaySales || 0,
        monthSales: currentData.monthSales || 0,
        totalCustomers: currentData.totalCustomers || 0,
        totalProducts: currentData.totalProducts || 0,
        activeOrders: currentData.activeOrders || 0,
        lowStockCount: currentData.lowStockCount || 0,
        todaySalesCount: currentData.todaySalesCount || 0,
        averageTicket: currentData.averageTicket || 0,
        webOrders: currentData.webOrders
    } : {
        todaySales: 0,
        monthSales: 0,
        totalCustomers: 0,
        totalProducts: 0,
        activeOrders: 0,
        lowStockCount: 0,
        todaySalesCount: 0,
        averageTicket: 0,
    }

    const recentSales = currentData?.recentSales || []
    const statsLoading = isLoading
    const salesLoading = isLoading
    const isQuickMode = currentData?.isQuickMode || false

    // Reduced auto-refresh for better performance
    useEffect(() => {
        const interval = setInterval(() => {
            // Only invalidate if not currently loading
            if (!isLoading) {
                queryClient.invalidateQueries({ queryKey: ['dashboard-optimized-summary'] });
            }
        }, 10 * 60 * 1000); // Increased to 10 minutes

        return () => clearInterval(interval);
    }, [queryClient, isLoading])

    // Acciones rápidas
    const quickActions: QuickAction[] = useMemo(() => ([
        {
            id: '1',
            title: 'Nueva Venta',
            description: 'Abrir POS',
            icon: ShoppingCart,
            gradient: 'from-emerald-500 to-emerald-600',
            action: () => router.push('/dashboard/pos')
        },
        {
            id: '2',
            title: 'Nuevo Producto',
            description: 'Agregar inventario',
            icon: Plus,
            gradient: 'from-blue-500 to-blue-600',
            action: () => router.push('/dashboard/products?tab=all')
        },
        {
            id: '3',
            title: 'Nuevo Cliente',
            description: 'Registrar cliente',
            icon: Users,
            gradient: 'from-purple-500 to-purple-600',
            action: () => router.push('/dashboard/customers')
        },
        {
            id: '4',
            title: 'Pedidos Web',
            description: 'Gestionar pedidos online',
            icon: ShoppingBag,
            gradient: 'from-teal-500 to-teal-600',
            action: () => router.push('/dashboard/orders'),
            notification: stats?.activeOrders || 0
        },
        {
            id: '5',
            title: 'Ver Reportes',
            description: 'Análisis y datos',
            icon: BarChart3,
            gradient: 'from-orange-500 to-orange-600',
            action: () => router.push('/dashboard/reports')
        }
    ]), [router])

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/80 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/90">
            {/* Header */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-border/40 dark:border-white/5 sticky top-16 z-30 shadow-sm">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                Dashboard
                            </h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                Bienvenido a tu panel de control
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {isQuickMode && (
                                <Badge variant="secondary" className="text-xs">
                                    <Zap className="w-3 h-3 mr-1" />
                                    Modo Rápido
                                </Badge>
                            )}
                            <Button
                                onClick={() => refetch()}
                                variant="outline"
                                size="sm"
                                disabled={isLoading}
                                className="border-border/40 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:bg-white dark:hover:bg-zinc-900 shadow-sm"
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                {isLoading ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Acciones Rápidas */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                            Acciones Rápidas
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {quickActions.map((action, index) => (
                            <QuickActionCard key={action.id} action={action} index={index} />
                        ))}
                    </div>
                </section>

                {/* Estadísticas Principales */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                            Métricas Clave
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <GlassStatCard
                            title="Ventas de Hoy"
                            value={fmtCurrency(stats?.todaySales || 0)}
                            icon={DollarSign}
                            trend="up"
                            trendValue={`${stats?.todaySalesCount || 0} ventas`}
                            gradient="from-emerald-500 to-emerald-600"
                            isLoading={statsLoading}
                            onClick={() => router.push('/dashboard/sales')}
                        />

                        <GlassStatCard
                            title="Ventas del Mes"
                            value={fmtCurrency(stats?.monthSales || 0)}
                            icon={TrendingUp}
                            gradient="from-blue-500 to-blue-600"
                            isLoading={statsLoading}
                            onClick={() => router.push('/dashboard/reports')}
                        />

                        <GlassStatCard
                            title="Clientes"
                            value={stats?.totalCustomers?.toString() || '0'}
                            icon={Users}
                            gradient="from-purple-500 to-purple-600"
                            isLoading={statsLoading}
                            onClick={() => router.push('/dashboard/customers')}
                        />

                        <GlassStatCard
                            title="Productos"
                            value={stats?.totalProducts?.toString() || '0'}
                            icon={Package}
                            trend={stats && stats.lowStockCount > 0 ? 'down' : 'neutral'}
                            trendValue={stats && stats.lowStockCount > 0 ? `${stats.lowStockCount} bajo stock` : undefined}
                            gradient="from-orange-500 to-orange-600"
                            isLoading={statsLoading}
                            onClick={() => router.push('/dashboard/products')}
                        />
                    </div>
                </section>

                {/* Gráficos en Tiempo Real */}
                <section className="space-y-4">
                    <RealtimeCharts showMetrics={false} />
                </section>

                {/* Estadísticas Secundarias */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Ticket Promedio */}
                    <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                Ticket Promedio
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                                {fmtCurrency(stats?.averageTicket || 0)}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                Por venta realizada hoy
                            </p>
                        </CardContent>
                    </Card>

                    {/* Alertas de Stock */}
                    <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                Alertas de Stock
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                                {stats?.lowStockCount || 0}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                Productos con stock bajo
                            </p>
                        </CardContent>
                    </Card>

                    {/* Pedidos Web */}
                    <Card
                        className={cn(
                            "border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md cursor-pointer hover:shadow-lg transition-all duration-300 group relative",
                            stats?.activeOrders && stats.activeOrders > 0 && "ring-2 ring-red-200 dark:ring-red-800 ring-opacity-50"
                        )}
                        onClick={() => router.push('/dashboard/orders')}
                    >
                        {stats?.activeOrders && stats.activeOrders > 0 && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                <span className="text-xs font-bold text-white">
                                    {stats.activeOrders > 9 ? '9+' : stats.activeOrders}
                                </span>
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                                Pedidos Web
                                {stats?.activeOrders && stats.activeOrders > 0 && (
                                    <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs animate-pulse">
                                        {stats.activeOrders} pendientes
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                                {stats?.activeOrders || 0}
                            </p>
                            <p className={cn(
                                "text-xs mt-1 transition-colors",
                                stats?.activeOrders && stats.activeOrders > 0
                                    ? "text-red-600 dark:text-red-400 font-medium"
                                    : "text-zinc-600 dark:text-zinc-400 group-hover:text-teal-600 dark:group-hover:text-teal-400"
                            )}>
                                {stats?.activeOrders && stats.activeOrders > 0
                                    ? "¡Requieren atención! • Click para gestionar"
                                    : "Pedidos pendientes • Click para gestionar"
                                }
                            </p>
                        </CardContent>
                    </Card>
                </section>

                {/* Widget de Pedidos Web */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                Pedidos Web
                            </h2>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/dashboard/orders')}
                            className={cn(
                                "text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 relative",
                                stats?.activeOrders && stats.activeOrders > 0 && "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            )}
                        >
                            {stats?.activeOrders && stats.activeOrders > 0 && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            )}
                            Gestionar todos
                            {stats?.activeOrders && stats.activeOrders > 0 && (
                                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 h-4 ml-2">
                                    {stats.activeOrders}
                                </Badge>
                            )}
                            <ArrowUpRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                            {stats?.webOrders?.pending || stats?.activeOrders || 0}
                                        </p>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            Pendientes
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                            {stats?.webOrders?.preparing || 0}
                                        </p>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            Preparando
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                        <Truck className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                            {stats?.webOrders?.shipped || 0}
                                        </p>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            Enviados
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                        <Star className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                            {stats?.webOrders?.delivered || 0}
                                        </p>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            Entregados
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                            {fmtCurrency(stats?.webOrders?.todayRevenue || 0)}
                                        </p>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            Ingresos Hoy
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Acceso rápido a funciones de pedidos */}
                    <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "h-16 flex flex-col gap-2 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/20 relative",
                                        stats?.activeOrders && stats.activeOrders > 0 && "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20"
                                    )}
                                    onClick={() => router.push('/dashboard/orders')}
                                >
                                    {stats?.activeOrders && stats.activeOrders > 0 && (
                                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                            <span className="text-xs font-bold text-white">
                                                {stats.activeOrders > 9 ? '9+' : stats.activeOrders}
                                            </span>
                                        </div>
                                    )}
                                    <ShoppingBag className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Gestionar Pedidos</span>
                                        {stats?.activeOrders && stats.activeOrders > 0 && (
                                            <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 h-4">
                                                {stats.activeOrders}
                                            </Badge>
                                        )}
                                    </div>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="h-16 flex flex-col gap-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                    onClick={() => router.push('/orders/track')}
                                >
                                    <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium">Seguimiento Público</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="h-16 flex flex-col gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                                    onClick={() => router.push('/catalog')}
                                >
                                    <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    <span className="text-sm font-medium">Ver Catálogo Web</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Ventas Recientes */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                Ventas Recientes
                            </h2>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/dashboard/sales')}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                            Ver todas
                            <ArrowUpRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>

                    <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
                        <CardContent className="p-0">
                            {salesLoading ? (
                                <div className="p-6 space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <Skeleton className="h-12 w-1/3" />
                                            <Skeleton className="h-8 w-24" />
                                        </div>
                                    ))}
                                </div>
                            ) : recentSales && recentSales.length > 0 ? (
                                <div className="divide-y divide-border/40 dark:divide-white/5">
                                    {recentSales.map((sale: any) => (
                                        <div key={sale.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-zinc-900 dark:text-white">
                                                        {sale.customer_name || 'Cliente General'}
                                                    </p>
                                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                                        {new Date(sale.created_at).toLocaleString('es-ES', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-zinc-900 dark:text-white">
                                                        {fmtCurrency(sale.total)}
                                                    </p>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {sale.payment_method}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <FileText className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-600 mb-3" />
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        No hay ventas recientes
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    )
}
