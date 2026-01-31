'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, DollarSign, Users, Building2 } from 'lucide-react';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

export function RevenueAnalytics() {
    const { loading, error, mrr, arr, growthMetrics, planBreakdown } = useAdminAnalytics();

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-destructive">Error al cargar analíticas: {error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Revenue Overview */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Ingresos Mensuales (MRR)
                        </CardTitle>
                        <CardDescription>Ingreso recurrente mensual actual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-foreground">
                            ${mrr.toLocaleString()}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            ARR Proyectado: ${arr.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-secondary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <TrendingUp className="h-5 w-5 text-secondary-foreground" />
                            Métricas de Crecimiento
                        </CardTitle>
                        <CardDescription>Indicadores clave de rendimiento</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Tasa de Conversión</span>
                                <span className="font-semibold text-primary">
                                    {growthMetrics.conversionRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Tasa de Churn</span>
                                <span className="font-semibold text-destructive">
                                    {growthMetrics.churnRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">LTV Promedio</span>
                                <span className="font-semibold text-foreground">
                                    ${growthMetrics.averageLifetimeValue.toFixed(0)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Plan Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-foreground">Distribución por Plan</CardTitle>
                    <CardDescription>Ingresos y clientes por tipo de suscripción</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {planBreakdown.map((plan) => (
                            <div key={plan.plan} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-foreground">{plan.plan}</span>
                                        <span className="text-muted-foreground">({plan.count} clientes)</span>
                                    </div>
                                    <div className="font-semibold text-foreground">${plan.revenue}/mes</div>
                                </div>
                                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                                        style={{ width: `${plan.percentage}%` }}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground text-right">
                                    {plan.percentage.toFixed(1)}% del total
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-foreground">{growthMetrics.totalOrgs}</div>
                                <div className="text-xs text-muted-foreground">Organizaciones</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-foreground">{growthMetrics.activeSubscriptions}</div>
                                <div className="text-xs text-muted-foreground">Activos</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-foreground">{growthMetrics.trialCount}</div>
                                <div className="text-xs text-muted-foreground">En Prueba</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-foreground">${(mrr / Math.max(growthMetrics.activeSubscriptions, 1)).toFixed(0)}</div>
                                <div className="text-xs text-muted-foreground">ARPU</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
