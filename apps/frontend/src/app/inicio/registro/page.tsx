'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Check, ChevronRight, Loader2, Scissors, Sparkles, Store } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Footer } from '../components/Footer';
import { LandingHeader } from '../components/LandingHeader';
import { RegistrationForm } from '../components/RegistrationForm';
import '../landing.css';
import { usePlans } from '@/hooks/use-plans';
import type { Plan } from '@/hooks/use-subscription';
import { getRecommendedPlan } from '@/lib/public-plan-utils';
import { normalizeVertical } from '@/config/verticals';
import { getPublicVerticalPositioning } from '@/lib/public-vertical-positioning';

function resolveRegistrationPlan(plans: Plan[], requestedSlug: string | null): Plan | null {
  const registrablePlans = plans.filter((plan) => plan.slug !== 'enterprise');
  if (!registrablePlans.length) return null;

  if (requestedSlug) {
    const requestedPlan = registrablePlans.find((plan) => plan.slug === requestedSlug);
    if (requestedPlan) return requestedPlan;
  }

  return (
    registrablePlans.find((plan) => plan.slug === 'free') ||
    getRecommendedPlan(registrablePlans) ||
    registrablePlans[0] ||
    null
  );
}

export default function RegistroPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { plans, isLoading, error, refetch } = usePlans();

  const requestedSlug = searchParams.get('plan');
  const requestedBilling = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const requestedVertical = searchParams.get('vertical');
  const normalizedVertical = normalizeVertical(requestedVertical);
  const verticalCopy = getPublicVerticalPositioning(normalizedVertical);
  const selectedPlan = useMemo(
    () => resolveRegistrationPlan(plans, requestedSlug),
    [plans, requestedSlug],
  );

  const handleRegistrationSuccess = () => {
    router.push('/onboarding');
  };

  return (
    <div className="landing-shell min-h-screen text-white bg-slate-950">
      <LandingHeader />

      <main className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40">
        {/* Glow ambient background effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[130px] pointer-events-none" />

        <section className="relative z-10 border-b border-white/5 py-12 lg:py-16">
          <div className="landing-container">
            <nav className="mb-8 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Navegacion">
              <Link href="/inicio" className="transition-colors hover:text-white">Inicio</Link>
              <ChevronRight className="h-3 w-3 text-slate-600" aria-hidden="true" />
              <span className="text-slate-300">Crear cuenta</span>
            </nav>

            <div className="mx-auto max-w-2xl">
              <div className="mb-10 text-center animate-slide-up">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300 animate-pulse">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Registro de negocio
                </div>
                <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                  Crea tu cuenta y configura tu negocio
                </h1>
                <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
                  Este formulario crea el usuario administrador, la empresa y el tipo de negocio
                  para abrir el onboarding correcto desde el primer ingreso.
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                    {normalizedVertical === 'BARBERSHOP' ? (
                      <Scissors className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Store className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                      Rubro seleccionado: {verticalCopy.shortLabel}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {verticalCopy.heroSummary}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {verticalCopy.planImpact.map((item) => (
                        <span key={item} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-300">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                id="registration-form-panel"
                className="relative z-10 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 md:p-10 transition-all duration-300 hover:border-white/15"
              >
                <div className="border-b border-white/10 pb-5 mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                    Datos de acceso
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Formulario de registro</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    El usuario creado será el administrador principal de tu negocio.
                  </p>
                </div>

                <div>
                  {selectedPlan ? (
                    <RegistrationForm
                      selectedPlan={selectedPlan}
                      billingCycle={requestedBilling}
                      onSuccess={handleRegistrationSuccess}
                      defaultVertical={requestedVertical}
                    />
                  ) : isLoading ? (
                    <div className="flex min-h-[300px] items-center justify-center">
                      <div className="inline-flex items-center gap-3 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" aria-hidden="true" />
                        <span>Preparando registro...</span>
                      </div>
                    </div>
                  ) : (
                    <Alert className="border-red-500/30 bg-red-500/10 text-red-50 rounded-xl">
                      <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
                      <AlertTitle className="font-bold">No se pudo preparar el registro</AlertTitle>
                      <AlertDescription className="mt-2 flex flex-col gap-4 text-xs text-red-200/90">
                        <span>
                          {error
                            ? 'No se pudieron cargar los datos necesarios para crear la cuenta.'
                            : 'No hay un plan inicial disponible para completar el alta.'}
                        </span>
                        <Button
                          type="button"
                          onClick={() => void refetch()}
                          className="w-fit rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-semibold"
                        >
                          Reintentar
                        </Button>
                      </AlertDescription>
                    </Alert>
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
