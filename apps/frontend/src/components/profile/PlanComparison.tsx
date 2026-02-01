import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/hooks/use-subscription';
import { Check, Sparkles, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanComparisonProps {
    plans: Plan[];
    currentPlanId?: string;
    isLoading?: boolean;
    onSelectPlan?: (plan: Plan) => void;
    disableCurrentPlan?: boolean;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
    }).format(amount);
};

export function PlanComparison({
    plans,
    currentPlanId,
    isLoading,
    onSelectPlan,
    disableCurrentPlan = true
}: PlanComparisonProps) {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <Skeleton className="h-6 w-1/2 mb-2" />
                            <Skeleton className="h-4 w-3/4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-12 w-full mb-4" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!plans || plans.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                        No hay planes disponibles en este momento
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toggle de ciclo de facturación */}
            <div className="flex justify-center">
                <div className="inline-flex items-center bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'monthly'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'yearly'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Anual
                        {plans.some(p => p.yearlyDiscount && p.yearlyDiscount > 0) && (
                            <Badge variant="secondary" className="ml-2 bg-green-500 text-white">
                                Ahorra hasta {Math.max(...plans.map(p => p.yearlyDiscount || 0))}%
                            </Badge>
                        )}
                    </button>
                </div>
            </div>

            {/* Grid de planes */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrentPlan = plan.id === currentPlanId;
                    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
                    const pricePerMonth = billingCycle === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly;

                    return (
                        <Card
                            key={plan.id}
                            className={`relative transition-all hover:shadow-xl ${isCurrentPlan
                                    ? 'border-primary border-2 shadow-lg'
                                    : 'hover:border-primary/50'
                                }`}
                        >
                            {/* Badge de plan actual */}
                            {isCurrentPlan && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-primary text-primary-foreground shadow-md">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Plan Actual
                                    </Badge>
                                </div>
                            )}

                            {/* Badge de ahorro anual */}
                            {billingCycle === 'yearly' && plan.yearlyDiscount && plan.yearlyDiscount > 0 && (
                                <div className="absolute -top-3 right-4">
                                    <Badge variant="secondary" className="bg-green-500 text-white shadow-md">
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        Ahorra {plan.yearlyDiscount}%
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="pb-4">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description || 'Plan de suscripción'}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Precio */}
                                <div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold">
                                            {formatCurrency(price, plan.currency)}
                                        </span>
                                        <span className="text-muted-foreground">
                                            / {billingCycle === 'yearly' ? 'año' : 'mes'}
                                        </span>
                                    </div>
                                    {billingCycle === 'yearly' && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {formatCurrency(pricePerMonth, plan.currency)} / mes
                                        </p>
                                    )}
                                </div>

                                {/* Características */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm">Características:</h4>
                                    <ul className="space-y-2">
                                        {plan.features.slice(0, 5).map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm">
                                                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                        {plan.features.length > 5 && (
                                            <li className="text-sm text-muted-foreground pl-6">
                                                +{plan.features.length - 5} características más
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                {/* Límites */}
                                {plan.limits && Object.keys(plan.limits).length > 0 && (
                                    <div className="border-t pt-4">
                                        <h4 className="font-semibold text-sm mb-2">Límites:</h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {plan.limits.maxUsers && (
                                                <div className="bg-muted/50 p-2 rounded">
                                                    <div className="font-medium">Usuarios</div>
                                                    <div className="text-muted-foreground">
                                                        {plan.limits.maxUsers === -1 ? '∞' : plan.limits.maxUsers}
                                                    </div>
                                                </div>
                                            )}
                                            {plan.limits.maxProducts && (
                                                <div className="bg-muted/50 p-2 rounded">
                                                    <div className="font-medium">Productos</div>
                                                    <div className="text-muted-foreground">
                                                        {plan.limits.maxProducts === -1 ? '∞' : plan.limits.maxProducts}
                                                    </div>
                                                </div>
                                            )}
                                            {plan.limits.maxLocations && (
                                                <div className="bg-muted/50 p-2 rounded">
                                                    <div className="font-medium">Locales</div>
                                                    <div className="text-muted-foreground">
                                                        {plan.limits.maxLocations === -1 ? '∞' : plan.limits.maxLocations}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Botón de acción */}
                                <Button
                                    onClick={() => onSelectPlan?.(plan)}
                                    disabled={isCurrentPlan && disableCurrentPlan}
                                    className="w-full"
                                    variant={isCurrentPlan ? 'outline' : 'default'}
                                >
                                    {isCurrentPlan ? 'Plan Actual' : 'Cambiar a este Plan'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
