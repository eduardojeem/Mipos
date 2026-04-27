'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RotateCcw, DollarSign, Clock, CheckCircle,
  XCircle, Package, TrendingDown, Percent
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ReturnsStats as Stats } from '../hooks/useReturns';

interface ReturnsStatsProps {
  stats: Stats | null;
  isLoading: boolean;
}

export function ReturnsStats({ stats, isLoading }: ReturnsStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="mb-3 h-8 w-8 rounded-lg" />
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="mt-1 h-3 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const pendingPct = stats.totalReturns > 0
    ? ((stats.pendingReturns / stats.totalReturns) * 100).toFixed(0)
    : '0';
  const approvedPct = stats.totalReturns > 0
    ? ((stats.approvedReturns / stats.totalReturns) * 100).toFixed(0)
    : '0';
  const processedPct = stats.totalReturns > 0
    ? ((stats.completedReturns / stats.totalReturns) * 100).toFixed(0)
    : '0';
  const rejectedPct = stats.totalReturns > 0
    ? ((stats.rejectedReturns / stats.totalReturns) * 100).toFixed(0)
    : '0';

  const cards = [
    {
      title: 'Total',
      value: stats.totalReturns.toLocaleString('es'),
      sub: formatCurrency(stats.totalAmount),
      subLabel: 'monto total',
      icon: RotateCcw,
      gradient: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-700 dark:text-blue-300',
      delay: '0ms',
    },
    {
      title: 'Pendientes',
      value: stats.pendingReturns.toLocaleString('es'),
      sub: formatCurrency(stats.pendingAmount),
      subLabel: `${pendingPct}% del total`,
      icon: Clock,
      gradient: 'from-amber-500/10 to-amber-600/5',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-300',
      urgent: stats.pendingReturns > 0,
      delay: '60ms',
    },
    {
      title: 'Aprobadas',
      value: stats.approvedReturns.toLocaleString('es'),
      sub: formatCurrency(stats.approvedAmount),
      subLabel: `${approvedPct}% del total`,
      icon: CheckCircle,
      gradient: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      delay: '120ms',
    },
    {
      title: 'Procesadas',
      value: stats.completedReturns.toLocaleString('es'),
      sub: formatCurrency(stats.completedAmount),
      subLabel: `${processedPct}% del total`,
      icon: Package,
      gradient: 'from-purple-500/10 to-purple-600/5',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
      valueColor: 'text-purple-700 dark:text-purple-300',
      delay: '180ms',
    },
    {
      title: 'Rechazadas',
      value: stats.rejectedReturns.toLocaleString('es'),
      sub: formatCurrency(stats.rejectedAmount),
      subLabel: `${rejectedPct}% del total`,
      icon: XCircle,
      gradient: 'from-red-500/10 to-red-600/5',
      border: 'border-red-500/20',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
      valueColor: 'text-red-700 dark:text-red-300',
      delay: '240ms',
    },
    {
      title: 'Tasa de dev.',
      value: `${stats.returnRate?.toFixed(1) ?? '0.0'}%`,
      sub: stats.avgProcessingTime > 0
        ? `${stats.avgProcessingTime.toFixed(1)}h promedio`
        : 'Sin datos',
      subLabel: 'tiempo promedio',
      icon: stats.returnRate > 5 ? TrendingDown : Percent,
      gradient: stats.returnRate > 5
        ? 'from-rose-500/10 to-rose-600/5'
        : 'from-slate-500/10 to-slate-600/5',
      border: stats.returnRate > 5 ? 'border-rose-500/20' : 'border-slate-500/20',
      iconBg: stats.returnRate > 5 ? 'bg-rose-500/10' : 'bg-slate-500/10',
      iconColor: stats.returnRate > 5
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-600 dark:text-slate-400',
      valueColor: stats.returnRate > 5
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-slate-700 dark:text-slate-300',
      delay: '300ms',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card
            key={i}
            style={{ animationDelay: card.delay }}
            className={`stats-card-enter overflow-hidden border ${card.border} bg-gradient-to-br ${card.gradient} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className={`relative inline-flex rounded-lg p-2 ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  {/* Urgency pulse for pending */}
                  {'urgent' in card && card.urgent && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                  )}
                </div>
              </div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.title}
              </p>
              <p className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground" title={card.sub}>
                {card.sub}
              </p>
            </CardContent>
          </Card>
        );
      })}

      <style jsx>{`
        .stats-card-enter {
          animation: statsCardFadeIn 0.4s ease both;
        }
        @keyframes statsCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}