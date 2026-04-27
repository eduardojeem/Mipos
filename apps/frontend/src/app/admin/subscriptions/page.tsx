'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, CreditCard, RefreshCw, Shield, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useUserOrganizations } from '@/hooks/use-user-organizations'
import { useSubscription } from '@/hooks/use-subscription'
import { usePlans } from '@/hooks/use-plans'
import { useCompanyAccess } from '@/hooks/use-company-access'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import type { Plan } from '@/hooks/use-subscription'
import { dedupeCanonicalPlans, getCanonicalFeatureLabel, getCanonicalPlanDisplayName, normalizePlanSlug } from '@/lib/plan-catalog'

type UsageStats = {
  users: number
  products: number
  locations: number
  transactions: number
}

const PLAN_STYLES: Record<string, { tone: string; icon: typeof Sparkles }> = {
  free: { tone: 'text-slate-700 dark:text-slate-100', icon: Sparkles },
  starter: { tone: 'text-blue-700 dark:text-blue-200', icon: BadgeCheck },
  professional: { tone: 'text-fuchsia-700 dark:text-fuchsia-200', icon: Shield },
}

function getPlanStyle(slug?: string) {
  return PLAN_STYLES[String(slug || 'free').toLowerCase()] || PLAN_STYLES.free
}

function formatPlanName(slug?: string, fallback?: string) {
  return fallback || getCanonicalPlanDisplayName(slug)
}

function getLimitUsage(current: number, limit?: number) {
  if (!limit || limit <= 0 || limit === 999999) {
    return { label: `${current} / Ilimitado`, percentage: 0 }
  }
  return {
    label: `${current} / ${limit}`,
    percentage: Math.min(100, Math.round((current / limit) * 100)),
  }
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { selectedOrganization, organizations, selectOrganization } = useUserOrganizations(user?.id)
  const { subscription, isLoading: subscriptionLoading, changePlan, isChangingPlan, refetch } = useSubscription()
  const { plans, isLoading: plansLoading } = usePlans()
  const access = useCompanyAccess({
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
    companyId: selectedOrganization?.id,
    enabled: Boolean(selectedOrganization?.id),
  })

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  useEffect(() => {
    if (subscription?.billingCycle) {
      setBillingCycle(subscription.billingCycle)
    }
  }, [subscription?.billingCycle])

  const loadUsage = useCallback(async () => {
    if (!selectedOrganization?.id) {
      setUsageLoading(false)
      return
    }

    setUsageLoading(true)
    try {
      const response = await fetch(`/api/subscription/usage?organizationId=${selectedOrganization.id}`, {
        headers: { 'x-organization-id': selectedOrganization.id },
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar el uso del plan')
      }
      setUsage(payload.usage || null)
    } catch (error: any) {
      setUsage(null)
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo cargar el uso del plan',
        variant: 'destructive',
      })
    } finally {
      setUsageLoading(false)
    }
  }, [selectedOrganization?.id, toast])

  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  const currentPlan = useMemo(() => {
    if (!subscription?.plan) return null
    return plans.find((plan) => normalizePlanSlug(plan.slug) === normalizePlanSlug(subscription.plan.slug)) || subscription.plan
  }, [plans, subscription?.plan])

  const visiblePlans = useMemo(() => (
    dedupeCanonicalPlans(plans, (current, candidate) => {
      if (!current) return candidate
      return normalizePlanSlug(current.slug) === current.slug ? current : candidate
    }).map((plan) => ({
      ...plan,
      name: getCanonicalPlanDisplayName(plan.slug),
      slug: normalizePlanSlug(plan.slug),
      features: (plan.features || []).map((feature) => getCanonicalFeatureLabel(feature)),
    }))
  ), [plans])

  const canChangePlan = useMemo(() => {
    const role = access.data?.context?.role
    return role === 'OWNER' || role === 'SUPER_ADMIN'
  }, [access.data?.context?.role])

  const handleChangePlan = useCallback(async (planId: string) => {
    const targetPlan = plans.find((plan) => plan.id === planId)
    if (!targetPlan) return
    if (subscription?.plan?.id === targetPlan.id) {
      toast({ title: 'Plan actual', description: 'La empresa ya usa este plan.' })
      return
    }

    setSelectedPlanId(planId)
    const result = await changePlan(planId, billingCycle)
    if (result.ok) {
      toast({ title: 'Plan actualizado', description: result.message || `La empresa ahora usa ${targetPlan.name}.` })

      const policy = result.branchPolicy
      if (policy?.deactivatedBranchIds?.length) {
        toast({
          title: 'Sucursales ajustadas por downgrade',
          description: `Se desactivaron ${policy.deactivatedBranchIds.length} sucursal(es) extra para cumplir el límite del plan.`,
        })
      }
      await refetch()
      await loadUsage()
    } else {
      toast({ title: 'Error', description: result.message || 'No se pudo cambiar el plan.', variant: 'destructive' })
    }
    setSelectedPlanId(null)
  }, [billingCycle, changePlan, loadUsage, plans, refetch, subscription?.plan?.id, toast])

  if (subscriptionLoading || plansLoading) {
    return <Skeleton className="h-[640px] rounded-3xl" />
  }

  if (!selectedOrganization) {
    return (
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertDescription>Selecciona una empresa para administrar su plan y suscripcion.</AlertDescription>
      </Alert>
    )
  }

  if (access.isLoading) {
    return <Skeleton className="h-[420px] rounded-3xl" />
  }

  if (!access.data?.allowed) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Esta seccion requiere acceso al panel administrativo y permisos de administracion de empresa.
        </AlertDescription>
      </Alert>
    )
  }

  const style = getPlanStyle(currentPlan?.slug)
  const Icon = style.icon
  const usageCards = [
    { label: 'Usuarios', current: usage?.users || 0, limit: currentPlan?.limits?.maxUsers },
    { label: 'Productos', current: usage?.products || 0, limit: currentPlan?.limits?.maxProducts },
    { label: 'Ubicaciones', current: usage?.locations || 0, limit: currentPlan?.limits?.maxLocations },
    { label: 'Transacciones', current: usage?.transactions || 0, limit: currentPlan?.limits?.maxTransactionsPerMonth },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CreditCard className="h-3.5 w-3.5" />
              Plan, renovacion y limites
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-50">Plan y suscripcion</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Gestiona el plan activo de la empresa, revisa consumo y cambia de nivel sin salir del panel administrativo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {organizations.length > 1 && (
              <div className="min-w-[220px]">
                <Label className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Empresa</Label>
                <Select value={selectedOrganization.id} onValueChange={(value) => {
                  const target = organizations.find((organization) => organization.id === value)
                  if (target) selectOrganization(target)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((organization) => (
                      <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button variant="outline" onClick={() => { void refetch(); void loadUsage(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        {!canChangePlan && (
          <Alert className="mt-4 border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Puedes ver el plan y el consumo de la empresa, pero solo `OWNER` o `SUPER_ADMIN` pueden cambiar la suscripcion.
            </AlertDescription>
          </Alert>
        )}
      </section>

      {subscription && currentPlan && (
        <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl text-slate-900 dark:text-slate-50">
                  <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                    <Icon className={`h-6 w-6 ${style.tone}`} />
                  </div>
                  {formatPlanName(currentPlan.slug, currentPlan.name)}
                </CardTitle>
                <CardDescription className="mt-2 text-slate-600 dark:text-slate-300">
                  {currentPlan.description || 'Plan activo de la empresa seleccionada.'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.status === 'trialing' ? 'Prueba' : subscription.status === 'suspended' ? 'Suspendido' : 'Activo'}
                </Badge>
                <Badge variant="outline">{billingCycle === 'yearly' ? 'Anual' : 'Mensual'}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-700/70">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Empresa</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{selectedOrganization.name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{selectedOrganization.slug}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-700/70">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Renovacion</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{subscription.daysUntilRenewal} dias</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Hasta {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-700/70">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Precio mensual</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{currentPlan.currency} {currentPlan.priceMonthly}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-700/70">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Precio anual</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{currentPlan.currency} {currentPlan.priceYearly}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-700/70 dark:bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Ciclo de facturacion</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">El cambio actualiza plan visible y limites efectivos.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button variant={billingCycle === 'monthly' ? 'default' : 'outline'} onClick={() => setBillingCycle('monthly')} disabled={!canChangePlan}>Mensual</Button>
                <Button variant={billingCycle === 'yearly' ? 'default' : 'outline'} onClick={() => setBillingCycle('yearly')} disabled={!canChangePlan}>Anual</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
          <CardHeader>
            <CardTitle>Uso actual</CardTitle>
            <CardDescription>Consumo visible para la empresa sobre los limites del plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {usageLoading ? (
              <Skeleton className="h-56 rounded-2xl" />
            ) : (
              usageCards.map((item) => {
                const usageInfo = getLimitUsage(item.current, item.limit)
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
                      <span className="text-slate-500 dark:text-slate-300">{usageInfo.label}</span>
                    </div>
                    <Progress value={usageInfo.percentage} className="h-2" />
                  </div>
                )
              })
            )}
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/dashboard/settings?tab=plan">
                <span>Ver detalles ampliados en settings</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
          <CardHeader>
            <CardTitle>Planes disponibles</CardTitle>
            <CardDescription>Actualiza la suscripcion manteniendo sincronizados plan visible y restricciones reales.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {visiblePlans.map((plan) => {
              const isCurrent = normalizePlanSlug(subscription?.plan?.slug) === plan.slug
              const planStyle = getPlanStyle(plan.slug)
              const PlanIcon = planStyle.icon
              return (
                <div key={plan.id} className={`rounded-3xl border p-5 transition-colors ${isCurrent ? 'border-primary bg-primary/5' : 'border-slate-200/80 dark:border-slate-700/70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                        <PlanIcon className={`h-5 w-5 ${planStyle.tone}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatPlanName(plan.slug, plan.name)}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{plan.description || 'Plan comercial disponible.'}</p>
                      </div>
                    </div>
                    {isCurrent && <Badge>Actual</Badge>}
                  </div>

                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly}
                    </span>
                    <span className="pb-1 text-sm text-slate-500 dark:text-slate-300">{plan.currency} / {billingCycle === 'yearly' ? 'ano' : 'mes'}</span>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {(plan.features || []).slice(0, 6).map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-5 w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={!canChangePlan || isCurrent || isChangingPlan || selectedPlanId === plan.id}
                    onClick={() => handleChangePlan(plan.id)}
                  >
                    {selectedPlanId === plan.id ? 'Actualizando...' : isCurrent ? 'Plan actual' : canChangePlan ? 'Cambiar a este plan' : 'Solo lectura'}
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

