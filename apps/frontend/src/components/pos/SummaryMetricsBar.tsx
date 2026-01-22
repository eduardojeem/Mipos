"use client";
import React from 'react';
import { TrendingUp, BarChart3, Clock, Package, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

interface SummaryMetricsBarProps {
  todaySales?: number;
  averageTicket?: number;
  newSalesCount?: number;
  topSellingProduct?: string;
  lowStockCount?: number;
  onRefresh?: () => void;
  onGoToReports?: () => void;
}

export default function SummaryMetricsBar({
  todaySales = 0,
  averageTicket = 0,
  newSalesCount = 0,
  topSellingProduct = '',
  lowStockCount = 0,
  onRefresh,
  onGoToReports,
}: SummaryMetricsBarProps) {
  const fmtCurrency = useCurrencyFormatter();
  return (
    <section aria-labelledby="pos-summary-title" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
      <div className="px-3 sm:px-4 py-2 sm:py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {/* Ventas del día */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800">
          <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
          <div className="min-w-0">
            <p id="pos-summary-title" className="text-xs text-slate-500">Ventas del día</p>
            <p className="text-sm sm:text-base font-semibold truncate" aria-live="polite">{fmtCurrency(todaySales)}</p>
          </div>
        </div>

        {/* Ticket promedio */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800">
          <BarChart3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Ticket promedio</p>
            <p className="text-sm sm:text-base font-semibold truncate">{fmtCurrency(averageTicket)}</p>
          </div>
        </div>

        {/* Nuevas ventas (realtime) */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800">
          <Clock className="h-4 w-4 text-purple-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Nuevas ventas</p>
            <p className="text-sm sm:text-base font-semibold truncate" aria-live="polite">{newSalesCount}</p>
          </div>
        </div>

        {/* Más vendido y alertas */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800">
          <Package className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Más vendido</p>
            <p className="text-sm sm:text-base font-semibold truncate">{topSellingProduct || '—'}</p>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 text-amber-700">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              <span>{lowStockCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-3 flex items-center gap-2">
        {onRefresh && (
          <button onClick={onRefresh} className="text-xs sm:text-sm px-2 py-1 rounded border bg-white hover:bg-slate-50">Refrescar</button>
        )}
        {onGoToReports && (
          <button onClick={onGoToReports} className="text-xs sm:text-sm px-2 py-1 rounded border bg-white hover:bg-slate-50">Ver reportes</button>
        )}
      </div>
    </section>
  );
}