'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CreditCard, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
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

export const AdminStats = memo(function AdminStats({ stats, trends }: AdminStatsProps) {
  const statCards = [
    {
      title: 'Total Organizaciones',
      value: stats.totalOrganizations,
      description: 'Empresas registradas',
      icon: Building2,
      trend: trends?.organizations,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-50 dark:bg-slate-900/50',
      borderColor: 'border-l-slate-500',
    },
    {
      title: 'Usuarios Totales',
      value: stats.totalUsers,
      description: 'Usuarios en todas las orgs',
      icon: Users,
      trend: trends?.users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-l-blue-500',
    },
    {
      title: 'Suscripciones Activas',
      value: stats.activeSubscriptions,
      description: 'Organizaciones pagando',
      icon: CreditCard,
      trend: trends?.subscriptions,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-l-emerald-500',
    },
    {
      title: 'MRR Estimado',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      description: 'Ingreso recurrente mensual',
      icon: DollarSign,
      trend: trends?.revenue,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-l-amber-500',
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const hasTrend = typeof stat.trend === 'number';
          const isPositive = hasTrend && stat.trend! > 0;
          const isNegative = hasTrend && stat.trend! < 0;

          return (
            <Card
              key={index}
              className={`relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer border-l-4 ${stat.borderColor} bg-white dark:bg-slate-950/50 backdrop-blur-sm`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {stat.description}
                    </p>
                  </div>

                  {hasTrend && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                            isPositive
                              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : isNegative
                              ? 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400'
                              : 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : isNegative ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          {Math.abs(stat.trend!)}%
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isPositive ? 'Incremento' : isNegative ? 'Disminución' : 'Sin cambios'} del{' '}
                          {Math.abs(stat.trend!)}% respecto al período anterior
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
});