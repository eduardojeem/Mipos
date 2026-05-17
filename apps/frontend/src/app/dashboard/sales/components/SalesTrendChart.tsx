'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PremiumDashboardCard } from '@/components/dashboard/shared/PremiumDashboardCard';
import { useSalesTrend, type TrendRange } from '../hooks/useSalesTrend';
import { cn } from '@/lib/utils';

const RANGES: { label: string; value: TrendRange }[] = [
  { label: '7 días', value: '7d' },
  { label: '30 días', value: '30d' },
  { label: '90 días', value: '90d' },
  { label: 'MTD', value: 'mtd' },
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

function formatDay(day: string, range: TrendRange): string {
  const date = new Date(day + 'T00:00:00');
  if (range === '90d' || range === 'ytd') {
    return date.toLocaleDateString('es', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { day: string; transactions: number } }>;
  label?: string;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { day, transactions } = payload[0].payload;
  const revenue = payload[0].value;
  const date = new Date(day + 'T00:00:00');
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
        {date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
      </p>
      <p className="text-sm font-bold text-emerald-600">
        {new Intl.NumberFormat('es', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(revenue)}
      </p>
      <p className="text-xs text-slate-500">{transactions} transacciones</p>
    </div>
  );
}

export function SalesTrendChart() {
  const [range, setRange] = useState<TrendRange>('7d');
  const { data: points = [], isLoading } = useSalesTrend({ range });

  return (
    <PremiumDashboardCard>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg">Tendencia de Ventas</CardTitle>
          <CardDescription>Ingresos diarios del período seleccionado.</CardDescription>
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
        ) : points.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            Sin ventas en este período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={d => formatDay(d, range)}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </PremiumDashboardCard>
  );
}
