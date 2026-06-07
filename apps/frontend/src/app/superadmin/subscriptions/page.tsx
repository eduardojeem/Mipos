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
  active: { label: 'Activa', variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600' },
  trialing: { label: 'Prueba', variant: 'secondary' },
  past_due: { label: 'Vencida', variant: 'destructive' },
  canceled: { label: 'Cancelada', variant: 'outline' },
  paused: { label: 'Pausada', variant: 'secondary' },
  unknown: { label: 'Sin estado', variant: 'outline' }
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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Suscripciones</h1>
            {isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Control operativo de planes activos, renovaciones, riesgo de pago y consumo por organización.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="w-full gap-2 sm:w-auto">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-lg">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">{card.label}</div>
                  <div className="mt-2 truncate text-2xl font-semibold">{card.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{card.detail}</div>
                </div>
                <div className={cn('rounded-md bg-muted p-2', card.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-lg">
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
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 xl:w-auto">
                {statusFilters.map((filter) => (
                  <TabsTrigger key={filter.value} value={filter.value} className="gap-2">
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

      <Card className="rounded-lg">
        <CardHeader className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Cartera de suscripciones</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {pagination.total} resultado{pagination.total === 1 ? '' : 's'} · pagina {Math.max(pagination.page, 1)} de {Math.max(pagination.pages, 1)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Organizacion</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Renovacion</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="w-[64px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                        <Activity className="h-8 w-8" />
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
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{subscription.organizationName}</div>
                            <div className="text-xs text-muted-foreground">{subscription.organizationSlug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{subscription.planName}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(subscription.planPrice)} / {intervalLabel(subscription.planInterval)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(subscription.monthlyAmount)}</div>
                          <div className="text-xs text-muted-foreground">mensualizado</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className={config.className}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <CalendarClock className={cn('mt-0.5 h-4 w-4 text-muted-foreground', renewalRisk && 'text-amber-600')} />
                            <div className="space-y-1">
                              <div className={cn('text-sm font-medium', renewalRisk && 'text-amber-700')}>
                                {renewalLabel(subscription)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {renewalPeriodLabel(subscription)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatSafeDate(subscription.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Abrir acciones">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSubscription(subscription);
                                  setUsageDialogOpen(true);
                                }}
                              >
                                <Activity className="mr-2 h-4 w-4" />
                                Ver uso
                              </DropdownMenuItem>
                              {subscription.status === 'canceled' ? (
                                <DropdownMenuItem
                                  onClick={() => reactivateMutation.mutate(subscription.id)}
                                  disabled={reactivateMutation.isPending}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setCancelTarget(subscription)}
                                  disabled={cancelMutation.isPending}
                                  className="text-destructive focus:text-destructive"
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

          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {subscriptions.length} de {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={pagination.page <= 1 || isFetching}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(current + 1, Math.max(pagination.pages, 1)))}
                disabled={pagination.page >= pagination.pages || isFetching || pagination.pages === 0}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uso del plan</DialogTitle>
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
            <div className="space-y-4">
              {usageRows.map((row) => {
                const percentage = usagePercentage(row.current, row.limit);
                const unlimited = row.limit === -1;

                return (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm font-medium">{row.label}</Label>
                      <span className="text-sm text-muted-foreground">
                        {row.valueLabel} / {limitLabel(row.limit)}
                      </span>
                    </div>
                    <Progress value={unlimited ? 0 : percentage} className="h-2" />
                    <div className={cn('text-xs', unlimited ? 'text-muted-foreground' : usageTone(percentage))}>
                      {unlimited ? 'Sin limite operativo' : `${percentage.toFixed(1)}% utilizado`}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay datos de uso disponibles para esta suscripción.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar suscripción</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactiva el plan de {cancelTarget?.organizationName}. Úsala solo cuando el cobro o acceso deba cortarse desde superadmin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
