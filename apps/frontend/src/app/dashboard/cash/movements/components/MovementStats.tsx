import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface MovementStatsProps {
    stats: {
        total: number;
        in: number;
        out: number;
        sale: number;
        return: number;
        adjustment: number;
        totalAmount: number;
        inAmount: number;
        outAmount: number;
        saleAmount: number;
        returnAmount: number;
    };
    isLoading?: boolean;
}

export function MovementStats({ stats, isLoading }: MovementStatsProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 w-20 bg-muted rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-muted rounded mb-1" />
                            <div className="h-3 w-24 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(stats.totalAmount)}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.in}</div>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(stats.inAmount)}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Egresos</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.out}</div>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(stats.outAmount)}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Ventas</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.sale}</div>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(stats.saleAmount)}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
