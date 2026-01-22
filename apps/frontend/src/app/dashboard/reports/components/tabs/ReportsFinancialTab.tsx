'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportCard } from '../ReportCard';
import { PeriodComparison } from '../PeriodComparison';
import { ChartCard } from '../ChartCard';
import { DataTable, Column } from '../DataTable';
import { FinancialData } from '../../hooks/useReportData';

interface ReportsFinancialTabProps {
    data: FinancialData;
}

export function ReportsFinancialTab({ data }: ReportsFinancialTabProps) {
    const columns: Column<any>[] = [
        { key: 'month', label: 'Mes', sortable: true },
        {
            key: 'revenue',
            label: 'Ingresos',
            sortable: true,
            render: (value) => `$${value.toLocaleString()}`,
        },
        {
            key: 'expenses',
            label: 'Gastos',
            sortable: true,
            render: (value) => `$${value.toLocaleString()}`,
        },
        {
            key: 'profit',
            label: 'Beneficio',
            sortable: true,
            render: (value) => (
                <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${value.toLocaleString()}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Métricas principales */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <ReportCard
                    title="Ingresos Totales"
                    value={`$${data.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="green"
                    trend={{
                        value: Math.abs(data.trends?.revenuePct ?? 0),
                        label: 'vs período anterior',
                        direction: (data.trends?.revenuePct ?? 0) >= 0 ? 'up' : 'down',
                    }}
                />
                <ReportCard
                    title="Gastos Totales"
                    value={`$${data.totalExpenses.toLocaleString()}`}
                    icon={TrendingUp}
                    color="red"
                    trend={{
                        value: Math.abs(data.trends?.expensesPct ?? 0),
                        label: 'vs período anterior',
                        direction: (data.trends?.expensesPct ?? 0) >= 0 ? 'up' : 'down',
                    }}
                />
                <ReportCard
                    title="Beneficio Neto"
                    value={`$${data.netProfit.toLocaleString()}`}
                    icon={BarChart3}
                    color="blue"
                    trend={{
                        value: Math.abs(data.trends?.profitPct ?? 0),
                        label: 'vs período anterior',
                        direction: (data.trends?.profitPct ?? 0) >= 0 ? 'up' : 'down',
                    }}
                />
                <ReportCard
                    title="Margen de Beneficio"
                    value={`${data.profitMargin.toFixed(1)}%`}
                    icon={TrendingUp}
                    color="purple"
                    trend={{
                        value: Math.abs(data.trends?.marginPct ?? 0),
                        label: 'vs período anterior',
                        direction: (data.trends?.marginPct ?? 0) >= 0 ? 'up' : 'down',
                    }}
                />
            </div>

            {/* Comparativa detallada */}
            {data.previousPeriod && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <PeriodComparison
                        label="Ingresos vs. período anterior"
                        current={data.totalRevenue}
                        previous={data.previousPeriod.totalRevenue}
                        format="currency"
                    />
                    <PeriodComparison
                        label="Gastos vs. período anterior"
                        current={data.totalExpenses}
                        previous={data.previousPeriod.totalExpenses}
                        format="currency"
                    />
                    <PeriodComparison
                        label="Beneficio vs. período anterior"
                        current={data.netProfit}
                        previous={data.previousPeriod.netProfit}
                        format="currency"
                    />
                    <PeriodComparison
                        label="Margen vs. período anterior"
                        current={data.profitMargin}
                        previous={data.previousPeriod.profitMargin}
                        format="percentage"
                    />
                </motion.div>
            )}

            {/* Gráficos */}
            <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard
                    title="Ingresos vs Gastos"
                    description="Comparación mensual de ingresos y gastos"
                    data={data.revenueByMonth.map((item: any) => ({
                        label: item.month,
                        value: item.revenue,
                    }))}
                    type="bar"
                />
                <ChartCard
                    title="Gastos por Categoría"
                    description="Distribución de gastos por categoría"
                    data={data.expenseBreakdown.map((item: any) => ({
                        label: item.category,
                        value: item.amount,
                    }))}
                    type="pie"
                />
            </div>

            {/* Tabla Financiera */}
            <Card className="dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-800/50">
                <CardHeader>
                    <CardTitle>Histórico Financiero</CardTitle>
                    <CardDescription>Resumen de ingresos y gastos por mes</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable data={data.revenueByMonth} columns={columns} pageSize={10} />
                </CardContent>
            </Card>
        </div>
    );
}
