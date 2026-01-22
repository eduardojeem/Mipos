'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react';

interface SaleSummaryHeaderProps {
    totalAmount: number;
    itemCount: number;
    discountAmount?: number;
    paymentMethod?: string;
    formatCurrency: (amount: number) => string;
    className?: string;
}

export function SaleSummaryHeader({
    totalAmount,
    itemCount,
    discountAmount = 0,
    paymentMethod,
    formatCurrency,
    className
}: SaleSummaryHeaderProps) {
    const hasDiscount = discountAmount > 0;

    return (
        <div
            className={cn(
                "sticky top-0 z-20 bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 dark:from-primary/10 dark:via-primary/15 dark:to-primary/10",
                "backdrop-blur-xl border-2 border-primary/20 rounded-xl p-4 sm:p-6 shadow-xl",
                "transition-all duration-300",
                className
            )}
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Left side: Total */}
                <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Total a Pagar
                        </span>
                        {hasDiscount && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-xs">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                Descuento aplicado
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl sm:text-5xl font-black text-primary tracking-tight leading-none">
                            {formatCurrency(totalAmount)}
                        </span>

                        {hasDiscount && (
                            <span className="text-lg text-muted-foreground line-through">
                                {formatCurrency(totalAmount + discountAmount)}
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                        IVA incluido
                    </p>
                </div>

                {/* Right side: Details */}
                <div className="flex flex-col sm:items-end gap-2">
                    {/* Item count */}
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                        <ShoppingCart className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">
                            {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
                        </span>
                    </div>

                    {/* Payment method */}
                    {paymentMethod && (
                        <Badge
                            variant="outline"
                            className="bg-white/50 dark:bg-gray-900/50 border-primary/30 text-primary font-medium"
                        >
                            {paymentMethod}
                        </Badge>
                    )}

                    {/* Discount amount */}
                    {hasDiscount && (
                        <div className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                            <TrendingDown className="w-4 h-4" />
                            <span className="font-semibold">
                                Ahorro: {formatCurrency(discountAmount)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress indicator (optional visual element) */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-b-xl" />
        </div>
    );
}
