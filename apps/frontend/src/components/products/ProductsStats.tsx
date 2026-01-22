'use client';

import React, { memo, useMemo } from 'react';
import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types';

interface ProductsStatsProps {
  products: Product[];
  total: number;
  loading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default'
}: StatCardProps) {
  const cardClasses = {
    default: 'border-border/40 bg-card/50',
    success: 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20',
    warning: 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20',
    destructive: 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
  };
  
  const iconClasses = {
    default: 'text-muted-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    destructive: 'text-red-600 dark:text-red-400'
  };
  
  return (
    <Card className={`${cardClasses[variant]} backdrop-blur-sm transition-all duration-200 hover:shadow-md`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconClasses[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center space-x-1">
              <Badge 
                variant={trend.isPositive ? 'default' : 'secondary'}
                className="text-xs"
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs mes anterior</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

const StatsSkeleton = memo(function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border/40 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted rounded animate-pulse mb-1" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

export const ProductsStats = memo(function ProductsStats({
  products,
  total,
  loading = false
}: ProductsStatsProps) {
  
  const stats = useMemo(() => {
    if (loading || products.length === 0) {
      return {
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalValue: 0,
        averagePrice: 0,
        lowStockPercentage: 0,
        outOfStockPercentage: 0
      };
    }
    
    const totalProducts = total || products.length;
    
    // Calculate stock-related stats
    const lowStockProducts = products.filter(p => {
      const stock = p.stock_quantity || 0;
      const minStock = p.min_stock || 5;
      return stock > 0 && stock <= minStock;
    });
    
    const outOfStockProducts = products.filter(p => 
      (p.stock_quantity || 0) === 0
    );
    
    // Calculate value stats
    const totalValue = products.reduce((sum, p) => {
      const stock = p.stock_quantity || 0;
      const price = p.cost_price || p.sale_price || 0;
      return sum + (stock * price);
    }, 0);
    
    const averagePrice = products.length > 0 
      ? products.reduce((sum, p) => sum + (p.sale_price || 0), 0) / products.length
      : 0;
    
    const lowStockPercentage = totalProducts > 0 
      ? (lowStockProducts.length / totalProducts) * 100 
      : 0;
    
    const outOfStockPercentage = totalProducts > 0 
      ? (outOfStockProducts.length / totalProducts) * 100 
      : 0;
    
    return {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      totalValue,
      averagePrice,
      lowStockPercentage,
      outOfStockPercentage
    };
  }, [products, total, loading]);
  
  if (loading) {
    return <StatsSkeleton />;
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Products */}
      <StatCard
        title="Total Productos"
        value={stats.totalProducts.toLocaleString()}
        subtitle={`${products.length} cargados`}
        icon={Package}
        variant="default"
      />
      
      {/* Low Stock */}
      <StatCard
        title="Stock Bajo"
        value={stats.lowStockCount}
        subtitle={`${stats.lowStockPercentage.toFixed(1)}% del total`}
        icon={AlertTriangle}
        variant={stats.lowStockCount > 0 ? 'warning' : 'success'}
      />
      
      {/* Out of Stock */}
      <StatCard
        title="Sin Stock"
        value={stats.outOfStockCount}
        subtitle={`${stats.outOfStockPercentage.toFixed(1)}% del total`}
        icon={AlertTriangle}
        variant={stats.outOfStockCount > 0 ? 'destructive' : 'success'}
      />
      
      {/* Total Value */}
      <StatCard
        title="Valor Total"
        value={`Gs ${stats.totalValue.toLocaleString('es-PY')}`}
        subtitle={`Promedio: Gs ${stats.averagePrice.toLocaleString('es-PY')}`}
        icon={DollarSign}
        variant="default"
      />
    </div>
  );
});