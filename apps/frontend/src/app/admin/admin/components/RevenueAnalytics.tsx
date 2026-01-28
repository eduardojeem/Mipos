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
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Ingresos Mensuales (MRR)
                        </CardTitle>
                        <CardDescription>Ingreso recurrente mensual actual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-green-600">
                            ${mrr.toLocaleString()}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            ARR Proyectado: ${arr.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Métricas de Crecimiento
                        </CardTitle>
                        <CardDescription>Indicadores clave de rendimiento</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Tasa de Conversión</span>
                                <span className="font-semibold text-blue-600">
                                    {growthMetrics.conversionRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Tasa de Churn</span>
                                <span className="font-semibold text-red-600">
                                    {growthMetrics.churnRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">LTV Promedio</span>
                                <span className="font-semibold">
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
                    <CardTitle>Distribución por Plan</CardTitle>
                    <CardDescription>Ingresos y clientes por tipo de suscripción</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {planBreakdown.map((plan) => (
                            <div key={plan.plan} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{plan.plan}</span>
                                        <span className="text-muted-foreground">({plan.count} clientes)</span>
                                    </div>
                                    <div className="font-semibold">${plan.revenue}/mes</div>
                                </div>
                                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all"
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
                            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{growthMetrics.totalOrgs}</div>
                                <div className="text-xs text-muted-foreground">Organizaciones</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{growthMetrics.activeSubscriptions}</div>
                                <div className="text-xs text-muted-foreground">Activos</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                <Users className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{growthMetrics.trialCount}</div>
                                <div className="text-xs text-muted-foreground">En Prueba</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-50 dark:bg-violet-950 rounded-lg">
                                <DollarSign className="h-4 w-4 text-violet-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">${(mrr / Math.max(growthMetrics.activeSubscriptions, 1)).toFixed(0)}</div>
                                <div className="text-xs text-muted-foreground">ARPU</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
