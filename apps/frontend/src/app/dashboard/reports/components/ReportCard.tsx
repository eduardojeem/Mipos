'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { MetricTooltip } from './MetricTooltip';

interface ReportCardProps {
  title: string;
  description?: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  loading?: boolean;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  tooltip?: {
    explanation: string;
  };
}

const colorClasses = {
  blue: 'from-blue-400 to-blue-600 text-blue-600 bg-blue-50',
  green: 'from-green-400 to-green-600 text-green-600 bg-green-50',
  yellow: 'from-yellow-400 to-yellow-600 text-yellow-600 bg-yellow-50',
  purple: 'from-purple-400 to-purple-600 text-purple-600 bg-purple-50',
  red: 'from-red-400 to-red-600 text-red-600 bg-red-50',
};

export function ReportCard({
  title,
  description,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  loading = false,
  badge,
  tooltip,
}: ReportCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  const colors = colorClasses[color];
  const [bgColor, textColor, iconBg] = colors.split(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-800/50 dark:hover:shadow-slate-900/70">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${bgColor} dark:from-blue-600 dark:to-purple-700`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              {title}
              {tooltip && (
                <MetricTooltip
                  title={title}
                  explanation={tooltip.explanation}
                />
              )}
            </CardTitle>
            {description && <CardDescription className="text-xs mt-1">{description}</CardDescription>}
          </div>
          <div className={`p-2 rounded-lg ${iconBg} dark:bg-slate-800/70`}>
            <Icon className={`h-4 w-4 ${textColor}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{value}</div>
            {badge && (
              <Badge variant={badge.variant || 'default'} className="ml-2">
                {badge.label}
              </Badge>
            )}
          </div>
          {trend && (
            <div className="flex items-center text-xs mt-2">
              <span
                className={`font-medium ${trend.direction === 'up'
                  ? 'text-green-600 dark:text-green-400'
                  : trend.direction === 'down'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground dark:text-slate-400'
                  }`}
              >
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}%
              </span>
              <span className="text-muted-foreground ml-1">{trend.label}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ReportCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
