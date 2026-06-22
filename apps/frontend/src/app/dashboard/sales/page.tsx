'use client';

import { useState, useCallback, useEffect } from 'react';
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
  Plus,
  BarChart2,
  CreditCard,
  Zap,
  ZapOff,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PermissionProvider, PermissionGuard } from '@/components/ui/permission-guard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRecentSales, RecentSale } from '@/hooks/useOptimizedSales';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import { useSalesRealtime } from '@/app/dashboard/sales/hooks/useSalesRealtime';
import { useSalesKpis, PaymentBreakdown } from '@/app/dashboard/sales/hooks/useSalesKpis';
import { useSalesTrend } from '@/app/dashboard/sales/hooks/useSalesTrend';
import { useSalesBreakdown } from '@/app/dashboard/sales/hooks/useSalesBreakdown';
import { SalesTrendChart } from '@/app/dashboard/sales/components/SalesTrendChart';
import { SalesCategoryChart } from '@/app/dashboard/sales/components/SalesCategoryChart';
import { ExportPDFButton } from '@/app/dashboard/sales/components/ExportPDFButton';
import { cn } from '@/lib/utils';

function SalesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Skeleton className="h-[460px] w-full rounded-lg" /></div>
        <div className="space-y-6">
          <Skeleton className="h-[230px] w-full rounded-lg" />
          <Skeleton className="h-[140px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

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

// Tarjeta de KPI simple (estilo slate, sin gradientes).
function StatCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  trend?: number;
  icon: typeof DollarSign;
}) {
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend);
  const up = (trend ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {hasTrend && (
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', up ? 'text-emerald-600' : 'text-rose-600')}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend!).toFixed(1)}%
            </span>
          )}
          <span className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SalesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = useCurrentOrganizationId();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sales-realtime') === 'true';
  });

  const handleToggleRealtime = () => {
    setRealtimeEnabled(prev => {
      const next = !prev;
      localStorage.setItem('sales-realtime', String(next));
      return next;
    });
  };

  // Realtime: disabled by default to avoid unnecessary Supabase connections
  useSalesRealtime(orgId, realtimeEnabled);

  const { data: todayKpis, isLoading: todayLoading, refetch: refetchToday } = useSalesKpis({ range: 'today' });
  const { data: weekKpis,  isLoading: weekLoading,  refetch: refetchWeek  } = useSalesKpis({ range: '7d'   });
  const { data: mtdKpis,   isLoading: mtdLoading,   refetch: refetchMtd   } = useSalesKpis({ range: 'mtd'  });
  const { data: recentSalesData, isLoading: recentLoading, refetch: refetchRecent } = useRecentSales(10);
  // PDF export data (same range as trend/category charts default — cache hits)
  const { data: pdfTrend = [] }     = useSalesTrend({ range: '7d' });
  const { data: pdfBreakdown = [] } = useSalesBreakdown({ range: '7d' });

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

  // Refresh on tab focus (Realtime handles live updates; this covers the
  // case where the tab was hidden long enough that the WS connection dropped)
  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
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
          <div className="container mx-auto space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ventas</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Resumen de transacciones y métricas operativas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleRealtime}
                  className={cn('gap-2', realtimeEnabled && 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20')}
                >
                  {realtimeEnabled ? <Zap className="h-4 w-4 text-emerald-500" /> : <ZapOff className="h-4 w-4 text-slate-400" />}
                  Auto-actualizar
                </Button>

                <Button variant="outline" size="sm" onClick={handleToggleNotifications} className="gap-2">
                  {notificationsEnabled ? <Bell className="h-4 w-4 text-emerald-500" /> : <BellOff className="h-4 w-4 text-slate-400" />}
                  Notificaciones
                </Button>

                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={todayLoading || recentLoading} className="gap-2">
                  <RefreshCw className={cn('h-4 w-4', (todayLoading || recentLoading) && 'animate-spin')} />
                  Actualizar
                </Button>

                <Button size="sm" variant="outline" onClick={handleExportRecent} disabled={exportLoading} className="gap-2">
                  <Download className="h-4 w-4" />
                  Excel
                </Button>

                <ExportPDFButton range="today" kpis={todayKpis} trend={pdfTrend} breakdown={pdfBreakdown} />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Ventas de Hoy"
                value={<CurrencyDisplay value={todayKpis?.revenue ?? 0} />}
                description={`${todayKpis?.transactions ?? 0} transacciones`}
                trend={todayKpis?.revenue_delta_pct ?? undefined}
                icon={DollarSign}
              />
              <StatCard
                title="Esta Semana"
                value={<CurrencyDisplay value={weekKpis?.revenue ?? 0} />}
                description={`${weekKpis?.transactions ?? 0} ventas`}
                trend={weekKpis?.revenue_delta_pct ?? undefined}
                icon={Calendar}
              />
              <StatCard
                title="Este Mes"
                value={<CurrencyDisplay value={mtdKpis?.revenue ?? 0} />}
                description={`${mtdKpis?.transactions ?? 0} acumuladas`}
                trend={mtdKpis?.revenue_delta_pct ?? undefined}
                icon={TrendingUp}
              />
              <StatCard
                title="Ticket Promedio"
                value={<CurrencyDisplay value={todayKpis?.avg_ticket ?? 0} />}
                description={`Método top: ${topPaymentMethod(breakdown)}`}
                icon={Receipt}
              />
            </div>

            {/* Trend + category charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SalesTrendChart />
              <SalesCategoryChart />
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Recent transactions */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Transacciones Recientes</CardTitle>
                      <CardDescription>Últimas 10 ventas de la organización.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/sales/all" className="flex items-center">
                        Ver todas <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900/50" />
                        ))
                      ) : recentSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                          <ShoppingCart className="mb-3 h-10 w-10 opacity-30" />
                          <p className="text-sm">No se encontraron ventas recientes</p>
                        </div>
                      ) : (
                        recentSales.map((sale: RecentSale) => (
                          <div
                            key={sale.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  #{sale.id.slice(-4)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {sale.customer_name || 'Consumidor Final'}
                                </p>
                                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="capitalize">{sale.payment_method.toLowerCase()}</span>
                                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                  <span>{formatDate(sale.created_at)}</span>
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                <CurrencyDisplay value={sale.total_amount} />
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'h-5 px-1.5 text-[10px] font-medium',
                                  sale.status === 'COMPLETED'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400'
                                    : 'border-slate-200 text-slate-500',
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
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Acciones de Venta</CardTitle>
                    <CardDescription>Acceso directo a funciones comerciales.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="h-10 w-full justify-between" asChild>
                      <Link href="/dashboard/pos">
                        <span className="flex items-center"><Plus className="mr-2 h-4 w-4" /> Nueva Venta</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" className="h-10 w-full justify-start" asChild>
                      <Link href="/dashboard/sales/all"><ShoppingCart className="mr-2 h-4 w-4 text-slate-400" /> Historial de Ventas</Link>
                    </Button>
                    <Button variant="outline" className="h-10 w-full justify-start" asChild>
                      <Link href="/dashboard/reports"><TrendingUp className="mr-2 h-4 w-4 text-slate-400" /> Reportes Avanzados</Link>
                    </Button>
                    <Button variant="outline" className="h-10 w-full justify-start" asChild>
                      <Link href="/dashboard/customers"><Users className="mr-2 h-4 w-4 text-slate-400" /> Portal de Clientes</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Today metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <BarChart2 className="h-4 w-4 text-violet-500" /> Métricas de Hoy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Margen bruto</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          <CurrencyDisplay value={todayKpis?.gross_margin ?? 0} />
                        </span>
                        {(todayKpis?.gross_margin_pct ?? 0) > 0 && (
                          <span className="ml-2 text-xs font-medium text-emerald-600">{todayKpis?.gross_margin_pct}%</span>
                        )}
                      </div>
                    </div>

                    {Object.keys(breakdown).length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          <CreditCard className="h-3 w-3" /> Métodos de pago
                        </p>
                        {(Object.entries(breakdown) as [string, number][])
                          .filter(([, v]) => v > 0)
                          .sort(([, a], [, b]) => b - a)
                          .map(([method, amount]) => (
                            <div key={method} className="flex items-center justify-between">
                              <span className="text-xs capitalize text-slate-600 dark:text-slate-400">{METHOD_LABELS[method] ?? method}</span>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white"><CurrencyDisplay value={amount} /></span>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Realtime status */}
                <Card className={realtimeEnabled ? 'border-emerald-200 dark:border-emerald-900' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <span className={cn('h-2 w-2 rounded-full', realtimeEnabled ? 'animate-pulse bg-emerald-500' : 'bg-slate-300')} />
                      {realtimeEnabled ? 'Auto-actualización activa' : 'Auto-actualización inactiva'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {realtimeEnabled
                        ? 'Los KPIs se actualizan automáticamente al registrar ventas.'
                        : 'Activá "Auto-actualizar" para recibir cambios en tiempo real.'}
                    </p>
                    <button
                      onClick={handleToggleRealtime}
                      className={cn(
                        'mt-3 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                        realtimeEnabled
                          ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-950/30'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800',
                      )}
                    >
                      {realtimeEnabled ? 'Desactivar' : 'Activar'}
                    </button>
                  </CardContent>
                </Card>

                {/* Top products */}
                {topProducts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <TrendingUp className="h-4 w-4 text-amber-500" /> Top Productos Hoy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topProducts.slice(0, 5).map((p, i) => (
                        <div key={p.product_id} className="flex items-center gap-3">
                          <span className="w-4 text-xs font-bold text-slate-400">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-900 dark:text-white">{p.product_name}</p>
                            <p className="text-[10px] text-slate-400">{p.qty} uds.</p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <CurrencyDisplay value={p.revenue} />
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </PermissionGuard>
      </PermissionProvider>
    </ErrorBoundary>
  );
}
