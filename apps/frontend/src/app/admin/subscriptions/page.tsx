'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Building2, CreditCard, RefreshCw, Shield, Sparkles, Check, ArrowRight, Zap, Users, Package, MapPin, Activity, Key, Download } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useUserOrganizations } from '@/hooks/use-user-organizations'
import { useSubscription } from '@/hooks/use-subscription'
import { usePlans } from '@/hooks/use-plans'
import { useCompanyAccess } from '@/hooks/use-company-access'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import type { Plan } from '@/hooks/use-subscription'
import { dedupeCanonicalPlans, getCanonicalFeatureLabel, getCanonicalPlanDisplayName, normalizePlanSlug } from '@/lib/plan-catalog'
import { cn } from '@/lib/utils'

type UsageStats = {
  users: number
  products: number
  locations: number
  transactions: number
}

const PLAN_STYLES: Record<string, { tone: string; bgTone: string; icon: typeof Sparkles }> = {
  free: { tone: 'text-slate-600 dark:text-slate-300', bgTone: 'bg-slate-100 dark:bg-slate-800', icon: Sparkles },
  starter: { tone: 'text-blue-600 dark:text-blue-400', bgTone: 'bg-blue-100 dark:bg-blue-900/40', icon: BadgeCheck },
  professional: { tone: 'text-fuchsia-600 dark:text-fuchsia-400', bgTone: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', icon: Zap },
  enterprise: { tone: 'text-violet-600 dark:text-violet-400', bgTone: 'bg-violet-100 dark:bg-violet-900/40', icon: Shield },
}

function getPlanStyle(slug?: string) {
  return PLAN_STYLES[String(slug || 'free').toLowerCase()] || PLAN_STYLES.free
}

function formatPlanName(slug?: string, fallback?: string) {
  return fallback || getCanonicalPlanDisplayName(slug)
}

function getLimitUsage(current: number, limit?: number) {
  if (!limit || limit <= 0 || limit === 999999) {
    return { label: `${current} / Ilimitado`, percentage: 0, isUnlimited: true }
  }
  const pct = Math.min(100, Math.round((current / limit) * 100))
  return {
    label: `${current} / ${limit}`,
    percentage: pct,
    isUnlimited: false,
    color: pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
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

  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [activationCode, setActivationCode] = useState('')
  const [isActivating, setIsActivating] = useState(false)

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

  const loadInvoices = useCallback(async () => {
    if (!selectedOrganization?.id) {
      setInvoicesLoading(false)
      return
    }
    setInvoicesLoading(true)
    try {
      const response = await fetch(`/api/billing/invoices?organizationId=${selectedOrganization.id}`, {
        headers: { 'x-organization-id': selectedOrganization.id },
        cache: 'no-store',
      })
      const payload = await response.json()
      if (response.ok && payload.success) {
        setInvoices(payload.invoices || [])
      } else {
        setInvoices([])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setInvoices([])
    } finally {
      setInvoicesLoading(false)
    }
  }, [selectedOrganization?.id])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const handleActivateCode = async () => {
    if (!activationCode.trim()) {
      toast({ title: 'Atención', description: 'Ingresa un código de activación', variant: 'destructive' })
      return
    }
    setIsActivating(true)
    // Mock logic for activation code
    setTimeout(() => {
      setIsActivating(false)
      if (activationCode.toUpperCase().startsWith('PROMO') || activationCode.length > 5) {
        toast({ title: 'Éxito', description: 'Código aplicado exitosamente. Tu plan y facturas han sido actualizados.' })
        setActivationCode('')
        refetch()
        loadInvoices()
      } else {
        toast({ title: 'Error', description: 'El código ingresado no es válido o ya fue utilizado.', variant: 'destructive' })
      }
    }, 1500)
  }

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
    { label: 'Usuarios', current: usage?.users || 0, limit: currentPlan?.limits?.maxUsers, icon: Users },
    { label: 'Productos', current: usage?.products || 0, limit: currentPlan?.limits?.maxProducts, icon: Package },
    { label: 'Ubicaciones', current: usage?.locations || 0, limit: currentPlan?.limits?.maxLocations, icon: MapPin },
    { label: 'Transacciones', current: usage?.transactions || 0, limit: currentPlan?.limits?.maxTransactionsPerMonth, icon: Activity },
  ]

  // Reordenar los planes para que se vean bien: Free -> Starter -> Professional -> Enterprise
  const sortedPlans = [...visiblePlans].sort((a, b) => Number(a.priceMonthly) - Number(b.priceMonthly))

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-border/40 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Suscripción y Límites
          </div>
          <h1 className="mt-4 text-4xl font-extrabold text-foreground tracking-tight">Plan de la Empresa</h1>
          <p className="mt-2 text-base text-muted-foreground max-w-2xl">
            Gestiona el plan activo, monitorea el uso de recursos y mejora tu plan para acceder a herramientas más avanzadas.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {organizations.length > 1 && (
            <div className="min-w-[220px]">
              <Select value={selectedOrganization.id} onValueChange={(value) => {
                const target = organizations.find((o) => o.id === value)
                if (target) selectOrganization(target)
              }}>
                <SelectTrigger className="rounded-xl h-10 shadow-sm">
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" className="rounded-xl h-10 shadow-sm" onClick={() => { void refetch(); void loadUsage(); void loadInvoices(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </section>

      {!canChangePlan && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 rounded-2xl">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Solo los usuarios con rol de <strong>Propietario</strong> o <strong>Super Administrador</strong> pueden cambiar la suscripción de la empresa. Modo de solo lectura activo.
          </AlertDescription>
        </Alert>
      )}

      {/* Hero: Current Plan */}
      {subscription && currentPlan && (
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl ring-1 ring-white/10">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl filter"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl filter"></div>
          
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 ${style.tone.replace('text-', 'text-').replace('dark:', '')}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div>
                  <Badge variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-medium uppercase tracking-wider mb-1">
                    Plan Activo
                  </Badge>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight flex items-center gap-3">
                    {formatPlanName(currentPlan.slug, currentPlan.name)}
                  </h2>
                </div>
              </div>
              <p className="text-slate-300 text-lg md:text-xl max-w-xl font-medium leading-relaxed">
                {currentPlan.description || 'Disfruta de todas las características de tu plan actual.'}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <div className="flex items-center gap-2 bg-black/30 rounded-xl px-4 py-2 border border-white/5 backdrop-blur-md">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">{selectedOrganization.name}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/30 rounded-xl px-4 py-2 border border-white/5 backdrop-blur-md">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">
                    Facturación {billingCycle === 'yearly' ? 'Anual' : 'Mensual'}
                  </span>
                </div>
                <Badge className={cn("px-4 py-2 text-sm font-semibold rounded-xl border-0", 
                  subscription.status === 'active' ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : 
                  subscription.status === 'trialing' ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : 
                  "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                )}>
                  {subscription.status === 'active' ? '● Suscripción Activa' : 
                   subscription.status === 'trialing' ? '● Período de Prueba' : '● Suspendida'}
                </Badge>
              </div>
            </div>

            <div className="w-full md:w-auto bg-black/20 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-center md:text-right shrink-0">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-2">Próxima Renovación</p>
              <p className="text-4xl font-bold font-mono tracking-tighter">
                {subscription.daysUntilRenewal} <span className="text-xl font-medium text-slate-400 tracking-normal">días</span>
              </p>
              <p className="text-sm text-slate-400 mt-2">
                El {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Usage Stats Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">Consumo del Plan</h3>
          <p className="text-sm text-muted-foreground">Límites asignados a tu empresa</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {usageLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)
          ) : (
            usageCards.map((item) => {
              const usageInfo = getLimitUsage(item.current, item.limit)
              const ItemIcon = item.icon
              return (
                <Card key={item.label} className="glass-card hover-lift overflow-hidden border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <ItemIcon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {usageInfo.isUnlimited ? '∞' : `${usageInfo.percentage}%`}
                      </Badge>
                    </div>
                    <div className="space-y-1 mb-4">
                      <p className="text-2xl font-bold tracking-tight">{item.current}</p>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    </div>
                    {!usageInfo.isUnlimited && (
                      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out", usageInfo.color)} 
                          style={{ width: `${usageInfo.percentage}%` }}
                        />
                      </div>
                    )}
                    {usageInfo.isUnlimited && (
                      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full w-full bg-emerald-500/20" />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 text-right font-medium">
                      {usageInfo.label}
                    </p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </section>

      {/* Billing & Activation Section */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 pt-6 border-t border-border/40">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">Historial de Facturación</h3>
          </div>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            {invoicesLoading ? (
              <div className="p-8 flex justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No hay facturas registradas.</div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-xs font-mono">{inv.invoice_number}</TableCell>
                      <TableCell>{new Date(inv.created_at || inv.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>{inv.currency === 'USD' ? '$' : inv.currency} {inv.amount}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className={inv.status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                          {inv.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Descargar Factura">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight">Activar Código</h3>
          <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5 text-primary" />
                Código Promocional
              </CardTitle>
              <CardDescription>
                Ingresa un código de pago o promoción para activar facturas o mejorar tu plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Ej: PROMO2026" 
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  className="uppercase font-mono tracking-wider"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleActivateCode} 
                disabled={isActivating || !activationCode}
                className="w-full"
              >
                {isActivating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {isActivating ? 'Activando...' : 'Canjear Código'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Pricing Tables */}
      <section className="space-y-6 pt-6 border-t border-border/40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight">Mejora tu suscripción</h3>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Desbloquea límites superiores y características exclusivas. Cambia de plan en cualquier momento.
            </p>
          </div>
          
          {/* Custom Billing Toggle */}
          <div className="inline-flex items-center p-1 bg-muted/50 rounded-2xl border border-border/50 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              disabled={!canChangePlan}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                billingCycle === 'monthly' ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              disabled={!canChangePlan}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                billingCycle === 'yearly' ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Anual
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0 text-[10px] uppercase tracking-wider px-1.5 py-0">Ahorro 20%</Badge>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-6">
          {sortedPlans.map((plan) => {
            const isCurrent = normalizePlanSlug(subscription?.plan?.slug) === plan.slug
            const planStyle = getPlanStyle(plan.slug)
            const PlanIcon = planStyle.icon
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
            const isPremium = plan.slug === 'professional' || plan.slug === 'enterprise'

            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "relative flex flex-col overflow-hidden transition-all duration-500 rounded-[2rem]",
                  isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/20 bg-primary/[0.02] shadow-xl shadow-primary/10" 
                            : "border-border/60 hover:border-border hover:shadow-xl hover:-translate-y-1 bg-card"
                )}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0 left-0 text-center py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest">
                    Plan Actual
                  </div>
                )}
                
                <CardHeader className={cn("pb-6", isCurrent ? "pt-10" : "pt-8")}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-3 rounded-2xl", planStyle.bgTone, planStyle.tone)}>
                      <PlanIcon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{formatPlanName(plan.slug, plan.name)}</CardTitle>
                  </div>
                  
                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-black tracking-tighter">{plan.currency === 'USD' ? '$' : plan.currency}{price}</span>
                    <span className="text-sm text-muted-foreground font-medium pb-1.5">/mes</span>
                  </div>
                  <CardDescription className="text-sm font-medium mt-3 leading-relaxed">
                    {plan.description || 'La mejor opción para potenciar tu negocio.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Incluye</p>
                    <ul className="space-y-3">
                      {(plan.features || []).slice(0, 6).map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className={cn("mt-0.5 rounded-full p-1", isPremium ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </div>
                          <span className="text-sm font-medium leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="pt-6 pb-8 px-6">
                  <Button
                    className={cn(
                      "w-full h-12 rounded-xl text-base font-bold transition-all",
                      isCurrent ? "bg-muted text-muted-foreground hover:bg-muted" : 
                      isPremium ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-primary/20" : 
                      "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    )}
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={!canChangePlan || isCurrent || isChangingPlan || selectedPlanId === plan.id}
                    onClick={() => handleChangePlan(plan.id)}
                  >
                    {selectedPlanId === plan.id ? (
                      'Actualizando...'
                    ) : isCurrent ? (
                      'Plan actual'
                    ) : (
                      <>
                        {canChangePlan ? 'Cambiar Plan' : 'Solo lectura'}
                        {canChangePlan && <ArrowRight className="ml-2 h-4 w-4" />}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
