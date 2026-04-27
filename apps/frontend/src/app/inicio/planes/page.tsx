'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LandingHeader } from '../components/LandingHeader';
import { Footer } from '../components/Footer';
import { PricingCard } from '../components/PricingCard';
import { usePlans } from '@/hooks/use-plans';
import type { Plan } from '@/hooks/use-subscription';
import {
    Loader2,
    Check,
    X,
    Sparkles,
    Shield,
    Zap,
    Users,
    TrendingUp,
    ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import '../landing.css';

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
}

function getRecommendedPlan(plans: Plan[]) {
    const paidPlans = plans.filter((plan) => plan.priceMonthly > 0);
    if (!paidPlans.length) {
        return plans[0] || null;
    }

    return [...paidPlans].sort((a, b) => {
        if ((b.yearlyDiscount || 0) !== (a.yearlyDiscount || 0)) {
            return (b.yearlyDiscount || 0) - (a.yearlyDiscount || 0);
        }

        return a.priceMonthly - b.priceMonthly;
    })[0];
}

export default function PlanesPage() {
    const { plans, isLoading: loading, error } = usePlans();
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
        () => Array.from(new Set(plans.map((plan) => plan.currency || 'USD'))),
        [plans]
    );
    const hasUniformCurrency = currencies.length === 1;
    const billingBadgeDiscount = useMemo(() => {
        const discounts = plans
            .map((plan) => plan.yearlyDiscount || 0)
            .filter((value) => value > 0);

        return discounts.length ? Math.max(...discounts) : 0;
    }, [plans]);

    const handlePlanSelect = (plan: Plan) => {
        setSelectedPlanId(plan.id);
        router.push(`/inicio?plan=${encodeURIComponent(plan.slug)}#registro`);
    };

    const ctaPlan = selectedPlanId
        ? plans.find((plan) => plan.id === selectedPlanId) || recommendedPlan
        : recommendedPlan;
    const registrationTargetPlan = ctaPlan || cheapestPaidPlan || plans[0] || null;

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <LandingHeader />

            <main>
                <section className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 radial-gradient-purple opacity-20" />
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 radial-gradient-blue opacity-20" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-4xl mx-auto mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                                <Sparkles className="h-4 w-4 text-purple-400" />
                                <span className="text-sm font-medium text-gray-300">
                                    Planes flexibles para cada tipo de negocio
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                                Elige el plan <span className="gradient-text">perfecto</span> para tu negocio
                            </h1>
                            <p className="text-lg md:text-xl text-gray-400 mb-4">
                                Compara planes mensuales y anuales con precios y beneficios reales.
                            </p>
                            {cheapestPaidPlan && hasUniformCurrency && (
                                <p className="text-sm md:text-base text-gray-500">
                                    Disponible desde {formatCurrency(cheapestPaidPlan.priceMonthly, cheapestPaidPlan.currency)} por mes.
                                </p>
                            )}
                            {highestTrialDays > 0 && (
                                <p className="text-sm md:text-base text-blue-300 mt-2">
                                    Algunos planes incluyen hasta {highestTrialDays} dias de prueba.
                                </p>
                            )}

                            <div className="inline-flex items-center gap-3 p-1 glass-card rounded-full mt-8">
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('monthly')}
                                    aria-pressed={billingCycle === 'monthly'}
                                    className={`px-6 py-2 rounded-full font-medium transition-all ${billingCycle === 'monthly'
                                        ? 'gradient-primary text-white'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Mensual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('yearly')}
                                    aria-pressed={billingCycle === 'yearly'}
                                    className={`px-6 py-2 rounded-full font-medium transition-all ${billingCycle === 'yearly'
                                        ? 'gradient-primary text-white'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Anual
                                    {billingBadgeDiscount > 0 && (
                                        <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                            Hasta -{billingBadgeDiscount}%
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-20 text-gray-400">
                                <p className="text-lg font-medium">No se pudieron cargar los planes</p>
                                <p className="text-sm text-gray-500 mt-2">{error}</p>
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <p>No hay planes disponibles en este momento</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
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

                        <div className="mt-16 text-center space-y-4">
                            <p className="text-sm text-gray-500">
                                Precios transparentes, activacion inmediata y soporte incluido segun el plan.
                            </p>
                            <div className="flex items-center justify-center gap-8 text-gray-600 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-green-400" />
                                    <span className="text-sm">Pago seguro</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-400" />
                                    <span className="text-sm">Activacion inmediata</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-400" />
                                    <span className="text-sm">Escalable por equipo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-[#0a0a0a] relative">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Comparacion <span className="gradient-text">detallada</span>
                            </h2>
                            <p className="text-lg text-gray-400">
                                Encuentra las caracteristicas que necesitas para tu negocio
                            </p>
                        </div>

                        {!loading && plans.length > 0 && (
                            <div className="max-w-6xl mx-auto overflow-x-auto">
                                <div className="glass-card rounded-2xl p-6 md:p-8">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left py-4 px-4 text-white font-semibold">
                                                    Caracteristicas
                                                </th>
                                                {plans.map((plan) => (
                                                    <th key={plan.id} className="text-center py-4 px-4">
                                                        <div className="text-white font-semibold">{plan.name}</div>
                                                        <div className="text-sm text-gray-400 mt-1">
                                                            {billingCycle === 'monthly'
                                                                ? `${formatCurrency(plan.priceMonthly, plan.currency)}/mes`
                                                                : `${formatCurrency(plan.priceYearly, plan.currency)}/ano`}
                                                        </div>
                                                        {billingCycle === 'yearly' && plan.yearlyDiscount && plan.yearlyDiscount > 0 && (
                                                            <div className="text-xs text-green-400 mt-1">
                                                                -{plan.yearlyDiscount}% anual
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from(new Set(plans.flatMap((plan) => plan.features))).map((feature, idx) => (
                                                <tr key={idx} className="border-b border-white/5">
                                                    <td className="py-4 px-4 text-gray-300">{feature}</td>
                                                    {plans.map((plan) => (
                                                        <td key={plan.id} className="text-center py-4 px-4">
                                                            {plan.features.includes(feature) ? (
                                                                <Check className="h-5 w-5 text-green-400 mx-auto" />
                                                            ) : (
                                                                <X className="h-5 w-5 text-gray-600 mx-auto" />
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="py-20 bg-[#0a0a0a] relative">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Preguntas <span className="gradient-text">frecuentes</span>
                            </h2>
                            <p className="text-lg text-gray-400">
                                Resolvemos tus dudas sobre nuestros planes
                            </p>
                        </div>

                        <div className="max-w-3xl mx-auto space-y-4">
                            {[
                                {
                                    q: 'Puedo cambiar de plan en cualquier momento?',
                                    a: 'Si. Puedes actualizar o cambiar tu plan cuando lo necesites desde tu panel o con ayuda del equipo de soporte.',
                                },
                                {
                                    q: 'Que metodos de pago aceptan?',
                                    a: 'Los metodos disponibles pueden variar segun tu pais y configuracion comercial. Veras las opciones activas al contratar.',
                                },
                                {
                                    q: 'Hay costos ocultos o permanencia?',
                                    a: 'No mostramos permanencia obligatoria en esta pagina. Revisa siempre el detalle final del plan y sus condiciones antes de activar.',
                                },
                                {
                                    q: 'Todos los planes incluyen prueba?',
                                    a: highestTrialDays > 0
                                        ? `No necesariamente. Actualmente hay planes con hasta ${highestTrialDays} dias de prueba, segun disponibilidad.`
                                        : 'La disponibilidad de prueba depende del plan activo en este momento.',
                                },
                                {
                                    q: 'Que soporte incluye cada plan?',
                                    a: 'El nivel de soporte depende del plan contratado y de los servicios habilitados para tu cuenta.',
                                },
                            ].map((faq, idx) => (
                                <details key={idx} className="glass-card rounded-xl p-6 group">
                                    <summary className="flex items-center justify-between cursor-pointer text-white font-semibold">
                                        {faq.q}
                                        <ArrowRight className="h-5 w-5 text-purple-400 transition-transform group-open:rotate-90" />
                                    </summary>
                                    <p className="mt-4 text-gray-400 leading-relaxed">
                                        {faq.a}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-[#0a0a0a] relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 radial-gradient-purple opacity-30" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-3xl mx-auto text-center">
                            <TrendingUp className="h-16 w-16 text-purple-400 mx-auto mb-6" />
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Listo para <span className="gradient-text">comenzar</span>?
                            </h2>
                            <p className="text-lg text-gray-400 mb-8">
                                Elige un plan y continua con tu registro en pocos pasos.
                            </p>
                            <Button
                                onClick={() => {
                                    if (!registrationTargetPlan) {
                                        return;
                                    }

                                    router.push(`/inicio?plan=${encodeURIComponent(registrationTargetPlan.slug)}#registro`);
                                }}
                                disabled={!registrationTargetPlan}
                                className="gradient-primary text-white px-8 py-6 text-lg rounded-xl shadow-dark-lg glow-purple hover:scale-105 transition-all"
                            >
                                Continuar con el registro
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
