'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PremiumDashboardCard } from '@/components/dashboard/shared/PremiumDashboardCard';
import { useSalesBreakdown } from '../hooks/useSalesBreakdown';
import type { TrendRange } from '../hooks/useSalesTrend';
import { cn } from '@/lib/utils';

const RANGES: { label: string; value: TrendRange }[] = [
  { label: '7 días', value: '7d' },
  { label: '30 días', value: '30d' },
  { label: '90 días', value: '90d' },
  { label: 'MTD', value: 'mtd' },
];

const PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#6366f1',
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { category: string; units: number } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { category, units } = payload[0].payload;
  const revenue = payload[0].value;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{category}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">
        {new Intl.NumberFormat('es', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(revenue)}
      </p>
      <p className="text-xs text-slate-500">{units.toLocaleString('es')} unidades</p>
    </div>
  );
}

export function SalesCategoryChart() {
  const [range, setRange] = useState<TrendRange>('7d');
  const { data: rows = [], isLoading } = useSalesBreakdown({ range });

  const total = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <PremiumDashboardCard>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg">Ventas por Categoría</CardTitle>
          <CardDescription>Ingresos desglosados por categoría de producto.</CardDescription>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-medium transition-all',
                range === r.value
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : rows.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            Sin ventas en este período
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Bar chart */}
            <ResponsiveContainer width="60%" height={200}>
              <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                  tickFormatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {rows.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend with % share */}
            <div className="flex-1 space-y-2 overflow-hidden pt-1">
              {rows.map((row, i) => {
                const pct = total > 0 ? ((row.revenue / total) * 100).toFixed(1) : '0';
                return (
                  <div key={row.category} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400">
                      {row.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </PremiumDashboardCard>
  );
}
