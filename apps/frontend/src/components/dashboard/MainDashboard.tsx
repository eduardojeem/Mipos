"use client";

import dynamic from "next/dynamic";
import { useMemo, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Clock3,
  DollarSign,
  ExternalLink,
  Globe,
  Package,
  Plus,
  RefreshCw,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useCurrencyFormatter } from "@/contexts/BusinessConfigContext";
import {
  useCurrentOrganizationId,
  useCurrentOrganizationName,
} from "@/hooks/use-current-organization";
import { useResolvedRole } from "@/hooks/use-auth";
import { usePlanPermissions } from "@/hooks/use-plan-permissions";
import { canAccessDashboardItem } from "@/components/dashboard/navigation-access";
import {
  useOptimizedDashboard,
  type DashboardSummary,
  type RecentSale,
} from "@/hooks/useOptimizedDashboard";
import { createClient } from "@/lib/supabase";
import { DashboardStatCard } from "./shared/DashboardStatCard";
import { useCurrentVertical } from '@/hooks/use-current-vertical';
import { useServices } from '@/app/admin/services/hooks/useServices';
import { useStaff } from '@/app/admin/staff/hooks/useStaff';

const RealtimeCharts = dynamic<{ showMetrics?: boolean }>(
  () =>
    import("@/components/dashboard/RealtimeCharts").then(
      (m) => m.RealtimeCharts,
    ),
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
  },
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
  roles?: string[];
  category?: string;
}

const quickActions: QuickAction[] = [
  {
    id: "sale",
    title: "Nueva venta",
    description: "Abrir caja y cobrar",
    href: "/dashboard/pos",
    icon: ShoppingCart,
    accent: "bg-emerald-600",
    roles: ["ADMIN", "CASHIER", "SUPER_ADMIN", "OWNER"],
    category: "sales",
  },
  {
    id: "product",
    title: "Cargar producto",
    description: "Actualizar inventario",
    href: "/dashboard/products",
    icon: Plus,
    accent: "bg-blue-600",
    roles: ["ADMIN", "CASHIER", "SUPER_ADMIN", "OWNER"],
    category: "inventory",
  },
  {
    id: "customer",
    title: "Ver clientes",
    description: "Buscar o registrar",
    href: "/dashboard/customers",
    icon: Users,
    accent: "bg-violet-600",
    roles: ["ADMIN", "CASHIER", "SUPER_ADMIN", "OWNER"],
    category: "management",
  },
  {
    id: "orders",
    title: "Pedidos web",
    description: "Revisar pendientes",
    href: "/dashboard/orders",
    icon: ShoppingBag,
    accent: "bg-amber-600",
    roles: ["ADMIN", "CASHIER", "SUPER_ADMIN", "OWNER"],
    category: "sales",
  },
  {
    id: "reports",
    title: "Reportes",
    description: "Tendencias y ventas",
    href: "/dashboard/reports",
    icon: BarChart3,
    accent: "bg-slate-700",
    roles: ["ADMIN", "SUPER_ADMIN", "OWNER"],
    category: "analytics",
  },
];

const barbershopQuickActions: QuickAction[] = [
  {
    id: "agenda",
    title: "Ver Agenda",
    description: "Administrar turnos y citas",
    href: "/admin/agenda",
    icon: Calendar,
    accent: "bg-emerald-600",
    roles: ["ADMIN", "CASHIER", "SUPER_ADMIN", "OWNER"],
    category: "agenda",
  },
  {
    id: "services",
    title: "Servicios",
    description: "Cargar o editar cortes",
    href: "/admin/services",
    icon: Scissors,
    accent: "bg-blue-600",
    roles: ["ADMIN", "SUPER_ADMIN", "OWNER"],
    category: "services",
  },
  {
    id: "staff",
    title: "Profesionales",
    description: "Horarios y comisiones",
    href: "/admin/staff",
    icon: Users,
    accent: "bg-violet-600",
    roles: ["ADMIN", "SUPER_ADMIN", "OWNER"],
    category: "staff",
  },
  {
    id: "sale",
    title: "Nueva venta",
    description: "Cobrar productos o servicios",
    href: "/dashboard/pos",
    icon: ShoppingCart,
    accent: "bg-amber-600",
    roles: ["ADMIN", "CASHIER", "SUPER_ADMIN", "OWNER"],
    category: "sales",
  },
  {
    id: "orders",
    title: "Compras online",
    description: "Pedidos web de productos",
    href: "/dashboard/orders",
    icon: ShoppingBag,
    accent: "bg-cyan-600",
    roles: ["ADMIN", "CASHIER", "SUPER_ADMIN", "OWNER"],
    category: "sales",
  },
  {
    id: "reports",
    title: "Reportes",
    description: "Analítica de la barbería",
    href: "/dashboard/reports",
    icon: BarChart3,
    accent: "bg-slate-700",
    roles: ["ADMIN", "SUPER_ADMIN", "OWNER"],
    category: "analytics",
  },
];

function formatTimestamp(value: string | undefined) {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function paymentMethodLabel(method: string) {
  const n = method.toUpperCase();
  if (n === "CARD") return "Tarjeta";
  if (n === "TRANSFER") return "Transferencia";
  return "Efectivo";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
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
          {sale.customer_name || "Cliente General"}
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

function AppointmentRow({
  appt,
  formatCurrency,
}: {
  appt: any;
  formatCurrency: (v: number) => string;
}) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'BOOKED': return 'Reservado';
      case 'CONFIRMED': return 'Confirmado';
      case 'COMPLETED': return 'Completado';
      case 'CANCELLED': return 'Cancelado';
      case 'NO_SHOW': return 'No vino';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'COMPLETED': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'CANCELLED': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'NO_SHOW': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-white/5';
    }
  };

  const timeStr = useMemo(() => {
    try {
      const d = new Date(appt.start_at);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [appt.start_at]);

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/30 px-4 py-3 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{timeStr}</span>
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", getStatusColor(appt.status))}>
            {getStatusLabel(appt.status)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
          {appt.customer_name || 'Cliente General'}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          <span>Servicio: <span className="font-semibold text-slate-700 dark:text-slate-300">{appt.service?.name || 'Servicio'}</span></span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>Profesional: <span className="font-semibold text-slate-700 dark:text-slate-300">{appt.staff?.name || 'Estilista'}</span></span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-950 dark:text-white">
          {formatCurrency(appt.price || 0)}
        </p>
      </div>
    </div>
  );
}

export default function MainDashboard({
  initialData = null,
}: MainDashboardProps) {
  const router = useRouter();
  const formatCurrency = useCurrencyFormatter();
  const organizationId = useCurrentOrganizationId();
  const organizationName = useCurrentOrganizationName();
  const resolvedRole = useResolvedRole();

  const vertical = useCurrentVertical();
  const { services } = useServices();
  const { staff } = useStaff();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  // Slug de la org para construir la URL pública del tenant
  const organizationSlug = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      // Prioridad 1: localStorage (refleja la organización seleccionada en el dashboard de admin)
      const raw = window.localStorage.getItem('selected_organization');
      if (raw?.startsWith('{')) {
        const parsed = JSON.parse(raw);
        if (parsed?.slug) return parsed.slug;
      }
      
      // Prioridad 2 (Fallback): Cookie seteada por el middleware (puede quedar stale si visitó otra web pública)
      const cookieMatch = document.cookie.match(/(?:^|; )x-organization-slug=([^;]*)/);
      if (cookieMatch) return decodeURIComponent(cookieMatch[1]) || null;
    } catch {}
    return null;
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps
  const { permissions, isPlanResolved } = usePlanPermissions();
  const { data, isLoading, isFetching, error, refetch } = useOptimizedDashboard(
    { initialData },
  );

  const stats = data ?? initialData;

  useEffect(() => {
    if (vertical !== 'BARBERSHOP' || !organizationId) return;

    const fetchTodayAppointments = async () => {
      setLoadingAppts(true);
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');

        // Rango [from, to) del día local pedido, en ISO absoluto.
        const start = new Date(yyyy, today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const end = new Date(yyyy, today.getMonth(), today.getDate() + 1, 0, 0, 0, 0);

        const res = await fetch(`/api/appointments?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`, {
          headers: { 'x-organization-id': organizationId },
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          setAppointments(json.appointments || []);
        }
      } catch (e) {
        console.error('Error fetching dashboard appointments:', e);
      } finally {
        setLoadingAppts(false);
      }
    };

    fetchTodayAppointments();
  }, [vertical, organizationId, stats?.lastUpdated]);

  // Realtime refresh: actualizar al cambiar ventas o movimientos de inventario o turnos.
  // Refetch solo si el tab está visible — en background no tiene sentido pegar
  // /api/dashboard/* cada vez que llega un cambio (el usuario no lo ve y se
  // refresca de todos modos al volver a foco).
  const refetchOnVisibleRef = useRef(false);
  useEffect(() => {
    if (!organizationId) return;
    const supabase = createClient();
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const debounceRefetch = () => {
      if (typeof document !== "undefined" && document.hidden) {
        // Marcamos para que al volver al tab refetcheemos lo perdido.
        refetchOnVisibleRef.current = true;
        return;
      }
      if (pending) return;
      pending = true;
      timer = setTimeout(() => {
        pending = false;
        void refetch();
      }, 500);
    };

    const onVisible = () => {
      if (typeof document === "undefined") return;
      if (!document.hidden && refetchOnVisibleRef.current) {
        refetchOnVisibleRef.current = false;
        void refetch();
      }
    };

    const channel = supabase
      .channel(`dashboard-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `organization_id=eq.${organizationId}`,
        },
        debounceRefetch,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_movements",
          filter: `organization_id=eq.${organizationId}`,
        },
        debounceRefetch,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `organization_id=eq.${organizationId}`,
        },
        debounceRefetch,
      )
      .subscribe();

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [organizationId, refetch]);

  // Determina si hay pedidos web activos para decidir si mostrar el card.
  const hasActiveWebOrders = useMemo(() => {
    const orders = stats?.webOrders;
    if (!orders) return false;
    return (
      (orders.pending || 0) +
        (orders.confirmed || 0) +
        (orders.preparing || 0) +
        (orders.shipped || 0) >
      0
    );
  }, [stats?.webOrders]);
  const webOrdersCardTitle = vertical === "BARBERSHOP" ? "Compras online" : "Pedidos web";
  const webOrdersCardDescription =
    vertical === "BARBERSHOP" ? "Estado actual de compras de productos." : "Estado actual.";

  const alerts = useMemo(() => {
    if (!stats) return [];
    const items: Array<{ id: string; label: string; tone: string }> = [];
    if (stats.activeOrders > 0)
      items.push({
        id: "orders",
        label: `${stats.activeOrders} pedido${stats.activeOrders === 1 ? "" : "s"} activo${stats.activeOrders === 1 ? "" : "s"}`,
        tone: "amber",
      });
    if (stats.lowStockCount > 0 && vertical !== 'BARBERSHOP')
      items.push({
        id: "stock",
        label: `${stats.lowStockCount} producto${stats.lowStockCount === 1 ? "" : "s"} con stock bajo`,
        tone: "rose",
      });
    if (stats.todaySalesCount > 0)
      items.push({
        id: "sales",
        label: `${stats.todaySalesCount} venta${stats.todaySalesCount === 1 ? "" : "s"} hoy`,
        tone: "emerald",
      });
    return items;
  }, [stats, vertical]);

  const visibleQuickActions = useMemo(
    () => {
      const actions = vertical === 'BARBERSHOP' ? barbershopQuickActions : quickActions;
      return actions.filter((action) =>
        canAccessDashboardItem(action, {
          userRole: resolvedRole || "CASHIER",
          permissions,
          isPlanResolved,
        })
      );
    },
    [isPlanResolved, permissions, resolvedRole, vertical],
  );

  if (!organizationId) {
    return (
      <Card className="border-dashed border-slate-300 bg-white shadow-none dark:border-slate-700 dark:bg-slate-950">
        <CardContent className="flex flex-col items-start gap-3 p-8">
          <h1 className="text-xl font-semibold text-slate-950 dark:text-white">
            Selecciona una organizacion
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Elige una organizacion desde el selector superior para cargar
            metricas reales.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !stats) return <DashboardSkeleton />;

  return (
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
            {getGreeting()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
            {organizationName || "Dashboard"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              {/* Live dot — verde fijo cuando está conectado realtime,
                  pulsando ámbar cuando está refetcheando. */}
              <span
                className={cn(
                  "inline-flex h-2 w-2 rounded-full",
                  isFetching
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-500",
                )}
                aria-hidden="true"
              />
              <Clock3 className="h-3.5 w-3.5" />
              {formatTimestamp(stats?.lastUpdated)}
            </span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatCurrency(stats?.monthSales || 0)}
              </span>{" "}
              este mes
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {organizationSlug ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`/${organizationSlug}/home`, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Ver tienda</span>
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open('/home/catalogo', '_blank')}
          >
            <Globe className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Marketplace</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={() => refetch()}
            aria-label={isFetching ? "Actualizando datos" : "Actualizar datos"}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
            />
            <span className="hidden sm:inline">
              {isFetching ? "Actualizando" : "Actualizar"}
            </span>
          </Button>
        </div>
      </div>

      {/* Acciones Rápidas (Pills) */}
      <div className="flex flex-wrap gap-3">
        {visibleQuickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => router.push(action.href)}
              title={action.description}
              className={cn(
                "group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:shadow-md",
                "bg-white border-slate-200 hover:border-violet-300 dark:bg-slate-900/50 dark:border-slate-800 dark:hover:border-violet-700 text-slate-700 dark:text-slate-200 hover:text-violet-700 dark:hover:text-violet-400"
              )}
            >
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition-transform group-hover:scale-110", action.accent)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              {action.title}
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium",
                item.tone === "amber" &&
                  "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
                item.tone === "rose" &&
                  "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
                item.tone === "emerald" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
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
            Se mantiene la ultima informacion disponible mientras se restablece
            la conexion.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {vertical === 'BARBERSHOP' ? (
          <>
            <button
              type="button"
              onClick={() => router.push("/dashboard/sales")}
              className="group relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-left transition-colors hover:border-emerald-300 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-slate-950 dark:hover:border-emerald-800 md:col-span-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Ventas de hoy
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
                    {formatCurrency(stats?.todaySales || 0)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {stats?.todaySalesCount || 0} venta{stats?.todaySalesCount === 1 ? "" : "s"}
                    {(stats?.averageTicket || 0) > 0 ? (
                      <span className="text-slate-400 dark:text-slate-500">
                        {" · ticket "}
                        {formatCurrency(stats?.averageTicket || 0)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-emerald-600/50 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-emerald-400/50 dark:group-hover:text-emerald-400" />
            </button>
            <DashboardStatCard
              title="Clientes"
              value={`${stats?.totalCustomers || 0}`}
              description="Base de clientes"
              icon={Users}
              accent="bg-violet-600"
              onClick={() => router.push("/dashboard/customers")}
            />
            <DashboardStatCard
              title="Profesionales"
              value={`${staff.length}`}
              description="Barberos activos"
              icon={Users}
              accent="bg-amber-600"
              onClick={() => router.push("/admin/staff")}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => router.push("/dashboard/sales")}
              className="group relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-left transition-colors hover:border-emerald-300 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-slate-950 dark:hover:border-emerald-800 md:col-span-2 xl:col-span-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Ventas de hoy
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
                    {formatCurrency(stats?.todaySales || 0)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {stats?.todaySalesCount || 0} venta
                    {stats?.todaySalesCount === 1 ? "" : "s"}
                    {(stats?.averageTicket || 0) > 0 ? (
                      <span className="text-slate-400 dark:text-slate-500">
                        {" · ticket "}
                        {formatCurrency(stats?.averageTicket || 0)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-emerald-600/50 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-emerald-400/50 dark:group-hover:text-emerald-400" />
            </button>
            <DashboardStatCard
              title="Clientes"
              value={`${stats?.totalCustomers || 0}`}
              description="Base de clientes"
              icon={Users}
              accent="bg-violet-600"
              onClick={() => router.push("/dashboard/customers")}
            />
            <DashboardStatCard
              title="Productos"
              value={`${stats?.totalProducts || 0}`}
              description={
                (stats?.lowStockCount || 0) > 0
                  ? `${stats?.lowStockCount} con stock bajo`
                  : "Catálogo activo"
              }
              icon={Package}
              accent={
                (stats?.lowStockCount || 0) > 0 ? "bg-rose-600" : "bg-amber-600"
              }
              onClick={() => router.push("/dashboard/products")}
            />
          </>
        )}
      </section>

      {/* Charts — Protagonista en el medio */}
      <LazyChartsSection />

      {/* Main content: Recent sales + sidebar */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {vertical === 'BARBERSHOP' && (
            <Card className="border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/40">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base text-slate-950 dark:text-white">
                    Agenda de Hoy
                  </CardTitle>
                  <CardDescription>
                    Próximas citas agendadas para el día de hoy.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/admin/agenda")}
                >
                  Ver Agenda completa
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingAppts ? (
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </div>
                ) : appointments.length ? (
                  appointments.map((appt: any) => (
                    <AppointmentRow
                      key={appt.id}
                      appt={appt}
                      formatCurrency={formatCurrency}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No hay turnos agendados para hoy.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/40">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base text-slate-950 dark:text-white">
                  Últimas ventas
                </CardTitle>
                <CardDescription>
                  Movimientos recientes del negocio.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/sales")}
              >
                Ver todo
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats?.recentSales?.length ? (
                stats.recentSales.map((sale: RecentSale) => (
                  <RecentSaleRow
                    key={sale.id}
                    sale={sale}
                    formatCurrency={formatCurrency}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Sin ventas recientes.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Order status */}
          {hasActiveWebOrders ? (
            <Card className="border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/40">
              <CardHeader>
                <CardTitle className="text-base text-slate-950 dark:text-white">
                  {webOrdersCardTitle}
                </CardTitle>
                <CardDescription>{webOrdersCardDescription}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { label: "Pendientes", value: stats?.webOrders?.pending || 0 },
                  { label: "Confirmados", value: stats?.webOrders?.confirmed || 0 },
                  { label: "Preparando", value: stats?.webOrders?.preparing || 0 },
                  { label: "Enviados", value: stats?.webOrders?.shipped || 0 },
                ]
                  .filter((item) => item.value > 0)
                  .map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function LazyChartsSection() {
  const [shouldRender, setShouldRender] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldRender) return;
    if (typeof window === "undefined") return;

    // No IntersectionObserver (very old browsers / SSR snapshot) → render now.
    if (typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return;
    }

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer.disconnect();
            break;
          }
        }
      },
      // Pre-cargar 200px antes de aparecer en pantalla para que el bundle
      // empiece a bajar antes de que el usuario llegue al chart.
      { rootMargin: "200px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <section ref={sentinelRef} className="min-h-[100px]">
      {shouldRender ? <RealtimeCharts showMetrics={false} /> : null}
    </section>
  );
}
