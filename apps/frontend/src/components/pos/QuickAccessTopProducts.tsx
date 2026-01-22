"use client";
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Flame } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface QuickAccessTopProductsProps {
  products: Product[];
  onQuickAdd: (product: Product) => void;
}

export default function QuickAccessTopProducts({ products, onQuickAdd }: QuickAccessTopProductsProps) {
  const { data, loading } = useDashboardData({ enableRealtime: false, refreshInterval: 60000 });

  const topProducts = useMemo(() => {
    const tops = data?.topProducts || [];
    // Mapear por ID a productos completos del catálogo para obtener imagen y stock
    const byId = new Map(products.map(p => [p.id, p]));
    return tops
      .map(tp => byId.get(tp.id))
      .filter(Boolean)
      .slice(0, 10) as Product[];
  }, [data?.topProducts, products]);

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-2">
        <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  if (!topProducts.length) return null;

  return (
    <div className="px-3 sm:px-4 py-2 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium">Más vendidos</span>
          <Badge variant="secondary" className="text-xs">{topProducts.length}</Badge>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {topProducts.map(p => (
          <Card key={p.id} className="flex-shrink-0 w-[160px] p-2">
            <button
              className="w-full text-left"
              onClick={() => onQuickAdd(p)}
              aria-label={`Agregar rápido ${p.name}`}
            >
              <div className="relative w-full aspect-square bg-gray-50 rounded-md flex items-center justify-center">
                {p.images && p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain rounded-md" />
                ) : (
                  <Package className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <div className="mt-2 text-sm font-medium truncate">{p.name}</div>
              {typeof p.sale_price === 'number' && (
                <div className="text-xs text-muted-foreground">{formatCurrency(p.sale_price)}</div>
              )}
              {typeof p.stock_quantity === 'number' && (
                <div className="mt-1">
                  <Badge variant={p.stock_quantity > 0 ? 'outline' : 'destructive'} className="text-xs">
                    {p.stock_quantity > 0 ? `Stock: ${p.stock_quantity}` : 'Sin stock'}
                  </Badge>
                </div>
              )}
              <div className="mt-2">
                <Button type="button" size="sm" className="w-full">Agregar</Button>
              </div>
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}