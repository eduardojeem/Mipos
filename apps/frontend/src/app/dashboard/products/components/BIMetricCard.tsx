'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { BIMetric } from '../services/AdvancedBIEngine';

interface BIMetricCardProps {
  metric: BIMetric;
  detailed?: boolean;
  className?: string;
}

export function BIMetricCard({ metric, detailed = false, className }: BIMetricCardProps) {
  const formatValue = (value: number, format: BIMetric['format']) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getTrendIcon = (trend: BIMetric['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: BIMetric['trend']) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: BIMetric['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getCategoryIcon = (category: BIMetric['category']) => {
    switch (category) {
      case 'financial':
        return '💰';
      case 'operational':
        return '⚙️';
      case 'performance':
        return '📈';
      case 'strategic':
        return '🎯';
      default:
        return '📊';
    }
  };

  const getTargetProgress = () => {
    if (!metric.target) return null;
    const progress = (metric.value / metric.target) * 100;
    return Math.min(progress, 100);
  };

  const isAtTarget = () => {
    if (!metric.target) return null;
    const tolerance = 0.05; // 5% tolerance
    const diff = Math.abs(metric.value - metric.target) / metric.target;
    return diff <= tolerance;
  };

  return (
    <Card className={`border-l-4 ${getPriorityColor(metric.priority)} ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getCategoryIcon(metric.category)}</span>
              <div>
                <h4 className="font-semibold text-sm">{metric.name}</h4>
                {detailed && (
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {metric.priority}
            </Badge>
          </div>

          {/* Main Value */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">
                {formatValue(metric.value, metric.format)}
              </div>
              {metric.previousValue && (
                <div className="flex items-center gap-1 text-sm">
                  {getTrendIcon(metric.trend)}
                  <span className={getTrendColor(metric.trend)}>
                    {metric.changePercent && (
                      <>
                        {metric.changePercent > 0 ? '+' : ''}
                        {metric.changePercent.toFixed(1)}%
                      </>
                    )}
                  </span>
                  <span className="text-muted-foreground">vs anterior</span>
                </div>
              )}
            </div>
            
            {/* Target Indicator */}
            {metric.target && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Meta: {formatValue(metric.target, metric.format)}
                </div>
                {isAtTarget() !== null && (
                  <div className="flex items-center gap-1 text-xs mt-1">
                    {isAtTarget() ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-green-600">En meta</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        <span className="text-orange-600">Fuera de meta</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress to Target */}
          {detailed && metric.target && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progreso a meta</span>
                <span>{getTargetProgress()?.toFixed(0)}%</span>
              </div>
              <Progress 
                value={getTargetProgress() || 0} 
                className="h-2"
              />
            </div>
          )}

          {/* Benchmark Comparison */}
          {detailed && metric.benchmark && (
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Benchmark:</span>
                <span className="font-medium">
                  {formatValue(metric.benchmark, metric.format)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Diferencia:</span>
                <span className={metric.value >= metric.benchmark ? 'text-green-600' : 'text-red-600'}>
                  {metric.value >= metric.benchmark ? '+' : ''}
                  {formatValue(metric.value - metric.benchmark, metric.format)}
                </span>
              </div>
            </div>
          )}

          {/* Change Details */}
          {detailed && metric.change && (
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cambio absoluto:</span>
                <span className={`font-medium ${getTrendColor(metric.trend)}`}>
                  {metric.change > 0 ? '+' : ''}
                  {formatValue(metric.change, metric.format)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BIMetricCard;