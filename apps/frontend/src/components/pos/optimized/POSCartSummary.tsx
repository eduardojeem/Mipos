'use client';

import React, { memo } from 'react';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface POSCartSummaryProps {
    calculations: {
        subtotal: number; // Subtotal SIN IVA
        subtotalWithIva: number;
        discountAmount: number;
        taxAmount: number;
        total: number;
    };
}

export const POSCartSummary = memo(({ calculations }: POSCartSummaryProps) => {
    return (
        <div className="space-y-3 bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 rounded-xl border border-gray-200 shadow-sm">
            {/* Subtotal SIN IVA */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (sin IVA):</span>
                <span className="font-medium">{formatCurrency(calculations.subtotal)}</span>
            </div>

            {/* IVA */}
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (10%):</span>
                <span className="font-medium">{formatCurrency(calculations.taxAmount)}</span>
            </div>

            {/* Discount */}
            {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-green-700 font-medium">Descuento:</span>
                    <span className="font-semibold text-green-700">
                        -{formatCurrency(calculations.discountAmount)}
                    </span>
                </div>
            )}

            <Separator className="my-2" />

            {/* Total - PREMIUM ENHANCED */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg border-2 border-primary/20">
                <div className="flex justify-between items-baseline gap-3">
                    <span className="text-base font-semibold text-gray-700 uppercase tracking-wide">
                        Total a Pagar:
                    </span>
                    <div className="flex flex-col items-end">
                        <span className="text-4xl font-black text-primary tracking-tight leading-none">
                            {formatCurrency(calculations.total)}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                            IVA Incluido
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

POSCartSummary.displayName = 'POSCartSummary';
