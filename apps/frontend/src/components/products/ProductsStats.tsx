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
    default: 'border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/80 to-fuchsia-50/80 dark:from-violet-950/30 dark:to-fuchsia-950/30 backdrop-blur-sm',
    success: 'border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50/90 to-teal-50/90 dark:from-emerald-950/40 dark:to-teal-950/40 backdrop-blur-sm shadow-emerald-500/10',
    warning: 'border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50/90 to-orange-50/90 dark:from-amber-950/40 dark:to-orange-950/40 backdrop-blur-sm shadow-amber-500/10',
    destructive: 'border-red-300 dark:border-red-700 bg-gradient-to-br from-red-50/90 to-pink-50/90 dark:from-red-950/40 dark:to-pink-950/40 backdrop-blur-sm shadow-red-500/10'
  };

  const iconClasses = {
    default: 'text-violet-600 dark:text-violet-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    destructive: 'text-red-600 dark:text-red-400'
  };

  const valueClasses = {
    default: 'text-violet-900 dark:text-violet-100',
    success: 'text-emerald-900 dark:text-emerald-100',
    warning: 'text-amber-900 dark:text-amber-100',
    destructive: 'text-red-900 dark:text-red-100'
  };

  return (
    <Card className={`${cardClasses[variant]} transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${variant === 'default' ? 'bg-violet-100 dark:bg-violet-900/50' :
            variant === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/50' :
              variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/50' :
                'bg-red-100 dark:bg-red-900/50'
          }`}>
          <Icon className={`h-5 w-5 ${iconClasses[variant]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className={`text-2xl font-bold ${valueClasses[variant]}`}>{value}</div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center space-x-1">
              <Badge
                variant={trend.isPositive ? 'default' : 'secondary'}
                className={`text-xs ${trend.isPositive
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
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