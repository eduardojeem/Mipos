'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Boxes,
  Clock3,
  DollarSign,
  Package,
  ShieldCheck,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { StockAlertsStats as StockAlertsStatsType } from '@/lib/stock-alerts';

interface StockAlertsStatsProps {
  stats: StockAlertsStatsType | null;
  isLoading: boolean;
}

export function StockAlertsStats({ stats, isLoading }: StockAlertsStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const healthRatio =
    stats.totalProducts > 0
      ? `${Math.round((stats.healthyProducts / stats.totalProducts) * 100)}%`
      : '0%';

  const cards = [
    {
      title: 'Criticas',
      value: stats.criticalAlerts.toLocaleString(),
      icon: AlertTriangle,
      tone: 'text-red-600',
      surface: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      title: 'Bajo minimo',
      value: stats.lowStockAlerts.toLocaleString(),
      icon: Package,
      tone: 'text-orange-600',
      surface: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      title: 'Advertencia',
      value: stats.warningAlerts.toLocaleString(),
      icon: TrendingDown,
      tone: 'text-amber-600',
      surface: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Sin stock',
      value: stats.outOfStockAlerts.toLocaleString(),
      icon: XCircle,
      tone: 'text-rose-600',
      surface: 'bg-rose-50 dark:bg-rose-950/30',
    },
    {
      title: 'Salud',
      value: healthRatio,
      icon: ShieldCheck,
      tone: 'text-emerald-600',
      surface: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Reposicion',
      value: formatCurrency(stats.estimatedReplenishmentCost),
      icon: DollarSign,
      tone: 'text-sky-600',
      surface: 'bg-sky-50 dark:bg-sky-950/30',
    },
    {
      title: 'Cobertura',
      value: stats.avgDaysToStockout !== null ? `${stats.avgDaysToStockout}d` : '--',
      icon: Clock3,
      tone: 'text-violet-600',
      surface: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      title: 'Productos',
      value: stats.totalProducts.toLocaleString(),
      icon: Boxes,
      tone: 'text-slate-700 dark:text-slate-200',
      surface: 'bg-slate-100 dark:bg-slate-900',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${card.surface}`}>
                <card.icon className={`h-5 w-5 ${card.tone}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.title}
                </p>
                <p className="truncate text-xl font-semibold">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
