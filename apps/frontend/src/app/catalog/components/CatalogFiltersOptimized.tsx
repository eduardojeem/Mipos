'use client';

import { useMemo } from 'react';
import { BusinessConfig } from '@/types/business-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Grid3X3,
  List,
  LayoutGrid,
  ArrowUpDown,
  Sparkles,
  Tag,
  Package,
  X,
  Search,
  Filter,
} from 'lucide-react';
import FilterDrawer, { type AdvancedFilters } from './FilterDrawer';
import { type CatalogSortMode } from '../catalog-query';
import type { Category } from '@/types';

export type ViewMode = 'grid' | 'list' | 'compact';
export type SortMode = CatalogSortMode;

interface CatalogFiltersOptimizedProps {
  selectedCategories: string[];
  sortBy: SortMode;
  viewMode: ViewMode;
  showOnlyInStock: boolean;
  showOnlyOnSale: boolean;
  categories: Category[];
  resultsCount: number;
  totalProducts: number;
  maxPrice: number;
  advancedFilters: AdvancedFilters;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onCategorySelect: (categoryId: string) => void;
  onCategoryRemove: (categoryId: string) => void;
  onSortChange: (sort: SortMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onAdvancedFiltersChange: (filters: AdvancedFilters) => void;
  onClearFilters: () => void;
  onInStockChange: (value: boolean) => void;
  onToggleOnSale: () => void;
  config: BusinessConfig;
}

export default function CatalogFiltersOptimized({
  selectedCategories,
  sortBy,
  viewMode,
  showOnlyInStock,
  showOnlyOnSale,
  categories,
  resultsCount,
  totalProducts,
  maxPrice,
  advancedFilters,
  searchQuery = '',
  onSearchChange,
  onCategorySelect,
  onCategoryRemove,
  onSortChange,
  onViewModeChange,
  onAdvancedFiltersChange,
  onClearFilters,
  onInStockChange,
  onToggleOnSale,
  config,
}: CatalogFiltersOptimizedProps) {
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (showOnlyOnSale) count++;
    if (!showOnlyInStock) count++;
    if (advancedFilters.rating) count++;
    if (advancedFilters.priceRange[0] > 0 || advancedFilters.priceRange[1] < maxPrice) count++;
    return count;
  }, [advancedFilters, maxPrice, selectedCategories, showOnlyInStock, showOnlyOnSale]);

  const hasActiveFilters = activeFiltersCount > 0;

  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'popular', label: 'Destacados' },
    { value: 'newest', label: 'Mas Reciente' },
    { value: 'price-low', label: 'Precio: Menor' },
    { value: 'price-high', label: 'Precio: Mayor' },
    { value: 'rating', label: 'Mejor Valorado' },
    { value: 'name', label: 'Nombre A-Z' },
  ];

  return (
    <>
      <div className="sticky top-[128px] sm:top-[128px] z-30 -mx-4 px-3 sm:px-4 md:mx-0 mb-8 transition-all duration-300">
        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/5 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-none p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
          {onSearchChange && (
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar productos..."
                className="pl-10 pr-10 bg-slate-100/50 dark:bg-white/5 border-transparent focus-visible:ring-primary/30 text-sm sm:text-base h-11 rounded-xl transition-all"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => onSearchChange('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <Select
              value={showOnlyInStock ? 'in-stock' : 'all'}
              onValueChange={(value) => onInStockChange(value === 'in-stock')}
            >
              <SelectTrigger className="min-w-[120px] sm:w-[140px] bg-slate-100/50 dark:bg-white/5 border-transparent h-11 rounded-xl transition-all text-sm">
                <Package className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="in-stock">En Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedCategories.length === 1 ? selectedCategories[0] : 'all'}
              onValueChange={(value) => onCategorySelect(value)}
            >
              <SelectTrigger className="min-w-[140px] sm:w-[160px] bg-slate-100/50 dark:bg-white/5 border-transparent h-11 rounded-xl transition-all text-sm">
                <Filter className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortMode)}>
              <SelectTrigger className="min-w-[140px] sm:w-[160px] bg-slate-100/50 dark:bg-white/5 border-transparent h-11 rounded-xl transition-all text-sm">
                <ArrowUpDown className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8 scale-in-animation">
        <Sparkles className="w-6 h-6 text-primary animate-glow-pulse" />
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Explora el Catalogo
        </h2>
        <Badge
          variant="outline"
          className="ml-3 bg-primary/5 border-primary/20 text-primary font-bold px-3 py-1 rounded-full backdrop-blur-sm"
          aria-live="polite"
          role="status"
        >
          {resultsCount === totalProducts
            ? `${totalProducts} ${totalProducts === 1 ? 'producto' : 'productos'}`
            : `Mostrando ${resultsCount} de ${totalProducts}`}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button
          size="sm"
          variant={showOnlyOnSale ? 'default' : 'outline'}
          onClick={onToggleOnSale}
          className={`rounded-full gap-1.5 ${showOnlyOnSale ? 'bg-red-600 hover:bg-red-700' : ''}`}
        >
          <Tag className="w-3.5 h-3.5" />
          Ofertas
        </Button>

        <Button
          size="sm"
          variant={showOnlyInStock ? 'default' : 'outline'}
          onClick={() => onInStockChange(!showOnlyInStock)}
          className={`rounded-full h-10 px-5 font-semibold transition-all duration-300 gap-2 ${
            showOnlyInStock
              ? 'bg-primary text-white shadow-lg shadow-primary/25 border-0'
              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Package className="w-4 h-4" />
          En Stock
        </Button>

        <FilterDrawer
          categories={categories}
          filters={advancedFilters}
          onFiltersChange={onAdvancedFiltersChange}
          onClearFilters={onClearFilters}
          maxPrice={maxPrice}
          config={config}
          activeFiltersCount={activeFiltersCount}
        />

        {hasActiveFilters && (
          <>
            <div className="h-6 w-px bg-border mx-1" />

            {selectedCategories.map((categoryId) => {
              const category = categories.find((item) => item.id === categoryId);
              return category ? (
                <Badge
                  key={categoryId}
                  variant="secondary"
                  className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => onCategoryRemove(categoryId)}
                >
                  {category.name}
                  <X className="w-3 h-3" />
                </Badge>
              ) : null;
            })}

            <Button
              size="sm"
              variant="ghost"
              onClick={onClearFilters}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              Limpiar todo
            </Button>
          </>
        )}

        <div className="ml-auto hidden sm:flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
            <TabsList className="h-10 bg-slate-100/80 dark:bg-white/5 border-0 p-1 rounded-xl">
              <TabsTrigger
                value="grid"
                className="h-8 px-4 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all"
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden md:inline">Cuadricula</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="h-7 px-3 gap-1.5">
                <List className="w-4 h-4" />
                <span className="hidden md:inline">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="compact" className="h-7 px-3 gap-1.5">
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Compacto</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </>
  );
}
