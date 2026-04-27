'use client';

import dynamic from 'next/dynamic';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock3,
  DollarSign,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { useCurrentOrganizationId, useCurrentOrganizationName } from '@/hooks/use-current-organization';
import { useOptimizedDashboard, type DashboardSummary, type RecentSale } from '@/hooks/useOptimizedDashboard';
import { createClient } from '@/lib/supabase';
import { DashboardStatCard } from './shared/DashboardStatCard';

const RealtimeCharts = dynamic<{ showMetrics?: boolean }>(
  () => import('@/components/dashboard/RealtimeCharts').then((m) => m.RealtimeCharts),
  {
    ssr: false,
    loading: () => (
      <Card className="border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    ),
  }
);

interface MainDashboardProps {
  initialData?: DashboardSummary | null;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'sale',
    title: 'Nueva venta',
    description: 'Abrir caja y cobrar',
    href: '/dashboard/pos',
    icon: ShoppingCart,
    accent: 'bg-emerald-600',
  },
  {
    id: 'product',
    title: 'Cargar producto',
    description: 'Actualizar inventario',
    href: '/dashboard/products?tab=products',
    icon: Plus,
    accent: 'bg-blue-600',
  },
  {
    id: 'customer',
    title: 'Ver clientes',
    description: 'Buscar o registrar',
    href: '/dashboard/customers',
    icon: Users,
    accent: 'bg-violet-600',
  },
  {
    id: 'orders',
    title: 'Pedidos web',
    description: 'Revisar pendientes',
    href: '/dashboard/orders',
    icon: ShoppingBag,
    accent: 'bg-amber-600',
  },
  {
    id: 'reports',
    title: 'Reportes',
    description: 'Tendencias y ventas',
    href: '/dashboard/reports',
    icon: BarChart3,
    accent: 'bg-slate-700',
  },
];

function formatTimestamp(value: string | undefined) {
  if (!value) return 'Sin datos';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin datos';
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function paymentMethodLabel(method: string) {
  const n = method.toUpperCase();
  if (n === 'CARD') return 'Tarjeta';
  if (n === 'TRANSFER') return 'Transferencia';
  return 'Efectivo';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Skeleton className="h-[360px] w-full rounded-xl" />
        <Skeleton className="h-[360px] w-full rounded-xl" />
      </div>
    </div>
  );
}

function RecentSaleRow({
  sale,
  formatCurrency,
}: {
  sale: RecentSale;
  formatCurrency: (v: number) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-950 dark:text-white">
          {sale.customer_name || 'Cliente General'}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{paymentMethodLabel(sale.payment_method)}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span>{formatTimestamp(sale.created_at)}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-950 dark:text-white">
        {formatCurrency(sale.total)}
      </p>
    </div>
  );
}

export default function MainDashboard({ initialData = null }: MainDashboardProps) {
  const router = useRouter();
  const formatCurrency = useCurrencyFormatter();
  const organizationId = useCurrentOrganizationId();
  const organizationName = useCurrentOrganizationName();
  const { data, isLoading, isFetching, error, refetch } = useOptimizedDashboard({ initialData });

  const stats = data ?? initialData;

  // Realtime refresh: actualizar al cambiar ventas, items o movimientos de inventario
  useEffect(() => {
    if (!organizationId) return;
    const supabase = createClient();
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounceRefetch = () => {
      if (pending) return;
      pending = true;
      timer = setTimeout(() => {
        pending = false;
        void refetch();
      }, 500);
    };

    const channel = supabase
      .channel(`dashboard-${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `organization_id=eq.${organizationId}` }, debounceRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, debounceRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_movements', filter: `organization_id=eq.${organizationId}` }, debounceRefetch)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [organizationId, refetch]);

  const alerts = useMemo(() => {
    if (!stats) return [];
    const items: Array<{ id: string; label: string; tone: string }> = [];
    if (stats.activeOrders > 0)
      items.push({ id: 'orders', label: `${stats.activeOrders} pedido${stats.activeOrders === 1 ? '' : 's'} activo${stats.activeOrders === 1 ? '' : 's'}`, tone: 'amber' });
    if (stats.lowStockCount > 0)
      items.push({ id: 'stock', label: `${stats.lowStockCount} producto${stats.lowStockCount === 1 ? '' : 's'} con stock bajo`, tone: 'rose' });
    if (stats.todaySalesCount > 0)
      items.push({ id: 'sales', label: `${stats.todaySalesCount} venta${stats.todaySalesCount === 1 ? '' : 's'} hoy`, tone: 'emerald' });
    return items;
  }, [stats]);

  if (!organizationId) {
    return (
      <Card className="border-dashed border-slate-300 bg-white shadow-none dark:border-slate-700 dark:bg-slate-950">
        <CardContent className="flex flex-col items-start gap-3 p-8">
          <h1 className="text-xl font-semibold text-slate-950 dark:text-white">
            Selecciona una organizacion
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Elige una organizacion desde el selector superior para cargar metricas reales.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !stats) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">
            {organizationName || 'Dashboard'}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {formatTimestamp(stats?.lastUpdated)}
            </span>
            <span>{formatCurrency(stats?.monthSales || 0)} este mes</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            {isFetching ? 'Actualizando' : 'Actualizar'}
          </Button>
          <Button
            size="sm"
            onClick={() => router.push('/dashboard/pos')}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Ir al POS
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium',
                item.tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
                item.tone === 'rose' && 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
                item.tone === 'emerald' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
              )}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No se pudo actualizar</AlertTitle>
          <AlertDescription>
            Se mantiene la ultima informacion disponible mientras se restablece la conexion.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Ventas de hoy"
          value={formatCurrency(stats?.todaySales || 0)}
          description={`${stats?.todaySalesCount || 0} venta${stats?.todaySalesCount === 1 ? '' : 's'}`}
          icon={DollarSign}
          accent="bg-emerald-600"
          onClick={() => router.push('/dashboard/sales')}
        />
        <DashboardStatCard
          title="Ticket promedio"
          value={formatCurrency(stats?.averageTicket || 0)}
          description="Valor medio por venta"
          icon={Receipt}
          accent="bg-blue-600"
          onClick={() => router.push('/dashboard/sales')}
        />
        <DashboardStatCard
          title="Clientes"
          value={`${stats?.totalCustomers || 0}`}
          description="Base de clientes"
          icon={Users}
          accent="bg-violet-600"
          onClick={() => router.push('/dashboard/customers')}
        />
        <DashboardStatCard
          title="Productos"
          value={`${stats?.totalProducts || 0}`}
          description={`${stats?.lowStockCount || 0} con stock bajo`}
          icon={Package}
          accent="bg-amber-600"
          onClick={() => router.push('/dashboard/products')}
        />
      </section>

      {/* Main content: Recent sales + sidebar */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base text-slate-950 dark:text-white">Ultimas ventas</CardTitle>
              <CardDescription>Movimientos recientes del negocio.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/sales')}>
              Ver todo
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.recentSales?.length ? (
              stats.recentSales.map((sale: RecentSale) => (
                <RecentSaleRow key={sale.id} sale={sale} formatCurrency={formatCurrency} />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Sin ventas recientes.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Order status */}
          <Card className="border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base text-slate-950 dark:text-white">Pedidos</CardTitle>
              <CardDescription>Estado actual de pedidos web.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { label: 'Pendientes', value: stats?.webOrders?.pending || 0 },
                { label: 'Confirmados', value: stats?.webOrders?.confirmed || 0 },
                { label: 'Preparando', value: stats?.webOrders?.preparing || 0 },
                { label: 'Enviados', value: stats?.webOrders?.shipped || 0 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base text-slate-950 dark:text-white">Acciones rapidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => router.push(action.href)}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 group"
                  >
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-white', action.accent)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-950 dark:text-white">{action.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Charts */}
      <section>
        <RealtimeCharts showMetrics={false} />
      </section>
    </div>
  );
}
