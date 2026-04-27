'use client';

import React, { memo } from 'react';
import { SimpleProductCard } from './SimpleProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import type { Product } from '@/types';

interface SimpleProductListProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  loading?: boolean;
}

const ProductSkeltonGrid = memo(function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-border/40">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
});

export const SimpleProductList = memo(function SimpleProductList({
  products,
  onEdit,
  onDelete,
  onView,
  loading = false,
}: SimpleProductListProps) {
  if (loading) {
    return <ProductSkeltonGrid />;
  }

  if (products.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <Package className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <h3 className="mb-1 text-lg font-semibold">No hay productos</h3>
        <p className="text-sm text-muted-foreground">
          No se encontraron productos para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {products.map((product, index) => (
        <SimpleProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          priority={index < 6}
        />
      ))}
    </div>
  );
});