'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  RefreshCw, 
  Bell, 
  BellOff, 
  TrendingUp, 
  DollarSign,
  ShoppingCart,
  Receipt,
  Users,
  Calendar,
  ChevronRight,
  Sparkles,
  Plus
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PermissionProvider, PermissionGuard } from '@/components/ui/permission-guard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSalesSummary, useRecentSales, RecentSale } from '@/hooks/useOptimizedSales';
import { PremiumDashboardCard } from '@/components/dashboard/shared/PremiumDashboardCard';
import { DashboardStatCard } from '@/components/dashboard/shared/DashboardStatCard';
import { cn } from '@/lib/utils';

// Loading skeleton con estilo premium
function SalesLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-[500px] w-full rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[250px] w-full rounded-3xl" />
          <Skeleton className="h-[150px] w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

export default function SalesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Optimized data fetching
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useSalesSummary();
  const { data: recentSalesData, isLoading: recentLoading, refetch: refetchRecent } = useRecentSales(10);

  const recentSales = recentSalesData?.sales || [];
  const isAllLoading = summaryLoading && recentLoading;

  // Handlers
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchSummary(),
        refetchRecent()
      ]);
      toast({
        title: 'Actualizado',
        description: 'Datos de ventas actualizados correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar los datos',
        variant: 'destructive',
      });
    }
  }, [refetchSummary, refetchRecent, toast]);

  const handleExportRecent = useCallback(async () => {
    try {
      setExportLoading(true);
      
      const response = await fetch('/api/sales/export?limit=100&format=excel');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ventas-recientes-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Éxito',
        description: 'Ventas recientes exportadas correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron exportar las ventas',
        variant: 'destructive',
      });
    } finally {
      setExportLoading(false);
    }
  }, [toast]);

  const handleToggleNotifications = useCallback(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(!notificationsEnabled);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted');
        });
      }
    }
  }, [notificationsEnabled]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  if (isAllLoading) {
    return (
      <div className="container mx-auto p-6">
        <SalesLoadingSkeleton />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PermissionProvider>
        <PermissionGuard permission="sales.view">
        <motion.div 
          className="container mx-auto p-6 space-y-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header con estilo Premium */}
          <motion.div 
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
            variants={itemVariants}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Panel Comercial
                </Badge>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Ventas</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Resumen de transacciones y métricas operativas en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleNotifications}
                className="rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm self-start md:self-auto"
              >
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4 mr-2 text-emerald-500" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2 text-slate-400" />
                )}
                Notificaciones
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={summaryLoading || recentLoading}
                className="rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", (summaryLoading || recentLoading) && "animate-spin")} />
                Actualizar
              </Button>

              <Button
                size="sm"
                onClick={handleExportRecent}
                disabled={exportLoading}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </motion.div>

          {/* Métricas Clave usando DashboardStatCard */}
          <motion.div 
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            variants={itemVariants}
          >
            <DashboardStatCard
              title="Ventas de Hoy"
              value={<CurrencyDisplay value={summary?.todaySales || 0} />}
              description={`${summary?.todayCount || 0} transacciones registradas`}
              trend={summary?.growthPercentage}
              icon={DollarSign}
              accent="from-emerald-500 to-teal-500"
              delay={0.1}
            />
            
            <DashboardStatCard
              title="Esta Semana"
              value={<CurrencyDisplay value={summary?.weekSales || 0} />}
              description={`${summary?.weekCount || 0} ventas totales`}
              icon={Calendar}
              accent="from-blue-500 to-indigo-500"
              delay={0.2}
            />
            
            <DashboardStatCard
              title="Este Mes"
              value={<CurrencyDisplay value={summary?.monthSales || 0} />}
              description={`${summary?.monthCount || 0} transacciones acumuladas`}
              icon={TrendingUp}
              accent="from-violet-500 to-purple-500"
              delay={0.3}
            />
            
            <DashboardStatCard
              title="Ticket Promedio"
              value={<CurrencyDisplay value={summary?.avgTicket || 0} />}
              description={`Método top: ${summary?.topPaymentMethod || 'N/A'}`}
              icon={Receipt}
              accent="from-amber-500 to-orange-500"
              delay={0.4}
            />
          </motion.div>

          {/* Contenido Principal con PremiumDashboardCard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div className="lg:col-span-2" variants={itemVariants}>
              <PremiumDashboardCard className="h-full">
                <CardHeader className="flex flex-row items-start justify-between pb-6">
                  <div>
                    <CardTitle className="text-xl">Transacciones Recientes</CardTitle>
                    <CardDescription>
                      Últimas 10 ventas ejecutadas en la organización.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="rounded-xl hover:bg-slate-100">
                    <Link href="/dashboard/sales/all" className="flex items-center">
                      Ver todas <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 w-full rounded-2xl bg-slate-50 dark:bg-slate-900/50 animate-pulse" />
                      ))
                    ) : recentSales.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
                        <p>No se encontraron ventas recientes</p>
                      </div>
                    ) : (
                      recentSales.map((sale: RecentSale) => (
                        <div 
                          key={sale.id} 
                          className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group dark:border-slate-800 dark:bg-slate-900/30 dark:hover:bg-slate-900/60"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center dark:from-slate-800 dark:to-slate-900">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                #{sale.id.slice(-4)}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                {sale.customer_name || 'Consumidor Final'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="capitalize">{sale.payment_method.toLowerCase()}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                <span>{formatDate(sale.created_at)}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-bold text-slate-900 dark:text-white">
                              <CurrencyDisplay value={sale.total_amount} />
                            </p>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-[10px] font-bold px-1.5 h-5",
                                sale.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {sale.status === 'COMPLETED' ? 'Completado' : sale.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </PremiumDashboardCard>
            </motion.div>

            {/* Acciones Rápidas Sidebar */}
            <motion.div className="space-y-6" variants={itemVariants}>
              <PremiumDashboardCard variant="gradient">
                <CardHeader>
                  <CardTitle className="text-lg">Acciones de Venta</CardTitle>
                  <CardDescription>Acceso directo a funciones comerciales.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-between rounded-xl h-11 group" asChild>
                    <Link href="/dashboard/pos">
                      <span className="flex items-center">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Venta
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl h-11 border-slate-200 bg-white/50 backdrop-blur-sm" asChild>
                    <Link href="/dashboard/sales/all">
                      <ShoppingCart className="h-4 w-4 mr-2 text-slate-400" />
                      Historial de Ventas
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl h-11 border-slate-200 bg-white/50 backdrop-blur-sm" asChild>
                    <Link href="/dashboard/reports">
                      <TrendingUp className="h-4 w-4 mr-2 text-slate-400" />
                      Reportes Avanzados
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl h-11 border-slate-200 bg-white/50 backdrop-blur-sm" asChild>
                    <Link href="/dashboard/customers">
                      <Users className="h-4 w-4 mr-2 text-slate-400" />
                      Portal de Clientes
                    </Link>
                  </Button>
                </CardContent>
              </PremiumDashboardCard>

              {/* Estado del Sistema con un toque Premium */}
              <PremiumDashboardCard className="border-emerald-500/10 bg-emerald-50/10 dark:bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    Sincronización Activa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Los datos se actualizan automáticamente cada 5 minutos mediante Supabase.
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Última actualización</span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{new Date().toLocaleTimeString()}</span>
                  </div>
                </CardContent>
              </PremiumDashboardCard>
            </motion.div>
          </div>
        </motion.div>
        </PermissionGuard>
      </PermissionProvider>
    </ErrorBoundary>
  );
}
