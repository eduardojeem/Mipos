'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: number | string;
  description?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}

const colorClasses = {
  blue: {
    gradient: 'from-blue-400 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    gradient: 'from-green-400 to-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-600 dark:text-green-400',
  },
  yellow: {
    gradient: 'from-yellow-400 to-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  purple: {
    gradient: 'from-purple-400 to-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
  red: {
    gradient: 'from-red-400 to-red-600',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-600 dark:text-red-400',
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
}: StatCardProps) {
  const colors = colorClasses[color];
  
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return val.toLocaleString('es-ES');
    }
    return val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colors.gradient}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Icon className={`h-4 w-4 ${colors.text}`} aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatValue(value)}</div>
          {trend && trendValue !== undefined && (
            <div className="flex items-center text-xs">
              {trend === 'up' ? (
                <ArrowUpRight className="w-3 h-3 mr-1 text-green-600" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-1 text-red-600" aria-hidden="true" />
              )}
              <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {trendValue}%
              </span>
              {description && (
                <span className="text-muted-foreground ml-1">{description}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
