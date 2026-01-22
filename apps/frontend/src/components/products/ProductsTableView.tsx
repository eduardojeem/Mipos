'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { 
  Package, 
  Edit, 
  Trash2, 
  Eye, 
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  className
}: SortableHeaderProps) {
  const isActive = sortField === field;
  
  const handleSort = () => {
    if (!onSort) return;
    
    if (isActive) {
      // Toggle order if same field
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to asc for new field
      onSort(field, 'asc');
    }
  };

  return (
    <TableHead className={cn('cursor-pointer select-none', className)}>
      <div 
        className="flex items-center space-x-1 hover:text-foreground transition-colors"
        onClick={handleSort}
      >
        <span>{label}</span>
        {onSort && (
          <div className="flex flex-col">
            {isActive ? (
              sortOrder === 'asc' ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    </TableHead>
  );
});

const ProductRow = memo(function ProductRow({
  product,
  onEdit,
  onDelete,
  onView,
  isSelected,
  onSelect
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
  
  const getStockBadge = () => {
    if (isOutOfStock) {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Sin stock
      </Badge>;
    }
    if (isLowStock) {
      return <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Stock bajo
      </Badge>;
    }
    return <Badge variant="default">{stock}</Badge>;
  };

  const categoryName = typeof product.category === 'object' 
    ? product.category?.name 
    : 'Sin categoría';

  return (
    <TableRow className={cn(
      'hover:bg-muted/50 transition-colors',
      isSelected && 'bg-muted/30'
    )}>
      {/* Checkbox */}
      <TableCell className="w-12">
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(product.id)}
          />
        )}
      </TableCell>

      {/* Imagen */}
      <TableCell className="w-16">
        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name || 'Product'}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
        </div>
      </TableCell>

      {/* Nombre y SKU */}
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium text-sm line-clamp-1">
            {product.name || 'Sin nombre'}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            SKU: {product.sku || 'N/A'}
          </div>
        </div>
      </TableCell>

      {/* Categoría */}
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {categoryName}
        </Badge>
      </TableCell>

      {/* Precio */}
      <TableCell className="text-right">
        <div className="space-y-1">
          <div className="font-semibold">
            Gs {(product.sale_price || 0).toLocaleString('es-PY')}
          </div>
          {product.cost_price && (
            <div className="text-xs text-muted-foreground">
              Costo: Gs {product.cost_price.toLocaleString('es-PY')}
            </div>
          )}
        </div>
      </TableCell>

      {/* Stock */}
      <TableCell>
        {getStockBadge()}
      </TableCell>

      {/* Estado */}
      <TableCell>
        <Badge variant={product.is_active ? 'default' : 'secondary'}>
          {product.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      </TableCell>

      {/* Acciones */}
      <TableCell>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView?.(product)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(product)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(product.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
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
  onSelectAll
}: ProductsTableViewProps) {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (onSelectAll) {
      onSelectAll(checked ? products.map(p => p.id) : []);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
        <p className="text-sm text-muted-foreground">
          No se encontraron productos para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              {onSelectAll && (
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
              )}
            </TableHead>
            <TableHead className="w-16">Imagen</TableHead>
            <SortableHeader
              field="name"
              label="Producto"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader
              field="category"
              label="Categoría"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />
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
            <TableHead className="w-32">Acciones</TableHead>
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