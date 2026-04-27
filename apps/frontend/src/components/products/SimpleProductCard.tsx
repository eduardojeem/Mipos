'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { Package, Edit, Trash2, Eye, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface SimpleProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  priority?: boolean;
}

export const SimpleProductCard = memo(function SimpleProductCard({
  product,
  onEdit,
  onDelete,
  onView,
  priority = false,
}: SimpleProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const stock = product.stock_quantity || 0;
  const isLowStock = stock <= (product.min_stock || 5) && stock > 0;
  const isOutOfStock = stock === 0;
  const price = `Gs ${(product.sale_price || 0).toLocaleString('es-PY')}`;

  const imageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? typeof product.images[0] === 'string'
        ? product.images[0]
        : (product.images[0] as { url?: string })?.url || null
      : product.image_url || null;

  const categoryName =
    typeof product.category === 'object' && product.category?.name
      ? product.category.name
      : null;

  const stockBadgeClass = isOutOfStock
    ? 'bg-red-500/90 text-white border-red-600'
    : isLowStock
      ? 'bg-amber-400/90 text-amber-900 border-amber-500'
      : 'bg-emerald-500/90 text-white border-emerald-600';

  const stockLabel = isOutOfStock
    ? 'Sin stock'
    : isLowStock
      ? `${stock} uds ⚠`
      : `${stock} uds`;

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30">
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/60 via-muted/30 to-muted/10">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={product.name || 'Producto'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            loading={priority ? undefined : 'lazy'}
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/30 transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}

        {/* Stock badge — bottom left */}
        <div className="absolute bottom-2 left-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm',
              stockBadgeClass
            )}
          >
            {stockLabel}
          </span>
        </div>

        {/* Inactive overlay */}
        {!product.is_active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white/80">
              Inactivo
            </span>
          </div>
        )}

        {/* ── Hover action overlay ── */}
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-full bg-white/90 text-slate-900 shadow-md hover:bg-white"
            onClick={(e) => { e.preventDefault(); onView?.(product); }}
            title="Ver detalles"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-full bg-white/90 text-slate-900 shadow-md hover:bg-white"
            onClick={(e) => { e.preventDefault(); onEdit?.(product); }}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
            onClick={(e) => { e.preventDefault(); onDelete?.(product.id); }}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <CardContent className="space-y-1.5 p-3">
        <h3 className="min-h-[2.5rem] text-sm font-medium leading-snug text-foreground line-clamp-2">
          {product.name || 'Sin nombre'}
        </h3>

        <div className="flex items-center justify-between gap-1">
          <p className="text-base font-bold text-foreground">
            {price}
          </p>
          {product.sku && (
            <span className="truncate text-[11px] text-muted-foreground font-mono max-w-[80px]">
              {product.sku}
            </span>
          )}
        </div>

        {categoryName && (
          <div className="flex items-center gap-1 pt-0.5">
            <Tag className="h-2.5 w-2.5 text-muted-foreground/60" />
            <span className="text-[11px] text-muted-foreground truncate">{categoryName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.sku === nextProps.product.sku &&
    prevProps.product.is_active === nextProps.product.is_active &&
    prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
    prevProps.product.min_stock === nextProps.product.min_stock &&
    prevProps.product.sale_price === nextProps.product.sale_price &&
    JSON.stringify(prevProps.product.images) === JSON.stringify(nextProps.product.images) &&
    prevProps.product.image_url === nextProps.product.image_url &&
    prevProps.priority === nextProps.priority
  );
});
