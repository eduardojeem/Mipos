'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Boxes,
  Clock3,
  Package,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { supabaseRealtimeService } from '@/lib/supabase-realtime';
import type { InventoryMovementChangePayload, SaleChangePayload } from '@/lib/supabase-realtime';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import type { DashboardSummaryData, DashboardTimeRange } from '@/lib/dashboard/types';

const lazyRecharts = (name: keyof typeof import('recharts')) =>
  dynamic(
    () =>
      import('recharts').then((module) => {
        const Component = module[name] as React.ElementType;
        const Wrapper = (props: Record<string, unknown>) => <Component {...props} />;
        Wrapper.displayName = `LazyRecharts_${name}`;
        return Wrapper;
      }),
    { ssr: false }
  );

const ResponsiveContainer = lazyRecharts('ResponsiveContainer');
const AreaChart = lazyRecharts('AreaChart');
const Area = lazyRecharts('Area');
const BarChart = lazyRecharts('BarChart');
const Bar = lazyRecharts('Bar');
const PieChart = lazyRecharts('PieChart');
const Pie = lazyRecharts('Pie');
const Cell = lazyRecharts('Cell');
const XAxis = lazyRecharts('XAxis');
const YAxis = lazyRecharts('YAxis');
const CartesianGrid = lazyRecharts('CartesianGrid');
const Tooltip = lazyRecharts('Tooltip');

const COLORS = ['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0f172a'];

const RANGE_OPTIONS: Array<{ value: DashboardTimeRange; label: string }> = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '1y', label: '12 meses' },
];

interface RealtimeChartsProps {
  className?: string;
  showMetrics?: boolean;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('es-ES', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function growthPercentage(current: number, previous: number) {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function SalesTooltip({
  active,
  payload,
  label,
  formatCurrency,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color?: string }>;
  label?: string;
  formatCurrency: (value: number) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-medium text-slate-950 dark:text-white">{label}</p>
      <div className="mt-2 space-y-1.5 text-sm">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">{item.dataKey}</span>
            <span className="font-medium text-slate-950 dark:text-white">
              {item.dataKey.toLowerCase().includes('revenue')
                ? formatCurrency(item.value)
                : formatCompact(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChartState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center dark:border-slate-700">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900">
        <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
      </div>
      <p className="mt-4 font-medium text-slate-950 dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[360px] w-full rounded-3xl" />
    </div>
  );
}

export function RealtimeCharts({ className, showMetrics = true }: RealtimeChartsProps) {
  const organizationId = useCurrentOrganizationId();
  const formatCurrency = useCurrencyFormatter();
  const [range, setRange] = useState<DashboardTimeRange>('30d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['dashboard-summary', organizationId, range],
    [organizationId, range]
  );

  const { data, isLoading, isFetching, refetch } = useQuery<DashboardSummaryData>({
    queryKey,
    queryFn: async () => {
      const response = await api.get('/dashboard/summary', { params: { range } });
      return response.data?.data as DashboardSummaryData;
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false,
  });

  useEffect(() => {
    if (!organizationId) {
      return undefined;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 3000);
    };

    const unsubscribeConnection = supabaseRealtimeService.onConnectionChange((status: string) => {
      if (status === 'DISCONNECTED' && !pollingInterval) {
        pollingInterval = setInterval(() => {
          queryClient.invalidateQueries({ queryKey });
        }, 60000);
      }

      if (status !== 'DISCONNECTED' && pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    });

    const unsubscribeSales = supabaseRealtimeService.subscribeToSalesGlobal((payload: SaleChangePayload) => {
      const payloadOrgId =
        (payload.new as { organization_id?: string } | undefined)?.organization_id ||
        (payload.old as { organization_id?: string } | undefined)?.organization_id;

      if (payloadOrgId && payloadOrgId !== organizationId) {
        return;
      }

      scheduleRefresh();
    });

    const unsubscribeInventory = supabaseRealtimeService.subscribeToInventoryMovementsGlobal((payload: InventoryMovementChangePayload) => {
      const payloadOrgId =
        (payload.new as { organization_id?: string } | undefined)?.organization_id ||
        (payload.old as { organization_id?: string } | undefined)?.organization_id;

      if (payloadOrgId && payloadOrgId !== organizationId) {
        return;
      }

      scheduleRefresh();
    });

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      try {
        unsubscribeConnection();
      } catch {}

      try {
        (unsubscribeSales as Promise<() => void>).then((fn) => fn()).catch(() => {});
      } catch {}

      try {
        (unsubscribeInventory as Promise<() => void>).then((fn) => fn()).catch(() => {});
      } catch {}
    };
  }, [organizationId, queryClient, queryKey]);

  const totals = data?.totals ?? {
    orders: 0,
    revenue: 0,
    previousOrders: 0,
    previousRevenue: 0,
  };
  const categoryTotal = (data?.categories ?? []).reduce(
    (sum: number, item: DashboardSummaryData['categories'][number]) => sum + item.value,
    0
  );
  const revenueGrowth = growthPercentage(totals.revenue, totals.previousRevenue);
  const orderGrowth = growthPercentage(totals.orders, totals.previousOrders);
  const averageTicket = totals.orders ? totals.revenue / totals.orders : 0;

  if (!organizationId) {
    return null;
  }

  if (isLoading && !data) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {showMetrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ingresos
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {formatCurrency(totals.revenue)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {revenueGrowth >= 0 ? '+' : ''}
                  {revenueGrowth.toFixed(1)}% vs periodo anterior
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ordenes
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {formatCompact(totals.orders)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {orderGrowth >= 0 ? '+' : ''}
                  {orderGrowth.toFixed(1)}% vs periodo anterior
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ticket promedio
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {formatCurrency(averageTicket)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {data?.topProducts?.length || 0} producto{data?.topProducts?.length === 1 ? '' : 's'} destacados
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
                <Package className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-950 dark:text-white">Analitica del dashboard</CardTitle>
            <CardDescription>
              Resumen consolidado desde Supabase con datos de ventas, categorias y productos.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={(value: DashboardTimeRange) => setRange(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoRefresh((current) => !current)}
            >
              {autoRefresh ? 'Auto refresh' : 'Manual'}
            </Button>

            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              <span>Ultima lectura: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString('es-ES') : 'Sin datos'}</span>
            </div>
            <Badge variant="secondary">{categoryTotal ? `${formatCurrency(categoryTotal)} en categorias` : 'Sin categoria dominante'}</Badge>
          </div>

          <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-fit">
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="products">Productos</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-6">
              {data?.daily?.length ? (
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-base">Evolucion de ingresos y ordenes</CardTitle>
                      <CardDescription>La serie cambia automaticamente con el rango elegido.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={data.daily} margin={{ top: 16, right: 18, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                          <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value: string) =>
                              new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                            }
                          />
                          <YAxis tickLine={false} axisLine={false} />
                          <Tooltip content={<SalesTooltip formatCurrency={formatCurrency} />} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#0f766e"
                            strokeWidth={2.5}
                            fill="url(#revenueFill)"
                          />
                          <Area
                            type="monotone"
                            dataKey="orders"
                            name="Orders"
                            stroke="#2563eb"
                            strokeWidth={2}
                            fill="url(#ordersFill)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4">
                    <Card className="border-slate-200 dark:border-slate-800">
                      <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Ingreso del periodo
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                          {formatCurrency(totals.revenue)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800">
                      <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Ordenes procesadas
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                          {totals.orders}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800">
                      <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Crecimiento
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                          {revenueGrowth >= 0 ? '+' : ''}
                          {revenueGrowth.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <EmptyChartState
                  title="Todavia no hay volumen suficiente"
                  description="Cuando entren ventas en el rango seleccionado, el grafico mostrara la curva de ingresos y ordenes."
                  icon={BarChart3}
                />
              )}
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              {data?.categories?.length ? (
                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-base">Mix por categoria</CardTitle>
                      <CardDescription>Participacion de cada categoria en la facturacion.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={data.categories}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={68}
                            outerRadius={118}
                            paddingAngle={3}
                          >
                            {data.categories.map((
                              entry: DashboardSummaryData['categories'][number],
                              index: number
                            ) => (
                              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<SalesTooltip formatCurrency={formatCurrency} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-base">Rendimiento por categoria</CardTitle>
                      <CardDescription>Ventas acumuladas y productos distintos por categoria.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.categories.map((
                        category: DashboardSummaryData['categories'][number],
                        index: number
                      ) => {
                        const share = categoryTotal ? (category.value / categoryTotal) * 100 : 0;
                        return (
                          <div
                            key={category.name}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  <p className="truncate font-medium text-slate-950 dark:text-white">
                                    {category.name}
                                  </p>
                                </div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  {category.items} producto{category.items === 1 ? '' : 's'} vendidos
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-950 dark:text-white">
                                  {formatCurrency(category.value)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {share.toFixed(1)}% del total
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <EmptyChartState
                  title="No hay categorias para este rango"
                  description="A medida que se registren ventas con productos categorizados, apareceran aqui."
                  icon={PieChartIcon}
                />
              )}
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              {data?.topProducts?.length ? (
                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-base">Productos mas vendidos</CardTitle>
                      <CardDescription>Ranking por ingresos dentro del rango elegido.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={data.topProducts.slice(0, 6)} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
                          <XAxis type="number" tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} />
                          <Tooltip content={<SalesTooltip formatCurrency={formatCurrency} />} />
                          <Bar dataKey="revenue" name="Revenue" radius={[0, 10, 10, 0]} fill="#0f766e" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-base">Detalle de top productos</CardTitle>
                      <CardDescription>Unidades vendidas, categoria y stock actual.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.topProducts.map((product: DashboardSummaryData['topProducts'][number]) => (
                        <div
                          key={product.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-950 dark:text-white">
                                {product.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span>{product.category}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                <span>{product.sales} unidades</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-950 dark:text-white">
                                {formatCurrency(product.revenue)}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Stock {product.stock}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <EmptyChartState
                  title="Sin ranking de productos aun"
                  description="El ranking se completa automaticamente cuando hay ventas registradas con items asociados."
                  icon={Boxes}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
