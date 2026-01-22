'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Award, Target, BarChart3, AlertTriangle } from 'lucide-react';
import type { PerformanceMetrics } from '../hooks/useSupplierAnalytics';

interface PerformanceMetricsGridProps {
  data: PerformanceMetrics;
  totalSuppliers: number;
  loading?: boolean;
}

export const PerformanceMetricsGrid = memo(function PerformanceMetricsGrid({
  data,
  totalSuppliers,
  loading = false,
}: PerformanceMetricsGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 bg-muted animate-pulse rounded mb-2" />
              <div className="h-2 w-full bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Excelente',
      value: data.excellent,
      percentage: (data.excellent / totalSuppliers) * 100,
      description: 'Score 90-100',
      icon: Award,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      progressColor: 'bg-green-500',
    },
    {
      title: 'Bueno',
      value: data.good,
      percentage: (data.good / totalSuppliers) * 100,
      description: 'Score 70-89',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      progressColor: 'bg-blue-500',
    },
    {
      title: 'Regular',
      value: data.average,
      percentage: (data.average / totalSuppliers) * 100,
      description: 'Score 50-69',
      icon: BarChart3,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      progressColor: 'bg-yellow-500',
    },
    {
      title: 'Deficiente',
      value: data.poor,
      percentage: (data.poor / totalSuppliers) * 100,
      description: 'Score 0-49',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      progressColor: 'bg-red-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Métricas de Rendimiento</h3>
        <div className="text-sm text-muted-foreground">
          Total: {totalSuppliers} proveedores
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className={`text-2xl font-bold ${metric.color}`}>
                  {metric.value}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Porcentaje</span>
                    <span className="font-medium">{metric.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={metric.percentage} 
                    className="h-2"
                  />
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Summary */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {((data.excellent + data.good) / totalSuppliers * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Alto Rendimiento</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {(data.average / totalSuppliers * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Rendimiento Regular</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {(data.poor / totalSuppliers * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Necesita Mejora</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {(((data.excellent + data.good) / totalSuppliers) * 100 / 100 * 5).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Score Promedio</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});