'use client';

import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Plan } from '@/hooks/use-subscription';

interface PricingCardProps {
    plan: Plan;
    billingCycle: 'monthly' | 'yearly';
    onSelect: () => void;
    isSelected: boolean;
    isPopular: boolean;
}

function formatPlanPrice(plan: Plan, billingCycle: 'monthly' | 'yearly') {
    const rawPrice = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

    if (rawPrice === 0) {
        return 'Gratis';
    }

    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: plan.currency || 'USD',
        minimumFractionDigits: rawPrice % 1 === 0 ? 0 : 2,
        maximumFractionDigits: rawPrice % 1 === 0 ? 0 : 2,
    }).format(rawPrice);
}

export function PricingCard({ plan, billingCycle, onSelect, isSelected, isPopular }: PricingCardProps) {
    const isFree = plan.priceMonthly === 0;
    const displayPrice = formatPlanPrice(plan, billingCycle);
    const annualSavings = Math.max(0, plan.priceMonthly * 12 - plan.priceYearly);

    return (
        <div
            className={`relative glass-card rounded-2xl p-6 transition-all duration-300 ${isSelected
                ? 'ring-2 ring-purple-500 scale-105 glow-purple'
                : 'hover-glow'
                } ${isPopular ? 'border-purple-500/50' : ''}`}
        >
            {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="gradient-primary text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" />
                        RECOMENDADO
                    </div>
                </div>
            )}

            <div className="flex flex-col h-full">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    {plan.description && (
                        <p className="text-sm text-gray-400">{plan.description}</p>
                    )}
                </div>

                <div className="mb-6">
                    <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-4xl font-bold gradient-text">{displayPrice}</span>
                        {!isFree && (
                            <span className="text-gray-400 text-sm">
                                /{billingCycle === 'monthly' ? 'mes' : 'ano'}
                            </span>
                        )}
                    </div>
                    {billingCycle === 'yearly' && !isFree && plan.yearlyDiscount && plan.yearlyDiscount > 0 && (
                        <p className="text-sm text-green-400 font-medium mt-1">
                            Ahorras {formatPlanPrice({ ...plan, priceYearly: annualSavings, priceMonthly: annualSavings }, 'yearly')} por ano
                        </p>
                    )}
                    {plan.trialDays && plan.trialDays > 0 && (
                        <p className="text-sm text-blue-300 font-medium mt-1">
                            {plan.trialDays} dias de prueba incluidos
                        </p>
                    )}
                </div>

                <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-300">{feature}</span>
                        </li>
                    ))}
                </ul>

                <Button
                    onClick={onSelect}
                    className={`w-full ${isSelected || isPopular
                        ? 'gradient-primary text-white'
                        : 'glass-card border-white/10 text-white hover:border-purple-500/50'
                        } transition-all duration-300`}
                >
                    {isSelected ? 'Seleccionado' : 'Seleccionar'}
                </Button>
            </div>
        </div>
    );
}
