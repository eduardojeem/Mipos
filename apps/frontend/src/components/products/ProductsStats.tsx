'use client';

import React, { memo, useMemo } from 'react';
import { Package, AlertTriangle, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStatCard } from '@/components/dashboard/shared/DashboardStatCard';
import type { Product } from '@/types';

interface ProductsStatsProps {
  products: Product[];
  total: number;
  loading?: boolean;
  summary?: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalValue: number;
  };
}

const StatsSkeleton = memo(function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
});

export const ProductsStats = memo(function ProductsStats({
  products,
  total,
  loading = false,
  summary,
}: ProductsStatsProps) {
  const fallbackStats = useMemo(() => {
    if (loading || (!products && !total)) {
      return {
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalValue: 0,
        averagePrice: 0,
        lowStockPercentage: 0,
        outOfStockPercentage: 0,
      };
    }

    const totalProducts = total || products.length;

    const lowStockProducts = products.filter((product) => {
      const stock = product.stock_quantity || 0;
      const minStock = product.min_stock || 5;
      return stock > 0 && stock <= minStock;
    });

    const outOfStockProducts = products.filter((product) =>
      (product.stock_quantity || 0) === 0
    );

    const totalValue = products.reduce((sum, product) => {
      const stock = product.stock_quantity || 0;
      const price = product.cost_price || product.sale_price || 0;
      return sum + stock * price;
    }, 0);

    const averagePrice = products.length > 0
      ? products.reduce((sum, product) => sum + (product.sale_price || 0), 0) / products.length
      : 0;

    return {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      totalValue,
      averagePrice,
      lowStockPercentage: totalProducts > 0 ? (lowStockProducts.length / totalProducts) * 100 : 0,
      outOfStockPercentage: totalProducts > 0 ? (outOfStockProducts.length / totalProducts) * 100 : 0,
    };
  }, [loading, products, total]);

  const resolvedStats = summary ? {
    totalProducts: summary.totalProducts,
    lowStockCount: summary.lowStockProducts,
    outOfStockCount: summary.outOfStockProducts,
    totalValue: summary.totalValue,
    averagePrice: fallbackStats.averagePrice,
    lowStockPercentage: summary.totalProducts > 0
      ? (summary.lowStockProducts / summary.totalProducts) * 100
      : 0,
    outOfStockPercentage: summary.totalProducts > 0
      ? (summary.outOfStockProducts / summary.totalProducts) * 100
      : 0,
  } : fallbackStats;

  if (loading) {
    return <StatsSkeleton />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DashboardStatCard
        title="Total Productos"
        value={resolvedStats.totalProducts.toLocaleString()}
        description={`${products.length || 0} cargados en vista`}
        icon={Package}
        accent="from-violet-500 to-fuchsia-500"
        delay={0.1}
      />

      <DashboardStatCard
        title="Stock Bajo"
        value={resolvedStats.lowStockCount}
        description={`${resolvedStats.lowStockPercentage.toFixed(1)}% requiere reposición`}
        icon={AlertTriangle}
        accent={resolvedStats.lowStockCount > 0 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500'}
        delay={0.2}
      />

      <DashboardStatCard
        title="Sin Stock"
        value={resolvedStats.outOfStockCount}
        description={`${resolvedStats.outOfStockPercentage.toFixed(1)}% agotado totalmente`}
        icon={AlertTriangle}
        accent={resolvedStats.outOfStockCount > 0 ? 'from-red-500 to-pink-500' : 'from-emerald-500 to-teal-500'}
        delay={0.3}
      />

      <DashboardStatCard
        title="Valor Total Estimado"
        value={`Gs ${resolvedStats.totalValue.toLocaleString('es-PY')}`}
        description={`Precio promedio visible: Gs ${Math.round(resolvedStats.averagePrice).toLocaleString('es-PY')}`}
        icon={DollarSign}
        accent="from-blue-500 to-cyan-500"
        delay={0.4}
      />
    </div>
  );
});
