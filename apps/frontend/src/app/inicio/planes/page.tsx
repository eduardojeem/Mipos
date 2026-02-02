'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingHeader } from '../components/LandingHeader';
import { Footer } from '../components/Footer';
import { PricingCard } from '../components/PricingCard';
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

interface Plan {
    id: string;
    name: string;
    slug: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    yearlyDiscount: number;
    description?: string;
}

export default function PlanesPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/plans');
            const data = await response.json();

            if (data.success && data.plans) {
                setPlans(data.plans);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPopularPlan = () => {
        const professionalPlan = plans.find(p => p.slug === 'professional');
        if (professionalPlan) return professionalPlan.id;

        const middleIndex = Math.floor(plans.length / 2);
        return plans[middleIndex]?.id;
    };

    const handlePlanSelect = (plan: Plan) => {
        setSelectedPlanId(plan.id);
        // Scroll to registration section or redirect
        const registrationSection = document.getElementById('registro');
        if (registrationSection) {
            registrationSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            // If no registration section, redirect to inicio with plan selected
            router.push(`/inicio?plan=${plan.slug}#registro`);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <LandingHeader />

            <main>
                {/* Hero Section */}
                <section className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
                    {/* Background gradients */}
                    <div className="absolute inset-0">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 radial-gradient-purple opacity-20" />
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 radial-gradient-blue opacity-20" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        {/* Header */}
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
                            <p className="text-lg md:text-xl text-gray-400 mb-8">
                                Sin permanencia, cancela cuando quieras. Todos los planes incluyen soporte técnico.
                            </p>

                            {/* Billing Toggle */}
                            <div className="inline-flex items-center gap-3 p-1 glass-card rounded-full">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-6 py-2 rounded-full font-medium transition-all ${billingCycle === 'monthly'
                                        ? 'gradient-primary text-white'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Mensual
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-6 py-2 rounded-full font-medium transition-all ${billingCycle === 'yearly'
                                        ? 'gradient-primary text-white'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Anual
                                    <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                        -20%
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Plans Grid */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <p>No hay planes disponibles</p>
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
                                        isPopular={plan.id === getPopularPlan()}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Trust indicators */}
                        <div className="mt-16 text-center space-y-4">
                            <p className="text-sm text-gray-500">
                                ✓ Sin permanencia • ✓ Cancela cuando quieras • ✓ Soporte incluido
                            </p>
                            <div className="flex items-center justify-center gap-8 text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-green-400" />
                                    <span className="text-sm">Pago seguro</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-400" />
                                    <span className="text-sm">Activación inmediata</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-400" />
                                    <span className="text-sm">Soporte 24/7</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Comparison Table Section */}
                <section className="py-20 bg-[#0a0a0a] relative">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Comparación <span className="gradient-text">detallada</span>
                            </h2>
                            <p className="text-lg text-gray-400">
                                Encuentra las características que necesitas para tu negocio
                            </p>
                        </div>

                        {!loading && plans.length > 0 && (
                            <div className="max-w-6xl mx-auto overflow-x-auto">
                                <div className="glass-card rounded-2xl p-6 md:p-8">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left py-4 px-4 text-white font-semibold">
                                                    Características
                                                </th>
                                                {plans.map((plan) => (
                                                    <th key={plan.id} className="text-center py-4 px-4">
                                                        <div className="text-white font-semibold">{plan.name}</div>
                                                        <div className="text-sm text-gray-400 mt-1">
                                                            ${billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12)}/mes
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Get all unique features */}
                                            {Array.from(new Set(plans.flatMap(p => p.features))).map((feature, idx) => (
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

                {/* FAQ Section */}
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
                                    q: '¿Puedo cambiar de plan en cualquier momento?',
                                    a: 'Sí, puedes actualizar o cambiar tu plan en cualquier momento desde tu panel de control. Los cambios se aplican inmediatamente.'
                                },
                                {
                                    q: '¿Qué métodos de pago aceptan?',
                                    a: 'Aceptamos tarjetas de crédito, débito y transferencias bancarias. Todos los pagos son procesados de forma segura.'
                                },
                                {
                                    q: '¿Hay algún costo de instalación?',
                                    a: 'No, todos nuestros planes incluyen la instalación y configuración sin costo adicional.'
                                },
                                {
                                    q: '¿Ofrecen período de prueba?',
                                    a: 'Sí, todos los planes incluyen 14 días de prueba gratuita sin necesidad de tarjeta de crédito.'
                                },
                                {
                                    q: '¿Qué incluye el soporte técnico?',
                                    a: 'Todos los planes incluyen soporte técnico por email. Los planes superiores incluyen soporte prioritario y por teléfono.'
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

                {/* CTA Section */}
                <section className="py-20 bg-[#0a0a0a] relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 radial-gradient-purple opacity-30" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-3xl mx-auto text-center">
                            <TrendingUp className="h-16 w-16 text-purple-400 mx-auto mb-6" />
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                ¿Listo para <span className="gradient-text">comenzar</span>?
                            </h2>
                            <p className="text-lg text-gray-400 mb-8">
                                Únete a cientos de negocios que ya confían en MiPOS
                            </p>
                            <Button
                                onClick={() => router.push('/inicio#registro')}
                                className="gradient-primary text-white px-8 py-6 text-lg rounded-xl shadow-dark-lg glow-purple hover:scale-105 transition-all"
                            >
                                Crear cuenta gratis
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
