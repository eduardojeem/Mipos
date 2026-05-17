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
  Plus,
  BarChart2,
  CreditCard
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
import { useRecentSales, RecentSale } from '@/hooks/useOptimizedSales';
import { useSalesKpis, PaymentBreakdown } from '@/app/dashboard/sales/hooks/useSalesKpis';
import { SalesTrendChart } from '@/app/dashboard/sales/components/SalesTrendChart';
import { PremiumDashboardCard } from '@/components/dashboard/shared/PremiumDashboardCard';
import { DashboardStatCard } from '@/components/dashboard/shared/DashboardStatCard';
import { cn } from '@/lib/utils';

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
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

function topPaymentMethod(breakdown: PaymentBreakdown): string {
  const entries = Object.entries(breakdown).filter(([, v]) => v && v > 0);
  if (!entries.length) return 'N/A';
  const [key] = entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
  return METHOD_LABELS[key] ?? key;
}

export default function SalesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: todayKpis, isLoading: todayLoading, refetch: refetchToday } = useSalesKpis({ range: 'today' });
  const { data: weekKpis,  isLoading: weekLoading,  refetch: refetchWeek  } = useSalesKpis({ range: '7d'   });
  const { data: mtdKpis,   isLoading: mtdLoading,   refetch: refetchMtd   } = useSalesKpis({ range: 'mtd'  });
  const { data: recentSalesData, isLoading: recentLoading, refetch: refetchRecent } = useRecentSales(10);

  const recentSales = recentSalesData?.sales || [];
  const isAllLoading = todayLoading && recentLoading;

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([refetchToday(), refetchWeek(), refetchMtd(), refetchRecent()]);
      toast({ title: 'Actualizado', description: 'Datos de ventas actualizados correctamente' });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron actualizar los datos', variant: 'destructive' });
    }
  }, [refetchToday, refetchWeek, refetchMtd, refetchRecent, toast]);

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
      toast({ title: 'Éxito', description: 'Ventas recientes exportadas correctamente' });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron exportar las ventas', variant: 'destructive' });
    } finally {
      setExportLoading(false);
    }
  }, [toast]);

  const handleToggleNotifications = useCallback(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(prev => !prev);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted');
        });
      }
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
    };
    const interval = setInterval(tick, 5 * 60 * 1000);
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [queryClient]);

  if (isAllLoading) {
    return <div className="container mx-auto p-6"><SalesLoadingSkeleton /></div>;
  }

  const breakdown = todayKpis?.payment_breakdown ?? {};
  const topProducts = todayKpis?.top_products_by_revenue ?? [];

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
          {/* Header */}
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
                disabled={todayLoading || recentLoading}
                className="rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", (todayLoading || recentLoading) && "animate-spin")} />
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

          {/* KPI Cards */}
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            variants={itemVariants}
          >
            <DashboardStatCard
              title="Ventas de Hoy"
              value={<CurrencyDisplay value={todayKpis?.revenue ?? 0} />}
              description={`${todayKpis?.transactions ?? 0} transacciones registradas`}
              trend={todayKpis?.revenue_delta_pct ?? undefined}
              icon={DollarSign}
              accent="from-emerald-500 to-teal-500"
              delay={0.1}
            />

            <DashboardStatCard
              title="Esta Semana"
              value={<CurrencyDisplay value={weekKpis?.revenue ?? 0} />}
              description={`${weekKpis?.transactions ?? 0} ventas totales`}
              trend={weekKpis?.revenue_delta_pct ?? undefined}
              icon={Calendar}
              accent="from-blue-500 to-indigo-500"
              delay={0.2}
            />

            <DashboardStatCard
              title="Este Mes"
              value={<CurrencyDisplay value={mtdKpis?.revenue ?? 0} />}
              description={`${mtdKpis?.transactions ?? 0} transacciones acumuladas`}
              trend={mtdKpis?.revenue_delta_pct ?? undefined}
              icon={TrendingUp}
              accent="from-violet-500 to-purple-500"
              delay={0.3}
            />

            <DashboardStatCard
              title="Ticket Promedio"
              value={<CurrencyDisplay value={todayKpis?.avg_ticket ?? 0} />}
              description={`Método top: ${topPaymentMethod(breakdown)}`}
              icon={Receipt}
              accent="from-amber-500 to-orange-500"
              delay={0.4}
            />
          </motion.div>

          {/* Trend chart */}
          <motion.div variants={itemVariants}>
            <SalesTrendChart />
          </motion.div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent transactions */}
            <motion.div className="lg:col-span-2" variants={itemVariants}>
              <PremiumDashboardCard className="h-full">
                <CardHeader className="flex flex-row items-start justify-between pb-6">
                  <div>
                    <CardTitle className="text-xl">Transacciones Recientes</CardTitle>
                    <CardDescription>Últimas 10 ventas ejecutadas en la organización.</CardDescription>
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

            {/* Sidebar */}
            <motion.div className="space-y-6" variants={itemVariants}>
              {/* Quick actions */}
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

              {/* Gross margin + payment breakdown */}
              <PremiumDashboardCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-violet-500" />
                    Métricas de Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Gross margin */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Margen bruto</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        <CurrencyDisplay value={todayKpis?.gross_margin ?? 0} />
                      </span>
                      {(todayKpis?.gross_margin_pct ?? 0) > 0 && (
                        <span className="ml-2 text-xs text-emerald-600 font-medium">
                          {todayKpis?.gross_margin_pct}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment breakdown */}
                  {Object.keys(breakdown).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3" />
                        Métodos de pago
                      </p>
                      {(Object.entries(breakdown) as [string, number][])
                        .filter(([, v]) => v > 0)
                        .sort(([, a], [, b]) => b - a)
                        .map(([method, amount]) => (
                          <div key={method} className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                              {METHOD_LABELS[method] ?? method}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              <CurrencyDisplay value={amount} />
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </PremiumDashboardCard>

              {/* Top products */}
              {topProducts.length > 0 && (
                <PremiumDashboardCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                      Top Productos Hoy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topProducts.slice(0, 5).map((p, i) => (
                      <div key={p.product_id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                            {p.product_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{p.qty} uds.</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                          <CurrencyDisplay value={p.revenue} />
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </PremiumDashboardCard>
              )}
            </motion.div>
          </div>
        </motion.div>
        </PermissionGuard>
      </PermissionProvider>
    </ErrorBoundary>
  );
}
