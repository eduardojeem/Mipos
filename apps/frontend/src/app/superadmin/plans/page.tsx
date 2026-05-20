'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { PlanModal } from './components/PlanModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  dedupeCanonicalPlans,
  getCanonicalFeatureLabel,
  getCanonicalPlanDisplayName,
  normalizePlanSlug,
} from '@/lib/plan-catalog';

interface Plan {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  trial_days: number;
  features: (string | { name: string; included: boolean })[];
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxTransactionsPerMonth: number;
    maxLocations: number;
  };
  is_active: boolean;
  organization_count?: number;
  active_subscription_count?: number;
  mrr?: number;
  created_at?: string;
  updated_at?: string;
}

type SortValue =
  | 'price_monthly_asc'
  | 'price_monthly_desc'
  | 'slug_asc'
  | 'slug_desc'
  | 'updated_at_desc';

function formatMoney(amount: number, currency: string) {
  const safe = Number(amount || 0);
  const upper = String(currency || 'PYG').toUpperCase();
  try {
    const isPy = upper === 'PYG';
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: upper,
      minimumFractionDigits: isPy ? 0 : 2,
      maximumFractionDigits: isPy ? 0 : 2,
    }).format(safe);
  } catch {
    return `${upper} ${safe.toLocaleString('es-PY')}`;
  }
}

function formatLimit(value?: number) {
  if (value === -1) return 'Ilimitado';
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('es-PY');
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getPlanTone(slug: string) {
  const normalized = normalizePlanSlug(slug);
  if (normalized === 'free') return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
  if (normalized === 'starter') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300';
  if (normalized === 'professional') return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300';
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300';
}

function featureName(feature: Plan['features'][number]) {
  return getCanonicalFeatureLabel(typeof feature === 'string' ? feature : feature.name);
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="rounded-md">
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{helper}</div>
      </CardContent>
    </Card>
  );
}

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [sort, setSort] = useState<SortValue>('price_monthly_asc');

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearchQuery(value);
    setPage(1);
  }, 300);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['saas-plans', debouncedSearchQuery, statusFilter, sort, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: debouncedSearchQuery,
        status: statusFilter,
        sort,
        page: String(page),
        pageSize: String(pageSize),
      });

      const response = await fetch(`/api/superadmin/plans?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Error al cargar planes');
      return json as { plans: Plan[]; total: number; page: number; pageSize: number };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  const processedPlans = useMemo(() => {
    if (!data?.plans) return [];
    return dedupeCanonicalPlans(
      data.plans.map((plan) => {
        const slug = normalizePlanSlug(plan.slug);
        return {
          ...plan,
          slug,
          display_name: getCanonicalPlanDisplayName(slug),
          name: String(plan.name || '').trim() || getCanonicalPlanDisplayName(slug),
        };
      }),
      (current, candidate) => {
        if (!current) return candidate;
        return Number(candidate.organization_count || 0) > Number(current.organization_count || 0)
          ? candidate
          : current;
      }
    );
  }, [data?.plans]);

  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const summary = useMemo(() => {
    const activePlans = processedPlans.filter((plan) => plan.is_active).length;
    const tenants = processedPlans.reduce((sum, plan) => sum + Number(plan.organization_count || 0), 0);
    const mrr = processedPlans.reduce((sum, plan) => sum + Number(plan.mrr || 0), 0);
    return { activePlans, tenants, mrr };
  }, [processedPlans]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/superadmin/plans?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Error al eliminar plan');
      }
      return response.json();
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['saas-plans'] });
      setDeletingId(deletedId);
    },
    onSuccess: () => {
      toast.success('Plan eliminado');
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
    },
    onError: (err) => {
      toast.error('No se pudo eliminar', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    },
    onSettled: () => {
      setDeletingId(null);
      setDeleteTarget(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/superadmin/plans', { method: 'PATCH' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Error al sincronizar planes');
      return json;
    },
    onSuccess: (json) => {
      toast.success('Planes sincronizados', {
        description: typeof json?.message === 'string' ? json.message : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
    },
    onError: (err) => {
      toast.error('No se pudo sincronizar', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    },
  });

  const openEditModal = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  }, []);

  const openCreateModal = useCallback(() => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  }, []);

  if (isLoading) {
    return (
      <SuperAdminGuard>
        <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-6 sm:px-6">
          <div className="h-24 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
          <div className="h-96 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
        </div>
      </SuperAdminGuard>
    );
  }

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <AlertCircle className="h-10 w-10 text-rose-600" />
          <div>
            <h1 className="text-2xl font-semibold">No se pudo cargar planes</h1>
            <p className="mt-2 text-sm text-slate-500">{error instanceof Error ? error.message : 'Error desconocido'}</p>
          </div>
          <Button onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Sparkles className="h-4 w-4" />
              Catalogo SaaS
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              Planes
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Administra precios, limites y features por plan. Los cambios impactan nuevas asignaciones y reglas de entitlement.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar defaults
            </Button>
            <Button className="gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Nuevo plan
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Planes activos" value={String(summary.activePlans)} helper={`${processedPlans.length} planes canonicos`} />
          <SummaryCard label="Tenants asignados" value={String(summary.tenants)} helper="Segun suscripciones SaaS" />
          <SummaryCard label="MRR estimado" value={formatMoney(summary.mrr, processedPlans[0]?.currency || 'PYG')} helper="Suscripciones activas por plan" />
        </div>

        <Card className="rounded-md">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <Tabs
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter((value === 'inactive' || value === 'all' ? value : 'active') as 'active' | 'inactive' | 'all');
                  setPage(1);
                }}
              >
                <TabsList>
                  <TabsTrigger value="active">Activos</TabsTrigger>
                  <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      debouncedSearch(event.target.value);
                    }}
                    placeholder="Buscar plan..."
                    className="pl-9"
                  />
                  {isFetching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>
                <Select
                  value={sort}
                  onValueChange={(value) => {
                    setSort((value || 'price_monthly_asc') as SortValue);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="sm:w-[220px]">
                    <SelectValue placeholder="Orden" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_monthly_asc">Precio mensual asc</SelectItem>
                    <SelectItem value="price_monthly_desc">Precio mensual desc</SelectItem>
                    <SelectItem value="slug_asc">Plan A-Z</SelectItem>
                    <SelectItem value="slug_desc">Plan Z-A</SelectItem>
                    <SelectItem value="updated_at_desc">Actualizado reciente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Mensual</TableHead>
                  <TableHead className="text-right">Anual</TableHead>
                  <TableHead className="text-right">Usuarios</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                  <TableHead className="text-right">Ventas/mes</TableHead>
                  <TableHead className="text-right">Sucursales</TableHead>
                  <TableHead className="text-right">Tenants</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-32 text-center text-slate-500">
                      No hay planes para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  processedPlans.map((plan) => {
                    const tenantCount = Number(plan.organization_count || 0);
                    return (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className={cn('rounded-md font-semibold uppercase', getPlanTone(plan.slug))}>
                              {plan.slug}
                            </Badge>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-950 dark:text-slate-50">
                                {plan.display_name || plan.name}
                              </div>
                              <div className="line-clamp-1 max-w-[360px] text-xs text-slate-500">
                                {plan.description || 'Sin descripcion'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {plan.is_active ? (
                            <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-md text-slate-500">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(plan.price_monthly, plan.currency)}</TableCell>
                        <TableCell className="text-right">{formatMoney(plan.price_yearly, plan.currency)}</TableCell>
                        <TableCell className="text-right">{formatLimit(plan.limits?.maxUsers)}</TableCell>
                        <TableCell className="text-right">{formatLimit(plan.limits?.maxProducts)}</TableCell>
                        <TableCell className="text-right">{formatLimit(plan.limits?.maxTransactionsPerMonth)}</TableCell>
                        <TableCell className="text-right">{formatLimit(plan.limits?.maxLocations)}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/superadmin/organizations?plan=${encodeURIComponent(plan.slug)}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            {tenantCount}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[260px] flex-wrap gap-1">
                            {(plan.features || []).slice(0, 3).map((feature, index) => (
                              <Badge key={`${plan.id}-feature-${index}`} variant="outline" className="rounded-md text-[11px]">
                                {featureName(feature)}
                              </Badge>
                            ))}
                            {(plan.features || []).length > 3 && (
                              <Badge variant="outline" className="rounded-md text-[11px]">
                                +{(plan.features || []).length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(plan.updated_at || plan.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditModal(plan)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar plan
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/superadmin/organizations?plan=${encodeURIComponent(plan.slug)}`}>
                                  <Building2 className="mr-2 h-4 w-4" />
                                  Ver organizaciones
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={tenantCount > 0 || deletingId === plan.id}
                                onClick={() => setDeleteTarget(plan)}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {tenantCount > 0 ? 'En uso' : 'Eliminar'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {total > 0 && (
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Total: {total} · Pagina {page} de {totalPages}
                  {isFetching && <span className="ml-2">Actualizando...</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={!canPrev || isFetching}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={!canNext || isFetching}
                  >
                    Siguiente
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['saas-plans'] })}
        plan={selectedPlan}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plan</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Solo se pueden eliminar planes sin tenants asignados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando...
                </span>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminGuard>
  );
}
