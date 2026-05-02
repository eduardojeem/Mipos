'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CreditCard,
  Gauge,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrganizationId, useCurrentOrganizationName } from '@/hooks/use-current-organization'
import { usePlans } from '@/hooks/use-plans'
import { type Plan, useSubscription } from '@/hooks/use-subscription'
import { usePlanSyncContext } from '@/contexts/plan-sync-context'
import {
  compareCanonicalPlanOrder,
  dedupeCanonicalPlans,
  getCanonicalFeatureLabel,
  getCanonicalPlanDisplayName,
  normalizePlanSlug,
} from '@/lib/plan-catalog'
import planService, { type PlanLimit } from '@/lib/services/plan-service'
import { cn } from '@/lib/utils'
import { BillingHistoryCard, type BillingInvoice } from './subscription/BillingHistoryCard'
import { DangerZoneCard } from './subscription/DangerZoneCard'
import {
  PaymentMethodCard,
  type PaymentMethod,
  type PaymentMethodUpdateInput,
} from './subscription/PaymentMethodCard'

type UsageFilter = 'all' | 'attention' | 'healthy' | 'unlimited'

type UsageEntry = {
  key: string
  label: string
  hint: string
  currentUsage: number
  limitValue: number
  usagePercentage: number
  isUnlimited: boolean
  resetDate: string | null
  state: 'critical' | 'warning' | 'healthy' | 'unlimited'
}

const PLAN_STYLES = {
  free: {
    icon: Sparkles,
    panelClass: 'bg-slate-950 text-white',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    accentClass: 'text-slate-100',
  },
  starter: {
    icon: BadgeCheck,
    panelClass: 'bg-blue-950 text-white',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    accentClass: 'text-blue-100',
  },
  professional: {
    icon: ShieldCheck,
    panelClass: 'bg-emerald-950 text-white',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    accentClass: 'text-emerald-100',
  },
} as const

const USAGE_STATE_META = {
  critical: {
    label: 'Critico',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
    progressClass: 'bg-rose-500',
  },
  warning: {
    label: 'En observacion',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    progressClass: 'bg-amber-500',
  },
  healthy: {
    label: 'Estable',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    progressClass: 'bg-emerald-500',
  },
  unlimited: {
    label: 'Ilimitado',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200',
    progressClass: 'bg-slate-500',
  },
} as const

const FEATURE_HINTS: Record<string, string> = {
  users: 'Miembros activos dentro de la organizacion.',
  products: 'Catalogo activo disponible para ventas e inventario.',
  monthly_transactions: 'Movimiento del mes actual sobre el plan.',
  locations: 'Sucursales o puntos operativos habilitados.',
  integrations: 'Conectores externos o automatizaciones activas.',
  notifications: 'Capacidad operativa asociada a notificaciones.',
  storage_mb: 'Almacenamiento disponible para archivos y datos.',
}

function formatMoney(amount: number, currency = 'PYG') {
  const safeAmount = Number(amount || 0)
  try {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(safeAmount)
  } catch {
    return `${currency} ${safeAmount.toLocaleString('es-PY')}`
  }
}

function normalizeLimit(limit?: number | null) {
  const parsed = Number(limit || 0)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed === 999999) return 999999
  return parsed
}

function getPlanStyle(slug?: string | null) {
  const normalized = normalizePlanSlug(slug)
  return PLAN_STYLES[normalized] || PLAN_STYLES.free
}

function getUsageLabel(featureType: string) {
  switch (featureType) {
    case 'users': return 'Usuarios'
    case 'products': return 'Productos'
    case 'monthly_transactions': return 'Transacciones'
    case 'locations': return 'Sucursales'
    case 'storage_mb': return 'Almacenamiento'
    case 'integrations': return 'Integraciones'
    default: {
      const formatted = planService.getFeatureDisplayName(featureType)
      return formatted === featureType.charAt(0).toUpperCase() + featureType.slice(1)
        ? getCanonicalFeatureLabel(featureType)
        : formatted
    }
  }
}

function getUsageHint(featureType: string) {
  return FEATURE_HINTS[featureType] || 'Capacidad controlada por el plan actual.'
}

function getUsageState(limit: PlanLimit): UsageEntry['state'] {
  if (limit.is_unlimited) return 'unlimited'
  if (limit.usage_percentage >= 90) return 'critical'
  if (limit.usage_percentage >= 75) return 'warning'
  return 'healthy'
}

function formatUsageValue(value: number, featureType: string) {
  return planService.formatLimitValue(Number(value || 0), featureType)
}

function formatResetDate(resetDate?: string | null) {
  if (!resetDate) return 'Sin fecha de reinicio'
  const parsed = new Date(resetDate)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha de reinicio'
  return parsed.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function buildUsageEntries(limits: PlanLimit[] | undefined): UsageEntry[] {
  return (limits || [])
    .map((limit) => ({
      key: limit.feature_type,
      label: getUsageLabel(limit.feature_type),
      hint: getUsageHint(limit.feature_type),
      currentUsage: Number(limit.current_usage || 0),
      limitValue: Number(limit.limit_value || 0),
      usagePercentage: Number(limit.usage_percentage || 0),
      isUnlimited: Boolean(limit.is_unlimited),
      resetDate: limit.reset_date || null,
      state: getUsageState(limit),
    }))
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, healthy: 2, unlimited: 3 } as const
      if (order[a.state] !== order[b.state]) return order[a.state] - order[b.state]
      if (a.state === 'unlimited' && b.state === 'unlimited') return a.label.localeCompare(b.label)
      return b.usagePercentage - a.usagePercentage
    })
}

export function BillingTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const organizationId = useCurrentOrganizationId()
  const organizationName = useCurrentOrganizationName()
  const { subscription, isLoading: subscriptionLoading, error, changePlan, isChangingPlan, refetch } = useSubscription()
  const { plans, isLoading: plansLoading, error: plansError, refetch: refetchPlans } = usePlans()
  const { planData, refetch: refetchPlanSync } = usePlanSyncContext()

  const isFreePlan = normalizePlanSlug(subscription?.plan?.slug) === 'free'

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false)
  const [downgradeBranches, setDowngradeBranches] = useState<Array<{ id: string; name: string; address?: string | null; phone?: string | null; is_active?: boolean; created_at?: string | null }>>([])
  const [primaryBranchId, setPrimaryBranchId] = useState<string>('')
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)
  const [branchesError, setBranchesError] = useState<string | null>(null)
  const [downgradeImpact, setDowngradeImpact] = useState<{ activeBranches: number; willDeactivate: number } | null>(null)
  const [isLoadingImpact, setIsLoadingImpact] = useState(false)
  const [impactError, setImpactError] = useState<string | null>(null)
  const [usageSearch, setUsageSearch] = useState('')
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all')
  const [advancedValue, setAdvancedValue] = useState<string>('')

  const advancedOpen = advancedValue === 'advanced'

  useEffect(() => {
    if (subscription?.billingCycle) {
      setBillingCycle(subscription.billingCycle)
    }
  }, [subscription?.billingCycle])

  const invoicesQuery = useQuery({
    queryKey: ['billing-invoices', organizationId],
    enabled: Boolean(organizationId && advancedOpen && !isFreePlan),
    staleTime: 60_000,
    queryFn: async (): Promise<BillingInvoice[]> => {
      const response = await fetch(`/api/billing/invoices${organizationId ? `?organizationId=${organizationId}` : ''}`, {
        headers: organizationId ? { 'x-organization-id': organizationId } : undefined,
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar el historial de facturacion')
      }
      return Array.isArray(payload?.invoices) ? (payload.invoices as BillingInvoice[]) : []
    },
  })

  const paymentMethodQuery = useQuery({
    queryKey: ['billing-payment-method', organizationId],
    enabled: Boolean(organizationId && advancedOpen && !isFreePlan),
    staleTime: 60_000,
    queryFn: async (): Promise<PaymentMethod | null> => {
      const response = await fetch(`/api/billing/payment-method${organizationId ? `?organizationId=${organizationId}` : ''}`, {
        headers: organizationId ? { 'x-organization-id': organizationId } : undefined,
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar el metodo de pago')
      }
      return (payload?.paymentMethod as PaymentMethod | null) ?? null
    },
  })

  const updatePaymentMethod = useMutation({
    mutationFn: async (input: PaymentMethodUpdateInput) => {
      const response = await fetch('/api/billing/payment-method', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(organizationId ? { 'x-organization-id': organizationId } : {}),
        },
        body: JSON.stringify({ ...input, organizationId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo actualizar el metodo de pago')
      }
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-payment-method', organizationId] })
      toast({
        title: 'Metodo de pago actualizado',
        description: 'Se guardo la informacion enmascarada para esta organizacion.',
      })
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo actualizar el metodo de pago',
        variant: 'destructive',
      })
    },
  })

  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(organizationId ? { 'x-organization-id': organizationId } : {}),
        },
        body: JSON.stringify({ confirm: true, organizationId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cancelar la suscripcion')
      }
      return payload
    },
    onSuccess: async (payload) => {
      toast({
        title: 'Cancelacion programada',
        description: String(payload?.message || 'Podras usar tu plan hasta el fin del periodo actual.'),
      })
      await refreshAll()
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo cancelar la suscripcion',
        variant: 'destructive',
      })
    },
  })

  const visiblePlans = useMemo(() => (
    dedupeCanonicalPlans(plans).map((plan) => ({
      ...plan,
      slug: normalizePlanSlug(plan.slug),
      name: getCanonicalPlanDisplayName(plan.slug),
      features: (plan.features || []).map((feature) => getCanonicalFeatureLabel(feature)),
    }))
  ), [plans])

  const currentPlan = useMemo(() => {
    if (!subscription?.plan) return null

    return visiblePlans.find((plan) => normalizePlanSlug(plan.slug) === normalizePlanSlug(subscription.plan.slug)) || {
      ...subscription.plan,
      slug: normalizePlanSlug(subscription.plan.slug),
      name: getCanonicalPlanDisplayName(subscription.plan.slug),
      features: (subscription.plan.features || []).map((feature) => getCanonicalFeatureLabel(feature)),
    }
  }, [subscription?.plan, visiblePlans])

  const currentPlanSlug = normalizePlanSlug(currentPlan?.slug)
  const currentPlanStyle = getPlanStyle(currentPlanSlug)
  const CurrentPlanIcon = currentPlanStyle.icon
  const nextPlan = visiblePlans.find((plan) => compareCanonicalPlanOrder(plan.slug, currentPlanSlug) > 0) || null
  const canChangePlan = Boolean(subscription?.isOrgAdmin)
  const isLoading = subscriptionLoading || plansLoading

  const usageEntries = useMemo(() => buildUsageEntries(planData?.limits), [planData?.limits])
  const usageSummary = useMemo(() => ({
    total: usageEntries.length,
    critical: usageEntries.filter((entry) => entry.state === 'critical').length,
    attention: usageEntries.filter((entry) => entry.state === 'critical' || entry.state === 'warning').length,
    unlimited: usageEntries.filter((entry) => entry.state === 'unlimited').length,
  }), [usageEntries])

  const filteredUsageEntries = useMemo(() => {
    const search = usageSearch.trim().toLowerCase()
    return usageEntries.filter((entry) => {
      if (usageFilter === 'attention' && !['critical', 'warning'].includes(entry.state)) return false
      if (usageFilter === 'healthy' && entry.state !== 'healthy') return false
      if (usageFilter === 'unlimited' && entry.state !== 'unlimited') return false
      if (!search) return true
      return `${entry.label} ${entry.key} ${entry.hint}`.toLowerCase().includes(search)
    })
  }, [usageEntries, usageFilter, usageSearch])

  const selectedCyclePrice = billingCycle === 'yearly'
    ? currentPlan?.priceYearly || 0
    : currentPlan?.priceMonthly || 0
  const secondaryCyclePrice = billingCycle === 'yearly'
    ? currentPlan?.priceMonthly || 0
    : currentPlan?.priceYearly || 0
  const usageHotspot = usageEntries.find((entry) => ['critical', 'warning'].includes(entry.state)) || usageEntries[0] || null

  const scrollToPlans = () => {
    try {
      const el = document.getElementById('plan-catalog')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch {}
  }

  const refreshAll = async () => {
    await Promise.all([
      refetch(),
      refetchPlans(),
      Promise.resolve(refetchPlanSync()),
    ])
  }

  const openPlanDialog = (plan: Plan) => {
    setPendingPlan(plan)
    setDowngradeImpact(null)
    setImpactError(null)
    setIsPlanDialogOpen(true)

    if (normalizePlanSlug(plan.slug) === 'free') {
      setIsLoadingImpact(true)
      void loadBranchesForDowngrade()
        .then((branches) => {
          const activeBranches = branches.length
          setDowngradeImpact({
            activeBranches,
            willDeactivate: Math.max(0, activeBranches - 1),
          })
        })
        .catch((e) => {
          setImpactError(e instanceof Error ? e.message : 'No se pudo calcular el impacto del downgrade')
        })
        .finally(() => setIsLoadingImpact(false))
    }
  }

  const loadBranchesForDowngrade = async (): Promise<Array<{ id: string; name: string; address?: string | null; phone?: string | null; is_active?: boolean; created_at?: string | null }>> => {
    if (!organizationId) return []
    const response = await fetch(`/api/branches${organizationId ? `?organizationId=${organizationId}` : ''}`, {
      headers: organizationId ? { 'x-organization-id': organizationId } : undefined,
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || 'No se pudieron cargar sucursales')
    }
    const rows = Array.isArray(payload?.data) ? payload.data : []
    return (rows as any[]).filter((b) => b && b.is_active !== false).map((b) => ({
      id: String(b.id),
      name: String(b.name || 'Sucursal'),
      address: typeof b.address === 'string' ? b.address : null,
      phone: typeof b.phone === 'string' ? b.phone : null,
      is_active: b.is_active,
      created_at: b.created_at || null,
    }))
  }

  const performPlanChange = async (options?: { primaryBranchId?: string | null }) => {
    if (!pendingPlan) return
    setSelectedPlanId(pendingPlan.id)
    const result = await changePlan(pendingPlan.id, billingCycle, options)

    if (result.ok) {
      toast({
        title: 'Plan actualizado',
        description: result.message || `${organizationName || 'La empresa'} ahora opera con ${pendingPlan.name}.`,
      })

      const policy = result.branchPolicy
      if (policy?.primaryBranchId) {
        try {
          window.localStorage.setItem('selected_branch_id', policy.primaryBranchId)
        } catch {}
      }

      if (policy?.deactivatedBranchIds?.length) {
        toast({
          title: 'Sucursales ajustadas por downgrade',
          description: `El plan Free permite 1 sucursal. Se desactivaron ${policy.deactivatedBranchIds.length} sucursal(es) extra.`,
        })
      }

      await refreshAll()
    } else {
      toast({
        title: 'Error',
        description: result.message || 'No se pudo actualizar el plan seleccionado.',
        variant: 'destructive',
      })
    }

    setSelectedPlanId(null)
    setPendingPlan(null)
    setIsPlanDialogOpen(false)
    setIsBranchDialogOpen(false)
  }

  const confirmPlanChange = async () => {
    if (!pendingPlan) return

    const targetSlug = normalizePlanSlug(pendingPlan.slug)
    if (targetSlug === 'free') {
      setBranchesError(null)
      setIsLoadingBranches(true)
      try {
        const branches = await loadBranchesForDowngrade()
        if (branches.length > 1) {
          setDowngradeBranches(branches)
          let preferred = branches[0]?.id || ''
          try {
            const current = window.localStorage.getItem('selected_branch_id')
            if (current && branches.some((b) => b.id === current)) preferred = current
          } catch {}
          setPrimaryBranchId(preferred)
          setIsPlanDialogOpen(false)
          setIsBranchDialogOpen(true)
          return
        }
      } catch (e) {
        setBranchesError(e instanceof Error ? e.message : 'No se pudieron cargar sucursales')
      } finally {
        setIsLoadingBranches(false)
      }
    }

    await performPlanChange()
  }

  if (isLoading) {
    return <Skeleton className="h-[680px] rounded-xl" />
  }

  if (error) {
    return (
      <Alert className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void refreshAll()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!subscription || !currentPlan) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-200" />
        <AlertDescription className="text-amber-900 dark:text-amber-50">
          No hay una suscripcion activa para la organizacion seleccionada.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <section className={cn('rounded-xl p-6 shadow-sm', currentPlanStyle.panelClass)}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <Badge className={cn('w-fit border', currentPlanStyle.badgeClass)}>
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              Suscripcion activa
            </Badge>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <CurrentPlanIcon className={cn('h-5 w-5', currentPlanStyle.accentClass)} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{currentPlan.name}</h2>
                <p className="mt-1 text-sm text-white/75">
                  {currentPlan.description || 'Plan sincronizado con Supabase y limites efectivos del sistema.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-white/85">
              <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
                {subscription.cancelAtPeriodEnd
                  ? 'Cancelacion programada'
                  : subscription.status === 'trialing'
                    ? 'Prueba'
                    : subscription.status === 'suspended'
                      ? 'Suspendido'
                      : 'Activo'}
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
                {billingCycle === 'yearly' ? 'Facturacion anual' : 'Facturacion mensual'}
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
                {organizationName || 'Empresa actual'}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Plan actual</p>
              <p className="mt-2 text-2xl font-semibold">{formatMoney(selectedCyclePrice, currentPlan.currency)}</p>
              <p className="mt-1 text-sm text-white/60">
                {billingCycle === 'yearly'
                  ? `${formatMoney(secondaryCyclePrice, currentPlan.currency)} mensual`
                  : `${formatMoney(secondaryCyclePrice, currentPlan.currency)} anual`}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Renovacion</p>
              <p className="mt-2 text-base font-semibold">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-PY', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-1 text-sm text-white/60">{subscription.daysUntilRenewal} dias restantes</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Foco de uso</p>
              <p className="mt-2 text-base font-semibold">{usageHotspot?.label || 'Sin limites cargados'}</p>
              <p className="mt-1 text-sm text-white/60">
                {usageHotspot
                  ? usageHotspot.isUnlimited
                    ? 'Sin tope configurado'
                    : `${usageHotspot.usagePercentage}% del limite`
                  : 'Actualiza la sincronizacion'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full max-w-[320px] rounded-lg bg-white/10 p-1">
            <Button
              variant="ghost"
              className={cn(
                'flex-1 rounded-md text-white hover:bg-white/10 hover:text-white',
                billingCycle === 'monthly' && 'bg-white text-slate-950 hover:bg-white hover:text-slate-950'
              )}
              onClick={() => setBillingCycle('monthly')}
              disabled={!canChangePlan}
            >
              Mensual
            </Button>
            <Button
              variant="ghost"
              className={cn(
                'flex-1 rounded-md text-white hover:bg-white/10 hover:text-white',
                billingCycle === 'yearly' && 'bg-white text-slate-950 hover:bg-white hover:text-slate-950'
              )}
              onClick={() => setBillingCycle('yearly')}
              disabled={!canChangePlan}
            >
              Anual
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {canChangePlan && nextPlan && (
              <Button variant="secondary" onClick={() => openPlanDialog(nextPlan)}>
                Upgrade a {nextPlan.name}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => void refreshAll()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Uso real del plan</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Busca modulos, filtra por estado y revisa donde el plan actual necesita mas capacidad.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px] xl:min-w-[460px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={usageSearch}
                onChange={(event) => setUsageSearch(event.target.value)}
                placeholder="Buscar limite, modulo o capacidad"
                className="pl-9"
              />
            </div>

            <Select value={usageFilter} onValueChange={(value) => setUsageFilter(value as UsageFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="attention">En observacion</SelectItem>
                <SelectItem value="healthy">Estables</SelectItem>
                <SelectItem value="unlimited">Ilimitados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Capacidades</p>
            <p className="mt-2 text-2xl font-semibold">{usageSummary.total}</p>
            <p className="mt-1 text-sm text-muted-foreground">Limites visibles del plan</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">En observacion</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900 dark:text-amber-50">{usageSummary.attention}</p>
            <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-200/80">Sobre 75% de consumo</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
            <p className="text-xs uppercase tracking-[0.16em] text-rose-700 dark:text-rose-200">Criticos</p>
            <p className="mt-2 text-2xl font-semibold text-rose-900 dark:text-rose-50">{usageSummary.critical}</p>
            <p className="mt-1 text-sm text-rose-700/80 dark:text-rose-200/80">A punto de tocar el limite</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ilimitados</p>
            <p className="mt-2 text-2xl font-semibold">{usageSummary.unlimited}</p>
            <p className="mt-1 text-sm text-muted-foreground">Sin tope configurado</p>
          </div>
        </div>

        {filteredUsageEntries.length === 0 ? (
          <Alert className="mt-5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!planData?.limits || planData.limits.length === 0
                ? 'Los límites del plan se mostrarán cuando la suscripción esté activa. Si acabas de registrarte, esto es normal.'
                : 'No hay capacidades que coincidan con tu búsqueda actual.'}
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="mt-5 h-[420px] pr-4">
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredUsageEntries.map((entry) => {
                const stateMeta = USAGE_STATE_META[entry.state]
                return (
                  <div key={entry.key} className="rounded-lg border border-border/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{entry.label}</p>
                          <Badge className={cn('border', stateMeta.badgeClass)}>
                            {stateMeta.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{entry.hint}</p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold">
                          {formatUsageValue(entry.currentUsage, entry.key)} / {entry.isUnlimited ? 'Ilimitado' : planService.formatLimitValue(entry.limitValue, entry.key)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reinicia {formatResetDate(entry.resetDate)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{entry.isUnlimited ? 'Sin tope del plan' : 'Consumo actual'}</span>
                        <span>{entry.isUnlimited ? 'Activo' : `${entry.usagePercentage}%`}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            stateMeta.progressClass,
                            entry.isUnlimited ? 'w-1/3' : ''
                          )}
                          style={entry.isUnlimited ? undefined : { width: `${Math.min(100, entry.usagePercentage)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </section>

      <section id="plan-catalog" className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Catalogo de planes</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Comparacion limpia del catalogo actual con foco en precio, limites clave y cambio de plan.
            </p>
          </div>

          <Badge variant="outline" className="w-fit">
            Vista {billingCycle === 'yearly' ? 'anual' : 'mensual'}
          </Badge>
        </div>

        {visiblePlans.length === 0 ? (
          <Alert className="mt-5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{plansError || 'No hay planes disponibles en este momento.'}</AlertDescription>
          </Alert>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {visiblePlans.map((plan) => {
              const isCurrent = normalizePlanSlug(plan.slug) === currentPlanSlug
              const isRecommended = !isCurrent && nextPlan?.id === plan.id
              const planStyle = getPlanStyle(plan.slug)
              const PlanIcon = planStyle.icon
              const visiblePrice = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
              const alternatePrice = billingCycle === 'yearly' ? plan.priceMonthly : plan.priceYearly

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'flex h-full flex-col rounded-lg border p-5 transition-colors',
                    isCurrent ? 'border-primary bg-primary/5' : 'border-border/60 bg-background'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <PlanIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">{plan.name}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.description || 'Plan comercial disponible para la organizacion.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {isCurrent && <Badge>Actual</Badge>}
                      {!isCurrent && isRecommended && <Badge variant="secondary">Recomendado</Badge>}
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-3xl font-semibold">{formatMoney(visiblePrice, plan.currency)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {billingCycle === 'yearly'
                        ? `${formatMoney(alternatePrice, plan.currency)} mensual`
                        : `${formatMoney(alternatePrice, plan.currency)} anual`}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span>Usuarios</span>
                      <span className="font-medium">{planService.formatLimitValue(normalizeLimit(plan.limits?.maxUsers), 'users')}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span>Productos</span>
                      <span className="font-medium">{planService.formatLimitValue(normalizeLimit(plan.limits?.maxProducts), 'products')}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span>Transacciones</span>
                      <span className="font-medium">{planService.formatLimitValue(normalizeLimit(plan.limits?.maxTransactionsPerMonth), 'monthly_transactions')}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span>Sucursales</span>
                      <span className="font-medium">{planService.formatLimitValue(normalizeLimit(plan.limits?.maxLocations), 'locations')}</span>
                    </div>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {(plan.features || []).slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-5"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={!canChangePlan || isCurrent || isChangingPlan || selectedPlanId === plan.id}
                    onClick={() => openPlanDialog(plan)}
                  >
                    {selectedPlanId === plan.id
                      ? 'Actualizando...'
                      : isCurrent
                        ? 'Plan actual'
                        : canChangePlan
                          ? `Cambiar a ${plan.name}`
                          : 'Solo lectura'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {isFreePlan ? (
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Facturación avanzada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Disponible en planes de pago: historial de facturas, método de pago y gestión de cancelación.
                </p>
              </div>
            </div>
            <Button
              onClick={scrollToPlans}
              disabled={!canChangePlan}
              className="shrink-0"
            >
              Ver planes
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Accordion type="single" collapsible value={advancedValue} onValueChange={setAdvancedValue}>
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]>div>svg.chevron]:rotate-180">
                <div className="flex flex-1 items-start justify-between gap-4 pr-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Facturación avanzada</p>
                      <p className="mt-0.5 text-sm font-normal text-muted-foreground">
                        Historial de facturas, método de pago y cancelación de suscripción.
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t border-border/60 px-6 pb-6 pt-5">
                <div className="flex flex-col gap-6">
                  <BillingHistoryCard
                    invoices={invoicesQuery.data || []}
                    isLoading={invoicesQuery.isLoading}
                    error={invoicesQuery.error instanceof Error ? invoicesQuery.error.message : null}
                    onRetry={() => void invoicesQuery.refetch()}
                  />

                  <PaymentMethodCard
                    canManage={canChangePlan}
                    paymentMethod={paymentMethodQuery.data ?? null}
                    isLoading={paymentMethodQuery.isLoading}
                    error={paymentMethodQuery.error instanceof Error ? paymentMethodQuery.error.message : null}
                    isSaving={updatePaymentMethod.isPending}
                    onSave={async (input) => {
                      await updatePaymentMethod.mutateAsync(input)
                    }}
                    onRefresh={() => void paymentMethodQuery.refetch()}
                  />

                  <DangerZoneCard
                    canManage={canChangePlan}
                    cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
                    currentPeriodEnd={subscription.currentPeriodEnd}
                    isCanceling={cancelSubscription.isPending}
                    onCancel={async () => {
                      await cancelSubscription.mutateAsync()
                    }}
                    onScrollToPlans={scrollToPlans}
                    onRefresh={refreshAll}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </section>

      <AlertDialog
        open={isPlanDialogOpen}
        onOpenChange={(open) => {
          setIsPlanDialogOpen(open)
          if (!open) setPendingPlan(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar plan</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlan
                ? `Se actualizara la empresa a ${pendingPlan.name} con ciclo ${billingCycle === 'yearly' ? 'anual' : 'mensual'}. Este cambio sincroniza suscripcion, limites y renovacion.`
                : 'Confirma el cambio de plan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingPlan && normalizePlanSlug(pendingPlan.slug) === 'free' ? (
            <div className="space-y-3">
              {impactError ? (
                <Alert className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{impactError}</AlertDescription>
                </Alert>
              ) : isLoadingImpact ? (
                <Alert className="border-border/60 bg-muted/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Calculando impacto del downgrade...</AlertDescription>
                </Alert>
              ) : downgradeImpact && downgradeImpact.willDeactivate > 0 ? (
                <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    El plan Free permite 1 sucursal activa. Actualmente tienes {downgradeImpact.activeBranches}. Se desactivarán {downgradeImpact.willDeactivate} sucursal(es) y podrás elegir cuál queda como principal.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingPlan}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPlanChange} disabled={isChangingPlan || isLoadingBranches}>
              {isChangingPlan ? 'Actualizando...' : 'Confirmar cambio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isBranchDialogOpen}
        onOpenChange={(open) => {
          setIsBranchDialogOpen(open)
          if (!open) {
            setDowngradeBranches([])
            setBranchesError(null)
            setPrimaryBranchId('')
            setIsPlanDialogOpen(true)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elegir sucursal principal</AlertDialogTitle>
            <AlertDialogDescription>
              El plan Free permite 1 sucursal activa. Selecciona cuál quedará activa; las demás se desactivarán.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {branchesError ? (
            <Alert className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{branchesError}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <RadioGroup value={primaryBranchId} onValueChange={setPrimaryBranchId} className="gap-3">
                {downgradeBranches.map((b) => (
                  <div key={b.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                    <RadioGroupItem value={b.id} id={`primary-branch-${b.id}`} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`primary-branch-${b.id}`} className="text-sm font-medium">
                        {b.name}
                      </Label>
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {b.address ? <p>{b.address}</p> : null}
                        {b.phone ? <p>{b.phone}</p> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingPlan}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void performPlanChange({ primaryBranchId: primaryBranchId || null })}
              disabled={isChangingPlan || !primaryBranchId}
            >
              {isChangingPlan ? 'Aplicando...' : 'Confirmar downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
