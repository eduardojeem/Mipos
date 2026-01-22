import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ShoppingCart, Users, Target, CreditCard } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { SalesStats } from '@/hooks/useSalesStats';
import { cn } from '@/lib/utils';

interface SalesStatsCardsProps {
    stats: SalesStats;
    className?: string;
}

export const SalesStatsCards = memo(function SalesStatsCards({ stats, className }: SalesStatsCardsProps) {
    const fmtCurrency = useCurrencyFormatter();

    const statCards = [
        {
            title: 'Ventas Totales',
            value: fmtCurrency(stats.totalRevenue),
            subtitle: `${stats.totalSales} transacciones`,
            icon: DollarSign,
            iconColor: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-950/20',
        },
        {
            title: 'Ventas Hoy',
            value: fmtCurrency(stats.todayTotal),
            subtitle: `${stats.todayCount} ventas`,
            icon: TrendingUp,
            iconColor: stats.dailyGrowth >= 0 ? 'text-blue-600' : 'text-red-600',
            bgColor: stats.dailyGrowth >= 0 ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-red-50 dark:bg-red-950/20',
            badge: stats.dailyGrowth !== 0 ? `${stats.dailyGrowth > 0 ? '+' : ''}${stats.dailyGrowth.toFixed(1)}%` : undefined,
        },
        {
            title: 'Ticket Promedio',
            value: fmtCurrency(stats.averageTicket),
            subtitle: `${stats.completedSales} completadas`,
            icon: ShoppingCart,
            iconColor: 'text-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-950/20',
        },
        {
            title: 'Clientes Únicos',
            value: stats.uniqueCustomers.toString(),
            subtitle: `Esta semana: ${fmtCurrency(stats.thisWeekTotal)}`,
            icon: Users,
            iconColor: 'text-orange-600',
            bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        },
    ];

    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
            {statCards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card key={index} className="relative overflow-hidden transition-all hover:shadow-lg">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </CardTitle>
                                <div className={cn('p-2 rounded-lg', card.bgColor)}>
                                    <Icon className={cn('h-4 w-4', card.iconColor)} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-bold">{card.value}</div>
                                {card.badge && (
                                    <span className={cn(
                                        'text-xs font-semibold px-2 py-1 rounded-full',
                                        stats.dailyGrowth >= 0
                                            ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                    )}>
                                        {card.badge}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
});

interface SalesStatsDetailedProps {
    stats: SalesStats;
    className?: string;
}

export const SalesStatsDetailed = memo(function SalesStatsDetailed({ stats, className }: SalesStatsDetailedProps) {
    const fmtCurrency = useCurrencyFormatter();

    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', className)}>
            {/* Payment Methods */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Métodos de Pago
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Object.entries(stats.paymentMethods).map(([method, amount]) => {
                        const percentage = stats.totalRevenue > 0 ? (amount / stats.totalRevenue) * 100 : 0;
                        const labels: Record<string, string> = {
                            cash: 'Efectivo',
                            card: 'Tarjeta',
                            transfer: 'Transferencia',
                            other: 'Otro',
                        };

                        return (
                            <div key={method} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{labels[method]}</span>
                                    <span className="font-medium">{fmtCurrency(amount)}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground text-right">
                                    {percentage.toFixed(1)}%
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Sale Types */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Tipos de Venta
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Object.entries(stats.saleTypes).map(([type, amount]) => {
                        const percentage = stats.totalRevenue > 0 ? (amount / stats.totalRevenue) * 100 : 0;
                        const labels: Record<string, string> = {
                            retail: 'Minorista',
                            wholesale: 'Mayorista',
                        };

                        return (
                            <div key={type} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{labels[type]}</span>
                                    <span className="font-medium">{fmtCurrency(amount)}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-secondary transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground text-right">
                                    {percentage.toFixed(1)}%
                                </div>
                            </div>
                        );
                    })}

                    <div className="pt-3 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Impuestos</span>
                            <span className="font-medium">{fmtCurrency(stats.totalTax)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Descuentos</span>
                            <span className="font-medium text-red-600">{fmtCurrency(stats.totalDiscount)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});
