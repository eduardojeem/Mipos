import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Subscription } from '@/hooks/use-subscription';
import { Check, Calendar, CreditCard, AlertCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SubscriptionCardProps {
    subscription: Subscription | null;
    isLoading?: boolean;
    onChangePlan?: () => void;
}

const getStatusBadge = (status: string) => {
    const statusConfig = {
        active: { variant: 'default' as const, label: 'Activo', className: 'bg-green-500' },
        trialing: { variant: 'secondary' as const, label: 'En prueba', className: 'bg-blue-500' },
        past_due: { variant: 'destructive' as const, label: 'Vencido', className: 'bg-red-500' },
        cancelled: { variant: 'outline' as const, label: 'Cancelado', className: 'bg-gray-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

export function SubscriptionCard({ subscription, isLoading, onChangePlan }: SubscriptionCardProps) {
    if (isLoading) {
        return (
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!subscription) {
        return (
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        Sin Suscripción
                    </CardTitle>
                    <CardDescription>
                        No tienes una suscripción activa en este momento
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Selecciona un plan para comenzar a disfrutar de todas las funcionalidades del sistema.
                    </p>
                    {onChangePlan && (
                        <Button onClick={onChangePlan} className="w-full">
                            Ver Planes Disponibles
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    const { plan, status, billingCycle, currentPeriodEnd, daysUntilRenewal, isOrgAdmin } = subscription;
    const currentPrice = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            {plan.name}
                            {getStatusBadge(status)}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {plan.description || 'Tu plan actual de suscripción'}
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-primary">
                            {formatCurrency(currentPrice, plan.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            / {billingCycle === 'yearly' ? 'año' : 'mes'}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Características del plan */}
                <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Características Incluidas
                    </h4>
                    <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Límites del plan */}
                {plan.limits && Object.keys(plan.limits).length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-3">Límites del Plan</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {plan.limits.maxUsers && (
                                <div className="bg-muted/50 p-3 rounded-lg">
                                    <div className="font-medium">Usuarios</div>
                                    <div className="text-muted-foreground">
                                        {plan.limits.maxUsers === -1 ? 'Ilimitados' : `Hasta ${plan.limits.maxUsers}`}
                                    </div>
                                </div>
                            )}
                            {plan.limits.maxProducts && (
                                <div className="bg-muted/50 p-3 rounded-lg">
                                    <div className="font-medium">Productos</div>
                                    <div className="text-muted-foreground">
                                        {plan.limits.maxProducts === -1 ? 'Ilimitados' : `Hasta ${plan.limits.maxProducts}`}
                                    </div>
                                </div>
                            )}
                            {plan.limits.maxLocations && (
                                <div className="bg-muted/50 p-3 rounded-lg">
                                    <div className="font-medium">Locales</div>
                                    <div className="text-muted-foreground">
                                        {plan.limits.maxLocations === -1 ? 'Ilimitados' : `Hasta ${plan.limits.maxLocations}`}
                                    </div>
                                </div>
                            )}
                            {plan.limits.maxTransactionsPerMonth && (
                                <div className="bg-muted/50 p-3 rounded-lg">
                                    <div className="font-medium">Transacciones/mes</div>
                                    <div className="text-muted-foreground">
                                        {plan.limits.maxTransactionsPerMonth === -1
                                            ? 'Ilimitadas'
                                            : `Hasta ${plan.limits.maxTransactionsPerMonth.toLocaleString()}`}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Información de facturación */}
                <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Información de Facturación
                    </h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Ciclo de facturación:</span>
                            <span className="font-medium capitalize">{billingCycle === 'yearly' ? 'Anual' : 'Mensual'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Próxima renovación:</span>
                            <span className="font-medium">{formatDate(currentPeriodEnd)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Días restantes:
                            </span>
                            <Badge variant="outline" className="font-medium">
                                {daysUntilRenewal} días
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                {isOrgAdmin && onChangePlan && (
                    <div className="border-t pt-4">
                        <Button
                            onClick={onChangePlan}
                            variant="outline"
                            className="w-full"
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Cambiar Plan
                        </Button>
                    </div>
                )}

                {!isOrgAdmin && (
                    <div className="border-t pt-4">
                        <p className="text-xs text-muted-foreground text-center">
                            Solo los administradores pueden cambiar el plan de suscripción
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
