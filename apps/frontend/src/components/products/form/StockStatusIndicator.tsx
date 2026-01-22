/**
 * Componente StockStatusIndicator
 * Muestra el estado del stock con indicadores visuales
 */

'use client';

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StockStatusIndicatorProps {
    stock: number;
    minStock: number;
    className?: string;
}

export function StockStatusIndicator({
    stock,
    minStock,
    className
}: StockStatusIndicatorProps) {
    const getStockStatus = () => {
        if (stock <= 0) {
            return {
                color: 'text-red-600 bg-red-50 border-red-200',
                message: 'Sin stock',
                icon: <AlertCircle className="h-4 w-4" />,
                variant: 'destructive' as const
            };
        }

        if (stock <= minStock) {
            return {
                color: 'text-red-600 bg-red-50 border-red-200',
                message: 'Stock crítico',
                icon: <AlertCircle className="h-4 w-4" />,
                variant: 'destructive' as const
            };
        }

        if (stock <= minStock * 2) {
            return {
                color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
                message: 'Stock bajo',
                icon: <AlertCircle className="h-4 w-4" />,
                variant: 'default' as const
            };
        }

        return {
            color: 'text-green-600 bg-green-50 border-green-200',
            message: 'Stock adecuado',
            icon: <CheckCircle className="h-4 w-4" />,
            variant: 'default' as const
        };
    };

    const status = getStockStatus();

    return (
        <div className={cn('p-4 rounded-lg border', status.color, className)}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Estado del Stock</span>
                <Badge variant={status.variant} className="border-current">
                    {status.message}
                </Badge>
            </div>

            <div className="flex items-center space-x-2">
                {status.icon}
                <span className="text-2xl font-bold">
                    {stock} unidades
                </span>
            </div>

            <div className="mt-2 text-xs opacity-75">
                <p>Stock mínimo: {minStock} unidades</p>
                {stock > 0 && stock <= minStock * 2 && (
                    <p className="mt-1">
                        Considere reabastecer pronto
                    </p>
                )}
            </div>
        </div>
    );
}
