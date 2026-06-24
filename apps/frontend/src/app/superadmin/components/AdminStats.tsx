'use client';

import React, { memo } from 'react';
import { Building2, CreditCard, Users, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AdminStats as AdminStatsType } from '../hooks/useAdminData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdminStatsProps {
  stats: AdminStatsType;
  trends?: {
    organizations?: number;
    users?: number;
    subscriptions?: number;
    revenue?: number;
  };
}

const formatMoney = (amount: number | undefined) =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

export const AdminStats = memo(function AdminStats({ stats, trends }: AdminStatsProps) {
  const statCards = [
    {
      title: 'Organizaciones',
      subtitle: 'TOTAL REGISTRADAS',
      value: stats.totalOrganizations,
      description: 'empresas en la plataforma',
      icon: Building2,
      trend: trends?.organizations,
      accentColor: 'text-indigo-400',
      accentBg: 'bg-indigo-500/10',
      accentBorder: 'border-indigo-500/20',
      glowColor: 'shadow-indigo-500/10',
      dotColor: 'bg-indigo-400',
    },
    {
      title: 'Usuarios',
      subtitle: 'USUARIOS TOTALES',
      value: stats.totalUsers.toLocaleString('es-PY'),
      description: 'en todas las organizaciones',
      icon: Users,
      trend: trends?.users,
      accentColor: 'text-sky-400',
      accentBg: 'bg-sky-500/10',
      accentBorder: 'border-sky-500/20',
      glowColor: 'shadow-sky-500/10',
      dotColor: 'bg-sky-400',
    },
    {
      title: 'Activas',
      subtitle: 'ORGS ACTIVAS',
      value: stats.activeOrganizations || 0,
      description: `${stats.totalOrganizations > 0 ? Math.round(((stats.activeOrganizations || 0) / stats.totalOrganizations) * 100) : 0}% de operación`,
      icon: Building2,
      trend: trends?.subscriptions,
      accentColor: 'text-emerald-400',
      accentBg: 'bg-emerald-500/10',
      accentBorder: 'border-emerald-500/20',
      glowColor: 'shadow-emerald-500/10',
      dotColor: 'bg-emerald-400',
    },
    {
      title: 'MRR',
      subtitle: 'INGRESO MENSUAL',
      value: formatMoney(stats.monthlyRevenue),
      description: 'ingreso recurrente mensual',
      icon: DollarSign,
      trend: trends?.revenue,
      accentColor: 'text-violet-400',
      accentBg: 'bg-violet-500/10',
      accentBorder: 'border-violet-500/20',
      glowColor: 'shadow-violet-500/10',
      dotColor: 'bg-violet-400',
    },
    {
      title: 'Suscripciones',
      subtitle: 'CONTRATOS ACTIVOS',
      value: stats.activeSubscriptions,
      description: 'planes SaaS vigentes',
      icon: CreditCard,
      trend: trends?.subscriptions,
      accentColor: 'text-amber-400',
      accentBg: 'bg-amber-500/10',
      accentBorder: 'border-amber-500/20',
      glowColor: 'shadow-amber-500/10',
      dotColor: 'bg-amber-400',
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const hasTrend = typeof stat.trend === 'number';
          const isPositive = hasTrend && stat.trend! > 0;
          const isNegative = hasTrend && stat.trend! < 0;

          return (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-xl border bg-slate-900/60 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${stat.accentBorder} ${stat.glowColor}`}
            >
              {/* Ambient glow top-right */}
              <div className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full ${stat.accentBg} blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100`} />

              {/* Header row */}
              <div className="relative flex items-start justify-between gap-2">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.accentBg} border ${stat.accentBorder}`}>
                  <Icon className={`h-4 w-4 ${stat.accentColor}`} />
                </div>

                {hasTrend && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isNegative
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-2.5 w-2.5" />
                        ) : isNegative ? (
                          <TrendingDown className="h-2.5 w-2.5" />
                        ) : (
                          <Minus className="h-2.5 w-2.5" />
                        )}
                        {Math.abs(stat.trend!)}%
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {isPositive ? 'Incremento' : isNegative ? 'Disminución' : 'Sin cambios'} del{' '}
                      {Math.abs(stat.trend!)}% respecto al período anterior
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Value */}
              <div className="relative mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {stat.subtitle}
                </p>
                <div className={`mt-1 text-3xl font-black tabular-nums tracking-tight ${stat.accentColor}`}>
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {stat.description}
                </p>
              </div>

              {/* Bottom accent line */}
              <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${stat.accentBg} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
});
