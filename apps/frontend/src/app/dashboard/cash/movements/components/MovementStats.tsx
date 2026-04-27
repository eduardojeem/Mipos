import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity, Receipt } from 'lucide-react';

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

interface StatCardProps {
    label: string;
    count: number;
    amount: number;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    iconRing: string;
    amountColor: string;
    cardBorder: string;
    cardBg: string;
}

function StatCard({ label, count, amount, icon: Icon, iconColor, iconBg, iconRing, amountColor, cardBorder, cardBg }: StatCardProps) {
    return (
        <Card className={`${cardBorder} ${cardBg}`}>
            <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ring-2 ${iconBg} ${iconRing}`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold ${amountColor}`}>{formatCurrency(amount)}</p>
                    <p className="text-xs text-muted-foreground">{count} operaciones</p>
                </div>
            </CardContent>
        </Card>
    );
}

export function MovementStats({ stats, isLoading }: MovementStatsProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="h-11 w-11 rounded-xl bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-20 rounded bg-muted" />
                                <div className="h-6 w-28 rounded bg-muted" />
                                <div className="h-3 w-16 rounded bg-muted" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-4">
            <StatCard
                label="Total movimientos"
                count={stats.total}
                amount={stats.totalAmount}
                icon={Activity}
                iconColor="text-slate-600 dark:text-slate-300"
                iconBg="bg-slate-100 dark:bg-slate-800"
                iconRing="ring-slate-200/60 dark:ring-slate-700/60"
                amountColor="text-foreground"
                cardBorder="border-slate-200/70 dark:border-slate-800"
                cardBg="bg-gradient-to-br from-background to-muted/20"
            />
            <StatCard
                label="Ingresos"
                count={stats.in}
                amount={stats.inAmount}
                icon={TrendingUp}
                iconColor="text-emerald-600 dark:text-emerald-400"
                iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                iconRing="ring-emerald-200/60 dark:ring-emerald-800/40"
                amountColor="text-emerald-600 dark:text-emerald-400"
                cardBorder="border-emerald-200/50 dark:border-emerald-900/30"
                cardBg="bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-900/10"
            />
            <StatCard
                label="Egresos"
                count={stats.out}
                amount={stats.outAmount}
                icon={TrendingDown}
                iconColor="text-rose-600 dark:text-rose-400"
                iconBg="bg-rose-100 dark:bg-rose-900/40"
                iconRing="ring-rose-200/60 dark:ring-rose-800/40"
                amountColor="text-rose-600 dark:text-rose-400"
                cardBorder="border-rose-200/50 dark:border-rose-900/30"
                cardBg="bg-gradient-to-br from-rose-50/50 to-background dark:from-rose-900/10"
            />
            <StatCard
                label="Ventas"
                count={stats.sale}
                amount={stats.saleAmount}
                icon={Receipt}
                iconColor="text-blue-600 dark:text-blue-400"
                iconBg="bg-blue-100 dark:bg-blue-900/40"
                iconRing="ring-blue-200/60 dark:ring-blue-800/40"
                amountColor="text-blue-600 dark:text-blue-400"
                cardBorder="border-blue-200/50 dark:border-blue-900/30"
                cardBg="bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-900/10"
            />
        </div>
    );
}
