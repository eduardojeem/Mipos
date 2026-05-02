'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { useOrganizations } from '../hooks/useOrganizations';
import { Organization } from '../hooks/useAdminData';
import { toast } from '@/lib/toast';
import { buildTenantPublicBaseUrl } from '@/lib/domain/host-context';
import { cn } from '@/lib/utils';
import { exportCSV, exportExcel } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type StatusFilter = 'ALL' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
type PlanFilter = 'ALL' | 'FREE' | 'STARTER' | 'PROFESSIONAL';
type SortOptionValue =
  | 'created_at:desc'
  | 'created_at:asc'
  | 'name:asc'
  | 'name:desc'
  | 'subscription_status:asc'
  | 'subscription_plan:asc';

const PAGE_SIZE = 10;

const PLAN_OPTIONS: Array<{ value: PlanFilter; label: string }> = [
  { value: 'ALL', label: 'Todos los planes' },
  { value: 'FREE', label: 'Gratis' },
  { value: 'STARTER', label: 'Starter' },
  { value: 'PROFESSIONAL', label: 'Professional' },
];

const SORT_OPTIONS: Array<{ value: SortOptionValue; label: string }> = [
  { value: 'created_at:desc', label: 'Mas recientes' },
  { value: 'created_at:asc', label: 'Mas antiguas' },
  { value: 'name:asc', label: 'Nombre A-Z' },
  { value: 'name:desc', label: 'Nombre Z-A' },
  { value: 'subscription_status:asc', label: 'Estado' },
  { value: 'subscription_plan:asc', label: 'Plan' },
];

function getMemberCount(org: Organization) {
  return org.member_count ?? org.members?.[0]?.count ?? org.organization_members?.[0]?.count ?? 0;
}

function getPlanLabel(plan: string) {
  switch ((plan || '').toUpperCase()) {
    case 'PROFESSIONAL':
    case 'PRO':
      return 'Professional';
    case 'STARTER':
      return 'Starter';
    case 'FREE':
      return 'Gratis';
    default:
      return plan || 'Sin plan';
  }
}

function getPlanBadge(plan: string) {
  const normalized = (plan || '').toUpperCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        'border px-2.5 py-1 text-[11px] font-semibold',
        normalized === 'PROFESSIONAL' || normalized === 'PRO'
          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'
          : normalized === 'STARTER'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
      )}
    >
      {getPlanLabel(normalized)}
    </Badge>
  );
}

function getStatusLabel(status: string) {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'Activa';
    case 'TRIAL':
      return 'Trial';
    case 'SUSPENDED':
      return 'Suspendida';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status || 'Sin estado';
  }
}

function getStatusBadge(status: string) {
  const normalized = (status || '').toUpperCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        'border px-2.5 py-1 text-[11px] font-semibold',
        normalized === 'ACTIVE'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
          : normalized === 'TRIAL'
            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'
            : normalized === 'SUSPENDED'
              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
              : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
      )}
    >
      {getStatusLabel(normalized)}
    </Badge>
  );
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value?: Date | null) {
  if (!value) return 'Sin datos';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function getPrimaryDomain(org: Organization) {
  if (typeof org.custom_domain === 'string' && org.custom_domain.length > 0) {
    return org.custom_domain;
  }

  return buildTenantPublicBaseUrl(
    {
      slug: org.slug,
      subdomain: org.subdomain,
      custom_domain: org.custom_domain,
    },
    process.env.NEXT_PUBLIC_BASE_DOMAIN || 'miposparaguay.vercel.app'
  );
}

function buildPagination(currentPage: number, totalPages: number) {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | 'ellipsis'> = [];
  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      items.push('ellipsis');
    }
    items.push(page);
  });

  return items;
}

function StatCard({
  title,
  value,
  helper,
  active,
  icon: Icon,
  onClick,
}: {
  title: string;
  value: number;
  helper: string;
  active?: boolean;
  icon: typeof Building2;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border bg-background p-5 text-left transition-colors',
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.14em]',
              active ? 'text-white/70 dark:text-slate-500' : 'text-slate-500'
            )}
          >
            {title}
          </div>
          <div className="mt-3 text-3xl font-semibold">{value}</div>
          <div
            className={cn(
              'mt-2 text-sm',
              active ? 'text-white/75 dark:text-slate-600' : 'text-slate-500'
            )}
          >
            {helper}
          </div>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            active ? 'bg-white/10 dark:bg-slate-900/10' : 'bg-slate-100 dark:bg-slate-900'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

function StatusPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        'h-9 rounded-full px-3 text-sm',
        active
          ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200'
          : 'border-slate-200 bg-background text-slate-600 dark:border-slate-800 dark:text-slate-300'
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[11px]',
          active ? 'bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-950' : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300'
        )}
      >
        {count}
      </span>
    </Button>
  );
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('ALL');
  const [sortValue, setSortValue] = useState<SortOptionValue>('created_at:desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; ids: string[]; label: string }>({
    open: false,
    ids: [],
    label: '',
  });

  const [sortBy, sortOrder] = useMemo(() => {
    const [field, direction] = sortValue.split(':');
    return [field, direction as 'asc' | 'desc'];
  }, [sortValue]);
  const organizationFilters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter !== 'ALL' ? [statusFilter] : [],
      plan: planFilter !== 'ALL' ? [planFilter] : [],
    }),
    [debouncedSearch, statusFilter, planFilter]
  );

  const {
    organizations,
    loading: isLoading,
    isFetching,
    isRealtimeConnected,
    lastUpdatedAt,
    totalCount,
    metrics,
    error,
    refresh,
    updating,
    isUpdating,
    suspendOrganization,
    activateOrganization,
    deleteOrganization,
    bulkUpdateOrganizations,
    bulkDeleteOrganizations,
    changeSubscriptionPlan,
  } = useOrganizations({
    filters: organizationFilters,
    sortBy,
    sortOrder,
    pageSize: PAGE_SIZE,
    page: currentPage,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginationItems = buildPagination(currentPage, totalPages);
  const hasActiveFilters = searchQuery.length > 0 || statusFilter !== 'ALL' || planFilter !== 'ALL';
  const selectedCount = selectedOrgs.length;
  const allVisibleSelected = organizations.length > 0 && selectedCount === organizations.length;

  useEffect(() => {
    setSelectedOrgs((current) => {
      const filtered = current.filter((id) => organizations.some((org: Organization) => org.id === id));
      return filtered.length === current.length ? current : filtered;
    });
  }, [organizations]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openArchiveDialog = (ids: string[], label: string) => {
    setArchiveDialog({ open: true, ids, label });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPlanFilter('ALL');
    setCurrentPage(1);
  };

  const handleExportCSV = async () => {
    try {
      if (organizations.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      const data = organizations.map((org: Organization) => ({
        ID: org.id,
        Nombre: org.name,
        Slug: org.slug,
        Dominio: getPrimaryDomain(org),
        Plan: getPlanLabel(org.subscription_plan),
        Estado: getStatusLabel(org.subscription_status),
        Usuarios: getMemberCount(org),
        Creada: formatDate(org.created_at),
      }));

      await exportCSV(data as Record<string, unknown>[], 'organizaciones_mipos');
      toast.success('CSV exportado correctamente');
    } catch {
      toast.error('No se pudo exportar el CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      if (organizations.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      const data = organizations.map((org: Organization) => ({
        ID: org.id,
        Nombre: org.name,
        Slug: org.slug,
        Dominio: getPrimaryDomain(org),
        Plan: getPlanLabel(org.subscription_plan),
        Estado: getStatusLabel(org.subscription_status),
        Usuarios: getMemberCount(org),
        Creada: formatDate(org.created_at),
      }));

      await exportExcel(data as Record<string, unknown>[], 'organizaciones_mipos', 'Organizaciones');
      toast.success('Excel exportado correctamente');
    } catch {
      toast.error('No se pudo exportar el Excel');
    }
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedOrgs([]);
      return;
    }

    setSelectedOrgs(organizations.map((org: Organization) => org.id));
  };

  const toggleSelectOrg = (id: string) => {
    setSelectedOrgs((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleBulkStatusChange = async (status: 'ACTIVE' | 'SUSPENDED') => {
    if (selectedOrgs.length === 0) return;
    await bulkUpdateOrganizations(selectedOrgs, { subscription_status: status });
    setSelectedOrgs([]);
  };

  const handleBulkPlanChange = async (plan: 'FREE' | 'STARTER' | 'PROFESSIONAL') => {
    if (selectedOrgs.length === 0) return;
    await bulkUpdateOrganizations(selectedOrgs, {
      subscription_plan: plan,
      subscription_status: plan === 'FREE' ? undefined : 'ACTIVE',
    });
    setSelectedOrgs([]);
  };

  const handlePlanChange = async (id: string, plan: 'FREE' | 'STARTER' | 'PROFESSIONAL') => {
    await changeSubscriptionPlan(id, plan);
  };

  const confirmArchive = async () => {
    if (archiveDialog.ids.length === 0) return;

    if (archiveDialog.ids.length === 1) {
      await deleteOrganization(archiveDialog.ids[0]);
    } else {
      await bulkDeleteOrganizations(archiveDialog.ids);
      setSelectedOrgs([]);
    }

    setArchiveDialog({ open: false, ids: [], label: '' });
  };

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-full bg-rose-50 p-4 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">No se pudo cargar organizaciones</h2>
            <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">{error}</p>
          </div>
          <Button onClick={() => refresh()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <TooltipProvider>
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Superadmin
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  Organizaciones
                </h1>
                <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  Vista operativa de tenants, estados de suscripcion y salud general del ecosistema.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium',
                      isRealtimeConnected
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    {isRealtimeConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                    {isRealtimeConnected ? 'Realtime' : 'Sin live sync'}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Ultima actualizacion: {formatDateTime(lastUpdatedAt)}
                </TooltipContent>
              </Tooltip>

              <Button variant="outline" className="gap-2" onClick={() => refresh()} disabled={isFetching}>
                <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                Actualizar
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="mr-2 h-4 w-4 text-blue-500" />
                    CSV actual
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
                    Excel actual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => router.push('/superadmin/organizations/create')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva organizacion
              </Button>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total"
              value={metrics.total}
              helper="Empresas registradas"
              active={statusFilter === 'ALL'}
              icon={Building2}
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
            />
            <StatCard
              title="Activas"
              value={metrics.active}
              helper="Operando en produccion"
              active={statusFilter === 'ACTIVE'}
              icon={CheckCircle2}
              onClick={() => {
                setStatusFilter('ACTIVE');
                setCurrentPage(1);
              }}
            />
            <StatCard
              title="Trial"
              value={metrics.trial}
              helper="Seguimiento comercial"
              active={statusFilter === 'TRIAL'}
              icon={Clock}
              onClick={() => {
                setStatusFilter('TRIAL');
                setCurrentPage(1);
              }}
            />
            <StatCard
              title="Suspendidas"
              value={metrics.suspended}
              helper="Requieren accion"
              active={statusFilter === 'SUSPENDED'}
              icon={XCircle}
              onClick={() => {
                setStatusFilter('SUSPENDED');
                setCurrentPage(1);
              }}
            />
          </section>

          <Card className="overflow-hidden rounded-3xl border-slate-200/80 dark:border-slate-800">
            <CardHeader className="space-y-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Buscar por nombre o slug"
                      className="h-11 rounded-xl pl-10"
                    />
                    {searchQuery !== debouncedSearch && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                      value={planFilter}
                      onValueChange={(value) => {
                        setPlanFilter(value as PlanFilter);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={sortValue}
                      onValueChange={(value) => {
                        setSortValue(value as SortOptionValue);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Orden" />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Activity className="h-4 w-4" />
                  <span>{totalCount} resultados</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <StatusPill
                    active={statusFilter === 'ALL'}
                    label="Todas"
                    count={metrics.total}
                    onClick={() => {
                      setStatusFilter('ALL');
                      setCurrentPage(1);
                    }}
                  />
                  <StatusPill
                    active={statusFilter === 'ACTIVE'}
                    label="Activas"
                    count={metrics.active}
                    onClick={() => {
                      setStatusFilter('ACTIVE');
                      setCurrentPage(1);
                    }}
                  />
                  <StatusPill
                    active={statusFilter === 'TRIAL'}
                    label="Trial"
                    count={metrics.trial}
                    onClick={() => {
                      setStatusFilter('TRIAL');
                      setCurrentPage(1);
                    }}
                  />
                  <StatusPill
                    active={statusFilter === 'SUSPENDED'}
                    label="Suspendidas"
                    count={metrics.suspended}
                    onClick={() => {
                      setStatusFilter('SUSPENDED');
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" className="h-9 justify-start px-0 text-slate-500" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {selectedCount > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {selectedCount} organizaciones seleccionadas
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Acciones masivas sobre la pagina filtrada actual.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleBulkStatusChange('ACTIVE')}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Activar
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleBulkStatusChange('SUSPENDED')}
                      disabled={isUpdating}
                    >
                      <XCircle className="h-4 w-4" />
                      Suspender
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleBulkPlanChange('STARTER')}
                      disabled={isUpdating}
                    >
                      <CreditCard className="h-4 w-4" />
                      Pasar a Starter
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleBulkPlanChange('PROFESSIONAL')}
                      disabled={isUpdating}
                    >
                      <CreditCard className="h-4 w-4" />
                      Pasar a Professional
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-rose-600 hover:text-rose-600"
                      onClick={() => openArchiveDialog(selectedOrgs, `${selectedCount} organizaciones`)}
                      disabled={isUpdating}
                    >
                      <Trash2 className="h-4 w-4" />
                      Archivar
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              <div className="md:hidden">
                {isLoading && organizations.length === 0 ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="animate-pulse rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                        <div className="mt-3 h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
                        <div className="mt-4 h-16 rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                    ))}
                  </div>
                ) : organizations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                    <div className="rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                      <Search className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">Sin resultados</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Ajusta la busqueda o limpia filtros para ver mas organizaciones.
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 p-4">
                    {organizations.map((org: Organization) => (
                      <div
                        key={org.id}
                        className={cn(
                          'rounded-2xl border border-slate-200 p-4 dark:border-slate-800',
                          (updating === 'bulk' || updating === org.id) && 'pointer-events-none opacity-60'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedOrgs.includes(org.id)}
                              onCheckedChange={() => toggleSelectOrg(org.id)}
                              className="mt-1"
                            />
                            <button
                              type="button"
                              className="min-w-0 text-left"
                              onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                            >
                              <div className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                                {org.name}
                              </div>
                              <div className="truncate text-sm text-slate-500 dark:text-slate-400">/{org.slug}</div>
                            </button>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                {updating === org.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/superadmin/organizations/${org.id}`)}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePlanChange(org.id, 'FREE')}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Cambiar a Gratis
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePlanChange(org.id, 'STARTER')}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Cambiar a Starter
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePlanChange(org.id, 'PROFESSIONAL')}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Cambiar a Professional
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {org.subscription_status === 'ACTIVE' || org.subscription_status === 'TRIAL' ? (
                                <DropdownMenuItem onClick={() => suspendOrganization(org.id)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Suspender acceso
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => activateOrganization(org.id)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Activar organizacion
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() => openArchiveDialog([org.id], org.name)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Archivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {getStatusBadge(org.subscription_status)}
                          {getPlanBadge(org.subscription_plan)}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Usuarios</div>
                            <div className="mt-1 font-semibold">{getMemberCount(org)}</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Creada</div>
                            <div className="mt-1 font-semibold">{formatDate(org.created_at)}</div>
                          </div>
                          <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                              <Globe className="h-3.5 w-3.5" />
                              Dominio principal
                            </div>
                            <div className="mt-1 truncate font-medium">{getPrimaryDomain(org)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 dark:border-slate-800">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={() => toggleSelectAll()}
                            aria-label="Seleccionar todas"
                          />
                        </TableHead>
                        <TableHead className="min-w-[280px]">Organizacion</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-center">Usuarios</TableHead>
                        <TableHead>Dominio</TableHead>
                        <TableHead>Creada</TableHead>
                        <TableHead className="w-20 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && organizations.length === 0 ? (
                        Array.from({ length: 6 }).map((_, index) => (
                          <TableRow key={index} className="animate-pulse">
                            <TableCell>
                              <div className="h-5 w-5 rounded bg-slate-100 dark:bg-slate-800" />
                            </TableCell>
                            <TableCell>
                              <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
                            </TableCell>
                            <TableCell>
                              <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
                            </TableCell>
                            <TableCell>
                              <div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
                            </TableCell>
                            <TableCell>
                              <div className="mx-auto h-6 w-10 rounded bg-slate-100 dark:bg-slate-800" />
                            </TableCell>
                            <TableCell>
                              <div className="h-6 w-40 rounded bg-slate-100 dark:bg-slate-800" />
                            </TableCell>
                            <TableCell>
                              <div className="h-6 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                            </TableCell>
                            <TableCell>
                              <div className="ml-auto h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : organizations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="px-6 py-20 text-center">
                            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                              <div className="rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                                <Search className="h-8 w-8" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-lg font-semibold">Sin resultados para esta vista</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  Cambia filtros, orden o busqueda para recuperar organizaciones.
                                </p>
                              </div>
                              {hasActiveFilters && (
                                <Button variant="outline" onClick={clearFilters}>
                                  Limpiar filtros
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        organizations.map((org: Organization) => (
                          <TableRow
                            key={org.id}
                            className={cn(
                              'cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/50',
                              (updating === 'bulk' || updating === org.id) && 'pointer-events-none opacity-60',
                              selectedOrgs.includes(org.id) && 'bg-slate-50 dark:bg-slate-900/60'
                            )}
                            onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                          >
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={selectedOrgs.includes(org.id)}
                                onCheckedChange={() => toggleSelectOrg(org.id)}
                                aria-label={`Seleccionar ${org.name}`}
                              />
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                  <Building2 className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-950 dark:text-slate-50">
                                    {org.name}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <span className="truncate">/{org.slug}</span>
                                    <span className="text-slate-300 dark:text-slate-700">-</span>
                                    <span className="truncate">{getPrimaryDomain(org)}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(org.subscription_status)}</TableCell>
                            <TableCell>{getPlanBadge(org.subscription_plan)}</TableCell>
                            <TableCell className="text-center font-medium">{getMemberCount(org)}</TableCell>
                            <TableCell className="max-w-[220px] truncate text-sm text-slate-600 dark:text-slate-300">
                              {getPrimaryDomain(org)}
                            </TableCell>
                            <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                              {formatDate(org.created_at)}
                            </TableCell>
                            <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                    {updating === org.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => router.push(`/superadmin/organizations/${org.id}`)}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Abrir detalle
                                  </DropdownMenuItem>
                                  {(['FREE', 'STARTER', 'PROFESSIONAL'] as const)
                                    .filter((plan) => plan !== org.subscription_plan)
                                    .map((plan) => (
                                      <DropdownMenuItem key={plan} onClick={() => handlePlanChange(org.id, plan)}>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Cambiar a {getPlanLabel(plan)}
                                      </DropdownMenuItem>
                                    ))}
                                  <DropdownMenuSeparator />
                                  {org.subscription_status === 'ACTIVE' || org.subscription_status === 'TRIAL' ? (
                                    <DropdownMenuItem onClick={() => suspendOrganization(org.id)}>
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Suspender acceso
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => activateOrganization(org.id)}>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Activar organizacion
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-rose-600 focus:text-rose-600"
                                    onClick={() => openArchiveDialog([org.id], org.name)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Archivar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {totalCount > PAGE_SIZE && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Mostrando {(currentPage - 1) * PAGE_SIZE + 1} a {Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                      disabled={currentPage === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>

                    <div className="mx-1 flex items-center gap-1">
                      {paginationItems.map((item, index) =>
                        item === 'ellipsis' ? (
                          <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={item}
                            size="sm"
                            variant={item === currentPage ? 'default' : 'ghost'}
                            className="h-9 min-w-9 px-3"
                            onClick={() => setCurrentPage(item)}
                            disabled={isLoading}
                          >
                            {item}
                          </Button>
                        )
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialog
          open={archiveDialog.open}
          onOpenChange={(open) => setArchiveDialog((current) => ({ ...current, open }))}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archivar organizaciones</AlertDialogTitle>
              <AlertDialogDescription>
                {archiveDialog.ids.length > 1
                  ? `Se suspendera el acceso de ${archiveDialog.label}. Podras reactivarlas despues desde esta misma vista.`
                  : `Se suspendera el acceso de ${archiveDialog.label}. La organizacion seguira existiendo, pero quedara archivada.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmArchive} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Archivando
                  </>
                ) : (
                  'Confirmar archivado'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </SuperAdminGuard>
  );
}
