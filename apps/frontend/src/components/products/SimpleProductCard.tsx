'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { Edit, Eye, Lock, MoreVertical, Package, ShoppingBag, Trash2 } from 'lucide-react';
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
import { shouldBypassNextImageOptimizer } from '@/lib/images/next-image';
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

// ── Margin badge (ganancia estimada) ────────────────────────────────────────
function MarginBadge({ salePrice, costPrice }: { salePrice: number; costPrice?: number }) {
  if (!costPrice || costPrice <= 0 || !salePrice) return null;
  const margin = Math.round(((salePrice - costPrice) / salePrice) * 100);
  const color =
    margin >= 40 ? 'bg-emerald-500/90 text-white'
    : margin >= 20 ? 'bg-sky-500/90 text-white'
    : 'bg-rose-500/90 text-white';
  return (
    <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-tight backdrop-blur-sm', color)}>
      {margin}% mg
    </span>
  );
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

  const stock    = Number(product.stock_quantity || 0);
  const minStock = Number(product.min_stock || 5);
  const isLowStock   = stock > 0 && stock <= minStock;
  const isOutOfStock = stock === 0;
  const imageUrl = getImageUrl(product);

  const categoryName =
    typeof product.category === 'object' && product.category?.name
      ? product.category.name
      : null;

  // Stock indicators
  const stockColor = isOutOfStock
    ? 'bg-rose-500/95 text-white'
    : isLowStock
      ? 'bg-amber-400/95 text-amber-950'
      : 'bg-emerald-500/95 text-white';

  const stockLabel = isOutOfStock
    ? 'Sin stock'
    : isLowStock
      ? `${stock} uds ⚠`
      : `${stock} uds`;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground',
        'shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/8',
        isSelected
          ? 'border-primary/70 ring-2 ring-primary/25 shadow-primary/10'
          : 'border-border/50 hover:border-border/80',
        !product.is_active && 'opacity-55',
      )}
    >
      {/* ── Image area ─────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onView?.(product)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView?.(product); } }}
        className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-label={`Ver ${product.name || 'producto'}`}
      >
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={product.name || 'Producto'}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
            loading={priority ? undefined : 'lazy'}
            priority={priority}
            unoptimized={shouldBypassNextImageOptimizer(imageUrl)}
          />
        ) : (
          <ProductImagePlaceholder productName={product.name} className="rounded-none border-0" compact />
        )}

        {/* Gradient velo bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Stock pill — bottom left */}
        <span className={cn(
          'absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm shadow-sm',
          stockColor,
        )}>
          {stockLabel}
        </span>

        {/* Margin badge — bottom right */}
        <span className="absolute bottom-2 right-2">
          <MarginBadge salePrice={product.sale_price || 0} costPrice={product.cost_price} />
        </span>

        {/* Privado badge — top right (solo si está activo pero no es público) */}
        {product.is_active && product.is_public === false && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Lock className="h-2.5 w-2.5" />
            Privado
          </span>
        )}

        {/* Inactivo overlay */}
        {!product.is_active && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm">
              INACTIVO
            </span>
          </div>
        )}

        {/* Checkbox — top left */}
        {onSelect && (
          <div
            className={cn(
              'absolute left-2 top-2 transition-all duration-150',
              isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100',
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(product.id)}
              aria-label={`Seleccionar ${product.name}`}
              className="h-5 w-5 rounded-lg border-2 border-white/90 bg-black/30 shadow-sm data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
          </div>
        )}

        {/* Quick-view overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/10">
          <span className={cn(
            'flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-sm',
            'translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100',
          )}>
            <Eye className="h-3.5 w-3.5" />
            Ver detalle
          </span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">

        {/* Name + menu */}
        <div className="flex items-start justify-between gap-1">
          <h3 className="line-clamp-2 min-h-[2.5rem] flex-1 text-sm font-semibold leading-snug text-foreground">
            {product.name || 'Sin nombre'}
          </h3>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100"
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

        {/* Price row */}
        <div className="flex items-baseline justify-between gap-1">
          <p className="text-base font-bold tabular-nums text-foreground">
            {formatPrice(product.sale_price || 0)}
          </p>
          {product.cost_price ? (
            <p className="text-[11px] tabular-nums text-muted-foreground line-through">
              {formatPrice(product.cost_price)}
            </p>
          ) : null}
        </div>

        {/* Category + SKU */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
          {categoryName ? (
            <span className="truncate rounded-md bg-muted/70 px-1.5 py-0.5 font-medium">
              {categoryName}
            </span>
          ) : (
            <span className="italic opacity-60">Sin categoría</span>
          )}
          {product.sku && (
            <span className="shrink-0 font-mono opacity-70">{product.sku}</span>
          )}
        </div>

        {/* Edit CTA */}
        {onEdit && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-0.5 h-7 w-full gap-1.5 text-xs opacity-0 transition-all duration-150 group-hover:opacity-100"
            onClick={() => onEdit(product)}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Editar producto
          </Button>
        )}
      </div>
    </article>
  );
}, (prev, next) =>
  prev.product.id === next.product.id &&
  prev.product.name === next.product.name &&
  prev.product.sku === next.product.sku &&
  prev.product.is_active === next.product.is_active &&
  prev.product.is_public === next.product.is_public &&
  prev.product.stock_quantity === next.product.stock_quantity &&
  prev.product.min_stock === next.product.min_stock &&
  prev.product.sale_price === next.product.sale_price &&
  prev.product.cost_price === next.product.cost_price &&
  prev.product.image_url === next.product.image_url &&
  JSON.stringify(prev.product.images) === JSON.stringify(next.product.images) &&
  prev.priority === next.priority &&
  prev.isSelected === next.isSelected
);
