'use client';

import React, { memo, useMemo } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  Eye,
  Package,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { shouldBypassNextImageOptimizer } from '@/lib/images/next-image';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductsTableViewProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  loading?: boolean;
  selectedIds?: Set<string>;
  onSelectProduct?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
}

interface SortableHeaderProps {
  field: string;
  label: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  className?: string;
}

// ── Sortable header ──────────────────────────────────────────────────────────
const SortableHeader = memo(function SortableHeader({
  field, label, sortField, sortOrder, onSort, className,
}: SortableHeaderProps) {
  const isActive = sortField === field;

  const handleSort = () => {
    if (!onSort) return;
    onSort(field, isActive ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  return (
    <TableHead
      className={cn(
        'select-none whitespace-nowrap',
        onSort && 'cursor-pointer',
        className,
      )}
      onClick={handleSort}
    >
      <div className={cn(
        'flex items-center gap-1.5 transition-colors',
        onSort && 'hover:text-foreground',
        isActive ? 'text-primary' : 'text-muted-foreground',
      )}>
        <span className={isActive ? 'font-semibold text-foreground' : ''}>{label}</span>
        {onSort && (
          <span className="opacity-70">
            {isActive ? (
              sortOrder === 'asc'
                ? <ArrowUp className="h-3 w-3 text-primary" />
                : <ArrowDown className="h-3 w-3 text-primary" />
            ) : (
              <ArrowUpDown className="h-3 w-3" />
            )}
          </span>
        )}
      </div>
    </TableHead>
  );
});

// ── Loading skeleton ─────────────────────────────────────────────────────────
function TableLoadingSkeleton() {
  return (
    <div className="divide-y divide-border/40">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={cn('flex items-center gap-4 px-5 py-3', i % 2 === 0 && 'bg-muted/20')}>
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="hidden h-5 w-24 rounded-full sm:block" />
          <Skeleton className="hidden h-4 w-20 lg:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Margin indicator ─────────────────────────────────────────────────────────
function MarginIndicator({ sale, cost }: { sale: number; cost?: number }) {
  if (!cost || cost <= 0 || !sale) return null;
  const pct = Math.round(((sale - cost) / sale) * 100);
  const color =
    pct >= 40 ? 'text-emerald-600 dark:text-emerald-400'
    : pct >= 20 ? 'text-sky-600 dark:text-sky-400'
    : 'text-rose-600 dark:text-rose-400';

  return (
    <div className={cn('flex items-center gap-0.5 text-[11px] font-medium tabular-nums', color)}>
      <TrendingUp className="h-2.5 w-2.5" />
      {pct}%
    </div>
  );
}

// ── Product row ──────────────────────────────────────────────────────────────
const ProductRow = memo(function ProductRow({
  product, onEdit, onDelete, onView, isSelected, onSelect, index,
}: {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  index: number;
}) {
  const stock    = product.stock_quantity || 0;
  const minStock = product.min_stock || 5;
  const isLowStock   = stock > 0 && stock <= minStock;
  const isOutOfStock = stock === 0;

  const categoryName =
    typeof product.category === 'object'
      ? product.category?.name
      : undefined;

  const salePrice = product.sale_price || 0;
  const costPrice = product.cost_price || undefined;

  return (
    <TableRow
      className={cn(
        'group transition-colors duration-100',
        isSelected
          ? 'bg-primary/5 hover:bg-primary/8 dark:bg-primary/8'
          : index % 2 === 0
            ? 'bg-transparent hover:bg-muted/40'
            : 'bg-muted/15 hover:bg-muted/40',
      )}
    >
      {/* Checkbox */}
      <TableCell className="w-10 pr-0">
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(product.id)}
            aria-label={`Seleccionar ${product.name}`}
            className="transition-opacity group-hover:opacity-100"
          />
        )}
      </TableCell>

      {/* Thumbnail */}
      <TableCell className="w-14 py-2">
        <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-muted/60 ring-1 ring-border/40">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name || 'Producto'}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="44px"
              unoptimized={shouldBypassNextImageOptimizer(product.image_url)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
          {/* Status dot */}
          <span className={cn(
            'absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full ring-1 ring-card',
            product.is_active ? 'bg-emerald-500' : 'bg-slate-400',
          )} />
        </div>
      </TableCell>

      {/* Name + SKU */}
      <TableCell className="min-w-0 py-2">
        <div>
          <button
            className="max-w-[200px] truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
            onClick={() => onView?.(product)}
          >
            {product.name || 'Sin nombre'}
          </button>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {product.sku || <span className="italic opacity-60">sin SKU</span>}
          </div>
        </div>
      </TableCell>

      {/* Category */}
      <TableCell className="hidden sm:table-cell">
        {categoryName ? (
          <Badge
            variant="outline"
            className="rounded-lg border-border/60 bg-muted/40 text-[11px] font-normal text-foreground"
          >
            {categoryName}
          </Badge>
        ) : (
          <span className="text-[11px] italic text-muted-foreground/60">—</span>
        )}
      </TableCell>

      {/* Price */}
      <TableCell className="text-right">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold tabular-nums text-foreground">
            Gs {salePrice.toLocaleString('es-PY')}
          </div>
          {costPrice ? (
            <div className="flex items-center justify-end gap-1">
              <div className="text-[11px] tabular-nums text-muted-foreground line-through">
                {costPrice.toLocaleString('es-PY')}
              </div>
              <MarginIndicator sale={salePrice} cost={costPrice} />
            </div>
          ) : null}
        </div>
      </TableCell>

      {/* Stock */}
      <TableCell>
        {isOutOfStock ? (
          <Badge className="gap-1 rounded-lg border-rose-200 bg-rose-50 text-[11px] text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400" variant="outline">
            <AlertTriangle className="h-2.5 w-2.5" />
            Sin stock
          </Badge>
        ) : isLowStock ? (
          <Badge className="gap-1 rounded-lg border-amber-200 bg-amber-50 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400" variant="outline">
            <AlertTriangle className="h-2.5 w-2.5" />
            {stock} uds
          </Badge>
        ) : (
          <Badge className="rounded-lg border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" variant="outline">
            {stock} uds
          </Badge>
        )}
      </TableCell>

      {/* Estado */}
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            product.is_active ? 'bg-emerald-500' : 'bg-slate-400',
          )} />
          <span className={cn(
            'text-[11px] font-medium',
            product.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground',
          )}>
            {product.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </TableCell>

      {/* Acciones */}
      <TableCell className="w-28 py-2">
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView?.(product)}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            title="Ver detalles"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(product)}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
              title="Editar"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(product.id)}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

// ── Main component ───────────────────────────────────────────────────────────
export const ProductsTableView = memo(function ProductsTableView({
  products,
  onEdit,
  onDelete,
  onView,
  onSort,
  sortField,
  sortOrder,
  loading = false,
  selectedIds = new Set(),
  onSelectProduct,
  onSelectAll,
}: ProductsTableViewProps) {
  const allVisibleSelected = useMemo(() => {
    if (!products.length) return false;
    return products.every((p) => selectedIds.has(p.id));
  }, [products, selectedIds]);

  const someSelected = useMemo(() =>
    products.some((p) => selectedIds.has(p.id)), [products, selectedIds]);

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked ? products.map((p) => p.id) : []);
  };

  if (loading) return <TableLoadingSkeleton />;

  if (products.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
          <Package className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Sin resultados</h3>
          <p className="mt-1 text-sm text-muted-foreground">No se encontraron productos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 bg-muted/30 hover:bg-muted/30">
            {/* Select-all */}
            <TableHead className="w-10 pr-0">
              {onSelectAll && (
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todos"
                  data-state={someSelected && !allVisibleSelected ? 'indeterminate' : undefined}
                />
              )}
            </TableHead>

            {/* Img */}
            <TableHead className="w-14 text-xs font-medium text-muted-foreground">Img</TableHead>

            {/* Producto */}
            <SortableHeader
              field="name"
              label="Producto"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />

            {/* Categoría */}
            <TableHead className="hidden text-xs font-medium text-muted-foreground sm:table-cell">
              Categoría
            </TableHead>

            {/* Precio */}
            <SortableHeader
              field="sale_price"
              label="Precio"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
              className="text-right"
            />

            {/* Stock */}
            <SortableHeader
              field="stock_quantity"
              label="Stock"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />

            {/* Estado */}
            <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">
              Estado
            </TableHead>

            {/* Acciones */}
            <TableHead className="w-28 text-xs font-medium text-muted-foreground">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {products.map((product, index) => (
            <ProductRow
              key={product.id}
              product={product}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              isSelected={selectedIds.has(product.id)}
              onSelect={onSelectProduct}
              index={index}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
