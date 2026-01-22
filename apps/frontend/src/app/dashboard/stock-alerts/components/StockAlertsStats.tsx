'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, Package, TrendingDown, ShoppingCart,
  Clock, DollarSign, Target
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface StockAlertsStatsProps {
  stats: {
    criticalAlerts: number;
    lowStockAlerts: number;
    warningAlerts: number;
    totalProducts: number;
    estimatedLoss: number;
    avgDaysToStockout: number;
    pendingOrders: number;
  } | null;
  isLoading: boolean;
}

export function StockAlertsStats({ stats, isLoading }: StockAlertsStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1">
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

  if (!stats) return null;

  const statCards = [
    {
      title: 'Crítico',
      value: stats.criticalAlerts.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950'
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStockAlerts.toLocaleString(),
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950'
    },
    {
      title: 'Advertencias',
      value: stats.warningAlerts.toLocaleString(),
      icon: TrendingDown,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950'
    },
    {
      title: 'Total Productos',
      value: stats.totalProducts.toLocaleString(),
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    {
      title: 'Pérdida Estimada',
      value: formatCurrency(stats.estimatedLoss),
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950'
    },
    {
      title: 'Días Promedio',
      value: `${stats.avgDaysToStockout}d`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950'
    },
    {
      title: 'Órdenes Pendientes',
      value: stats.pendingOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}