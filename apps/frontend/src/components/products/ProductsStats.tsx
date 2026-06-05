'use client';

import React, { memo, useMemo } from 'react';
import { Package, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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

interface StatPillProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: 'default' | 'warning' | 'danger' | 'success' | 'info';
}

function StatPill({ icon: Icon, label, value, tone = 'default' }: StatPillProps) {
  const toneClass = {
    default: 'bg-muted/60 text-foreground',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    danger:  'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    info:    'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  }[tone];

  return (
    <div className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium', toneClass)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline text-[11px] opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export const ProductsStats = memo(function ProductsStats({
  products,
  total,
  loading = false,
  summary,
}: ProductsStatsProps) {
  const stats = useMemo(() => {
    const base = summary ?? null;

    const totalProducts = base?.totalProducts ?? total ?? products.length;

    const lowStock = base?.lowStockProducts ??
      products.filter((p) => {
        const s = p.stock_quantity || 0;
        return s > 0 && s <= (p.min_stock || 5);
      }).length;

    const outOfStock = base?.outOfStockProducts ??
      products.filter((p) => (p.stock_quantity || 0) === 0).length;

    const totalValue = base?.totalValue ??
      products.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.cost_price || 0), 0);

    const avgPrice = products.length > 0
      ? products.reduce((sum, p) => sum + (p.sale_price || 0), 0) / products.length
      : 0;

    return { totalProducts, lowStock, outOfStock, totalValue, avgPrice };
  }, [products, total, summary]);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[80, 60, 60, 90].map((w, i) => (
          <Skeleton key={i} className={`h-7 rounded-lg`} style={{ width: w }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatPill
        icon={Package}
        label="Productos"
        value={stats.totalProducts.toLocaleString()}
        tone="default"
      />
      {stats.outOfStock > 0 && (
        <StatPill
          icon={AlertTriangle}
          label="Sin stock"
          value={stats.outOfStock}
          tone="danger"
        />
      )}
      {stats.lowStock > 0 && (
        <StatPill
          icon={TrendingDown}
          label="Stock bajo"
          value={stats.lowStock}
          tone="warning"
        />
      )}
      {stats.outOfStock === 0 && stats.lowStock === 0 && (
        <StatPill
          icon={Package}
          label="Stock"
          value="OK"
          tone="success"
        />
      )}
      <StatPill
        icon={DollarSign}
        label="Valor"
        value={`Gs ${Math.round(stats.totalValue / 1_000_000)}M`}
        tone="info"
      />
    </div>
  );
});
