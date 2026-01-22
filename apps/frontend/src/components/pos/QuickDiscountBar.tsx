"use client";
import React, { useCallback } from 'react';
import { Percent, Tag } from 'lucide-react';

interface QuickDiscountBarProps {
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  onSetDiscount: (value: number) => void;
  onSetDiscountType: (type: 'PERCENTAGE' | 'FIXED_AMOUNT') => void;
}

export default function QuickDiscountBar({
  discount,
  discountType,
  onSetDiscount,
  onSetDiscountType,
}: QuickDiscountBarProps) {
  const applyPercentage = useCallback((v: number) => {
    onSetDiscountType('PERCENTAGE');
    onSetDiscount(v);
  }, [onSetDiscount, onSetDiscountType]);

  const applyFixed = useCallback((v: number) => {
    onSetDiscountType('FIXED_AMOUNT');
    onSetDiscount(v);
  }, [onSetDiscount, onSetDiscountType]);

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 sm:px-3 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div className="flex items-center gap-2 text-sm">
          <Percent className="h-4 w-4" />
          <span className="font-medium">Descuentos rápidos</span>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400" role="status" aria-live="polite">
          Actual: {discountType === 'PERCENTAGE' ? `${discount}%` : `$${discount}`}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {/* Presets porcentaje */}
        <button className="px-2 h-9 text-sm rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/30" onClick={() => applyPercentage(5)} aria-label="Aplicar descuento 5%">5%</button>
        <button className="px-2 h-9 text-sm rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/30" onClick={() => applyPercentage(10)} aria-label="Aplicar descuento 10%">10%</button>
        <button className="px-2 h-9 text-sm rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/30" onClick={() => applyPercentage(15)} aria-label="Aplicar descuento 15%">15%</button>
        {/* Presets monto fijo */}
        <button className="px-2 h-9 text-sm rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/30" onClick={() => applyFixed(10)} aria-label="Aplicar descuento fijo $10">
          <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />$10</span>
        </button>
        <button className="px-2 h-9 text-sm rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/30" onClick={() => applyFixed(20)} aria-label="Aplicar descuento fijo $20">
          <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />$20</span>
        </button>
        <button className="px-2 h-9 text-sm rounded border hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/30" onClick={() => applyFixed(50)} aria-label="Aplicar descuento fijo $50">
          <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />$50</span>
        </button>
      </div>
    </div>
  );
}