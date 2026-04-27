'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { StockAlertTrendItem, StockAlertsStats } from '@/lib/stock-alerts';

interface StockTrendsChartProps {
  trends: StockAlertTrendItem[];
  stats: StockAlertsStats | null;
  isLoading: boolean;
}

const severityColors: Record<string, string> = {
  critical: '#dc2626',
  low: '#ea580c',
  warning: '#ca8a04',
};

export function StockTrendsChart({ trends, stats, isLoading }: StockTrendsChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!stats || trends.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No hay suficiente historial para construir tendencias de stock.
      </div>
    );
  }

  const chartData = trends.map((item) => ({
    name: item.productName.length > 18 ? `${item.productName.slice(0, 18)}...` : item.productName,
    fullName: item.productName,
    gap: item.stockGap,
    weeklyUnitsSold: item.weeklyUnitsSold,
    severity: item.severity,
    currentStock: item.currentStock,
    minThreshold: item.minThreshold,
    estimatedDaysLeft: item.estimatedDaysLeft,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
          <div className="text-lg font-semibold text-red-600">{stats.criticalAlerts}</div>
          <div className="text-xs text-red-600">Criticas</div>
        </div>
        <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/30">
          <div className="text-lg font-semibold text-orange-600">{stats.lowStockAlerts}</div>
          <div className="text-xs text-orange-600">Bajo minimo</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
          <div className="text-lg font-semibold text-amber-600">{stats.warningAlerts}</div>
          <div className="text-xs text-amber-600">Advertencia</div>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={56} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartsTooltip
              formatter={(value: number, key: string) => {
                if (key === 'weeklyUnitsSold') {
                  return [`${value} u/semana`, 'Salida semanal'];
                }
                return [`${value} u`, 'Brecha'];
              }}
            />
            <Bar dataKey="gap" fill="#0f172a" radius={[4, 4, 0, 0]} name="Brecha" />
            <Bar dataKey="weeklyUnitsSold" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Salida semanal" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {trends.slice(0, 3).map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.productName}</p>
              <p className="text-xs text-muted-foreground">
                {item.estimatedDaysLeft !== null
                  ? `${item.estimatedDaysLeft} dias de cobertura`
                  : 'Sin velocidad de salida'}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-semibold"
                style={{ color: severityColors[item.severity] || '#0f172a' }}
              >
                {item.stockGap} u
              </p>
              <p className="text-xs text-muted-foreground">
                {item.weeklyUnitsSold} u/semana
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
