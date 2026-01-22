"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { CashMovement } from "@/types/cash";
import { useMemo } from "react";

interface CashFlowChartProps {
    movements: CashMovement[];
    openingBalance: number;
}

export default function CashFlowChart({ movements, openingBalance }: CashFlowChartProps) {
    const fmtCurrency = useCurrencyFormatter();

    const data = useMemo(() => {
        // Ordenar movimientos por fecha
        const sorted = [...movements].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        let currentBalance = openingBalance;
        const chartData = [{
            time: 'Inicio',
            balance: openingBalance,
            originalDate: new Date().setHours(0, 0, 0, 0) // Aproximado para el inicio
        }];

        sorted.forEach(m => {
            const amount = Number(m.amount);
            if (m.type === 'IN' || m.type === 'SALE' || m.type === 'ADJUSTMENT') { // Simplificación, ajuste puede ser negativo
                if (m.type === 'ADJUSTMENT' && amount < 0) currentBalance += amount; // Si es ajuste negativo
                else currentBalance += Math.abs(amount);
            } else {
                currentBalance -= Math.abs(amount);
            }

            chartData.push({
                time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                balance: currentBalance,
                originalDate: new Date(m.createdAt).getTime()
            });
        });

        return chartData;
    }, [movements, openingBalance]);

    if (movements.length === 0) {
        return (
            <Card className="col-span-1 md:col-span-2 h-[350px] flex items-center justify-center bg-muted/10">
                <p className="text-muted-foreground">No hay movimientos suficientes para mostrar el gráfico</p>
            </Card>
        );
    }

    return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader>
                <CardTitle>Flujo de Caja en Tiempo Real</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="time"
                                stroke="#9ca3af"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [fmtCurrency(value), "Balance"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#10b981"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
