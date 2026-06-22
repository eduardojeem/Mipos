'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  XCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/lib/toast';
import { cn, formatDate } from '@/lib/utils';

type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused' | 'unknown';

interface Subscription {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  planId: string;
  planName: string;
  planPrice: number;
  monthlyAmount: number;
  planInterval: 'monthly' | 'yearly';
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  daysUntilRenewal: number | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionUsage {
  usage: {
    usersCount: number;
    productsCount: number;
    salesCount: number;
    storageUsed: number;
    apiCallsCount: number;
  };
  limits: {
    users: number;
    products: number;
    sales: number;
    storage: number;
    apiCalls: number;
  };
}

interface SubscriptionsResponse {
  success: boolean;
  data: Subscription[];
  summary: {
    total: number;
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    paused: number;
    mrr: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const PAGE_SIZE = 20;

const statusConfig: Record<SubscriptionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  active: { label: 'Activa', variant: 'outline', className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20' },
  trialing: { label: 'Prueba', variant: 'outline', className: 'bg-sky-500/10 text-sky-500 border border-sky-500/20 hover:bg-sky-500/20' },
  past_due: { label: 'Vencida', variant: 'outline', className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 font-bold' },
  canceled: { label: 'Cancelada', variant: 'outline', className: 'bg-slate-500/10 text-slate-500 border border-slate-500/20 hover:bg-slate-500/20' },
  paused: { label: 'Pausada', variant: 'outline', className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' },
  unknown: { label: 'Sin estado', variant: 'outline', className: 'bg-slate-500/10 text-slate-500 border border-slate-500/20 hover:bg-slate-500/20' }
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function formatSafeDate(value?: string) {
  return value ? formatDate(value) : 'Sin fecha';
}

function intervalLabel(interval: string) {
  return interval === 'yearly' ? 'anio' : 'mes';
}

function usagePercentage(current: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min((current / limit) * 100, 100);
}

function usageTone(percentage: number) {
  if (percentage >= 95) return 'text-rose-600';
  if (percentage >= 80) return 'text-amber-600';
  return 'text-emerald-600';
}

function limitLabel(limit: number) {
  return limit === -1 ? 'Ilimitado' : new Intl.NumberFormat('es-PY').format(limit);
}

function renewalLabel(subscription: Subscription) {
  if (subscription.status === 'canceled') return 'Cancelada';
  if (subscription.daysUntilRenewal === null) return 'Periodo no configurado';
  if (subscription.daysUntilRenewal < 0) return `Vencio hace ${Math.abs(subscription.daysUntilRenewal)} d`;
  if (subscription.daysUntilRenewal === 0) return 'Vence hoy';
  return `Vence en ${subscription.daysUntilRenewal} d`;
}

function renewalPeriodLabel(subscription: Subscription) {
  if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
    return 'Sin fechas de periodo';
  }

  return `Renovado ${formatSafeDate(subscription.currentPeriodStart)} - vence ${formatSafeDate(subscription.currentPeriodEnd)}`;
}

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: PAGE_SIZE.toString()
    });

    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);

    return params.toString();
  }, [debouncedSearch, page, statusFilter]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<SubscriptionsResponse>({
    queryKey: ['subscriptions', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/superadmin/subscriptions-v2?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      return response.json();
    }
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['subscription-usage', selectedSubscription?.id],
    queryFn: async () => {
      if (!selectedSubscription) return null;
      const response = await fetch(`/api/superadmin/subscriptions-v2/${selectedSubscription.id}/usage`);
      if (!response.ok) throw new Error('Failed to fetch usage');
      const json = await response.json();
      return json.data as SubscriptionUsage;
    },
    enabled: Boolean(selectedSubscription && usageDialogOpen)
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/superadmin/subscriptions-v2/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: true })
      });
      if (!response.ok) throw new Error('Failed to cancel subscription');
      return response.json();
    },
    onSuccess: () => {
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: 'Suscripcion cancelada',
        description: 'La suscripción fue desactivada correctamente.'
      });
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/superadmin/subscriptions-v2/${id}/reactivate`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to reactivate subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: 'Suscripcion reactivada',
        description: 'La organización vuelve a tener el plan activo.'
      });
    }
  });

  const subscriptions = data?.data ?? [];
  const pagination = data?.pagination ?? { page, limit: PAGE_SIZE, total: 0, pages: 0 };
  const summary = data?.summary ?? { total: 0, active: 0, trialing: 0, pastDue: 0, canceled: 0, paused: 0, mrr: 0 };

  const statusFilters = [
    { value: 'all', label: 'Todas', count: summary.total },
    { value: 'active', label: 'Activas', count: summary.active },
    { value: 'trialing', label: 'Prueba', count: summary.trialing },
    { value: 'past_due', label: 'Vencidas', count: summary.pastDue },
    { value: 'canceled', label: 'Canceladas', count: summary.canceled }
  ];

  const summaryCards = [
    {
      label: 'MRR estimado',
      value: formatCurrency(summary.mrr),
      detail: 'Activas y pruebas',
      icon: Banknote,
      tone: 'text-emerald-600'
    },
    {
      label: 'Activas',
      value: summary.active.toString(),
      detail: `${summary.trialing} en prueba`,
      icon: CheckCircle2,
      tone: 'text-sky-600'
    },
    {
      label: 'Riesgo',
      value: summary.pastDue.toString(),
      detail: 'Pagos vencidos',
      icon: AlertTriangle,
      tone: 'text-amber-600'
    },
    {
      label: 'Canceladas',
      value: summary.canceled.toString(),
      detail: `${summary.total} total filtrado`,
      icon: XCircle,
      tone: 'text-rose-600'
    }
  ];

  const usageRows = usageData
    ? [
        {
          label: 'Usuarios',
          current: usageData.usage.usersCount,
          limit: usageData.limits.users,
          valueLabel: new Intl.NumberFormat('es-PY').format(usageData.usage.usersCount)
        },
        {
          label: 'Productos',
          current: usageData.usage.productsCount,
          limit: usageData.limits.products,
          valueLabel: new Intl.NumberFormat('es-PY').format(usageData.usage.productsCount)
        },
        {
          label: 'Ventas del mes',
          current: usageData.usage.salesCount,
          limit: usageData.limits.sales,
          valueLabel: new Intl.NumberFormat('es-PY').format(usageData.usage.salesCount)
        },
        {
          label: 'Almacenamiento',
          current: usageData.usage.storageUsed / (1024 * 1024 * 1024),
          limit: usageData.limits.storage,
          valueLabel: `${(usageData.usage.storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB`
        },
        {
          label: 'API calls',
          current: usageData.usage.apiCallsCount,
          limit: usageData.limits.apiCalls,
          valueLabel: new Intl.NumberFormat('es-PY').format(usageData.usage.apiCallsCount)
        }
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Activity className="h-3.5 w-3.5" />
            <span className="tracking-wide">Suscripciones & Clientes</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Suscripciones</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Control operativo de planes activos, renovaciones, riesgo de pago y consumo por organización.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-full gap-2 sm:w-auto h-10 bg-background/50 border-border/50 hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-2xl glass-card hover-lift hover-glow border-border/50 bg-background/60 backdrop-blur-sm transition-all duration-300">
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">{card.label}</div>
                  <div className="mt-3 truncate text-2xl font-extrabold text-foreground">{card.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground/80">{card.detail}</div>
                </div>
                <div className={cn('rounded-xl bg-background/40 p-2.5 border border-border/40 shadow-sm backdrop-blur-sm', card.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm glass-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar organización o plan"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              className="w-full xl:w-auto"
            >
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 xl:w-auto bg-background/50 border border-border/50">
                {statusFilters.map((filter) => (
                  <TabsTrigger key={filter.value} value={filter.value} className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    {filter.label}
                    <span className="rounded bg-background/80 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {filter.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No se pudieron cargar las suscripciones</AlertTitle>
          <AlertDescription>
            Revisa la conexion o intenta actualizar la tabla. El resto del panel no fue modificado.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm glass-card">
        <CardHeader className="flex flex-col gap-2 border-b border-border/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold">Cartera de suscripciones</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {pagination.total} resultado{pagination.total === 1 ? '' : 's'} · página {Math.max(pagination.page, 1)} de {Math.max(pagination.pages, 1)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="min-w-[240px] pl-6">Organización</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Renovación</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="w-[64px] text-right pr-6">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index} className="border-b border-border/50">
                      <TableCell colSpan={7} className="py-4 px-6">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : subscriptions.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableCell colSpan={7} className="h-36 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                        <Activity className="h-8 w-8 text-muted-foreground/60" />
                        <div className="font-medium text-foreground">Sin suscripciones para este filtro</div>
                        <div className="text-sm">Ajusta la búsqueda o cambia el estado seleccionado.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => {
                    const config = statusConfig[subscription.status] ?? statusConfig.unknown;
                    const renewalRisk = subscription.daysUntilRenewal !== null && subscription.daysUntilRenewal <= 7 && subscription.status !== 'canceled';

                    return (
                      <TableRow key={subscription.id} className={cn('border-b border-border/50 transition-colors', renewalRisk ? 'bg-amber-500/5 dark:bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-muted/40')}>
                        <TableCell className="pl-6 py-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">{subscription.organizationName}</div>
                            <div className="text-xs text-muted-foreground/80">/{subscription.organizationSlug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">{subscription.planName}</div>
                            <div className="text-xs text-muted-foreground/80">
                              {formatCurrency(subscription.planPrice)} / {intervalLabel(subscription.planInterval)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{formatCurrency(subscription.monthlyAmount)}</div>
                          <div className="text-xs text-muted-foreground/80">mensualizado</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className={config.className}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <CalendarClock className={cn('mt-0.5 h-4 w-4 text-muted-foreground shrink-0', renewalRisk && 'text-amber-500')} />
                            <div className="space-y-1">
                              <div className={cn('text-sm font-semibold', renewalRisk ? 'text-amber-600 dark:text-amber-500' : 'text-foreground')}>
                                {renewalLabel(subscription)}
                              </div>
                              <div className="text-[10px] text-muted-foreground/80">
                                {renewalPeriodLabel(subscription)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground/80">
                          {formatSafeDate(subscription.createdAt)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Abrir acciones" className="hover:bg-muted/60">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-border/50 glass-card">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSubscription(subscription);
                                  setUsageDialogOpen(true);
                                }}
                                className="focus:bg-muted/60"
                              >
                                <Activity className="mr-2 h-4 w-4" />
                                Ver uso
                              </DropdownMenuItem>
                              {subscription.status === 'canceled' ? (
                                <DropdownMenuItem
                                  onClick={() => reactivateMutation.mutate(subscription.id)}
                                  disabled={reactivateMutation.isPending}
                                  className="focus:bg-muted/60"
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setCancelTarget(subscription)}
                                  disabled={cancelMutation.isPending}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Mostrando {subscriptions.length} de {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={pagination.page <= 1 || isFetching}
                className="h-8 bg-background/50 border-border/50 hover:bg-muted/50"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(current + 1, Math.max(pagination.pages, 1)))}
                disabled={pagination.page >= pagination.pages || isFetching || pagination.pages === 0}
                className="h-8 bg-background/50 border-border/50 hover:bg-muted/50"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-w-2xl border-border/50 glass-card">
          <DialogHeader>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary w-fit">
              <Activity className="h-3.5 w-3.5" />
              <span>Consumo Operativo</span>
            </div>
            <DialogTitle className="text-2xl font-bold mt-2">Uso del plan</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.organizationName} · {selectedSubscription?.planName}
            </DialogDescription>
          </DialogHeader>

          {usageLoading ? (
            <div className="space-y-4 py-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : usageRows.length > 0 ? (
            <div className="space-y-5 py-2">
              {usageRows.map((row) => {
                const percentage = usagePercentage(row.current, row.limit);
                const unlimited = row.limit === -1;
                const progressTone = percentage >= 95 ? "[&>div]:bg-rose-500" : percentage >= 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500";

                return (
                  <div key={row.label} className="space-y-2 p-4 rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm font-semibold text-foreground">{row.label}</Label>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {row.valueLabel} <span className="text-muted-foreground/60">/ {limitLabel(row.limit)}</span>
                      </span>
                    </div>
                    <Progress value={unlimited ? 0 : percentage} className={cn("h-2 bg-muted/60", progressTone)} />
                    <div className={cn('text-xs font-medium', unlimited ? 'text-muted-foreground/80' : usageTone(percentage))}>
                      {unlimited ? 'Sin límite operativo' : `${percentage.toFixed(1)}% utilizado`}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
              No hay datos de uso disponibles para esta suscripción.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialogOpen(false)} className="border-border/50 bg-background/50 hover:bg-muted/50">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent className="border-border/50 glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar suscripción</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactiva el plan de {cancelTarget?.organizationName}. Úsala solo cuando el cobro o acceso deba cortarse desde superadmin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending} className="border-border/50 bg-background/50 hover:bg-muted/50">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
            >
              {cancelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancelar suscripción
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
