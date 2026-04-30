'use client';

import { useMemo, useState } from 'react';
import { PricingCard } from './PricingCard';
import { Loader2 } from 'lucide-react';
import { usePlans } from '@/hooks/use-plans';
import type { Plan } from '@/hooks/use-subscription';
import { getBillingBadgeDiscount, getRecommendedPlan } from '@/lib/public-plan-utils';

interface PricingSectionProps {
    onPlanSelect: (plan: Plan) => void;
    selectedPlanId?: string;
}

export function PricingSection({ onPlanSelect, selectedPlanId }: PricingSectionProps) {
    const { plans, isLoading: loading } = usePlans();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const recommendedPlan = useMemo(() => getRecommendedPlan(plans), [plans]);
    const billingBadgeDiscount = useMemo(() => getBillingBadgeDiscount(plans), [plans]);

    return (
        <section id="planes" className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 radial-gradient-purple opacity-20" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Planes y Precios
                    </h2>
                    <p className="text-lg text-gray-400 mb-8">
                        Elige el plan perfecto para tu negocio
                    </p>

                    <div className="inline-flex items-center gap-3 p-1 glass-card rounded-full">
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
                ) : plans.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <p>No hay planes disponibles</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
                        {plans.map((plan) => (
                            <PricingCard
                                key={plan.id}
                                plan={plan}
                                billingCycle={billingCycle}
                                onSelect={() => onPlanSelect(plan)}
                                isSelected={selectedPlanId === plan.id}
                                isPopular={Boolean(recommendedPlan && recommendedPlan.id === plan.id)}
                            />
                        ))}
                    </div>
                )}

                <div className="mt-16 text-center">
                    <p className="text-sm text-gray-500">
                        Precios transparentes y beneficios segun el plan activo.
                    </p>
                </div>
            </div>
        </section>
    );
}
