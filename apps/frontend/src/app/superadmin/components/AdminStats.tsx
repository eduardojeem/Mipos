'use client';

import React from 'react';
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

export function AdminStats({ stats, trends }: AdminStatsProps) {
  const statCards = [
    {
      title: 'Total Organizaciones',
      value: stats.totalOrganizations,
      description: 'Empresas registradas',
      icon: Building2,
      trend: trends?.organizations,
    },
    {
      title: 'Usuarios Totales',
      value: stats.totalUsers,
      description: 'Usuarios en todas las orgs',
      icon: Users,
      trend: trends?.users,
    },
    {
      title: 'Suscripciones Activas',
      value: stats.activeSubscriptions,
      description: 'Organizaciones pagando',
      icon: CreditCard,
      trend: trends?.subscriptions,
    },
    {
      title: 'MRR Estimado',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      description: 'Ingreso recurrente mensual',
      icon: DollarSign,
      trend: trends?.revenue,
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
              className="relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer border-l-4 border-l-primary"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>

                  {hasTrend && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                            isPositive
                              ? 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
                              : isNegative
                              ? 'text-destructive bg-destructive/10'
                              : 'text-muted-foreground bg-muted'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : isNegative ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          <span>
                            {isPositive ? '+' : ''}
                            {stat.trend}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cambio vs mes anterior</p>
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
}
