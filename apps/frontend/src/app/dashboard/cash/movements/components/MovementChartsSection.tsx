"use client";

import React, { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CashMovement } from "@/types/cash";
import { Skeleton } from "@/components/ui/skeleton";

interface MovementChartsSectionProps {
    movements: CashMovement[];
    isLoading?: boolean;
}

const COLORS = {
    IN: "#10b981",      // green
    OUT: "#ef4444",     // red
    SALE: "#3b82f6",    // blue
    RETURN: "#f59e0b",  // amber
    ADJUSTMENT: "#8b5cf6", // purple
};

const TYPE_LABELS = {
    IN: "Ingresos",
    OUT: "Egresos",
    SALE: "Ventas",
    RETURN: "Devoluciones",
    ADJUSTMENT: "Ajustes",
};

export function MovementChartsSection({ movements, isLoading }: MovementChartsSectionProps) {
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

    if (movements.length === 0) {
        return (
            <Card className="mb-6">
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">No hay datos suficientes para mostrar gráficos</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CashFlowChart movements={movements} />
                <MovementTypeDistribution movements={movements} />
            </div>
            <InOutComparisonChart movements={movements} />
        </div>
    );
}

function CashFlowChart({ movements }: { movements: CashMovement[] }) {
    const chartData = useMemo(() => {
        // Agrupar por día
        const dailyData = movements.reduce((acc, m) => {
            const date = new Date(m.createdAt).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });

            if (!acc[date]) {
                acc[date] = { date, inflows: 0, outflows: 0, net: 0, count: 0 };
            }

            const amount = Math.abs(m.amount);
            if (['IN', 'SALE'].includes(m.type)) {
                acc[date].inflows += amount;
                acc[date].net += amount;
            } else if (['OUT', 'RETURN'].includes(m.type)) {
                acc[date].outflows += amount;
                acc[date].net -= amount;
            } else if (m.type === 'ADJUSTMENT') {
                acc[date].net += m.amount;
            }
            acc[date].count++;

            return acc;
        }, {} as Record<string, any>);

        return Object.values(dailyData)
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-14); // Últimos 14 días
    }, [movements]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Flujo Diario de Efectivo
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            className="text-xs"
                            tick={{ fill: 'currentColor' }}
                        />
                        <YAxis
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
                            formatter={(value: number, name: string) => [
                                formatCurrency(value),
                                name === 'inflows' ? 'Ingresos' : name === 'outflows' ? 'Egresos' : 'Neto'
                            ]}
                        />
                        <Legend
                            formatter={(value) =>
                                value === 'inflows' ? 'Ingresos' :
                                    value === 'outflows' ? 'Egresos' : 'Neto'
                            }
                        />
                        <Line
                            type="monotone"
                            dataKey="inflows"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ fill: '#10b981' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="outflows"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ fill: '#ef4444' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="net"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#3b82f6' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function MovementTypeDistribution({ movements }: { movements: CashMovement[] }) {
    const chartData = useMemo(() => {
        const typeStats = movements.reduce((acc, m) => {
            const type = m.type as keyof typeof COLORS;
            if (!acc[type]) {
                acc[type] = { name: TYPE_LABELS[type] || type, value: 0, count: 0 };
            }
            acc[type].value += Math.abs(m.amount);
            acc[type].count++;
            return acc;
        }, {} as Record<string, any>);

        return Object.entries(typeStats).map(([type, data]) => ({
            ...data,
            color: COLORS[type as keyof typeof COLORS],
            percentage: 0, // Se calculará después
        }));
    }, [movements]);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const dataWithPercentage = chartData.map(item => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Distribución por Tipo
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={dataWithPercentage}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {dataWithPercentage.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem'
                            }}
                            formatter={(value: number, name, props: any) => [
                                `${formatCurrency(value)} (${props.payload.count} movimientos)`,
                                props.payload.name
                            ]}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-4">
                    {dataWithPercentage.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                            />
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium truncate">{entry.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    {formatCurrency(entry.value)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function InOutComparisonChart({ movements }: { movements: CashMovement[] }) {
    const chartData = useMemo(() => {
        // Agrupar por hora del día
        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, '0')}:00`,
            inflows: 0,
            outflows: 0,
        }));

        movements.forEach(m => {
            const hour = new Date(m.createdAt).getHours();
            const amount = Math.abs(m.amount);

            if (['IN', 'SALE'].includes(m.type)) {
                hourlyData[hour].inflows += amount;
            } else if (['OUT', 'RETURN'].includes(m.type)) {
                hourlyData[hour].outflows += amount;
            }
        });

        // Filtrar solo las horas con actividad
        return hourlyData.filter(h => h.inflows > 0 || h.outflows > 0);
    }, [movements]);

    if (chartData.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Actividad por Hora del Día
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="hour"
                            className="text-xs"
                            tick={{ fill: 'currentColor' }}
                        />
                        <YAxis
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
                            formatter={(value: number, name: string) => [
                                formatCurrency(value),
                                name === 'inflows' ? 'Ingresos' : 'Egresos'
                            ]}
                        />
                        <Legend
                            formatter={(value) => value === 'inflows' ? 'Ingresos' : 'Egresos'}
                        />
                        <Bar dataKey="inflows" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outflows" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
