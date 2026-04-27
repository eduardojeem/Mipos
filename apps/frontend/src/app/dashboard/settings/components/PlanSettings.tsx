'use client'

import { ArrowUpRight, CheckCircle2, Crown, Gauge, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { usePlanSyncContext } from '@/contexts/plan-sync-context'
import planService from '@/lib/services/plan-service'
import type { PlanLimit } from '@/lib/services/plan-service'
import { cn } from '@/lib/utils'
import { getCanonicalPlanDisplayName, normalizePlanSlug } from '@/lib/plan-catalog'

const PLANS = {
  free: {
    name: 'Free',
    price: 'Gs. 0',
    features: ['Inventario basico', 'Ventas basicas'],
    color: '#2563EB',
  },
  starter: {
    name: 'Starter',
    price: 'Gs. 100.000/mes',
    features: ['Compras', 'Reportes basicos', 'Gestion de equipo'],
    color: '#059669',
  },
  professional: {
    name: 'Professional',
    price: 'Gs. 200.000/mes',
    features: ['Reportes avanzados', 'Usuarios ilimitados', 'Marca personalizada'],
    color: '#7C3AED',
  },
}

export function PlanSettings() {
  const { company, planData, isLoading } = usePlanSyncContext()
  const currentPlan = normalizePlanSlug(company?.plan_type || 'free')
  const planInfo = PLANS[currentPlan as keyof typeof PLANS]

  if (isLoading) {
    return <div className="h-80 rounded-3xl bg-muted/40 animate-pulse" />
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-border/50 bg-slate-950 text-white shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Crown className="h-5 w-5" />
                  {planInfo?.name || getCanonicalPlanDisplayName(currentPlan)}
                </CardTitle>
                <CardDescription className="mt-2 text-slate-300">
                  Estado actual de tu suscripcion y lo que incluye.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-white text-slate-900">
                {planInfo.price}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {planInfo.features.map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <span>{feature}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-white/90 dark:bg-zinc-900/80 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Sparkles className="h-5 w-5" />
              Siguiente nivel
            </CardTitle>
            <CardDescription>
              Si necesitas mas capacidad, el cambio se hace desde facturacion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(PLANS)
              .filter(([planKey]) => planKey !== currentPlan)
              .map(([planKey, plan]) => (
                <div key={planKey} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold" style={{ color: plan.color }}>{plan.name}</div>
                      <div className="text-sm text-muted-foreground">{plan.price}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        window.location.href = '/admin/subscriptions'
                      }}
                    >
                      Ver
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {planData && (
        <Card className="rounded-3xl border-border/50 bg-white/90 dark:bg-zinc-900/80 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Gauge className="h-5 w-5" />
              Uso actual
            </CardTitle>
            <CardDescription>
              Vista simple de los limites mas relevantes de tu plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {planData.limits.map((limit: PlanLimit) => {
              const usagePercentage = limit.usage_percentage || 0
              const isWarning = !limit.is_unlimited && usagePercentage >= 80

              return (
                <div
                  key={limit.feature_type}
                  className={cn(
                    'rounded-2xl border p-4',
                    isWarning ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/20' : 'border-border/60 bg-muted/20'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {planService.getFeatureDisplayName(limit.feature_type)}
                    </div>
                    <Badge variant={isWarning ? 'secondary' : 'outline'}>
                      {limit.is_unlimited ? 'Ilimitado' : `${usagePercentage}%`}
                    </Badge>
                  </div>
                  {!limit.is_unlimited && (
                    <>
                      <Progress value={usagePercentage} className="mt-3 h-2" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {limit.current_usage.toLocaleString()} / {planService.formatLimitValue(limit.limit_value, limit.feature_type)}
                      </p>
                    </>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
