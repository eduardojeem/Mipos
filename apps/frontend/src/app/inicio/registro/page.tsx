'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Loader2, Sparkles, Store } from 'lucide-react';
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-5 w-28 bg-white/10" />
            <Skeleton className="mt-4 h-8 w-40 bg-white/10" />
            <Skeleton className="mt-3 h-4 w-full bg-white/10" />
          </div>
          <Skeleton className="h-16 w-28 rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="landing-panel rounded-lg p-6">
        <Skeleton className="h-3 w-32 bg-white/10" />
        <div className="mt-4 grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 bg-white/10" />
              <Skeleton className="mt-2 h-4 w-24 bg-white/10" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-3 w-24 bg-white/10" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="mt-3 h-4 w-full bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function resolveSelectedPlan(plans: Plan[], requestedSlug: string | null): { plan: Plan | null; mismatch: boolean } {
  if (!plans.length) return { plan: null, mismatch: false };

  if (requestedSlug) {
    const matched = plans.find((p) => p.slug === requestedSlug);
    if (matched) return { plan: matched, mismatch: false };
  }

  const fallback = plans.find((p) => p.priceMonthly === 0) || getRecommendedPlan(plans) || plans[0] || null;
  return { plan: fallback, mismatch: !!requestedSlug };
}

export default function RegistroPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedSlug = searchParams.get('plan');
  const requestedMode = searchParams.get('mode');
  const { plans, isLoading, error, refetch } = usePlans();
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const { plan: selectedPlan, mismatch: planMismatch } = useMemo(
    () => resolveSelectedPlan(plans, requestedSlug),
    [plans, requestedSlug]
  );

  const freePlan = useMemo(
    () => plans.find((plan) => plan.priceMonthly === 0 || plan.slug === 'free') || null,
    [plans]
  );
  const isFreeSelected = selectedPlan?.id === freePlan?.id;
  const entryMode = useMemo<'free' | 'plans'>(() => {
    if (requestedMode === 'plans') {
      return 'plans';
    }

    if (requestedMode === 'free') {
      return 'free';
    }

    if (requestedSlug && selectedPlan && !isFreeSelected) {
      return 'plans';
    }

    return 'free';
  }, [isFreeSelected, requestedMode, requestedSlug, selectedPlan]);

  const planNarrative = useMemo(
    () => getPlanNarrative(selectedPlan?.slug),
    [selectedPlan?.slug]
  );
  const featureLabels = useMemo(
    () => getPlanFeatureLabels(selectedPlan?.features || []),
    [selectedPlan?.features]
  );
  const limitItems = useMemo(
    () => (selectedPlan ? getPlanLimitItems(selectedPlan) : []),
    [selectedPlan]
  );

  const visibleFeatures = showAllFeatures ? featureLabels : featureLabels.slice(0, 4);
  const selectorPlans = useMemo(() => {
    if (!plans.length) {
      return [];
    }

    return [...plans].sort((left, right) => {
      const leftIsFree = left.id === freePlan?.id;
      const rightIsFree = right.id === freePlan?.id;

      if (leftIsFree && !rightIsFree) return -1;
      if (!leftIsFree && rightIsFree) return 1;

      return left.priceMonthly - right.priceMonthly;
    });
  }, [plans, freePlan?.id]);

  const handleRegistrationSuccess = () => {
    window.location.href = '/onboarding';
  };

  const buildRegistrationUrl = (planSlug?: string | null, mode: 'free' | 'plans' = 'free') => {
    const params = new URLSearchParams();

    if (planSlug) {
      params.set('plan', planSlug);
    }

    params.set('mode', mode);

    return `/inicio/registro?${params.toString()}`;
  };

  const handleQuickPlanChange = (plan: Plan) => {
    router.push(
      buildRegistrationUrl(
        plan.slug,
        plan.id === freePlan?.id ? 'free' : 'plans'
      )
    );
  };

  const handleChoosePlanNow = () => {
    router.push(buildRegistrationUrl(selectedPlan?.slug || freePlan?.slug, 'plans'));
  };

  const handleStartFree = () => {
    if (!freePlan) return;

    if (!isFreeSelected || entryMode !== 'free') {
      router.push(buildRegistrationUrl(freePlan.slug, 'free'));
      return;
    }

    document.getElementById('registration-form-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="landing-shell min-h-screen text-white">
      <LandingHeader />

      <main className="relative">
        <section className="border-b border-white/10 py-12 lg:py-20">
          <div className="landing-container">
            <nav className="mb-8 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Navegacion">
              <Link href="/inicio" className="transition-colors hover:text-white">Inicio</Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <Link href="/inicio/planes" className="transition-colors hover:text-white">Planes</Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-slate-300">Registro</span>
            </nav>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Crear cuenta
                </div>

                <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Registra tu negocio y empieza a operar
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                  Completa el formulario con los datos de tu empresa. Puedes empezar gratis y
                  mejorar el plan cuando el negocio necesite mas capacidad.
                </p>

                <div className="mt-6 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">Empieza gratis. Sin tarjeta.</p>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/85">
                        Crea tu cuenta en Free y sube de nivel cuando quieras. El alta inicial no
                        depende de un cobro ni de completar datos de pago.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <Button
                        type="button"
                        onClick={handleStartFree}
                        className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100"
                      >
                        Crear gratis
                      </Button>
                      <span className="text-xs text-emerald-50/75">
                        Luego puedes mejorar el plan desde suscripcion.
                      </span>
                    </div>
                  </div>
                </div>

                {!isLoading && plans.length > 1 && (
                  <div className="mt-6">
                    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={handleStartFree}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          entryMode === 'free'
                            ? 'bg-white text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                        aria-pressed={entryMode === 'free'}
                      >
                        Empezar gratis
                      </button>
                      <button
                        type="button"
                        onClick={handleChoosePlanNow}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          entryMode === 'plans'
                            ? 'bg-white text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                        aria-pressed={entryMode === 'plans'}
                      >
                        Elegir plan ahora
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {entryMode === 'free'
                        ? 'Entras por el plan Free para crear la cuenta sin friccion. Luego puedes subir de nivel desde suscripcion.'
                        : 'Compara capacidad y elige el plan adecuado antes de crear la cuenta.'}
                    </p>
                  </div>
                )}

                {planMismatch && selectedPlan && (
                  <Alert className="mt-6 border-amber-500/30 bg-amber-500/10 text-amber-50">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription className="text-amber-50/90">
                      El plan solicitado no esta disponible. Se selecciono <strong>{selectedPlan.name}</strong> como alternativa.
                    </AlertDescription>
                  </Alert>
                )}

                {!isLoading && plans.length > 1 && entryMode === 'plans' && (
                  <div className="mt-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Selecciona tu plan
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectorPlans.map((plan) => {
                        const isSelected = selectedPlan?.id === plan.id;
                        const isFree = plan.id === freePlan?.id;

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => handleQuickPlanChange(plan)}
                            className={`
                              rounded-lg border text-left transition-all
                              ${isFree ? 'sm:col-span-2 p-5' : 'p-4'}
                              ${
                                isSelected
                                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/30'
                                  : isFree
                                    ? 'border-emerald-400/25 bg-emerald-400/5 text-slate-100 hover:border-emerald-400/40 hover:bg-emerald-400/10'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                              }
                            `}
                          >
                            <div className={`flex ${isFree ? 'flex-col gap-4 md:flex-row md:items-start md:justify-between' : 'items-start justify-between gap-3'}`}>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="block text-sm font-semibold">{plan.name}</span>
                                  {isFree ? (
                                    <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                                      Empieza aqui
                                    </span>
                                  ) : null}
                                </div>
                                <span className="mt-1 block text-xs opacity-75">
                                  {plan.priceMonthly === 0
                                    ? 'Gratis'
                                    : `${formatCurrency(plan.priceMonthly, plan.currency)}/mes`}
                                </span>
                                {isFree ? (
                                  <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85">
                                    Entrada recomendada para arrancar sin friccion. Luego puedes subir
                                    de nivel cuando el negocio necesite mas usuarios, catalogo o sucursales.
                                  </p>
                                ) : (
                                  <p className="mt-2 text-xs text-slate-400">
                                    Para negocios que ya necesitan mas capacidad desde el primer dia.
                                  </p>
                                )}
                              </div>

                              {isSelected ? (
                                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                                  Seleccionado
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!isLoading && plans.length > 1 && entryMode === 'free' && freePlan && (
                  <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Entrada recomendada
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-white">
                          Vas a empezar con {freePlan.name}
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                          El alta inicial queda enfocada en crear tu cuenta y tu negocio. La eleccion
                          de un plan superior la haces despues, cuando ya necesites mas capacidad.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleChoosePlanNow}
                        className="rounded-full border-white/10 bg-transparent text-white hover:bg-white/10"
                      >
                        Comparar planes
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  {isLoading && !selectedPlan ? (
                    <PlanSummarySkeleton />
                  ) : error && !selectedPlan ? (
                    <Alert className="border-red-500/30 bg-red-500/10 text-red-50">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      <AlertTitle>No se pudieron cargar los planes</AlertTitle>
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
                            <Button variant="outline" className="rounded-lg border-white/10 bg-transparent text-white hover:bg-white/5">
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
                              <Store className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                              Plan seleccionado
                            </div>
                            <h2 className="mt-3 text-2xl font-semibold text-white">{selectedPlan.name}</h2>
                            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                              {selectedPlan.description || planNarrative.summary}
                            </p>
                            {selectedPlan.priceMonthly === 0 && (
                              <p className="mt-3 text-sm font-medium text-emerald-300">
                                Arrancas sin tarjeta y mejoras el plan solo cuando haga falta.
                              </p>
                            )}
                          </div>
                          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
                            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-100/80">Precio</p>
                            <p className="mt-1 text-2xl font-semibold text-white">
                              {formatCurrency(selectedPlan.priceMonthly, selectedPlan.currency)}
                              {selectedPlan.priceMonthly > 0 && (
                                <span className="ml-1 text-sm font-medium text-slate-300">/ mes</span>
                              )}
                            </p>
                            {selectedPlan.trialDays && selectedPlan.trialDays > 0 && (
                              <p className="mt-1 text-xs text-emerald-100/80">
                                {selectedPlan.trialDays} dias de prueba
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="landing-panel rounded-lg p-6">
                        {limitItems.length > 0 && (
                          <>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Capacidad incluida
                            </p>
                            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
                              {limitItems.map((item) => (
                                <div key={item.key}>
                                  <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{item.label}</dt>
                                  <dd className="mt-0.5 text-sm font-medium text-slate-200">{item.value}</dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        )}

                        {featureLabels.length > 0 && (
                          <>
                            <p className={`text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ${limitItems.length > 0 ? 'mt-5' : ''}`}>
                              Incluye
                            </p>
                            <ul className="mt-3 space-y-2">
                              {visibleFeatures.map((feature) => (
                                <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-300">
                                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            {featureLabels.length > 4 && (
                              <button
                                type="button"
                                onClick={() => setShowAllFeatures((v) => !v)}
                                className="mt-3 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                              >
                                {showAllFeatures ? 'Ver menos' : `Ver las ${featureLabels.length} caracteristicas`}
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      <Link href="/inicio/planes" className="inline-block">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-white/10 bg-white/5 text-sm text-white hover:bg-white/10"
                        >
                          <ArrowLeft className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                          Comparar todos los planes
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-50">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      <AlertTitle>No hay planes disponibles</AlertTitle>
                      <AlertDescription className="mt-2 text-amber-50/90">
                        No se encontraron planes activos. Intenta mas tarde o contacta soporte.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="lg:sticky lg:top-24">
                <div id="registration-form-panel" className="landing-panel rounded-lg p-6 md:p-8">
                  <div className="border-b border-white/10 pb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Datos de acceso
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Crea tu cuenta</h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-400">
                      Este usuario sera el administrador principal del negocio.
                    </p>
                    {selectedPlan?.priceMonthly === 0 && (
                      <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                        Empiezas con el plan gratuito. Sin tarjeta. El upgrade lo haces despues,
                        cuando quieras mas capacidad.
                      </div>
                    )}
                  </div>

                  <div className="pt-5">
                    {selectedPlan ? (
                      <RegistrationForm
                        selectedPlan={selectedPlan}
                        onSuccess={handleRegistrationSuccess}
                      />
                    ) : isLoading ? (
                      <div className="flex min-h-[280px] items-center justify-center">
                        <div className="inline-flex items-center gap-3 text-sm text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Cargando planes...
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                        <p className="max-w-sm text-sm leading-6 text-slate-400">
                          Necesitamos un plan activo para completar el registro.
                        </p>
                        <Link href="/inicio/planes">
                          <Button className="gradient-primary rounded-lg text-white">
                            Ver planes disponibles
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
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
