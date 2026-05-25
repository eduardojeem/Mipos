'use client';

import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Plan } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';
import {
    formatCurrency,
    getPlanBillingPrice,
    getPlanFeatureLabels,
    getPlanLimitItems,
    getPlanNarrative,
    isSelfServicePaidPlan,
    resolvePlanLimits,
} from '@/lib/public-plan-utils';

interface PricingCardProps {
    plan: Plan;
    billingCycle: 'monthly' | 'yearly';
    onSelect: () => void;
    isSelected: boolean;
    isPopular: boolean;
}

export function PricingCard({ plan, billingCycle, onSelect, isSelected, isPopular }: PricingCardProps) {
    const isEnterprise = plan.slug === 'enterprise';
    const isFree = plan.priceMonthly === 0 && !isEnterprise;
    const isPaidSelfService = isSelfServicePaidPlan(plan);
    const displayPrice = isEnterprise
        ? 'A consultar'
        : billingCycle === 'monthly'
            ? formatCurrency(plan.priceMonthly, plan.currency)
            : formatCurrency(getPlanBillingPrice(plan, 'yearly'), plan.currency);
    const annualSavings = Math.max(0, plan.priceMonthly * 12 - getPlanBillingPrice(plan, 'yearly'));
    const featureLabels = getPlanFeatureLabels(plan.features).slice(0, 6);
    const planNarrative = getPlanNarrative(plan.slug);
    const limitItems = getPlanLimitItems(plan);
    const limits = resolvePlanLimits({
        slug: plan.slug,
        limits: plan.limits,
        features: plan.features,
    });

    return (
        <div
            className={cn(
                'landing-panel flex h-full flex-col rounded-lg p-6 transition-colors',
                isPopular ? 'border-amber-400/45' : 'border-white/10',
                isSelected && 'border-emerald-400/60 ring-1 ring-emerald-400/50'
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-300">
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        {isPopular ? 'Plan recomendado' : planNarrative.badge}
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                        {plan.description || planNarrative.summary}
                    </p>
                </div>
                {plan.trialDays && plan.trialDays > 0 ? (
                    <div className="shrink-0 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
                        {plan.trialDays} días
                    </div>
                ) : null}
            </div>

            <div className="mt-8 border-y border-white/10 py-5">
                <div className="flex flex-wrap items-end gap-2">
                    <span className={cn('font-semibold text-white', isEnterprise ? 'text-2xl' : 'text-4xl')}>
                        {displayPrice}
                    </span>
                    {!isFree && !isEnterprise ? (
                        <span className="pb-1 text-sm text-slate-400">
                            / {billingCycle === 'monthly' ? 'mes' : 'año'}
                        </span>
                    ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-400">{planNarrative.audience}</p>
                {billingCycle === 'yearly' && !isFree && !isEnterprise && plan.yearlyDiscount && plan.yearlyDiscount > 0 ? (
                    <p className="mt-2 text-sm font-medium text-emerald-300">
                        Ahorro anual: {formatCurrency(annualSavings, plan.currency)}
                    </p>
                ) : null}
                {isPaidSelfService ? (
                    <p className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                        Creas la cuenta gratis. Este plan queda preparado para activarlo despues.
                    </p>
                ) : null}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
                {limitItems.map((item) => (
                    <div key={item.key}>
                        <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                            {item.label}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-100">{item.value}</dd>
                    </div>
                ))}
            </dl>

            <div className="mt-6 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    Funciones destacadas
                </p>
                <ul className="mt-4 space-y-3">
                    {featureLabels.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {isEnterprise ? (
                <a
                    href="mailto:contacto@mipos.app?subject=Consulta%20Enterprise"
                    className={cn(
                        'mt-8 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                        'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                    )}
                >
                    Consultar precio
                    <ArrowRight className="ml-2 h-4 w-4" />
                </a>
            ) : (
                <Button
                    onClick={onSelect}
                    className={cn(
                        'mt-8 w-full rounded-lg px-4 text-sm font-medium transition-colors',
                        isPopular || isSelected
                            ? 'gradient-primary text-white shadow-[0_18px_40px_-20px_rgba(16,185,129,0.95)] hover:opacity-95'
                            : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                    )}
                >
                    {isFree ? 'Crear cuenta gratis' : 'Preparar este plan'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
