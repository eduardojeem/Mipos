'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportCard } from '../ReportCard';
import { PeriodComparison } from '../PeriodComparison';
import { ChartCard } from '../ChartCard';
import { DataTable, Column } from '../DataTable';
import { SalesData } from '../../hooks/useReportData';

interface ReportsSalesTabProps {
    data: SalesData;
}

export function ReportsSalesTab({ data }: ReportsSalesTabProps) {
    const columns: Column<any>[] = [
        { key: 'name', label: 'Producto', sortable: true },
        {
            key: 'sales',
            label: 'Ventas',
            sortable: true,
            render: (value) => `$${value.toLocaleString()}`,
        },
        { key: 'quantity', label: 'Cantidad', sortable: true },
    ];

    return (
        <div className="space-y-6">
            {/* Métricas principales */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <ReportCard
                    title="Ventas Totales"
                    value={`$${data.totalSales.toLocaleString()}`}
                    icon={DollarSign}
                    color="green"
                    trend={{
                        value: Math.abs(data.trends?.salesPct ?? 0),
                        label: 'vs período anterior',
                        direction: (data.trends?.salesPct ?? 0) >= 0 ? 'up' : 'down',
                    }}
                    tooltip={{
                        explanation: 'Suma total de todas las ventas completadas en el período seleccionado. No incluye ventas canceladas o pendientes.'
                    }}
                />
                <ReportCard
                    title="Pedidos Totales"
                    value={data.totalOrders.toLocaleString()}
                    icon={ShoppingCart}
                    color="blue"
                    trend={{
                        value: Math.abs(data.trends?.ordersPct ?? 0),
                        label: 'vs período anterior',
                        direction: (data.trends?.ordersPct ?? 0) >= 0 ? 'up' : 'down',
                    }}
                    tooltip={{
                        explanation: 'Número total de transacciones completadas. Cada pedido puede contener uno o más productos.'
                    }}
                />
                <ReportCard
                    title="Valor Promedio"
                    value={`$${data.averageOrderValue.toFixed(2)}`}
                    icon={TrendingUp}
                    color="purple"
                    trend={{
                        value: Math.abs(data.trends?.aovPct ?? 0),
                        label: 'vs período anterior',
                        direction: (data.trends?.aovPct ?? 0) >= 0 ? 'up' : 'down',
                    }}
                    tooltip={{
                        explanation: 'Valor promedio por pedido. Se calcula dividiendo el total de ventas entre el número de pedidos. Un valor alto indica que los clientes compran más por transacción.'
                    }}
                />
            </div>

            {/* Comparativa detallada */}
            {data.previousPeriod && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    <PeriodComparison
                        label="Ventas totales vs. período anterior"
                        current={data.totalSales}
                        previous={data.previousPeriod.totalSales}
                        format="currency"
                    />
                    <PeriodComparison
                        label="Pedidos vs. período anterior"
                        current={data.totalOrders}
                        previous={data.previousPeriod.totalOrders}
                        format="number"
                    />
                    <PeriodComparison
                        label="Ticket promedio vs. período anterior"
                        current={data.averageOrderValue}
                        previous={data.previousPeriod.averageOrderValue}
                        format="currency"
                    />
                </motion.div>
            )}

            {/* Gráficos */}
            <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard
                    title="Ventas por Fecha"
                    description="Evolución de ventas en el período seleccionado"
                    data={data.salesByDate.map((item: any) => ({
                        label: new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                        value: item.sales,
                    }))}
                    type="line"
                />
                <ChartCard
                    title="Ventas por Categoría"
                    description="Distribución de ventas por categoría de producto"
                    data={data.salesByCategory.map((item: any) => ({
                        label: item.category,
                        value: item.sales,
                    }))}
                    type="pie"
                />
            </div>

            {/* Tabla de Top Productos */}
            <Card className="dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-800/50">
                <CardHeader>
                    <CardTitle>Productos Más Vendidos</CardTitle>
                    <CardDescription>Top 10 productos por volumen de ventas</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable data={data.topProducts} columns={columns} pageSize={5} />
                </CardContent>
            </Card>
        </div>
    );
}
