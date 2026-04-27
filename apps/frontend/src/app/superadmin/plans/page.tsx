'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Sparkles, 
  Plus,
  Edit,
  Check,
  Trash2,
  Users,
  Package,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Search,
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  RefreshCw,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { PlanModal } from './components/PlanModal';
import { dedupeCanonicalPlans, getCanonicalPlanDisplayName, normalizePlanSlug } from '@/lib/plan-catalog';

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
  created_at?: string;
  updated_at?: string;
}

// Optimized Plan Card Component
const PlanCard = React.memo(({ plan, onEdit, onDelete, isDeleting }: { 
  plan: Plan; 
  onEdit: (plan: Plan) => void; 
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) => {
  const getPlanColor = useCallback((slug: string) => {
    const s = String(slug || '').toLowerCase();
    if (s === 'free') return 'from-slate-500 to-slate-700';
    if (s === 'starter') return 'from-blue-500 to-cyan-600';
    if (s === 'professional') return 'from-purple-500 to-indigo-600';
    return 'from-slate-500 to-slate-600';
  }, []);

  const formatMoney = useCallback((amount: number, currency: string) => {
    const safe = Number(amount || 0)
    try {
      const upper = String(currency || 'PYG').toUpperCase()
      const isPy = upper === 'PYG'
      return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: upper,
        minimumFractionDigits: isPy ? 0 : 2,
        maximumFractionDigits: isPy ? 0 : 2,
      }).format(safe)
    } catch {
      return `Gs. ${safe.toLocaleString('es-PY')}`
    }
  }, [])

  return (
    <Card className="group relative backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-slate-200/50 dark:border-slate-800/50 shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:scale-[1.01] overflow-hidden flex flex-col h-full">
      {/* Header Gradient */}
      <div className={`h-2.5 bg-gradient-to-r ${getPlanColor(plan.slug)}`} />
      
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between mb-4">
          <Badge className={`bg-gradient-to-r ${getPlanColor(plan.slug)} text-white border-0 py-1 px-3 text-xs font-bold tracking-widest uppercase shadow-md`}>
            {plan.slug}
          </Badge>
          {plan.is_active ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Activo
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
              Inactivo
            </Badge>
          )}
        </div>
        <CardTitle className="text-3xl font-black tracking-tight text-slate-800 dark:text-white leading-none">
          {plan.display_name || plan.name}
        </CardTitle>
        {plan.display_name && plan.name && plan.display_name !== plan.name && (
          <p className="text-xs text-slate-400 mt-2">Nombre interno: {plan.name}</p>
        )}
        {plan.description && (
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 line-clamp-2 min-h-[40px]">
            {plan.description}
          </p>
        )}
        {plan.slug?.toLowerCase() === 'free' && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30" title="Plan de entrada con recursos reducidos">Limitado</Badge>
            <Badge variant="outline" className="text-xs" title="Máximo de usuarios administrables en la organización">Usuarios: {plan.limits?.maxUsers ?? 2}</Badge>
            <Badge variant="outline" className="text-xs" title="Cantidad total de productos en el catálogo">Productos: {plan.limits?.maxProducts ?? 50}</Badge>
            <Badge variant="outline" className="text-xs" title="Ventas registrables por mes">Transacciones/mes: {plan.limits?.maxTransactionsPerMonth ?? 200}</Badge>
            <Badge variant="outline" className="text-xs" title="Puntos de venta (sucursales) habilitados">Locales: {plan.limits?.maxLocations ?? 1}</Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6 flex-1 pt-0">
        <div className="relative group/price p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-slate-900 dark:text-white group-hover/price:scale-110 transition-transform duration-300">
                {formatMoney(plan.price_monthly, plan.currency)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/mes</span>
            </div>
            <div className="mt-3 py-1 px-4 bg-purple-100 dark:bg-purple-900/30 rounded-full text-xs font-bold text-purple-700 dark:text-purple-300">
              Anual: {formatMoney(plan.price_yearly, plan.currency)} /año
            </div>
          </div>
        </div>

        {/* Resource Limits */}
        <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Usuarios</span>
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {plan.limits?.maxUsers === -1 ? 'Ilimitados' : plan.limits?.maxUsers}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2 text-slate-400">
              <Package className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Productos</span>
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {plan.limits?.maxProducts === -1 ? 'Ilimitados' : plan.limits?.maxProducts}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            Características <ArrowRight className="h-3 w-3" />
          </h4>
          <div className="space-y-3">
            {Array.isArray(plan.features) ? plan.features.map((feature: { name: string; included: boolean } | string, idx: number) => {
              const name = typeof feature === 'string' ? feature : feature.name;
              const included = typeof feature === 'string' ? true : feature.included;
              return (
                <div key={idx} className="flex items-start gap-3 text-sm group/feature">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${included ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Check className="h-3 w-3" />
                  </div>
                  <span className={`leading-tight font-medium ${included ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 line-through'}`}>
                    {name}
                  </span>
                </div>
              );
            }) : (
              <div className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Sin características definidas
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <div className="p-6 pt-2 flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          size="lg"
          onClick={() => onEdit(plan)}
        >
          <Edit className="h-4 w-4 mr-2" /> Editar Plan
        </Button>
        <Button 
          className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
          size="lg"
          asChild
        >
          <Link href={`/superadmin/organizations?plan=${encodeURIComponent(plan.slug)}`}>
            Mejorar plan
          </Link>
        </Button>
        <Button 
          variant="outline" 
          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-slate-200 dark:border-slate-800 transition-all duration-300" 
          size="icon"
          onClick={() => onDelete(plan.id)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
});

PlanCard.displayName = 'PlanCard';

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50); // Increased to 50 as per PRD
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [sort, setSort] = useState<'price_monthly_asc' | 'price_monthly_desc' | 'slug_asc' | 'slug_desc' | 'updated_at_desc'>('price_monthly_asc');

  // Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearchQuery(value);
    setPage(1); // Reset to first page on search
  }, 300); // 300ms debounce as per PRD

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
      
      if (!response.ok) {
        throw new Error(json.error || 'Error al cargar planes');
      }
      
      return json as { plans: Plan[]; total: number; page: number; pageSize: number };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 3, // Retry 3 times as per PRD
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Optimistic delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/superadmin/plans?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar plan');
      }
      
      return response.json();
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['saas-plans', debouncedSearchQuery, statusFilter, sort, page, pageSize] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['saas-plans', debouncedSearchQuery, statusFilter, sort, page, pageSize]);
      
      // Optimistically update the cache
      queryClient.setQueryData(['saas-plans', debouncedSearchQuery, statusFilter, sort, page, pageSize], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          plans: old.plans.filter((plan: Plan) => plan.id !== deletedId),
          total: old.total - 1,
        };
      });
      
      return { previousData };
    },
    onError: (error, deletedId, context) => {
      // Rollback to the previous value
      queryClient.setQueryData(['saas-plans', debouncedSearchQuery, statusFilter, sort, page, pageSize], context?.previousData);
      toast.error('Error al eliminar plan', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
      setDeletingId(null);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      setDeletingId(null);
    },
    onSuccess: () => {
      toast.success('Plan eliminado exitosamente');
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/superadmin/plans', { method: 'PATCH' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Error al sincronizar planes')
      return json
    },
    onSuccess: (json) => {
      toast.success('Planes sincronizados', {
        description: typeof json?.message === 'string' ? json.message : undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] })
    },
    onError: (err) => {
      toast.error('No se pudo sincronizar', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      })
    },
  })

  


  

  const openEditModal = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  }, []);

  const openCreateModal = useCallback(() => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  }, []);

  const requestDelete = useCallback((id: string) => {
    setDeleteTargetId(id)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!deleteTargetId) return
    setDeletingId(deleteTargetId)
    deleteMutation.mutate(deleteTargetId)
    setDeleteTargetId(null)
  }, [deleteMutation, deleteTargetId])

  // Process plans data
  const processedPlans = useMemo(() => {
    if (!data?.plans) return [];
    return dedupeCanonicalPlans(
      data.plans.map((plan) => {
        const slug = normalizePlanSlug(plan.slug)
        return {
          ...plan,
          slug,
          display_name: getCanonicalPlanDisplayName(slug),
          name: String((plan as any).name || '').trim() || getCanonicalPlanDisplayName(slug),
        }
      })
    );
  }, [data?.plans]);

  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Skeleton loading component
  const PlanCardSkeleton = () => (
    <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-slate-200/50 dark:border-slate-800/50 shadow-2xl overflow-hidden flex flex-col h-full">
      <div className="h-2.5 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 animate-pulse" />
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent className="space-y-6 flex-1 pt-0">
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col items-center">
            <div className="h-12 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
            <div className="h-5 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
            <div className="h-5 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <div className="p-6 pt-2 flex gap-3">
        <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <SuperAdminGuard>
        <div className="space-y-8 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-3 mb-2 text-purple-600 dark:text-purple-400 font-semibold tracking-wider uppercase text-sm">
                <ShieldCheck className="h-5 w-5" />
                Super Admin Control
              </div>
              <div className="h-12 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
              <div className="h-6 w-96 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="flex gap-3 items-end">
              <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => <PlanCardSkeleton key={i} />)}
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="space-y-8 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-3 mb-2 text-purple-600 dark:text-purple-400 font-semibold tracking-wider uppercase text-sm">
                <ShieldCheck className="h-5 w-5" />
                Super Admin Control
              </div>
              <h1 className="text-5xl font-black">Planes SaaS</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg font-medium max-w-2xl leading-relaxed">
                No se pudo cargar el catálogo de planes.
              </p>
            </div>
            <div className="flex gap-3 items-end">
              <Button variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          </div>
          <Card className="p-6 border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5" />
              <div>
                <div className="font-semibold text-rose-800 dark:text-rose-200">Error</div>
                <div className="text-sm text-rose-700 dark:text-rose-300">
                  {error instanceof Error ? error.message : 'Error desconocido'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </SuperAdminGuard>
    )
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-8 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2 text-purple-600 dark:text-purple-400 font-semibold tracking-wider uppercase text-sm">
              <ShieldCheck className="h-5 w-5" />
              Super Admin Control
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent flex items-center gap-4">
              Planes SaaS
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg font-medium max-w-2xl leading-relaxed">
              Configura los niveles de suscripción, límites de recursos y precios para todas las organizaciones en el ecosistema MiPOS.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex flex-col gap-2">
              <Tabs
                value={statusFilter}
                onValueChange={(v) => {
                  const next = (v === 'inactive' || v === 'all' ? v : 'active') as 'active' | 'inactive' | 'all'
                  setStatusFilter(next)
                  setPage(1)
                }}
              >
                <TabsList>
                  <TabsTrigger value="active">Activos</TabsTrigger>
                  <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-3 items-center">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      debouncedSearch(e.target.value)
                    }}
                    placeholder="Buscar planes..."
                    className="pl-9"
                  />
                  {isFetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    </div>
                  )}
                </div>
                <Select
                  value={sort}
                  onValueChange={(v) => {
                    const next = (v || 'price_monthly_asc') as any
                    setSort(next)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[210px]">
                    <SelectValue placeholder="Orden" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_monthly_asc">Precio (asc)</SelectItem>
                    <SelectItem value="price_monthly_desc">Precio (desc)</SelectItem>
                    <SelectItem value="slug_asc">Slug (A→Z)</SelectItem>
                    <SelectItem value="slug_desc">Slug (Z→A)</SelectItem>
                    <SelectItem value="updated_at_desc">Actualizado (reciente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 items-end">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sincronizar
              </Button>
              <Button
                className="gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300"
                onClick={openCreateModal}
              >
                <Plus className="h-5 w-5" />
                Nuevo Plan
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isFetching && processedPlans.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => <PlanCardSkeleton key={i} />)}
          </div>
        )}

        {/* Plans Grid */}
        {!isFetching && processedPlans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {processedPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={openEditModal}
                onDelete={requestDelete}
                isDeleting={deletingId === plan.id}
              />
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!isFetching && processedPlans.length === 0 && (
          <Card className="col-span-full p-24 text-center bg-slate-50/50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                {debouncedSearchQuery ? 'No se encontraron planes' : 'No hay planes activos'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                {debouncedSearchQuery 
                  ? 'Intenta con otro término de búsqueda.'
                  : 'Aún no has configurado ningún plan de suscripción en el sistema. Comienza creando un plan base para tus usuarios.'
                }
              </p>
              {!debouncedSearchQuery && (
                <Button 
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  onClick={openCreateModal}
                >
                  <Plus className="h-5 w-5" /> Crear mi primer plan
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Total: {total} · Página {page} de {totalPages}
              {isFetching && <span className="ml-2 text-purple-600">Actualizando...</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                disabled={!canPrev || isFetching}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                disabled={!canNext || isFetching}
              >
                Siguiente <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-plans'] })
        }}
        plan={selectedPlan}
      />

      <AlertDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plan</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si el plan tiene suscripciones activas, el sistema bloqueará el borrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending || Boolean(deletingId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={deleteMutation.isPending || Boolean(deletingId)}
            >
              {deleteMutation.isPending || Boolean(deletingId) ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</span>
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
