/**
 * Componente ProfitMarginIndicator
 * Muestra el margen de ganancia con indicadores visuales
 */

'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProfitMarginIndicatorProps {
    margin: number;
    price: number;
    costPrice: number;
    className?: string;
}

export function ProfitMarginIndicator({
    margin,
    price,
    costPrice,
    className
}: ProfitMarginIndicatorProps) {
    const getMarginColor = () => {
        if (margin >= 30) return 'text-green-600 bg-green-50 border-green-200';
        if (margin >= 15) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getMarginIcon = () => {
        if (margin >= 30) return <TrendingUp className="h-4 w-4" />;
        if (margin >= 15) return <Minus className="h-4 w-4" />;
        return <TrendingDown className="h-4 w-4" />;
    };

    const getMarginLabel = () => {
        if (margin >= 30) return 'Excelente';
        if (margin >= 15) return 'Aceptable';
        return 'Bajo';
    };

    if (!price || !costPrice) {
        return null;
    }

    return (
        <div className={cn('p-4 rounded-lg border', getMarginColor(), className)}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Margen de Ganancia</span>
                <Badge variant="outline" className={cn('border-current', getMarginColor())}>
                    {getMarginLabel()}
                </Badge>
            </div>

            <div className="flex items-center space-x-2">
                {getMarginIcon()}
                <span className="text-2xl font-bold">
                    {margin.toFixed(2)}%
                </span>
            </div>

            <div className="mt-2 text-xs opacity-75">
                <p>Ganancia: ${(price - costPrice).toFixed(2)}</p>
            </div>
        </div>
    );
}
