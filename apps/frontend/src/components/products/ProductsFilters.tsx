'use client';

import React, { memo, useCallback, useId, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Filter,
  Layers,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
  Warehouse,
  X,
} from 'lucide-react';
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

interface Filters {
  search?: string;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
  stockStatus?: string;
  minPrice?: number;
  maxPrice?: number;
}

interface ProductsFiltersProps {
  filters: Filters;
  onFilterChange: (f: Partial<Filters>) => void;
  onRefresh: () => void;
  categories?: Array<{ id: string; name: string }>;
  loading?: boolean;
}

const SORT_LABELS: Record<string, string> = {
  updated_at: 'Más recientes',
  name: 'Nombre A-Z',
  sale_price: 'Precio',
  stock_quantity: 'Stock',
  created_at: 'Creación',
};

const STOCK_STATUS_LABELS: Record<string, string> = {
  out_of_stock: 'Sin stock',
  low_stock: 'Stock bajo',
  in_stock: 'Con stock',
};

// ── Count of active (non-default) filters ────────────────────────────────────
function countActiveFilters(f: Filters) {
  let n = 0;
  if (f.categoryId) n++;
  if (f.isActive === false || f.isActive === undefined) n++;
  if (f.sortBy && f.sortBy !== 'updated_at') n++;
  if (f.stockStatus) n++;
  if (f.minPrice != null && f.minPrice > 0) n++;
  if (f.maxPrice != null && f.maxPrice > 0) n++;
  return n;
}

export const ProductsFilters = memo(function ProductsFilters({
  filters,
  onFilterChange,
  onRefresh: _onRefresh,
  categories = [],
  loading = false,
}: ProductsFiltersProps) {
  const searchId = useId();
  const minPriceId = useId();
  const maxPriceId = useId();
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice ? String(filters.minPrice) : '');
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice ? String(filters.maxPrice) : '');
  const [expanded, setExpanded] = useState(false);

  // Sync external resets
  React.useEffect(() => { setLocalSearch(filters.search || ''); }, [filters.search]);
  React.useEffect(() => { setLocalMinPrice(filters.minPrice ? String(filters.minPrice) : ''); }, [filters.minPrice]);
  React.useEffect(() => { setLocalMaxPrice(filters.maxPrice ? String(filters.maxPrice) : ''); }, [filters.maxPrice]);

  // Debounced search
  const debouncedSearch = useDebounce(localSearch, 280);
  React.useEffect(() => {
    if (debouncedSearch !== (filters.search ?? '')) {
      onFilterChange({ search: debouncedSearch });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Debounced price filters
  const debouncedMinPrice = useDebounce(localMinPrice, 400);
  const debouncedMaxPrice = useDebounce(localMaxPrice, 400);
  React.useEffect(() => {
    const val = debouncedMinPrice ? Number(debouncedMinPrice) : undefined;
    if (val !== filters.minPrice) onFilterChange({ minPrice: val });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMinPrice]);
  React.useEffect(() => {
    const val = debouncedMaxPrice ? Number(debouncedMaxPrice) : undefined;
    if (val !== filters.maxPrice) onFilterChange({ maxPrice: val });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMaxPrice]);

  const clearSearch = useCallback(() => {
    setLocalSearch('');
    onFilterChange({ search: '' });
  }, [onFilterChange]);

  const handleCategoryChange = useCallback(
    (v: string) => onFilterChange({ categoryId: v === '__all' ? '' : v }),
    [onFilterChange],
  );

  const handleStatusChange = useCallback(
    (v: string) => {
      if (v === '__active') onFilterChange({ isActive: true });
      else if (v === '__inactive') onFilterChange({ isActive: false });
      else onFilterChange({ isActive: undefined });
    },
    [onFilterChange],
  );

  const handleSortChange = useCallback(
    (v: string) => onFilterChange({ sortBy: v }),
    [onFilterChange],
  );

  const handleStockStatusChange = useCallback(
    (v: string) => onFilterChange({ stockStatus: v === '__all' ? undefined : v }),
    [onFilterChange],
  );

  const toggleSortOrder = useCallback(
    () => onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' }),
    [filters.sortOrder, onFilterChange],
  );

  const clearAll = useCallback(() => {
    setLocalSearch('');
    setLocalMinPrice('');
    setLocalMaxPrice('');
    onFilterChange({
      search: '',
      categoryId: '',
      sortBy: 'updated_at',
      sortOrder: 'desc',
      isActive: true,
      stockStatus: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    });
  }, [onFilterChange]);

  // ── Active filter chips ───────────────────────────────────────────────────
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.categoryId) {
    const cat = categories.find((c) => c.id === filters.categoryId);
    chips.push({
      key: 'cat',
      label: `Categoría: ${cat?.name ?? '…'}`,
      onRemove: () => onFilterChange({ categoryId: '' }),
    });
  }
  if (filters.isActive === false) {
    chips.push({ key: 'status', label: 'Estado: Inactivos', onRemove: () => onFilterChange({ isActive: true }) });
  } else if (filters.isActive === undefined) {
    chips.push({ key: 'status', label: 'Estado: Todos', onRemove: () => onFilterChange({ isActive: true }) });
  }
  if (filters.sortBy && filters.sortBy !== 'updated_at') {
    chips.push({
      key: 'sort',
      label: `Orden: ${SORT_LABELS[filters.sortBy] ?? filters.sortBy}`,
      onRemove: () => onFilterChange({ sortBy: 'updated_at', sortOrder: 'desc' }),
    });
  }
  if (filters.stockStatus) {
    chips.push({
      key: 'stock',
      label: `Stock: ${STOCK_STATUS_LABELS[filters.stockStatus] ?? filters.stockStatus}`,
      onRemove: () => onFilterChange({ stockStatus: undefined }),
    });
  }
  if (filters.minPrice != null && filters.minPrice > 0) {
    chips.push({
      key: 'minPrice',
      label: `Precio ≥ ${filters.minPrice.toLocaleString('es-PY')}`,
      onRemove: () => { setLocalMinPrice(''); onFilterChange({ minPrice: undefined }); },
    });
  }
  if (filters.maxPrice != null && filters.maxPrice > 0) {
    chips.push({
      key: 'maxPrice',
      label: `Precio ≤ ${filters.maxPrice.toLocaleString('es-PY')}`,
      onRemove: () => { setLocalMaxPrice(''); onFilterChange({ maxPrice: undefined }); },
    });
  }

  const activeCount = countActiveFilters(filters);
  const hasAnyFilter = activeCount > 0 || Boolean(filters.search);

  // Status select value
  const statusValue =
    filters.isActive === undefined ? '__all' :
    filters.isActive ? '__active' : '__inactive';

  const stockStatusValue = filters.stockStatus || '__all';

  return (
    <div className="space-y-2.5">
      {/* ── Main filter bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <label htmlFor={searchId} className="sr-only">Buscar productos</label>
          <Search className={cn(
            'absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-colors',
            localSearch ? 'text-primary' : 'text-muted-foreground',
          )} />
          <Input
            id={searchId}
            placeholder="Nombre, SKU, descripción…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className={cn(
              'h-9 rounded-xl pl-9 pr-8 text-sm transition-all',
              localSearch && 'border-primary/50 ring-1 ring-primary/20',
            )}
          />
          {/* Spinner or clear */}
          {loading && localSearch ? (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : localSearch ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3 w-3" />
            </Button>
          ) : null}
        </div>

        {/* Category */}
        <Select value={filters.categoryId || '__all'} onValueChange={handleCategoryChange}>
          <SelectTrigger className={cn(
            'h-9 w-[160px] rounded-xl text-xs',
            filters.categoryId && 'border-primary/50 bg-primary/5 text-primary ring-1 ring-primary/20',
          )}>
            <Tag className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-60" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 opacity-50" />
                Todas las categorías
              </span>
            </SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={statusValue} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(
            'h-9 w-[130px] rounded-xl text-xs',
            filters.isActive === false && 'border-amber-400/50 bg-amber-50 text-amber-700 ring-1 ring-amber-400/20 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-400',
            filters.isActive === undefined && 'border-sky-400/50 bg-sky-50 text-sky-700 ring-1 ring-sky-400/20 dark:border-sky-700/50 dark:bg-sky-950/30 dark:text-sky-400',
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__active">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Solo activos
              </span>
            </SelectItem>
            <SelectItem value="__inactive">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Solo inactivos
              </span>
            </SelectItem>
            <SelectItem value="__all">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Todos
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle avanzados */}
        <Button
          variant={expanded ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setExpanded((p) => !p)}
          className={cn(
            'h-9 gap-1.5 rounded-xl text-xs',
            expanded && 'bg-muted',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filtros</span>
          {activeCount > 0 && (
            <Badge className="ml-0.5 h-4 min-w-4 rounded-full px-1 py-0 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>

        {/* Clear all */}
        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 gap-1 rounded-xl text-xs text-muted-foreground hover:text-foreground"
            title="Limpiar todos los filtros"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Limpiar</span>
          </Button>
        )}
      </div>

      {/* ── Advanced filters panel (collapsible) ─────────────────────────── */}
      {expanded && (
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
          {/* Row 1: Ordenar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-20 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              Ordenar
            </div>

            <Select value={filters.sortBy || 'updated_at'} onValueChange={handleSortChange}>
              <SelectTrigger className="h-8 w-[155px] rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
              className="h-8 gap-1.5 rounded-lg text-xs"
              title={filters.sortOrder === 'asc' ? 'Cambiar a descendente' : 'Cambiar a ascendente'}
            >
              {filters.sortOrder === 'asc' ? (
                <><ArrowUp className="h-3.5 w-3.5" /> Asc</>
              ) : (
                <><ArrowDown className="h-3.5 w-3.5" /> Desc</>
              )}
            </Button>
          </div>

          {/* Row 2: Stock status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-20 shrink-0">
              <Warehouse className="h-3.5 w-3.5" />
              Stock
            </div>

            <Select value={stockStatusValue} onValueChange={handleStockStatusChange}>
              <SelectTrigger className={cn(
                'h-8 w-[160px] rounded-lg text-xs',
                filters.stockStatus === 'out_of_stock' && 'border-rose-400/50 bg-rose-50 text-rose-700 ring-1 ring-rose-400/20 dark:border-rose-700/50 dark:bg-rose-950/30 dark:text-rose-400',
                filters.stockStatus === 'low_stock' && 'border-amber-400/50 bg-amber-50 text-amber-700 ring-1 ring-amber-400/20 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-400',
                filters.stockStatus === 'in_stock' && 'border-emerald-400/50 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/20 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-400',
              )}>
                <SelectValue placeholder="Estado de stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Todos
                  </span>
                </SelectItem>
                <SelectItem value="in_stock">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Con stock
                  </span>
                </SelectItem>
                <SelectItem value="low_stock">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Stock bajo
                  </span>
                </SelectItem>
                <SelectItem value="out_of_stock">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Sin stock
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Price range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-20 shrink-0">
              <BarChart3 className="h-3.5 w-3.5" />
              Precio
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <label htmlFor={minPriceId} className="sr-only">Precio mínimo</label>
                <Input
                  id={minPriceId}
                  type="number"
                  placeholder="Mín."
                  value={localMinPrice}
                  onChange={(e) => setLocalMinPrice(e.target.value)}
                  className="h-8 w-[100px] rounded-lg text-xs"
                  min={0}
                />
              </div>
              <span className="text-xs text-muted-foreground">—</span>
              <div className="relative">
                <label htmlFor={maxPriceId} className="sr-only">Precio máximo</label>
                <Input
                  id={maxPriceId}
                  type="number"
                  placeholder="Máx."
                  value={localMaxPrice}
                  onChange={(e) => setLocalMaxPrice(e.target.value)}
                  className="h-8 w-[100px] rounded-lg text-xs"
                  min={0}
                />
              </div>
              {(localMinPrice || localMaxPrice) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setLocalMinPrice('');
                    setLocalMaxPrice('');
                    onFilterChange({ minPrice: undefined, maxPrice: undefined });
                  }}
                  aria-label="Limpiar rango de precios"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter chips ──────────────────────────────────────────── */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Filtros:</span>
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 rounded-lg border border-border/60 bg-muted/60 pr-1.5 text-xs font-normal"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-0.5 rounded p-0.5 hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Quitar filtro ${chip.label}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          <button
            onClick={clearAll}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
});
