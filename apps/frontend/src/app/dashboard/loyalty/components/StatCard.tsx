'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: number | string;
  description?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  isLoading?: boolean;
  delay?: string;
}

const colorClasses = {
  blue: {
    gradient: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200/60 dark:border-blue-800/40',
  },
  green: {
    gradient: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
  },
  yellow: {
    gradient: 'from-amber-500 to-amber-700',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/60 dark:border-amber-800/40',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-700',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200/60 dark:border-purple-800/40',
  },
  red: {
    gradient: 'from-red-500 to-red-700',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200/60 dark:border-red-800/40',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  color = 'blue',
  isLoading = false,
  delay = '0ms',
}: StatCardProps) {
  const colors = colorClasses[color];

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') return val.toLocaleString('es-ES');
    return val;
  };

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colors.gradient}`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`stat-card-enter relative overflow-hidden border ${colors.border} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
      style={{ animationDelay: delay }}
    >
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colors.gradient}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`h-4 w-4 ${colors.text}`} aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{formatValue(value)}</div>
        {trend && trendValue !== undefined && (
          <div className="flex items-center text-xs">
            {trend === 'up' ? (
              <ArrowUpRight className="w-3 h-3 mr-1 text-emerald-600" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="w-3 h-3 mr-1 text-red-600" aria-hidden="true" />
            )}
            <span className={trend === 'up' ? 'text-emerald-600' : 'text-red-600'}>
              {trendValue}
            </span>
            {description && (
              <span className="text-muted-foreground ml-1">{description}</span>
            )}
          </div>
        )}
      </CardContent>

      <style jsx>{`
        .stat-card-enter {
          animation: statFadeIn 0.35s ease both;
        }
        @keyframes statFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Card>
  );
}
