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
  onRestore?: (id: string) => void;
  showDeleted?: boolean;
  loading?: boolean;
  selectedIds?: Set<string>;
  onSelectProduct?: (id: string) => void;
}

const ProductSkeletonGrid = memo(function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border/40 bg-card">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="space-y-2.5 p-3.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3.5 w-12" />
            </div>
            <Skeleton className="h-6 w-full rounded-lg" />
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
  onRestore,
  showDeleted = false,
  loading = false,
  selectedIds,
  onSelectProduct,
}: SimpleProductListProps) {
  if (loading) {
    return <ProductSkeletonGrid />;
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
          onRestore={onRestore}
          showDeleted={showDeleted}
          priority={index < 8}
          isSelected={selectedIds?.has(product.id)}
          onSelect={onSelectProduct}
        />
      ))}
    </div>
  );
});
