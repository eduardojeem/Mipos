'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface PeriodComparisonProps {
    current: number;
    previous: number;
    label: string;
    format?: 'currency' | 'number' | 'percentage';
    currencySymbol?: string;
}

export function PeriodComparison({
    current,
    previous,
    label,
    format = 'number',
    currencySymbol = '₲'
}: PeriodComparisonProps) {
    const change = current - previous;
    const changePercent = previous > 0 ? ((change / previous) * 100) : (current > 0 ? 100 : 0);
    const isPositive = change > 0;
    const isNeutral = change === 0;

    const formatValue = (val: number): string => {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('es-PY', {
                    style: 'currency',
                    currency: 'PYG',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(val).replace('PYG', currencySymbol);
            case 'percentage':
                return `${val.toFixed(1)}%`;
            default:
                return val.toLocaleString('es-PY');
        }
    };

    return (
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/10 rounded-lg border border-muted/50 dark:border-slate-700/50 hover:shadow-sm transition-all">
            {/* Current Value */}
            <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {formatValue(current)}
                </p>
            </div>

            {/* Change Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${isNeutral
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : isPositive
                        ? 'bg-green-50 dark:bg-green-950/30'
                        : 'bg-red-50 dark:bg-red-950/30'
                }`}>
                {isNeutral ? (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                ) : isPositive ? (
                    <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                    <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-semibold ${isNeutral
                        ? 'text-muted-foreground'
                        : isPositive
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-700 dark:text-red-400'
                    }`}>
                    {Math.abs(changePercent).toFixed(1)}%
                </span>
            </div>

            {/* Previous Period Value */}
            <div className="text-right ml-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Período anterior</p>
                <p className="text-sm font-medium text-muted-foreground">
                    {formatValue(previous)}
                </p>
            </div>
        </div>
    );
}

// Versión compacta para usar en tarjetas
export function CompactPeriodComparison({
    current,
    previous,
    format = 'number',
    currencySymbol = '₲'
}: Omit<PeriodComparisonProps, 'label'>) {
    const change = current - previous;
    const changePercent = previous > 0 ? ((change / previous) * 100) : (current > 0 ? 100 : 0);
    const isPositive = change > 0;
    const isNeutral = change === 0;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${isNeutral
                ? 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                : isPositive
                    ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
            }`}>
            {isNeutral ? (
                <Minus className="w-3 h-3" />
            ) : isPositive ? (
                <ArrowUp className="w-3 h-3" />
            ) : (
                <ArrowDown className="w-3 h-3" />
            )}
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
        </div>
    );
}
