'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, RefreshCw, ShieldCheck, Sparkles, Store, TrendingUp } from 'lucide-react';
import { LandingHeader } from '../components/LandingHeader';
import { Footer } from '../components/Footer';
import { PricingCard } from '../components/PricingCard';
import { PlansComparison } from '../components/PlansComparison';
import { usePlans } from '@/hooks/use-plans';
import type { Plan } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
    buildPublicRegistrationPath,
    buildPlanFaqs,
    formatCurrency,
    getBillingBadgeDiscount,
    getPlanNarrative,
    getRecommendedPlan,
} from '@/lib/public-plan-utils';
import '../landing.css';

function PlanGridSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-white/10 bg-slate-950/60 p-6">
                    <Skeleton className="h-6 w-28 bg-white/10" />
                    <Skeleton className="mt-6 h-8 w-32 bg-white/10" />
                    <Skeleton className="mt-3 h-4 w-full bg-white/10" />
                    <Skeleton className="mt-2 h-4 w-5/6 bg-white/10" />
                    <div className="mt-8 grid grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((__, itemIndex) => (
                            <div key={itemIndex}>
                                <Skeleton className="h-3 w-20 bg-white/10" />
                                <Skeleton className="mt-2 h-4 w-24 bg-white/10" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 space-y-3">
                        {Array.from({ length: 5 }).map((__, itemIndex) => (
                            <Skeleton key={itemIndex} className="h-4 w-full bg-white/10" />
                        ))}
                    </div>
                    <Skeleton className="mt-8 h-12 w-full bg-white/10" />
                </div>
            ))}
        </div>
    );
}

export default function PlanesPage() {
    const { plans, isLoading, isRefreshing, error, refetch } = usePlans();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const router = useRouter();

    const recommendedPlan = useMemo(() => getRecommendedPlan(plans), [plans]);
    const cheapestPaidPlan = useMemo(
        () => [...plans].filter((plan) => plan.priceMonthly > 0).sort((a, b) => a.priceMonthly - b.priceMonthly)[0] || null,
        [plans]
    );
    const highestTrialDays = useMemo(
        () => plans.reduce((max, plan) => Math.max(max, plan.trialDays || 0), 0),
        [plans]
    );
    const currencies = useMemo(
        () => Array.from(new Set(plans.map((plan) => plan.currency || 'PYG'))),
        [plans]
    );
    const hasUniformCurrency = currencies.length === 1;
    const billingBadgeDiscount = useMemo(() => getBillingBadgeDiscount(plans), [plans]);
    const planFaqs = useMemo(() => buildPlanFaqs(highestTrialDays), [highestTrialDays]);

    const activePlan = selectedPlanId
        ? plans.find((plan) => plan.id === selectedPlanId) || recommendedPlan
        : recommendedPlan;
    const registrationTargetPlan = activePlan || cheapestPaidPlan || plans[0] || null;

    const handlePlanSelect = (plan: Plan) => {
        setSelectedPlanId(plan.id);
        router.push(buildPublicRegistrationPath(plan.slug));
    };

    const handlePrimaryCta = () => {
        if (!registrationTargetPlan) return;
        router.push(buildPublicRegistrationPath(registrationTargetPlan.slug));
    };

    const handleScrollToComparison = () => {
        document.getElementById('comparacion-planes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const heroPlanNarrative = getPlanNarrative(recommendedPlan?.slug);

    return (
        <div className="landing-shell min-h-screen text-white">
            <LandingHeader />

            <main className="relative">
                <section className="relative overflow-hidden border-b border-white/10 py-16 lg:py-24">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="radial-gradient-purple absolute -left-12 top-0 h-72 w-72" />
                        <div className="radial-gradient-blue absolute right-0 top-12 h-72 w-72" />
                    </div>
                    <div className="landing-container relative">
                        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,420px)] lg:items-end">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Catalogo publico de planes
                                </div>
                                <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
                                    Planes claros para elegir sin perder tiempo en comparaciones confusas
                                </h1>
                                <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                                    Compara precios, capacidad operativa y funciones reales del sistema antes de iniciar el alta.
                                    La oferta visible se actualiza desde tu catalogo activo en Supabase.
                                </p>

                                <div className="mt-8 flex flex-wrap items-center gap-3">
                                    <div className="landing-panel inline-flex rounded-lg p-1">
                                        <button
                                            type="button"
                                            onClick={() => setBillingCycle('monthly')}
                                            aria-pressed={billingCycle === 'monthly'}
                                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                                billingCycle === 'monthly'
                                                    ? 'bg-white text-slate-950'
                                                    : 'text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            Mensual
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBillingCycle('yearly')}
                                            aria-pressed={billingCycle === 'yearly'}
                                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                                billingCycle === 'yearly'
                                                    ? 'bg-white text-slate-950'
                                                    : 'text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            Anual
                                        </button>
                                    </div>
                                    {billingBadgeDiscount > 0 ? (
                                        <div className="rounded-full bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-200">
                                            Hasta {billingBadgeDiscount}% menos en anual
                                        </div>
                                    ) : null}
                                    {isRefreshing ? (
                                        <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Actualizando catalogo
                                        </div>
                                    ) : null}
                                </div>

                                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        onClick={handlePrimaryCta}
                                        disabled={!registrationTargetPlan}
                                        className="gradient-primary rounded-lg px-6 py-6 text-sm font-medium text-white shadow-[0_22px_50px_-22px_rgba(16,185,129,0.95)] hover:opacity-95"
                                    >
                                        Empezar con {registrationTargetPlan?.name || 'un plan'}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleScrollToComparison}
                                        className="rounded-lg border-white/10 bg-white/5 px-6 py-6 text-sm font-medium text-white hover:bg-white/10"
                                    >
                                        Ver comparacion
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="landing-panel rounded-lg p-5">
                                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                                        Precio de entrada
                                    </p>
                                    <p className="mt-3 text-2xl font-semibold text-white">
                                        {cheapestPaidPlan && hasUniformCurrency
                                            ? `${formatCurrency(cheapestPaidPlan.priceMonthly, cheapestPaidPlan.currency)} / mes`
                                            : 'Revisar planes activos'}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-400">
                                        Ideal si quieres validar primero el flujo comercial y luego escalar.
                                    </p>
                                </div>

                                <div className="landing-panel rounded-lg p-5">
                                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                                        Plan sugerido hoy
                                    </p>
                                    <p className="mt-3 text-2xl font-semibold text-white">
                                        {recommendedPlan?.name || 'Sin recomendacion'}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-400">{heroPlanNarrative.summary}</p>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="landing-panel rounded-lg p-5">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="h-5 w-5 text-emerald-300" />
                                            <div>
                                                <p className="text-sm font-medium text-white">Cambio sin rehacer cuenta</p>
                                                <p className="text-sm text-slate-400">El plan acompana el crecimiento del negocio.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="landing-panel rounded-lg p-5">
                                        <div className="flex items-center gap-3">
                                            <TrendingUp className="h-5 w-5 text-sky-300" />
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {highestTrialDays > 0 ? `Hasta ${highestTrialDays} dias de prueba` : 'Alta inmediata'}
                                                </p>
                                                <p className="text-sm text-slate-400">Segun configuracion comercial activa.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="planes" className="border-b border-white/10 py-20">
                    <div className="landing-container">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl">
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Catalogo activo</p>
                                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Elige por capacidad, no por marketing</h2>
                                <p className="mt-3 text-base text-slate-300">
                                    Cada plan muestra capacidad operativa, funciones disponibles y el precio real para el ciclo elegido.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {recommendedPlan ? (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm text-amber-200">
                                        <Store className="h-4 w-4" />
                                        Recomendado: {recommendedPlan.name}
                                    </div>
                                ) : null}
                                <Button
                                    variant="outline"
                                    onClick={() => void refetch()}
                                    className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Recargar
                                </Button>
                            </div>
                        </div>

                        {error && plans.length > 0 ? (
                            <Alert className="mt-8 border-amber-500/30 bg-amber-500/10 text-amber-50">
                                <AlertTitle className="text-amber-100">Mostrando el ultimo catalogo disponible</AlertTitle>
                                <AlertDescription className="text-amber-50/90">
                                    No pudimos actualizar en este momento: {error}
                                </AlertDescription>
                            </Alert>
                        ) : null}

                        {isLoading && plans.length === 0 ? (
                            <div className="mt-10">
                                <PlanGridSkeleton />
                            </div>
                        ) : error && plans.length === 0 ? (
                            <Alert className="mt-10 border-red-500/30 bg-red-500/10 text-red-50">
                                <AlertTitle>No se pudieron cargar los planes</AlertTitle>
                                <AlertDescription className="mt-2 flex flex-col gap-4 text-red-50/90">
                                    <span>{error}</span>
                                    <div>
                                        <Button
                                            onClick={() => void refetch()}
                                            className="rounded-lg bg-white text-slate-950 hover:bg-slate-200"
                                        >
                                            Intentar de nuevo
                                        </Button>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        ) : plans.length === 0 ? (
                            <div className="mt-10 rounded-lg border border-dashed border-white/10 px-6 py-16 text-center">
                                <p className="text-lg font-medium text-white">No hay planes publicados ahora mismo.</p>
                                <p className="mt-2 text-sm text-slate-400">Publica al menos un plan activo para mostrar esta seccion.</p>
                            </div>
                        ) : (
                            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {plans.map((plan) => (
                                    <PricingCard
                                        key={plan.id}
                                        plan={plan}
                                        billingCycle={billingCycle}
                                        onSelect={() => handlePlanSelect(plan)}
                                        isSelected={selectedPlanId === plan.id}
                                        isPopular={Boolean(recommendedPlan && plan.id === recommendedPlan.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {!isLoading && plans.length > 0 ? (
                    <div id="comparacion-planes">
                        <PlansComparison plans={plans} billingCycle={billingCycle} />
                    </div>
                ) : null}

                <section className="border-t border-white/10 py-20">
                    <div className="landing-container">
                        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div>
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Preguntas frecuentes</p>
                                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                                    Lo que conviene saber antes de contratar
                                </h2>
                                <p className="mt-3 max-w-2xl text-base text-slate-300">
                                    Respuestas cortas para despejar dudas de alta, cambio de plan y capacidad del sistema.
                                </p>

                                <Accordion type="single" collapsible className="mt-8 border-t border-white/10">
                                    {planFaqs.map((faq) => (
                                        <AccordionItem key={faq.question} value={faq.question} className="border-b border-white/10">
                                            <AccordionTrigger className="py-5 text-left text-base font-medium text-white hover:no-underline">
                                                {faq.question}
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-5 text-sm leading-7 text-slate-300">
                                                {faq.answer}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>

                            <div className="space-y-4">
                                <div className="landing-panel rounded-lg p-5">
                                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Decision rapida</p>
                                    <p className="mt-3 text-lg font-semibold text-white">
                                        {recommendedPlan ? `Si dudas, empieza por ${recommendedPlan.name}.` : 'Revisa el plan base disponible.'}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        {heroPlanNarrative.audience}
                                    </p>
                                </div>
                                <div className="landing-panel rounded-lg p-5">
                                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Alta y seguimiento</p>
                                    <p className="mt-3 text-sm leading-6 text-slate-300">
                                        El alta publica usa este catalogo activo. Si cambias precios o disponibilidad en Supabase, esta pagina se actualiza sin tocar codigo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/10 py-20">
                    <div className="landing-container">
                        <div className="landing-panel flex flex-col gap-6 rounded-2xl p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
                            <div className="max-w-2xl">
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Siguiente paso</p>
                                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                                    Cuando tengas el plan claro, sigue con el registro
                                </h2>
                                <p className="mt-3 text-base text-slate-300">
                                    Selecciona el plan que mejor encaja con tu operacion y continua con la creacion de la cuenta.
                                </p>
                            </div>
                            <Button
                                onClick={handlePrimaryCta}
                                disabled={!registrationTargetPlan}
                                className="gradient-primary rounded-lg px-6 py-6 text-sm font-medium text-white shadow-[0_22px_50px_-22px_rgba(16,185,129,0.95)] hover:opacity-95"
                            >
                                Continuar con {registrationTargetPlan?.name || 'el registro'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
