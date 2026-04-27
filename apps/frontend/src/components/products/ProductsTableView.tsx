'use client';

import React, { memo, useMemo } from 'react';
import Image from 'next/image';
import {
  Package,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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

const SortableHeader = memo(function SortableHeader({
  field,
  label,
  sortField,
  sortOrder,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = sortField === field;

  const handleSort = () => {
    if (!onSort) return;
    onSort(field, isActive ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  return (
    <TableHead
      className={cn('cursor-pointer select-none', className)}
      onClick={handleSort}
    >
      <div className="flex items-center gap-1 hover:text-foreground transition-colors">
        <span>{label}</span>
        {onSort && (
          <span className="text-muted-foreground">
            {isActive ? (
              sortOrder === 'asc' ? (
                <ArrowUp className="h-3 w-3 text-primary" />
              ) : (
                <ArrowDown className="h-3 w-3 text-primary" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3" />
            )}
          </span>
        )}
      </div>
    </TableHead>
  );
});

function TableLoadingSkeleton() {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg px-4 py-2"
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

const ProductRow = memo(function ProductRow({
  product,
  onEdit,
  onDelete,
  onView,
  isSelected,
  onSelect,
}: {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const stock = product.stock_quantity || 0;
  const minStock = product.min_stock || 5;
  const isLowStock = stock > 0 && stock <= minStock;
  const isOutOfStock = stock === 0;

  const categoryName =
    typeof product.category === 'object'
      ? product.category?.name
      : 'Sin categoría';

  return (
    <TableRow
      className={cn(
        'group transition-colors duration-100',
        isSelected
          ? 'bg-primary/5 hover:bg-primary/8'
          : 'hover:bg-muted/40'
      )}
    >
      <TableCell className="w-10">
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(product.id)}
            aria-label={`Seleccionar ${product.name}`}
          />
        )}
      </TableCell>

      <TableCell className="w-14">
        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name || 'Producto'}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-0.5">
          <div className="max-w-[220px] truncate text-sm font-medium">
            {product.name || 'Sin nombre'}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {product.sku || '—'}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant="outline" className="text-xs">
          {categoryName || 'Sin categoría'}
        </Badge>
      </TableCell>

      <TableCell className="text-right">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold tabular-nums">
            Gs {(product.sale_price || 0).toLocaleString('es-PY')}
          </div>
          {product.cost_price ? (
            <div className="text-xs tabular-nums text-muted-foreground">
              Costo: Gs {product.cost_price.toLocaleString('es-PY')}
            </div>
          ) : null}
        </div>
      </TableCell>

      <TableCell>
        {isOutOfStock ? (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Sin stock
          </Badge>
        ) : isLowStock ? (
          <Badge
            variant="secondary"
            className="gap-1 border-amber-200 bg-amber-50 text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
          >
            <AlertTriangle className="h-3 w-3" />
            {stock} uds bajo
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
          >
            {stock} uds
          </Badge>
        )}
      </TableCell>

      <TableCell>
        <Badge
          variant={product.is_active ? 'default' : 'secondary'}
          className={cn(
            'text-xs',
            product.is_active
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
              : ''
          )}
        >
          {product.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView?.(product)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Ver detalles"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit?.(product)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Editar"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete?.(product.id)}
            className="h-7 w-7 text-destructive/70 hover:text-destructive"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

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

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked ? products.map((p) => p.id) : []);
  };

  if (loading) return <TableLoadingSkeleton />;

  if (products.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <h3 className="mb-1 text-lg font-semibold">No hay productos</h3>
        <p className="text-sm text-muted-foreground">
          No se encontraron productos para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-10">
              {onSelectAll ? (
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todos"
                />
              ) : null}
            </TableHead>
            <TableHead className="w-14">Img.</TableHead>
            <SortableHeader
              field="name"
              label="Producto"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <TableHead>Categoría</TableHead>
            <SortableHeader
              field="sale_price"
              label="Precio"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
              className="text-right"
            />
            <SortableHeader
              field="stock_quantity"
              label="Stock"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <TableHead>Estado</TableHead>
            <TableHead className="w-28">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              isSelected={selectedIds.has(product.id)}
              onSelect={onSelectProduct}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
