'use client';

import React, { memo, useCallback, useState } from 'react';
import { Search, RefreshCw, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface ProductsFiltersProps {
  filters: {
    search?: string;
    categoryId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isActive?: boolean;
  };
  onFilterChange: (filters: Partial<ProductsFiltersProps['filters']>) => void;
  onRefresh: () => void;
  categories?: Array<{ id: string; name: string }>;
  loading?: boolean;
}

export const ProductsFilters = memo(function ProductsFilters({
  filters,
  onFilterChange,
  onRefresh,
  categories = [],
  loading = false,
}: ProductsFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  React.useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  const debouncedSearch = useDebounce(searchValue, 300);

  React.useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, onFilterChange]);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    onFilterChange({ search: '' });
  }, [onFilterChange]);

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      onFilterChange({ categoryId: categoryId === 'all' ? '' : categoryId });
    },
    [onFilterChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onFilterChange({ isActive: value === 'all' ? undefined : value === 'active' });
    },
    [onFilterChange]
  );

  const handleSortChange = useCallback(
    (sortBy: string) => { onFilterChange({ sortBy }); },
    [onFilterChange]
  );

  const handleSortOrderToggle = useCallback(() => {
    onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  }, [filters.sortOrder, onFilterChange]);

  const clearAllFilters = useCallback(() => {
    setSearchValue('');
    onFilterChange({ search: '', categoryId: '', sortBy: 'updated_at', sortOrder: 'desc', isActive: true });
  }, [onFilterChange]);

  // Active filter chips
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.categoryId) {
    const cat = categories.find((c) => c.id === filters.categoryId);
    activeChips.push({
      key: 'category',
      label: cat?.name ?? 'Categoría',
      onRemove: () => onFilterChange({ categoryId: '' }),
    });
  }

  if (filters.isActive === false) {
    activeChips.push({
      key: 'status',
      label: 'Inactivos',
      onRemove: () => onFilterChange({ isActive: true }),
    });
  } else if (filters.isActive === undefined) {
    activeChips.push({
      key: 'status',
      label: 'Todos los estados',
      onRemove: () => onFilterChange({ isActive: true }),
    });
  }

  if (filters.sortBy && filters.sortBy !== 'updated_at') {
    const sortLabels: Record<string, string> = {
      name: 'Nombre',
      sale_price: 'Precio',
      stock_quantity: 'Stock',
    };
    activeChips.push({
      key: 'sort',
      label: `Orden: ${sortLabels[filters.sortBy] ?? filters.sortBy}`,
      onRemove: () => onFilterChange({ sortBy: 'updated_at', sortOrder: 'desc' }),
    });
  }

  const hasActiveFilters = activeChips.length > 0 || Boolean(filters.search);

  return (
    <Card className="border-border/40 bg-card/70 backdrop-blur-sm">
      <CardContent className="space-y-3 p-4">
        {/* Row 1: Search + Refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, SKU..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-10 pl-9 pr-9"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={handleClearSearch}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="h-10 w-10 shrink-0"
            title="Actualizar"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Row 2: Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />

          {/* Category */}
          <Select value={filters.categoryId || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={
              filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'
            }
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={filters.sortBy || 'updated_at'} onValueChange={handleSortChange}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Actualizado</SelectItem>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="sale_price">Precio</SelectItem>
              <SelectItem value="stock_quantity">Stock</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleSortOrderToggle}
            className="h-8 w-8"
            title={filters.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
          >
            <ArrowUpDown className={cn(
              'h-3.5 w-3.5 transition-transform',
              filters.sortOrder === 'asc' && 'rotate-180'
            )} />
          </Button>

          {/* Clear all */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="ml-auto h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Limpiar todo
            </Button>
          )}
        </div>

        {/* Row 3: Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {chip.label}
                <button
                  onClick={chip.onRemove}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
