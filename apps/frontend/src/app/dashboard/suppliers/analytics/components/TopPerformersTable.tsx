'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, Award, Star } from 'lucide-react';
import type { SupplierWithMetrics } from '../hooks/useSupplierAnalytics';

interface TopPerformersTableProps {
  data: SupplierWithMetrics[];
  loading?: boolean;
  onViewDetails?: (supplier: SupplierWithMetrics) => void;
}

export const TopPerformersTable = memo(function TopPerformersTable({
  data,
  loading = false,
  onViewDetails,
}: TopPerformersTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mejores Proveedores</CardTitle>
          <CardDescription>Top 10 proveedores por rendimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-2 w-20 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, label: 'Excelente', icon: Award };
    if (score >= 70) return { variant: 'secondary' as const, label: 'Bueno', icon: Star };
    if (score >= 50) return { variant: 'outline' as const, label: 'Regular', icon: TrendingUp };
    return { variant: 'destructive' as const, label: 'Deficiente', icon: TrendingUp };
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const topSuppliers = data.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Mejores Proveedores
            </CardTitle>
            <CardDescription>
              Top {topSuppliers.length} proveedores por rendimiento y volumen
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topSuppliers.map((supplier, index) => {
            const performanceBadge = getPerformanceBadge(supplier.performanceScore);
            const PerformanceIcon = performanceBadge.icon;
            
            return (
              <div 
                key={supplier.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Ranking */}
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {supplier.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Supplier Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{supplier.name}</h3>
                      <Badge variant={performanceBadge.variant} className="text-xs">
                        <PerformanceIcon className="w-3 h-3 mr-1" />
                        {performanceBadge.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{supplier.totalOrders} órdenes</span>
                      <span>•</span>
                      <span>{formatCurrency(supplier.totalPurchases)}</span>
                      <span>•</span>
                      <span>Promedio: {formatCurrency(supplier.averageOrderValue)}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Score */}
                <div className="flex items-center space-x-4">
                  <div className="text-right min-w-0">
                    <div className="text-sm font-medium mb-1">
                      Score: {supplier.performanceScore}
                    </div>
                    <Progress 
                      value={supplier.performanceScore} 
                      className="w-20 h-2"
                    />
                  </div>

                  {/* Actions */}
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(supplier)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {data.length > 10 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              Ver todos los proveedores ({data.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});