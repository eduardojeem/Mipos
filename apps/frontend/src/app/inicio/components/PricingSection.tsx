'use client';

import { useEffect, useState } from 'react';
import { PricingCard } from './PricingCard';
import { Loader2 } from 'lucide-react';

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

interface PricingSectionProps {
    onPlanSelect: (plan: Plan) => void;
    selectedPlanId?: string;
}

export function PricingSection({ onPlanSelect, selectedPlanId }: PricingSectionProps) {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

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

    return (
        <section id="planes" className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 radial-gradient-purple opacity-20" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Planes y Precios
                    </h2>
                    <p className="text-lg text-gray-400 mb-8">
                        Elige el plan perfecto para tu negocio
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
                                onSelect={() => onPlanSelect(plan)}
                                isSelected={selectedPlanId === plan.id}
                                isPopular={plan.id === getPopularPlan()}
                            />
                        ))}
                    </div>
                )}

                {/* Trust indicators */}
                <div className="mt-16 text-center">
                    <p className="text-sm text-gray-500">
                        ✓ Sin permanencia • ✓ Cancela cuando quieras • ✓ Soporte incluido
                    </p>
                </div>
            </div>
        </section>
    );
}
