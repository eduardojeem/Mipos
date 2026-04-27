'use client';

import { useMemo } from 'react';
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
    Filter
} from 'lucide-react';
import FilterDrawer, { AdvancedFilters } from './FilterDrawer';
import type { Category } from '@/types';

export type ViewMode = 'grid' | 'list' | 'compact';
export type SortMode = 'name' | 'price-low' | 'price-high' | 'rating' | 'newest' | 'popular';

interface CatalogFiltersProps {
    // Current filter state
    selectedCategories: string[];
    sortBy: SortMode;
    viewMode: ViewMode;
    showOnlyInStock: boolean;
    showOnlyOnSale: boolean;

    // Data
    categories: Category[];
    resultsCount: number;
    maxPrice: number;

    // Advanced filters
    advancedFilters: AdvancedFilters;

    // Search
    searchQuery?: string;
    onSearchChange?: (query: string) => void;

    // Callbacks
    onCategoryChange: (categoryId: string) => void;
    onSortChange: (sort: SortMode) => void;
    onViewModeChange: (mode: ViewMode) => void;
    onAdvancedFiltersChange: (filters: AdvancedFilters) => void;
    onClearFilters: () => void;
    onToggleInStock: () => void;
    onToggleOnSale: () => void;

    config: any;
}

export default function CatalogFilters({
    selectedCategories,
    sortBy,
    viewMode,
    showOnlyInStock,
    showOnlyOnSale,
    categories,
    resultsCount,
    maxPrice,
    advancedFilters,
    searchQuery = '',
    onSearchChange,
    onCategoryChange,
    onSortChange,
    onViewModeChange,
    onAdvancedFiltersChange,
    onClearFilters,
    onToggleInStock,
    onToggleOnSale,
    config,
}: CatalogFiltersProps) {

    // Calculate active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedCategories.length > 0) count++;
        if (showOnlyOnSale) count++;
        if (!showOnlyInStock) count++;
        if (advancedFilters.rating) count++;
        if (advancedFilters.priceRange[0] > 0 || advancedFilters.priceRange[1] < maxPrice) count++;
        return count;
    }, [selectedCategories, showOnlyOnSale, showOnlyInStock, advancedFilters, maxPrice]);

    const hasActiveFilters = activeFiltersCount > 0;

    const sortOptions = [
        { value: 'popular', label: 'Más Popular', icon: Sparkles },
        { value: 'newest', label: 'Más Reciente', icon: Package },
        { value: 'price-low', label: 'Precio: Menor', icon: Tag },
        { value: 'price-high', label: 'Precio: Mayor', icon: Tag },
        { value: 'rating', label: 'Mejor Valorado', icon: Sparkles },
        { value: 'name', label: 'Nombre A-Z', icon: ArrowUpDown },
    ];

    return (
        <>
            {/* Barra de Herramientas Sticky - Estilo Offers */}
            <div className="sticky top-16 z-30 -mx-4 px-3 sm:px-4 md:mx-0 mb-8 transition-all duration-300">
                <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/5 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-none p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">

                    {/* Campo de búsqueda - Full width en móviles */}
                    {onSearchChange && (
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Buscar productos..."
                                className="pl-10 pr-10 bg-slate-100/50 dark:bg-white/5 border-transparent focus-visible:ring-primary/30 text-sm sm:text-base h-11 rounded-xl transition-all"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
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

                    {/* Controles de filtro - Scroll horizontal en móviles */}
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                        {/* Filtro de Stock */}
                        <Select value={showOnlyInStock ? 'in-stock' : 'all'} onValueChange={(v) => v === 'in-stock' ? onToggleInStock() : onToggleInStock()}>
                            <SelectTrigger className="min-w-[120px] sm:w-[140px] bg-slate-100/50 dark:bg-white/5 border-transparent h-11 rounded-xl transition-all text-sm">
                                <Package className="w-4 h-4 mr-2 text-primary" />
                                <SelectValue placeholder="Stock" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="in-stock">En Stock</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Filtro de Categoría */}
                        <Select
                            value={selectedCategories.length === 1 ? selectedCategories[0] : 'all'}
                            onValueChange={(v) => {
                                if (v === 'all') {
                                    onClearFilters();
                                } else {
                                    onCategoryChange(v);
                                }
                            }}
                        >
                            <SelectTrigger className="min-w-[140px] sm:w-[160px] bg-slate-100/50 dark:bg-white/5 border-transparent h-11 rounded-xl transition-all text-sm">
                                <Filter className="w-4 h-4 mr-2 text-primary" />
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las categorías</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Ordenar */}
                        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortMode)}>
                            <SelectTrigger className="min-w-[140px] sm:w-[160px] bg-slate-100/50 dark:bg-white/5 border-transparent h-11 rounded-xl transition-all text-sm">
                                <ArrowUpDown className="w-4 h-4 mr-2 text-primary" />
                                <SelectValue placeholder="Ordenar" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Sección de Resultados y Filtros Rápidos */}
            <div className="flex items-center gap-2 mb-8 scale-in-animation">
                <Sparkles className="w-6 h-6 text-primary animate-glow-pulse" />
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Explora el Catálogo</h2>
                <Badge variant="outline" className="ml-3 bg-primary/5 border-primary/20 text-primary font-bold px-3 py-1 rounded-full backdrop-blur-sm" aria-live="polite" role="status">
                    {resultsCount} {resultsCount === 1 ? 'producto' : 'productos'}
                </Badge>
            </div>

            {/* Filtros Rápidos - Pills */}
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
                    onClick={onToggleInStock}
                    className={`rounded-full h-10 px-5 font-semibold transition-all duration-300 gap-2 ${
                        showOnlyInStock 
                          ? 'bg-primary text-white shadow-lg shadow-primary/25 border-0' 
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                >
                    <Package className="w-4 h-4" />
                    En Stock
                </Button>

                {/* Filtro Avanzado */}
                <FilterDrawer
                    categories={categories}
                    filters={advancedFilters}
                    onFiltersChange={onAdvancedFiltersChange}
                    onClearFilters={onClearFilters}
                    maxPrice={maxPrice}
                    config={config}
                    activeFiltersCount={activeFiltersCount}
                />

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <>
                        <div className="h-6 w-px bg-border mx-1" />

                        {selectedCategories.map(catId => {
                            const cat = categories.find(c => c.id === catId);
                            return cat ? (
                                <Badge
                                    key={catId}
                                    variant="secondary"
                                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                                    onClick={() => onCategoryChange(catId)}
                                >
                                    {cat.name}
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
                    <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
                        <TabsList className="h-10 bg-slate-100/80 dark:bg-white/5 border-0 p-1 rounded-xl">
                            <TabsTrigger value="grid" className="h-8 px-4 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all">
                                <Grid3X3 className="w-4 h-4" />
                                <span className="hidden md:inline">Grid</span>
                            </TabsTrigger>
                            <TabsTrigger value="list" className="h-8 px-4 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all">
                                <List className="w-4 h-4" />
                                <span className="hidden md:inline">Lista</span>
                            </TabsTrigger>
                            <TabsTrigger value="compact" className="h-8 px-4 gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all">
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
