'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Check, Loader2, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Footer } from '../components/Footer';
import { LandingHeader } from '../components/LandingHeader';
import { RegistrationForm } from '../components/RegistrationForm';
import '../landing.css';
import { usePlans } from '@/hooks/use-plans';
import type { Plan } from '@/hooks/use-subscription';
import {
  buildPublicRegistrationPath,
  formatCurrency,
  getPlanFeatureLabels,
  getPlanLimitItems,
  getPlanNarrative,
  getRecommendedPlan,
} from '@/lib/public-plan-utils';

function PlanSummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="landing-panel rounded-lg p-6">
        <Skeleton className="h-5 w-28 bg-white/10" />
        <Skeleton className="mt-4 h-10 w-40 bg-white/10" />
        <Skeleton className="mt-3 h-4 w-full bg-white/10" />
        <Skeleton className="mt-2 h-4 w-5/6 bg-white/10" />
      </div>
      <div className="landing-panel rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-24 bg-white/10" />
              <Skeleton className="mt-2 h-4 w-28 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="landing-panel rounded-lg p-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="mt-3 h-4 w-full bg-white/10 first:mt-0" />
        ))}
      </div>
    </div>
  );
}

function resolveSelectedPlan(plans: Plan[], requestedSlug: string | null) {
  if (!plans.length) {
    return null;
  }

  if (requestedSlug) {
    const matchedPlan = plans.find((plan) => plan.slug === requestedSlug);
    if (matchedPlan) {
      return matchedPlan;
    }
  }

  const freePlan = plans.find((plan) => plan.priceMonthly === 0);
  return freePlan || getRecommendedPlan(plans) || plans[0] || null;
}

export default function RegistroPage() {
  const searchParams = useSearchParams();
  const requestedSlug = searchParams.get('plan');
  const { plans, isLoading, error, refetch } = usePlans();

  const selectedPlan = useMemo(
    () => resolveSelectedPlan(plans, requestedSlug),
    [plans, requestedSlug]
  );
  const planNarrative = useMemo(
    () => getPlanNarrative(selectedPlan?.slug),
    [selectedPlan?.slug]
  );
  const featureLabels = useMemo(
    () => getPlanFeatureLabels(selectedPlan?.features || []).slice(0, 6),
    [selectedPlan?.features]
  );
  const limitItems = useMemo(
    () => (selectedPlan ? getPlanLimitItems(selectedPlan) : []),
    [selectedPlan]
  );

  const handleRegistrationSuccess = () => {
    window.location.href = '/dashboard/settings?tab=system';
  };

  const handleQuickPlanChange = (plan: Plan) => {
    const url = new URL(window.location.href);
    url.searchParams.set('plan', plan.slug);
    window.history.replaceState({}, '', url.toString());
    window.location.reload();
  };

  return (
    <div className="landing-shell min-h-screen text-white">
      <LandingHeader />

      <main className="relative">
        <section className="border-b border-white/10 py-16 lg:py-24">
          <div className="landing-container">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-start">
              <div>
                <Link
                  href="/inicio/planes"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al catalogo de planes
                </Link>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Alta de cuenta
                </div>

                <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Registro guiado con el plan ya definido
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  Crea la cuenta principal de tu negocio y entra al sistema con el plan seleccionado.
                </p>

                {/* Quick plan selector */}
                {!isLoading && plans.length > 1 && (
                  <div className="mt-8">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Cambiar plan rapidamente
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => handleQuickPlanChange(plan)}
                          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                            selectedPlan?.id === plan.id
                              ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <span className="block">{plan.name}</span>
                          <span className="mt-0.5 block text-xs opacity-70">
                            {plan.priceMonthly === 0
                              ? 'Gratis'
                              : `${formatCurrency(plan.priceMonthly, plan.currency)}/mes`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-10">
                  {isLoading && !selectedPlan ? (
                    <PlanSummarySkeleton />
                  ) : error && !selectedPlan ? (
                    <Alert className="border-red-500/30 bg-red-500/10 text-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No se pudo preparar el registro</AlertTitle>
                      <AlertDescription className="mt-2 flex flex-col gap-4 text-red-50/90">
                        <span>{error}</span>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            onClick={() => void refetch()}
                            className="rounded-lg bg-white text-slate-950 hover:bg-slate-200"
                          >
                            Reintentar
                          </Button>
                          <Link href="/inicio/planes">
                            <Button
                              variant="outline"
                              className="rounded-lg border-white/10 bg-transparent text-white hover:bg-white/5"
                            >
                              Ver planes
                            </Button>
                          </Link>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : selectedPlan ? (
                    <div className="space-y-4">
                      <div className="landing-panel rounded-lg p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-300">
                              <Store className="h-3.5 w-3.5 text-amber-300" />
                              Plan activo para el alta
                            </div>
                            <h2 className="mt-4 text-3xl font-semibold text-white">{selectedPlan.name}</h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                              {selectedPlan.description || planNarrative.summary}
                            </p>
                          </div>

                          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-100/80">
                              Precio base
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {formatCurrency(selectedPlan.priceMonthly, selectedPlan.currency)}
                              {selectedPlan.priceMonthly > 0 ? (
                                <span className="ml-1 text-sm font-medium text-slate-300">/ mes</span>
                              ) : null}
                            </p>
                            {selectedPlan.trialDays && selectedPlan.trialDays > 0 ? (
                              <p className="mt-1 text-xs text-emerald-100/80">
                                {selectedPlan.trialDays} dias de prueba incluidos
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="landing-panel rounded-lg p-6">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                          Capacidad incluida
                        </p>
                        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
                          {limitItems.map((item) => (
                            <div key={item.key}>
                              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                                {item.label}
                              </dt>
                              <dd className="mt-1 text-sm font-medium text-slate-100">{item.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      <div className="landing-panel rounded-lg p-6">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                          Lo que habilita este plan
                        </p>
                        <ul className="mt-4 space-y-3">
                          {featureLabels.map((feature) => (
                            <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="landing-panel rounded-lg p-5">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
                            <div>
                              <p className="text-sm font-medium text-white">Credenciales seguras</p>
                              <p className="mt-1 text-sm text-slate-400">
                                La cuenta creada queda como administradora principal de la organizacion.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="landing-panel rounded-lg p-5">
                          <div className="flex items-start gap-3">
                            <Sparkles className="mt-0.5 h-5 w-5 text-amber-300" />
                            <div>
                              <p className="text-sm font-medium text-white">Cambio de plan posterior</p>
                              <p className="mt-1 text-sm text-slate-400">
                                Si tu operacion cambia, puedes ajustar la suscripcion despues del alta.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link href="/inicio/planes">
                          <Button
                            variant="outline"
                            className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
                          >
                            Cambiar plan
                          </Button>
                        </Link>
                        {requestedSlug && selectedPlan.slug !== requestedSlug ? (
                          <Link href={buildPublicRegistrationPath(selectedPlan.slug)}>
                            <Button
                              variant="ghost"
                              className="rounded-lg px-0 text-slate-300 hover:bg-transparent hover:text-white"
                            >
                              Ajustar URL al plan disponible
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No hay planes listos para registro</AlertTitle>
                      <AlertDescription className="mt-2 text-amber-50/90">
                        Publica al menos un plan activo para abrir el flujo de alta.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="landing-panel rounded-lg p-6 md:p-8">
                <div className="border-b border-white/10 pb-6">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    Datos de acceso
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Crea tu cuenta principal</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Usa un correo operativo. Este usuario quedara como administrador inicial del negocio.
                  </p>
                </div>

                <div className="pt-6">
                  {selectedPlan ? (
                    <RegistrationForm
                      selectedPlan={selectedPlan}
                      onSuccess={handleRegistrationSuccess}
                    />
                  ) : isLoading ? (
                    <div className="flex min-h-[280px] items-center justify-center">
                      <div className="inline-flex items-center gap-3 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparando plan y formulario
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                      <p className="max-w-sm text-sm leading-6 text-slate-400">
                        Necesitamos un plan activo para completar el registro.
                      </p>
                      <Link href="/inicio/planes">
                        <Button className="gradient-primary rounded-lg text-white">
                          Ir al catalogo
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
