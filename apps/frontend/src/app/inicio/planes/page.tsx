'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Check,
  HelpCircle,
  Loader2,
  Scissors,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { type BusinessVertical } from '@/config/verticals';
import {
  buildPublicRegistrationPath,
  buildPlanFaqs,
  formatCurrency,
  getBillingBadgeDiscount,
  getPlanNarrative,
  getRecommendedPlan,
  isSelfServicePaidPlan,
} from '@/lib/public-plan-utils';
import { getPublicVerticalPositioning } from '@/lib/public-vertical-positioning';
import '../landing.css';
import { cn } from '@/lib/utils';

const VERTICAL_FEATURES: Record<BusinessVertical, Record<string, string[]>> = {
  RETAIL: {
    free: [
      'Punto de venta y caja rapida',
      'Control de stock inicial',
      'Registro basico de ventas',
      'Catalogo publico para productos',
    ],
    starter: [
      'Punto de venta multi-caja',
      'Pedidos online con carrito y checkout',
      'Presencia en marketplace publico',
      'Inventario avanzado con alertas',
      'Modulo de compras y proveedores',
      'Gestion de usuarios y roles',
      'Hasta 3 sucursales',
    ],
    professional: [
      'Capacidad hasta 10 sucursales',
      'Catalogo ecommerce conectado al inventario',
      'Gestion de pedidos web y seguimiento',
      'Reportes comerciales avanzados',
      'Exportacion de reportes',
      'Programa de fidelizacion',
      'Marca publica personalizada',
    ],
    enterprise: [
      'Limites operativos a medida',
      'Capacidad contractual sin techo',
      'Configuracion comercial personalizada',
      'Acompanamiento de implementacion',
      'Revision de necesidades tecnicas',
      'Contrato corporativo a medida',
    ],
  },
    BARBERSHOP: {
    free: [
      'Catalogo de servicios basicos',
      'Productos para venta en mostrador',
      'Catalogo publico para servicios y productos',
      'Ficha de clientes simple',
      'Caja para servicios y productos',
    ],
    starter: [
      'Agenda multi-profesional',
      'Pedidos online para productos',
      'Presencia en marketplace publico',
      'Horarios de atencion flexibles',
      'Inventario para productos de reventa',
      'Reportes operativos de ventas y servicios',
      'Hasta 3 sucursales',
    ],
    professional: [
      'Capacidad hasta 10 sucursales',
      'Catalogo ecommerce conectado al inventario',
      'Seguimiento de pedidos online',
      'Historial detallado de visitas',
      'Programa de fidelizacion y puntos',
      'Reportes avanzados',
      'Exportacion de reportes',
    ],
    enterprise: [
      'Barberos, productos y turnos a medida',
      'Capacidad contractual sin techo',
      'Configuracion comercial personalizada',
      'Acompanamiento de implementacion',
      'Revision de necesidades tecnicas',
      'Contrato corporativo a medida',
    ],
  },
};

function PlanGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <Skeleton className="h-6 w-28 rounded bg-white/10" />
          <Skeleton className="mt-6 h-8 w-32 rounded bg-white/10" />
          <Skeleton className="mt-3 h-4 w-full rounded bg-white/10" />
          <Skeleton className="mt-2 h-4 w-5/6 rounded bg-white/10" />
          <div className="mt-8 grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((__, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 rounded bg-white/10" />
                <Skeleton className="mt-2 h-4 w-24 rounded bg-white/10" />
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 5 }).map((__, i) => (
              <Skeleton key={i} className="h-4 w-full rounded bg-white/10" />
            ))}
          </div>
          <Skeleton className="mt-8 h-12 w-full rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function appendVertical(path: string, vertical: BusinessVertical) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}vertical=${vertical}`;
}

export default function PlanesPage() {
  const { plans, isLoading, isRefreshing, error, refetch } = usePlans();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<BusinessVertical>('RETAIL');
  const router = useRouter();

  const verticalCopy = getPublicVerticalPositioning(selectedVertical);
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
  const heroPlanNarrative = getPlanNarrative(recommendedPlan?.slug);

  const buildRegistrationHref = (plan: Plan) => {
    const path = buildPublicRegistrationPath(plan.slug, {
      billingCycle,
      mode: plan.priceMonthly > 0 && plan.slug !== 'enterprise' ? 'plans' : 'free',
    });
    return appendVertical(path, selectedVertical);
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    router.push(buildRegistrationHref(plan));
  };

  const handlePrimaryCta = () => {
    if (!registrationTargetPlan) return;
    router.push(buildRegistrationHref(registrationTargetPlan));
  };

  const handleScrollToComparison = () => {
    document.getElementById('comparacion-planes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing-shell min-h-screen bg-slate-950 text-white">
      <LandingHeader />

      <main className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-[-10%] top-[15%] h-[460px] w-[460px] rounded-full bg-sky-500/10 blur-[130px]" />

        <section className="relative z-10 border-b border-white/5 py-16 lg:py-24">
          <div className="landing-container">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,420px)] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Planes por capacidad, rubros por flujo
                </div>

                <h1 className="mt-6 max-w-4xl text-4xl font-extrabold text-white md:text-5xl lg:text-6xl">
                  Elige el plan y configura como trabaja tu negocio
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400">
                  Tu plan define limites, precio y funciones. El tipo de negocio define que modulo aparece primero y
                  como se ordena el onboarding. No son lo mismo.
                </p>

                <div className="mt-10 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                        Tipo de negocio
                      </p>
                    </div>

                    <div className="grid max-w-3xl gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-2 sm:grid-cols-2">
                      {[
                        {
                          value: 'RETAIL' as BusinessVertical,
                          label: 'Tienda / Retail',
                          icon: Store,
                        },
                        {
                          value: 'BARBERSHOP' as BusinessVertical,
                          label: 'Barberia / Peluqueria',
                          icon: Scissors,
                        },
                      ].map((option) => {
                        const Icon = option.icon;
                        const isActive = selectedVertical === option.value;
                        const optionCopy = getPublicVerticalPositioning(option.value);

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSelectedVertical(option.value)}
                            aria-pressed={isActive}
                            className={cn(
                              'rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/50',
                              isActive
                                ? 'border-emerald-400/50 bg-emerald-500/10 text-white'
                                : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
                            )}
                          >
                            <span className="flex items-start gap-3.5">
                              <span
                                className={cn(
                                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                                  isActive ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-slate-400',
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-bold">{option.label}</span>
                                <span className="mt-1 block text-[11px] leading-normal text-slate-400">
                                  {optionCopy.selectorDescription}
                                </span>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/35 p-4 md:grid-cols-3">
                    {verticalCopy.planImpact.map((item) => (
                      <div key={item} className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-5">
                    <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/80 p-1">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        aria-pressed={billingCycle === 'monthly'}
                        className={cn(
                          'rounded-lg px-5 py-2 text-xs font-bold transition-colors',
                          billingCycle === 'monthly'
                            ? 'bg-emerald-400 text-slate-950'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        Mensual
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('yearly')}
                        aria-pressed={billingCycle === 'yearly'}
                        className={cn(
                          'rounded-lg px-5 py-2 text-xs font-bold transition-colors',
                          billingCycle === 'yearly'
                            ? 'bg-emerald-400 text-slate-950'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        Anual
                      </button>
                    </div>

                    {billingBadgeDiscount > 0 && (
                      <Badge className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                        Ahorra hasta {billingBadgeDiscount}% al ano
                      </Badge>
                    )}

                    {isRefreshing && (
                      <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                        <span>Sincronizando catalogo...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-10 flex flex-col gap-3.5 sm:flex-row">
                  <Button
                    onClick={handlePrimaryCta}
                    disabled={!registrationTargetPlan}
                    className="gradient-primary h-12 rounded-xl px-6 text-sm font-bold text-white"
                  >
                    {isPaidRegistrationTarget
                      ? `Crear gratis y preparar ${registrationTargetPlan?.name}`
                      : 'Crear cuenta gratis'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleScrollToComparison}
                    className="h-12 rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    Ver comparacion
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                        Rubro seleccionado
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-white">{verticalCopy.shortLabel}</p>
                    </div>
                    {selectedVertical === 'RETAIL' ? (
                      <Store className="h-10 w-10 text-emerald-400" />
                    ) : (
                      <Scissors className="h-10 w-10 text-emerald-400" />
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">{verticalCopy.heroSummary}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                  <div className="absolute right-0 top-0 p-3 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                    Precio de entrada
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-white">
                    {cheapestPaidPlan && hasUniformCurrency
                      ? `${formatCurrency(cheapestPaidPlan.priceMonthly, cheapestPaidPlan.currency)} / mes`
                      : 'Revisar planes activos'}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{verticalCopy.priceNote}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <p className="mt-3 text-xs font-bold text-white">Flujo principal</p>
                    <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                      {verticalCopy.primaryFlow.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <TrendingUp className="h-5 w-5 text-sky-400" />
                    <p className="mt-3 text-xs font-bold text-white">Tambien incluido</p>
                    <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                      {verticalCopy.sharedModules.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {recommendedPlan && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
                    <Sparkles className="h-5 w-5 text-amber-300" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
                      Plan recomendado
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-white">{recommendedPlan.name}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{verticalCopy.recommendedNote}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-b border-white/5 py-14">
          <div className="landing-container">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                  Mismo plan, distinto flujo
                </p>
                <h2 className="mt-3 text-2xl font-extrabold text-white md:text-3xl">
                  El rubro activa modulos, no duplica precios
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Mantienes una sola escala comercial. Tienda prioriza ecommerce, productos y pedidos; Barberia prioriza
                  servicios, agenda y profesionales, conservando POS, productos y marketplace.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {verticalCopy.verticalModules.map((module) => (
                  <div key={module.title} className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{module.title}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">{module.description}</p>
                      </div>
                      <Badge className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-[10px] font-bold text-emerald-300">
                        {module.availability}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="planes" className="relative z-10 border-b border-white/5 py-20">
          <div className="landing-container">
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Catalogo activo</p>
                <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
                  Planes por capacidad, no por rubro
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{verticalCopy.catalogDescription}</p>
              </div>
              {recommendedPlan && (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  {selectedVertical === 'RETAIL' ? <Store className="h-4 w-4" /> : <Scissors className="h-4 w-4" />}
                  Sugerido para {verticalCopy.shortLabel}: {recommendedPlan.name}
                </div>
              )}
            </div>

            {error && plans.length > 0 && (
              <Alert className="mb-8 rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-50">
                <AlertTitle className="font-bold text-amber-100">Catalogo local activo</AlertTitle>
                <AlertDescription className="text-xs text-amber-200/90">
                  Mostrando la ultima configuracion guardada. No pudimos conectar con el servidor de facturacion.
                </AlertDescription>
              </Alert>
            )}

            {isLoading && plans.length === 0 ? (
              <PlanGridSkeleton />
            ) : error && plans.length === 0 ? (
              <Alert className="rounded-xl border-red-500/30 bg-red-500/10 text-red-50">
                <AlertCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
                <AlertTitle className="font-bold">Error al cargar el catalogo</AlertTitle>
                <AlertDescription className="mt-2 flex flex-col gap-4 text-xs text-red-200/90">
                  <span>No pudimos obtener la lista de planes comerciales activos.</span>
                  <Button
                    onClick={() => void refetch()}
                    className="w-fit rounded-xl bg-white font-semibold text-slate-950 hover:bg-slate-200"
                  >
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            ) : plans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/20 px-6 py-16 text-center">
                <p className="text-base font-bold text-white">No hay planes vigentes en este momento</p>
                <p className="mt-2 text-xs text-slate-500">Vuelve a intentar en unos minutos.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const slugKey = (plan.slug === 'basic' ? 'starter' : plan.slug) || 'free';
                  const featuresOverride = VERTICAL_FEATURES[selectedVertical][slugKey];
                  return (
                    <PricingCard
                      key={plan.id}
                      plan={plan}
                      billingCycle={billingCycle}
                      onSelect={() => handlePlanSelect(plan)}
                      isSelected={selectedPlanId === plan.id}
                      isPopular={Boolean(recommendedPlan && plan.id === recommendedPlan.id)}
                      featuresOverride={featuresOverride}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {!isLoading && plans.length > 0 && (
          <section className="relative z-10 border-b border-white/5 py-10">
            <div className="landing-container">
              <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Tu negocio supera los limites de capacidad?</p>
                  <p className="mt-1.5 max-w-2xl text-xs leading-normal text-slate-400">
                    Para cadenas, multiples empresas o integraciones complejas, usamos Enterprise a medida. El rubro
                    sigue definiendo el flujo principal.
                  </p>
                </div>
                <a
                  href="mailto:contacto@mitienda.app?subject=Consulta%20Enterprise"
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-center text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  Consultar Enterprise
                </a>
              </div>
            </div>
          </section>
        )}

        {!isLoading && plans.length > 0 && (
          <div id="comparacion-planes" className="relative z-10">
            <PlansComparison plans={plans} billingCycle={billingCycle} vertical={selectedVertical} />
          </div>
        )}

        <section className="relative z-10 border-t border-white/5 bg-slate-950/20 py-20">
          <div className="landing-container">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Preguntas frecuentes</p>
                <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
                  Lo que conviene saber antes de registrarte
                </h2>
                <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-400">
                  El registro crea la cuenta en Free y guarda el rubro elegido para abrir el onboarding correcto.
                </p>

                <Accordion type="single" collapsible className="mt-8 space-y-2">
                  {planFaqs.map((faq) => (
                    <AccordionItem
                      key={faq.question}
                      value={faq.question}
                      className="rounded-xl border border-white/5 bg-slate-900/20 px-4"
                    >
                      <AccordionTrigger className="py-4 text-left text-xs font-semibold text-slate-200 hover:no-underline hover:text-emerald-400 sm:text-sm">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-xs leading-relaxed text-slate-400">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <HelpCircle className="h-5 w-5 text-emerald-400" />
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                  Sugerencia rapida
                </p>
                <p className="mt-2.5 text-base font-bold leading-normal text-white">
                  {recommendedPlan ? `Si tienes dudas, inicia con ${recommendedPlan.name}.` : 'Revisa el plan inicial disponible.'}
                </p>
                <p className="mt-2 text-xs leading-normal text-slate-400">{heroPlanNarrative.audience}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/5 py-20">
          <div className="landing-container">
            <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-slate-900/60 p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Siguiente paso</p>
                <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
                  Crea tu cuenta con el flujo correcto desde el primer ingreso
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{verticalCopy.finalCtaDescription}</p>
              </div>
              <Button
                onClick={handlePrimaryCta}
                disabled={!registrationTargetPlan}
                className="gradient-primary h-12 shrink-0 rounded-xl px-6 text-sm font-bold text-white"
              >
                {isPaidRegistrationTarget
                  ? `Crear gratis y preparar ${registrationTargetPlan?.name}`
                  : 'Continuar gratis'}
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
