'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RotateCcw, DollarSign, Clock, CheckCircle, 
  XCircle, TrendingUp, AlertTriangle 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReturnsStatsProps {
  stats: {
    totalReturns: number;
    totalAmount: number;
    pendingReturns: number;
    approvedReturns: number;
    rejectedReturns: number;
    avgProcessingTime: number;
    returnRate: number;
  } | null;
  isLoading: boolean;
}

export function ReturnsStats({ stats, isLoading }: ReturnsStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      title: 'Total Devoluciones',
      value: stats.totalReturns.toLocaleString(),
      icon: RotateCcw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    {
      title: 'Monto Total',
      value: formatCurrency(stats.totalAmount),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
    {
      title: 'Pendientes',
      value: stats.pendingReturns.toLocaleString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950'
    },
    {
      title: 'Aprobadas',
      value: stats.approvedReturns.toLocaleString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
    {
      title: 'Rechazadas',
      value: stats.rejectedReturns.toLocaleString(),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950'
    },
    {
      title: 'Tiempo Promedio',
      value: `${stats.avgProcessingTime}h`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950'
    },
    {
      title: 'Tasa de Devolución',
      value: `${stats.returnRate.toFixed(1)}%`,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950'
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