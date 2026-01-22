'use client';

import React from 'react';
import { Package, AlertCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportCard } from '../ReportCard';
import { ChartCard } from '../ChartCard';
import { DataTable, Column } from '../DataTable';
import { InventoryData } from '../../hooks/useReportData';

interface ReportsInventoryTabProps {
    data: InventoryData;
}

export function ReportsInventoryTab({ data }: ReportsInventoryTabProps) {
    const columns: Column<any>[] = [
        { key: 'name', label: 'Producto', sortable: true },
        { key: 'stock', label: 'Stock', sortable: true },
        {
            key: 'status',
            label: 'Estado',
            render: (value) => (
                <Badge variant={value === 'low' ? 'destructive' : 'default'} className={value === 'low' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}>
                    {value === 'low' ? 'Bajo' : 'Normal'}
                </Badge>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Métricas principales */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <ReportCard
                    title="Total Productos"
                    value={data.totalProducts.toLocaleString()}
                    icon={Package}
                    color="blue"
                />
                <ReportCard
                    title="Stock Bajo"
                    value={data.lowStockItems.toLocaleString()}
                    icon={AlertCircle}
                    color="yellow"
                    badge={{ label: 'Atención', variant: 'destructive' }}
                />
                <ReportCard
                    title="Sin Stock"
                    value={data.outOfStockItems.toLocaleString()}
                    icon={AlertCircle}
                    color="red"
                />
                <ReportCard
                    title="Valor Total"
                    value={`$${data.totalValue.toLocaleString()}`}
                    icon={DollarSign}
                    color="green"
                />
            </div>

            {/* Gráficos */}
            <ChartCard
                title="Productos por Categoría"
                description="Distribución de inventario por categoría"
                data={data.categoryBreakdown.map((item: any) => ({
                    label: item.category,
                    value: item.count,
                }))}
                type="bar"
            />

            {/* Tabla de Stock */}
            <Card className="dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-800/50">
                <CardHeader>
                    <CardTitle>Niveles de Stock</CardTitle>
                    <CardDescription>Detalle de stock por producto</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable data={data.stockLevels} columns={columns} pageSize={10} />
                </CardContent>
            </Card>
        </div>
    );
}
