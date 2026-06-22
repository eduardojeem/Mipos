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
} from '@/lib/public-plan-utils';

interface PricingCardProps {
    plan: Plan;
    billingCycle: 'monthly' | 'yearly';
    onSelect: () => void;
    isSelected: boolean;
    isPopular: boolean;
    featuresOverride?: string[];
}

export function PricingCard({ plan, billingCycle, onSelect, isSelected, isPopular, featuresOverride }: PricingCardProps) {
    const isEnterprise = plan.slug === 'enterprise';
    const isFree = plan.priceMonthly === 0 && !isEnterprise;
    const isPaidSelfService = isSelfServicePaidPlan(plan);
    const displayPrice = isEnterprise
        ? 'A consultar'
        : billingCycle === 'monthly'
            ? formatCurrency(plan.priceMonthly, plan.currency)
            : formatCurrency(getPlanBillingPrice(plan, 'yearly'), plan.currency);
    const annualSavings = Math.max(0, plan.priceMonthly * 12 - getPlanBillingPrice(plan, 'yearly'));
    const featureLabels = featuresOverride || getPlanFeatureLabels(plan.features).slice(0, 6);
    const planNarrative = getPlanNarrative(plan.slug);
    const limitItems = getPlanLimitItems(plan);

    return (
        <div
            className={cn(
                'flex h-full flex-col rounded-2xl p-6 transition-all duration-500 backdrop-blur-xl border hover:scale-[1.02]',
                isPopular
                    ? 'border-amber-400/40 bg-slate-900/50 shadow-xl shadow-amber-500/5 hover:border-amber-400/60'
                    : 'border-white/10 bg-slate-900/35 hover:border-white/20',
                isSelected && 'border-emerald-400/60 bg-slate-900/60 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-400/40'
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                        isPopular
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-300 animate-pulse"
                            : "border-white/10 bg-white/5 text-slate-300"
                    )}>
                        <Sparkles className="h-3 w-3" />
                        {isPopular ? 'Sugerido' : planNarrative.badge}
                    </div>
                    <h3 className="mt-4 text-2xl font-extrabold text-white tracking-tight">{plan.name}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400 font-medium">
                        {plan.description || planNarrative.summary}
                    </p>
                </div>
                {plan.trialDays && plan.trialDays > 0 ? (
                    <div className="shrink-0 rounded-xl bg-sky-500/15 border border-sky-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-300 shadow-sm shadow-sky-500/5">
                        {plan.trialDays} días de prueba
                    </div>
                ) : null}
            </div>

            <div className="mt-6 border-y border-white/5 py-4">
                <div className="flex flex-wrap items-end gap-1.5">
                    <span className={cn('font-black text-white tracking-tight', isEnterprise ? 'text-2xl' : 'text-4xl')}>
                        {displayPrice}
                    </span>
                    {!isFree && !isEnterprise ? (
                        <span className="pb-1 text-xs font-semibold text-slate-400">
                            / {billingCycle === 'monthly' ? 'mes' : 'año'}
                        </span>
                    ) : null}
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-400 leading-normal">{planNarrative.audience}</p>

                {billingCycle === 'yearly' && !isFree && !isEnterprise && plan.yearlyDiscount && plan.yearlyDiscount > 0 ? (
                    <p className="mt-2 text-xs font-bold text-emerald-400">
                        ⚡ Ahorro anual de {formatCurrency(annualSavings, plan.currency)}
                    </p>
                ) : null}

                {isPaidSelfService ? (
                    <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] leading-relaxed text-emerald-300 font-medium">
                        ✨ Creas tu cuenta gratis y configuras este plan en tu panel más adelante.
                    </p>
                ) : null}
            </div>

            {/* Limits visual box */}
            <div className="mt-6 grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3.5 shadow-inner">
                {limitItems.map((item) => (
                    <div key={item.key} className="min-w-0">
                        <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                            {item.label}
                        </span>
                        <span className="mt-1 block text-xs font-extrabold text-slate-200 truncate">
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Features lists with stylized round bullets */}
            <div className="mt-6 flex-1 flex flex-col justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Funciones destacadas
                    </p>
                    <ul className="mt-4 space-y-3">
                        {featureLabels.map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-300 leading-normal font-medium">
                                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                                    <Check className="h-3 w-3" />
                                </span>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {isEnterprise ? (
                    <a
                        href="mailto:contacto@mipos.app?subject=Consulta%20Enterprise"
                        className={cn(
                            'mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-xs font-bold transition-all duration-300',
                            'border border-white/10 bg-white/5 text-slate-200 hover:text-white hover:bg-white/10 hover:border-white/20'
                        )}
                    >
                        Consultar precio Enterprise
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                ) : (
                    <Button
                        onClick={onSelect}
                        className={cn(
                            'mt-8 w-full h-11 rounded-xl px-4 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2',
                            isPopular || isSelected
                                ? 'gradient-primary text-white shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0'
                                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-slate-100 hover:border-white/20'
                        )}
                    >
                        {isFree ? 'Crear cuenta gratis' : 'Preparar este plan'}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
