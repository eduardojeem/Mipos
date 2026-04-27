'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { PremiumDashboardCard } from './PremiumDashboardCard';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DashboardStatCardProps {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon: LucideIcon;
  accent: string;
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
  delay?: number;
}

export function DashboardStatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  trend,
  trendLabel,
  onClick,
}: DashboardStatCardProps) {
  return (
    <PremiumDashboardCard
      className={cn(onClick && 'cursor-pointer select-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-900')}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {value}
              </h3>
              {trend !== undefined && (
                <Badge
                  variant={trend >= 0 ? 'default' : 'destructive'}
                  className={cn(
                    'text-[10px] font-semibold h-5 px-1.5',
                    trend >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                      : ''
                  )}
                >
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                </Badge>
              )}
            </div>
            {(description || trendLabel) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {description || trendLabel}
              </p>
            )}
          </div>

          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white', accent)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </PremiumDashboardCard>
  );
}
