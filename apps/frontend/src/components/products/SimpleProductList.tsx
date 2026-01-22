'use client';

import React, { memo } from 'react';
import { SimpleProductCard } from './SimpleProductCard';
import { Package } from 'lucide-react';
import type { Product } from '@/types';

interface SimpleProductListProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  loading?: boolean;
}

const ProductSkeleton = memo(function ProductSkeleton() {
  return (
    <div className="aspect-square bg-muted animate-pulse rounded-lg" />
  );
});

export const SimpleProductList = memo(function SimpleProductList({
  products,
  onEdit,
  onDelete,
  onView,
  loading = false
}: SimpleProductListProps) {

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
        <p className="text-sm text-muted-foreground">
          No se encontraron productos para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {products.map((product, index) => (
        <SimpleProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          priority={index < 4}
        />
      ))}
    </div>
  );
});