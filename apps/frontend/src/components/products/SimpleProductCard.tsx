'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Edit, Eye, PackageCheck, PackageX, Tag, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductImagePlaceholder } from '@/components/products/ProductImagePlaceholder';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface SimpleProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  priority?: boolean;
}

function getImageUrl(product: Product) {
  if (product.image_url) return product.image_url;

  if (!Array.isArray(product.images) || product.images.length === 0) {
    return null;
  }

  const firstImage = product.images[0];
  return typeof firstImage === 'string'
    ? firstImage
    : (firstImage as { url?: string })?.url || null;
}

export const SimpleProductCard = memo(function SimpleProductCard({
  product,
  onEdit,
  onDelete,
  onView,
  priority = false,
}: SimpleProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const stock = Number(product.stock_quantity || 0);
  const minStock = Number(product.min_stock || 5);
  const isLowStock = stock <= minStock && stock > 0;
  const isOutOfStock = stock === 0;
  const price = `Gs ${(product.sale_price || 0).toLocaleString('es-PY')}`;
  const stockRatio = Math.min(100, Math.round((stock / Math.max(minStock * 2, 1)) * 100));
  const imageUrl = getImageUrl(product);

  const categoryName =
    typeof product.category === 'object' && product.category?.name
      ? product.category.name
      : null;

  const stockToneClass = isOutOfStock
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300'
    : isLowStock
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300';

  const stockBarClass = isOutOfStock
    ? 'bg-red-500'
    : isLowStock
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const stockLabel = isOutOfStock ? 'Sin stock' : isLowStock ? 'Stock bajo' : 'Disponible';
  const StockIcon = isOutOfStock ? PackageX : isLowStock ? AlertTriangle : PackageCheck;

  return (
    <Card className="group relative flex h-full overflow-hidden border-border/70 bg-card shadow-sm transition-colors hover:border-primary/35 hover:shadow-md">
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onView?.(product); }}
          className="relative block aspect-[4/3] w-full overflow-hidden bg-muted/40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`Ver detalles de ${product.name || 'producto'}`}
        >
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={product.name || 'Producto'}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              onError={() => setImgError(true)}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              loading={priority ? undefined : 'lazy'}
              priority={priority}
            />
          ) : (
            <ProductImagePlaceholder productName={product.name} className="rounded-none border-0" compact />
          )}

          <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm',
                stockToneClass
              )}
            >
              <StockIcon className="h-3 w-3" />
              {stockLabel}
            </span>
            {!product.is_active && (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Inactivo
              </span>
            )}
          </div>
        </button>

        <CardContent className="flex flex-1 flex-col gap-3 p-3">
          <div className="space-y-1.5">
            <h3 className="min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground line-clamp-2">
              {product.name || 'Sin nombre'}
            </h3>

            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-lg font-bold tabular-nums text-foreground">
                {price}
              </p>
              {product.sku && (
                <span className="max-w-[96px] truncate rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {product.sku}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Stock</span>
              <span className="font-medium tabular-nums text-foreground">{stock} uds</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', stockBarClass)}
                style={{ width: `${isOutOfStock ? 100 : Math.max(stockRatio, 8)}%` }}
              />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-2">
            <div className="min-w-0">
              {categoryName ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Tag className="h-3 w-3 shrink-0" />
                  <span className="truncate">{categoryName}</span>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">Sin categoria</span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => { e.preventDefault(); onView?.(product); }}
                title="Ver detalles"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => { e.preventDefault(); onEdit?.(product); }}
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => { e.preventDefault(); onDelete?.(product.id); }}
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
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
