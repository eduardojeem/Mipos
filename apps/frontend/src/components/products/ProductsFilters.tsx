'use client';

import React, { memo, useCallback, useState } from 'react';
import { Search, RefreshCw, X, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    (v: string) => onFilterChange({ categoryId: v === 'all' ? '' : v }),
    [onFilterChange]
  );

  const handleStatusChange = useCallback(
    (v: string) => onFilterChange({ isActive: v === 'all' ? undefined : v === 'active' }),
    [onFilterChange]
  );

  const handleSortChange = useCallback(
    (v: string) => onFilterChange({ sortBy: v }),
    [onFilterChange]
  );

  const handleSortOrderToggle = useCallback(
    () => onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' }),
    [filters.sortOrder, onFilterChange]
  );

  const clearAll = useCallback(() => {
    setSearchValue('');
    onFilterChange({ search: '', categoryId: '', sortBy: 'updated_at', sortOrder: 'desc', isActive: true });
  }, [onFilterChange]);

  // Chips
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.categoryId) {
    const cat = categories.find((c) => c.id === filters.categoryId);
    chips.push({ key: 'cat', label: cat?.name ?? 'Categoría', onRemove: () => onFilterChange({ categoryId: '' }) });
  }
  if (filters.isActive === false) {
    chips.push({ key: 'status', label: 'Inactivos', onRemove: () => onFilterChange({ isActive: true }) });
  } else if (filters.isActive === undefined) {
    chips.push({ key: 'status', label: 'Todos', onRemove: () => onFilterChange({ isActive: true }) });
  }
  if (filters.sortBy && filters.sortBy !== 'updated_at') {
    const labels: Record<string, string> = { name: 'Nombre', sale_price: 'Precio', stock_quantity: 'Stock' };
    chips.push({
      key: 'sort',
      label: `↕ ${labels[filters.sortBy] ?? filters.sortBy}`,
      onRemove: () => onFilterChange({ sortBy: 'updated_at', sortOrder: 'desc' }),
    });
  }

  const hasFilters = chips.length > 0 || Boolean(filters.search);

  return (
    <div className="space-y-2">
      {/* Single toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search — grows to fill available space */}
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar nombre, SKU..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 pl-9 pr-8 text-sm"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={handleClearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Category */}
        <Select value={filters.categoryId || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="h-9 w-[110px] text-xs">
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
          <SelectTrigger className="h-9 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at">Recientes</SelectItem>
            <SelectItem value="name">Nombre</SelectItem>
            <SelectItem value="sale_price">Precio</SelectItem>
            <SelectItem value="stock_quantity">Stock</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort direction */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleSortOrderToggle}
          className="h-9 w-9 shrink-0"
          title={filters.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
        >
          <ArrowUpDown className={cn('h-3.5 w-3.5 transition-transform', filters.sortOrder === 'asc' && 'rotate-180')} />
        </Button>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          title="Actualizar"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </Button>

        {/* Clear all */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Active chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 text-xs">
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
    </div>
  );
});
