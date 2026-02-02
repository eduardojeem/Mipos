'use client';

import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface PricingCardProps {
    plan: Plan;
    billingCycle: 'monthly' | 'yearly';
    onSelect: () => void;
    isSelected: boolean;
    isPopular: boolean;
}

export function PricingCard({ plan, billingCycle, onSelect, isSelected, isPopular }: PricingCardProps) {
    const isFree = plan.priceMonthly === 0;
    const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    const displayPrice = isFree ? 'Gratis' : `$${price}`;

    return (
        <div
            className={`relative glass-card rounded-2xl p-6 transition-all duration-300 ${isSelected
                ? 'ring-2 ring-purple-500 scale-105 glow-purple'
                : 'hover-glow'
                } ${isPopular ? 'border-purple-500/50' : ''}`}
        >
            {/* Popular badge */}
            {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="gradient-primary text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" />
                        POPULAR
                    </div>
                </div>
            )}

            <div className="flex flex-col h-full">
                {/* Plan name */}
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    {plan.description && (
                        <p className="text-sm text-gray-400">{plan.description}</p>
                    )}
                </div>

                {/* Price */}
                <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold gradient-text">{displayPrice}</span>
                        {!isFree && (
                            <span className="text-gray-400 text-sm">
                                /{billingCycle === 'monthly' ? 'mes' : 'año'}
                            </span>
                        )}
                    </div>
                    {billingCycle === 'yearly' && !isFree && (
                        <p className="text-sm text-green-400 font-medium mt-1">
                            Ahorra ${(plan.priceMonthly * 12 - plan.priceYearly).toFixed(2)} al año
                        </p>
                    )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-300">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* Select button */}
                <Button
                    onClick={onSelect}
                    className={`w-full ${isSelected || isPopular
                        ? 'gradient-primary text-white'
                        : 'glass-card border-white/10 text-white hover:border-purple-500/50'
                        } transition-all duration-300`}
                >
                    {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                </Button>
            </div>
        </div>
    );
}
