'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ShieldCheck, Sparkles, Store, TrendingUp } from 'lucide-react';
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
    isSelfServicePaidPlan,
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
                        {Array.from({ length: 4 }).map((__, i) => (
                            <div key={i}>
                                <Skeleton className="h-3 w-20 bg-white/10" />
                                <Skeleton className="mt-2 h-4 w-24 bg-white/10" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 space-y-3">
                        {Array.from({ length: 5 }).map((__, i) => (
                            <Skeleton key={i} className="h-4 w-full bg-white/10" />
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
    const cheapestPaidPlan = [...plans].filter((p) => p.priceMonthly > 0).sort((a, b) => a.priceMonthly - b.priceMonthly)[0] ?? null;
    const highestTrialDays = plans.reduce((max, p) => Math.max(max, p.trialDays || 0), 0);
    const hasUniformCurrency = new Set(plans.map((p) => p.currency || 'PYG')).size === 1;
    const billingBadgeDiscount = useMemo(() => getBillingBadgeDiscount(plans), [plans]);
    const planFaqs = useMemo(() => buildPlanFaqs(highestTrialDays), [highestTrialDays]);

    const activePlan = selectedPlanId
        ? plans.find((p) => p.id === selectedPlanId) ?? recommendedPlan
        : recommendedPlan;
    const registrationTargetPlan = activePlan ?? cheapestPaidPlan ?? plans[0] ?? null;
    const isPaidRegistrationTarget = isSelfServicePaidPlan(registrationTargetPlan);

    const handlePlanSelect = (plan: Plan) => {
        setSelectedPlanId(plan.id);
        router.push(buildPublicRegistrationPath(plan.slug, {
            billingCycle,
            mode: plan.priceMonthly > 0 && plan.slug !== 'enterprise' ? 'plans' : 'free',
        }));
    };

    const handlePrimaryCta = () => {
        if (!registrationTargetPlan) return;
        router.push(buildPublicRegistrationPath(registrationTargetPlan.slug, {
            billingCycle,
            mode: isPaidRegistrationTarget ? 'plans' : 'free',
        }));
    };

    const handleScrollToComparison = () => {
        document.getElementById('comparacion-planes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const heroPlanNarrative = getPlanNarrative(recommendedPlan?.slug);

    return (
        <div className="landing-shell min-h-screen text-white">
            <LandingHeader />

            <main className="relative">
                {/* Hero */}
                <section className="relative overflow-hidden border-b border-white/10 py-16 lg:py-24">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="radial-gradient-purple absolute -left-12 top-0 h-72 w-72" />
                        <div className="radial-gradient-blue absolute right-0 top-12 h-72 w-72" />
                    </div>
                    <div className="landing-container relative">
                        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,420px)] lg:items-end">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Crea gratis, escala cuando quieras
                                </div>
                                <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
                                    Elige capacidad sin pagar antes de probar
                                </h1>
                                <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                                    La cuenta se crea en Free. Si eliges un plan pago, lo dejamos preparado para activarlo despues desde tu panel.
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
                                            Actualizando
                                        </div>
                                    ) : null}
                                </div>

                                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        onClick={handlePrimaryCta}
                                        disabled={!registrationTargetPlan}
                                        className="gradient-primary rounded-lg px-6 text-sm font-medium text-white shadow-[0_22px_50px_-22px_rgba(16,185,129,0.95)] hover:opacity-95"
                                    >
                                        {isPaidRegistrationTarget
                                            ? `Crear gratis y preparar ${registrationTargetPlan?.name}`
                                            : `Crear cuenta gratis`}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleScrollToComparison}
                                        className="rounded-lg border-white/10 bg-white/5 px-6 text-sm font-medium text-white hover:bg-white/10"
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
                                    {recommendedPlan && isSelfServicePaidPlan(recommendedPlan) ? (
                                        <p className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                                            No se cobra ahora. Tu cuenta inicia en Free y {recommendedPlan.name} queda como plan sugerido.
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="landing-panel rounded-lg p-5">
                                        <div className="flex items-start gap-3">
                                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                                            <div>
                                                <p className="text-sm font-medium text-white">Cambio sin rehacer cuenta</p>
                                                <p className="mt-1 text-sm text-slate-400">El plan acompana el crecimiento del negocio.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="landing-panel rounded-lg p-5">
                                        <div className="flex items-start gap-3">
                                            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {highestTrialDays > 0 ? `Hasta ${highestTrialDays} dias de prueba` : 'Alta inmediata'}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-400">Segun condiciones comerciales del plan.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Plan grid */}
                <section id="planes" className="border-b border-white/10 py-20">
                    <div className="landing-container">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl">
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Catalogo activo</p>
                                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Elige por capacidad, no por marketing</h2>
                                <p className="mt-3 text-base text-slate-300">
                                    Cada plan muestra capacidad operativa, funciones disponibles y el precio real. El alta inicial siempre es gratis.
                                </p>
                            </div>
                            {recommendedPlan ? (
                                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm text-amber-200">
                                    <Store className="h-4 w-4" />
                                    Recomendado: {recommendedPlan.name}
                                </div>
                            ) : null}
                        </div>

                        {error && plans.length > 0 ? (
                            <Alert className="mt-8 border-amber-500/30 bg-amber-500/10 text-amber-50">
                                <AlertTitle className="text-amber-100">Mostrando el ultimo catalogo disponible</AlertTitle>
                                <AlertDescription className="text-amber-50/90">
                                    No pudimos actualizar en este momento.
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
                                    <span>Ocurrio un error al obtener los planes disponibles.</span>
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
                                <p className="mt-2 text-sm text-slate-400">Vuelve a intentarlo en unos minutos.</p>
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

                {/* Enterprise banner */}
                {!isLoading && plans.length > 0 ? (
                    <section className="border-b border-white/10 py-10">
                        <div className="landing-container">
                            <div className="landing-panel flex flex-col gap-4 rounded-lg px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-white">¿Tu operacion supera los limites del plan Professional?</p>
                                    <p className="mt-1 text-sm text-slate-400">
                                        Para volumen muy alto, integraciones custom o multiples empresas bajo una misma cuenta, existe una opcion Enterprise con capacidad y precio a medida.
                                    </p>
                                </div>
                                <a
                                    href="mailto:contacto@mipos.app?subject=Consulta%20Enterprise"
                                    className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                                >
                                    Consultar Enterprise
                                </a>
                            </div>
                        </div>
                    </section>
                ) : null}

                {/* Comparison table */}
                {!isLoading && plans.length > 0 ? (
                    <div id="comparacion-planes">
                        <PlansComparison plans={plans} billingCycle={billingCycle} />
                    </div>
                ) : null}

                {/* FAQ */}
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

                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="border-t border-white/10 py-20">
                    <div className="landing-container">
                        <div className="landing-panel flex flex-col gap-6 rounded-2xl p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
                            <div className="max-w-2xl">
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Siguiente paso</p>
                                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                                    Cuando tengas el plan claro, sigue con el registro
                                </h2>
                                <p className="mt-3 text-base text-slate-300">
                                    Selecciona el plan que mejor encaja con tu operacion. Primero creas la cuenta gratis; luego decides si activarlo.
                                </p>
                            </div>
                            <Button
                                onClick={handlePrimaryCta}
                                disabled={!registrationTargetPlan}
                                className="gradient-primary rounded-lg px-6 text-sm font-medium text-white shadow-[0_22px_50px_-22px_rgba(16,185,129,0.95)] hover:opacity-95"
                            >
                                {isPaidRegistrationTarget
                                    ? `Crear gratis y preparar ${registrationTargetPlan?.name}`
                                    : `Continuar gratis`}
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
