'use client';

import React from 'react';
import { Users, TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportCard } from '../ReportCard';
import { ChartCard } from '../ChartCard';
import { DataTable, Column } from '../DataTable';
import { PeriodComparison } from '../PeriodComparison';
import { CustomerData } from '../../hooks/useReportData';

interface ReportsCustomersTabProps {
    data: CustomerData;
}

export function ReportsCustomersTab({ data }: ReportsCustomersTabProps) {
    const columns: Column<any>[] = [
        { key: 'name', label: 'Cliente', sortable: true },
        {
            key: 'totalSpent',
            label: 'Total Gastado',
            sortable: true,
            render: (value) => `$${value.toLocaleString()}`,
        },
        { key: 'orders', label: 'Pedidos', sortable: true },
    ];

    return (
        <div className="space-y-6">
            {/* Métricas principales */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <ReportCard
                    title="Total Clientes"
                    value={data.totalCustomers.toLocaleString()}
                    icon={Users}
                    color="blue"
                />
                <ReportCard
                    title="Nuevos Clientes"
                    value={data.newCustomers.toLocaleString()}
                    icon={TrendingUp}
                    color="green"
                    trend={{
                        value: Math.abs(data.trends?.newCustomersPct ?? 0),
                        label: 'vs período anterior',
                        direction: (data.trends?.newCustomersPct ?? 0) >= 0 ? 'up' : 'down',
                    }}
                />
                <ReportCard
                    title="Clientes Activos"
                    value={data.activeCustomers.toLocaleString()}
                    icon={Users}
                    color="purple"
                />
                <ReportCard
                    title="Valor de Vida"
                    value={`$${data.customerLifetimeValue.toFixed(2)}`}
                    icon={DollarSign}
                    color="yellow"
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
                        label="Nuevos clientes vs. período anterior"
                        current={data.newCustomers}
                        previous={data.previousPeriod.newCustomers}
                        format="number"
                    />
                </motion.div>
            )}

            {/* Gráficos */}
            <ChartCard
                title="Segmentos de Clientes"
                description="Distribución de clientes por segmento"
                data={data.customerSegments.map((item: any) => ({
                    label: item.segment,
                    value: item.count,
                }))}
                type="pie"
            />

            {/* Tabla de clientes */}
            <Card className="dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-800/50">
                <CardHeader>
                    <CardTitle>Top Clientes</CardTitle>
                    <CardDescription>Clientes con mayor gasto en el período</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable data={data.topCustomers} columns={columns} pageSize={10} />
                </CardContent>
            </Card>
        </div>
    );
}
