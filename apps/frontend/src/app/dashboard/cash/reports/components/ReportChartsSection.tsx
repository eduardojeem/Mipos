"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, BarChart3, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { CashReport } from "@/types/cash";

interface ReportChartsSectionProps {
    reports: CashReport[];
    isLoading?: boolean;
}

export function ReportChartsSection({ reports, isLoading }: ReportChartsSectionProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (reports.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SessionTrendsChart reports={reports} />
            <DiscrepancyAnalysisChart reports={reports} />
        </div>
    );
}

function SessionTrendsChart({ reports }: { reports: CashReport[] }) {
    const chartData = useMemo(() => {
        return reports.map(r => ({
            period: r.period,
            sesiones: r.data.totalSessions,
            cerradas: r.data.closedSessions,
            abiertas: r.data.openSessions,
            totalCierre: r.data.totalClosing,
        })).reverse(); // Más reciente a la derecha
    }, [reports]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tendencia de Sesiones
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: 'currentColor' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        <YAxis
                            className="text-xs"
                            tick={{ fill: 'currentColor' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem'
                            }}
                            formatter={(value: number, name: string) => {
                                if (name === 'totalCierre') return [formatCurrency(value), 'Total Cierre'];
                                return [value, name === 'cerradas' ? 'Cerradas' : name === 'abiertas' ? 'Abiertas' : 'Total'];
                            }}
                        />
                        <Legend
                            formatter={(value) =>
                                value === 'sesiones' ? 'Total' :
                                    value === 'cerradas' ? 'Cerradas' :
                                        value === 'abiertas' ? 'Abiertas' : value
                            }
                        />
                        <Bar dataKey="sesiones" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cerradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="abiertas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function DiscrepancyAnalysisChart({ reports }: { reports: CashReport[] }) {
    const chartData = useMemo(() => {
        return reports.map(r => ({
            period: r.period,
            discrepancias: r.data.sessionsWithDiscrepancy,
            totalSesiones: r.data.totalSessions,
            montoDiscrepancia: Math.abs(r.data.totalDiscrepancy),
            promedioDiscrepancia: Math.abs(r.data.averageDiscrepancy),
        })).reverse();
    }, [reports]);

    const hasDiscrepancies = chartData.some(d => d.discrepancias > 0);

    if (!hasDiscrepancies) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Análisis de Discrepancias
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                        <div className="text-6xl mb-2">✅</div>
                        <p className="text-lg font-semibold text-green-600">Sin Discrepancias</p>
                        <p className="text-sm text-muted-foreground">Todos los cierres coinciden</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Análisis de Discrepancias
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: 'currentColor' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        <YAxis
                            yAxisId="left"
                            className="text-xs"
                            tick={{ fill: 'currentColor' }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            className="text-xs"
                            tick={{ fill: 'currentColor' }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem'
                            }}
                            formatter={(value: number, name: string) => {
                                if (name === 'montoDiscrepancia' || name === 'promedioDiscrepancia') {
                                    return [formatCurrency(value), name === 'montoDiscrepancia' ? 'Monto Total' : 'Promedio'];
                                }
                                return [value, name === 'discrepancias' ? 'Sesiones con Discrepancia' : name];
                            }}
                        />
                        <Legend
                            formatter={(value) =>
                                value === 'discrepancias' ? 'Sesiones Afectadas' :
                                    value === 'montoDiscrepancia' ? 'Monto Total' :
                                        value === 'promedioDiscrepancia' ? 'Promedio' : value
                            }
                        />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="discrepancias"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ fill: '#ef4444' }}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="promedioDiscrepancia"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#f59e0b' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
