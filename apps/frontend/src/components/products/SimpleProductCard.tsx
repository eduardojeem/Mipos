'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { Edit, Eye, MoreVertical, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProductImagePlaceholder } from '@/components/products/ProductImagePlaceholder';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface SimpleProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  priority?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

function getImageUrl(product: Product) {
  if (product.image_url) return product.image_url;
  if (!Array.isArray(product.images) || product.images.length === 0) return null;
  const first = product.images[0];
  return typeof first === 'string' ? first : (first as { url?: string })?.url || null;
}

function formatPrice(n: number) {
  return `Gs ${n.toLocaleString('es-PY')}`;
}

export const SimpleProductCard = memo(function SimpleProductCard({
  product,
  onEdit,
  onDelete,
  onView,
  priority = false,
  isSelected = false,
  onSelect,
}: SimpleProductCardProps) {
  const [imgError, setImgError] = useState(false);

  const stock   = Number(product.stock_quantity || 0);
  const minStock = Number(product.min_stock || 5);
  const isLowStock   = stock > 0 && stock <= minStock;
  const isOutOfStock = stock === 0;
  const imageUrl = getImageUrl(product);

  const categoryName =
    typeof product.category === 'object' && product.category?.name
      ? product.category.name
      : null;

  // Stock pill
  const stockPillClass = isOutOfStock
    ? 'bg-red-500/90 text-white'
    : isLowStock
      ? 'bg-amber-400/90 text-amber-950'
      : 'bg-emerald-500/90 text-white';

  const stockText = isOutOfStock
    ? 'Sin stock'
    : `${stock} uds${isLowStock ? ' ⚠' : ''}`;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        isSelected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border/60 hover:border-border',
        !product.is_active && 'opacity-60',
      )}
    >
      {/* ── Image ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onView?.(product)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onView?.(product);
          }
        }}
        className="relative block aspect-square w-full overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-label={`Ver ${product.name || 'producto'}`}
      >
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={product.name || 'Producto'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading={priority ? undefined : 'lazy'}
            priority={priority}
          />
        ) : (
          <ProductImagePlaceholder productName={product.name} className="rounded-none border-0" compact />
        )}

        {/* Gradient overlay bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Stock pill — bottom left */}
        <span className={cn(
          'absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm',
          stockPillClass,
        )}>
          {stockText}
        </span>

        {/* Inactivo badge */}
        {!product.is_active && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/80">
            Inactivo
          </span>
        )}

        {/* Checkbox — top left, visible on hover or selected */}
        {onSelect && (
          <div
            className={cn(
              'absolute left-2 top-2 transition-opacity',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(product.id)}
              aria-label={`Seleccionar ${product.name}`}
              className="h-5 w-5 rounded-lg border-2 border-white/80 bg-black/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
            />
          </div>
        )}

        {/* Quick-view button — center on hover */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center',
          'opacity-0 transition-opacity group-hover:opacity-100',
        )}>
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-md backdrop-blur-sm">
            <Eye className="mr-1.5 inline h-3.5 w-3.5" />
            Ver detalle
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Name + menu */}
        <div className="flex items-start justify-between gap-1">
          <h3 className="line-clamp-2 min-h-[2.5rem] flex-1 text-sm font-semibold leading-snug text-foreground">
            {product.name || 'Sin nombre'}
          </h3>

          {/* Menú de acciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onView?.(product)}>
                <Eye className="mr-2 h-4 w-4" /> Ver detalle
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(product.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Price */}
        <p className="text-base font-bold tabular-nums text-foreground">
          {formatPrice(product.sale_price || 0)}
        </p>

        {/* Category + SKU row */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
          {categoryName ? (
            <span className="truncate rounded-md bg-muted/60 px-1.5 py-0.5">
              {categoryName}
            </span>
          ) : (
            <span className="italic">Sin categoría</span>
          )}
          {product.sku && (
            <span className="shrink-0 font-mono">{product.sku}</span>
          )}
        </div>

        {/* Edit button — full width, appears on hover */}
        {onEdit && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-1 w-full gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 text-xs h-7"
            onClick={() => onEdit(product)}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Editar producto
          </Button>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.product.id === next.product.id &&
  prev.product.name === next.product.name &&
  prev.product.sku === next.product.sku &&
  prev.product.is_active === next.product.is_active &&
  prev.product.stock_quantity === next.product.stock_quantity &&
  prev.product.min_stock === next.product.min_stock &&
  prev.product.sale_price === next.product.sale_price &&
  prev.product.image_url === next.product.image_url &&
  JSON.stringify(prev.product.images) === JSON.stringify(next.product.images) &&
  prev.priority === next.priority &&
  prev.isSelected === next.isSelected
);
