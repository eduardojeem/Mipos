'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Activity } from 'lucide-react';
import type { AnalyticsMetrics } from '../hooks/useSupplierAnalytics';

interface AnalyticsKPICardsProps {
  data: AnalyticsMetrics;
  loading?: boolean;
}

interface KPICard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: any;
  color: string;
}

export const AnalyticsKPICards = memo(function AnalyticsKPICards({
  data,
  loading = false,
}: AnalyticsKPICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Memoize expensive calculations
  const kpiCards = useMemo(() => {
    if (!data) return [];
    
    const activeRate = (data.activeSuppliers / data.totalSuppliers) * 100;
    
    return [
    {
      title: 'Total Proveedores',
      value: data.totalSuppliers.toString(),
      change: '+3 este mes',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Proveedores Activos',
      value: `${activeRate.toFixed(1)}%`,
      change: '+5.2% vs anterior',
      trend: 'up',
      icon: Activity,
      color: 'text-green-600',
    },
    {
      title: 'Total Gastado',
      value: `$${(data.totalSpent / 1000).toFixed(0)}K`,
      change: '+18.7% este período',
      trend: 'up',
      icon: DollarSign,
      color: 'text-purple-600',
    },
    {
      title: 'Valor Promedio Orden',
      value: `$${data.averageOrderValue.toFixed(0)}`,
      change: '+12.3% vs anterior',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-orange-600',
    },
    ];
  }, [data]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((kpi, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {kpi.trend === 'up' ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {kpi.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});