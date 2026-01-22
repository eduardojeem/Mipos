'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Filter, 
  Search, 
  X, 
  ChevronDown, 
  Calendar as CalendarIcon,
  Tag,
  Package,
  DollarSign,
  Bookmark,
  Save
} from 'lucide-react';
import { useProducts } from '../contexts/ProductsContext';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SavedFilter {
  id: string;
  name: string;
  filters: any;
  createdAt: Date;
}

export function ProductsAdvancedFilters() {
  const { filters, categories, actions, computed } = useProducts();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [stockRange, setStockRange] = useState<[number, number]>([0, 1000]);
  
  // Mock saved filters - would come from localStorage or API
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([
    {
      id: '1',
      name: 'Productos sin stock',
      filters: { stockStatus: 'out_of_stock' },
      createdAt: new Date()
    },
    {
      id: '2', 
      name: 'Productos caros',
      filters: { minPrice: 100000 },
      createdAt: new Date()
    }
  ]);

  const handleSearchChange = useCallback((value: string) => {
    actions.updateFilters({ search: value });
  }, [actions]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    actions.updateFilters({ 
      categoryId: categoryId === 'all' ? undefined : categoryId 
    });
  }, [actions]);

  const handleStockStatusChange = useCallback((status: string) => {
    actions.updateFilters({ 
      stockStatus: status === 'all' ? undefined : status as any
    });
  }, [actions]);

  const handlePriceRangeChange = useCallback((range: [number, number]) => {
    setPriceRange(range);
    actions.updateFilters({
      minPrice: range[0] > 0 ? range[0] : undefined,
      maxPrice: range[1] < 1000000 ? range[1] : undefined
    });
  }, [actions]);

  const handleStockRangeChange = useCallback((range: [number, number]) => {
    setStockRange(range);
    actions.updateFilters({
      minStock: range[0] > 0 ? range[0] : undefined,
      maxStock: range[1] < 1000 ? range[1] : undefined
    });
  }, [actions]);

  const handleDateRangeChange = useCallback((range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    actions.updateFilters({
      dateFrom: range.from?.toISOString(),
      dateTo: range.to?.toISOString()
    });
  }, [actions]);

  const handleSortChange = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    actions.updateFilters({ sortBy, sortOrder });
  }, [actions]);

  const clearAllFilters = useCallback(() => {
    actions.updateFilters({
      search: undefined,
      categoryId: undefined,
      stockStatus: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minStock: undefined,
      maxStock: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      sortBy: undefined,
      sortOrder: undefined
    });
    setPriceRange([0, 1000000]);
    setStockRange([0, 1000]);
    setDateRange({});
  }, [actions]);

  const removeFilter = useCallback((filterKey: string) => {
    actions.updateFilters({ [filterKey]: undefined });
    
    // Reset UI state for range filters
    if (filterKey === 'minPrice' || filterKey === 'maxPrice') {
      setPriceRange([0, 1000000]);
    }
    if (filterKey === 'minStock' || filterKey === 'maxStock') {
      setStockRange([0, 1000]);
    }
    if (filterKey === 'dateFrom' || filterKey === 'dateTo') {
      setDateRange({});
    }
  }, [actions]);

  const saveCurrentFilters = useCallback(() => {
    if (!filterName.trim()) return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...filters },
      createdAt: new Date()
    };
    
    setSavedFilters(prev => [...prev, newFilter]);
    setFilterName('');
    setShowSaveDialog(false);
    
    // Would save to localStorage or API
    localStorage.setItem('saved-product-filters', JSON.stringify([...savedFilters, newFilter]));
  }, [filterName, filters, savedFilters]);

  const loadSavedFilter = useCallback((savedFilter: SavedFilter) => {
    actions.updateFilters(savedFilter.filters);
    
    // Update UI state
    if (savedFilter.filters.minPrice || savedFilter.filters.maxPrice) {
      setPriceRange([
        savedFilter.filters.minPrice || 0,
        savedFilter.filters.maxPrice || 1000000
      ]);
    }
    if (savedFilter.filters.minStock || savedFilter.filters.maxStock) {
      setStockRange([
        savedFilter.filters.minStock || 0,
        savedFilter.filters.maxStock || 1000
      ]);
    }
  }, [actions]);

  const deleteSavedFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
    localStorage.setItem('saved-product-filters', JSON.stringify(savedFilters.filter(f => f.id !== filterId)));
  }, [savedFilters]);

  // Count active filters
  const activeFiltersCount = Object.keys(filters).filter(key => 
    filters[key as keyof typeof filters] !== undefined && 
    filters[key as keyof typeof filters] !== ''
  ).length;

  return (
    <div className="space-y-4">
      {/* Basic filters - always visible */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[300px]">
          <Label htmlFor="search">Buscar productos</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Buscar por nombre, SKU o descripción..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="min-w-[200px]">
          <Label htmlFor="category">Categoría</Label>
          <Select value={filters.categoryId || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px]">
          <Label htmlFor="stock-status">Estado de stock</Label>
          <Select value={filters.stockStatus || 'all'} onValueChange={handleStockStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="in_stock">En stock</SelectItem>
              <SelectItem value="low_stock">Stock bajo</SelectItem>
              <SelectItem value="out_of_stock">Sin stock</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros Avanzados
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Advanced filters - collapsible */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Price range */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Rango de precios
                  </Label>
                  <div className="px-3">
                    <Slider
                      value={priceRange}
                      onValueChange={handlePriceRangeChange}
                      max={1000000}
                      step={10000}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(priceRange[0])}</span>
                    <span>{formatCurrency(priceRange[1])}</span>
                  </div>
                </div>

                {/* Stock range */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Rango de stock
                  </Label>
                  <div className="px-3">
                    <Slider
                      value={stockRange}
                      onValueChange={handleStockRangeChange}
                      max={1000}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{stockRange[0]} unidades</span>
                    <span>{stockRange[1]} unidades</span>
                  </div>
                </div>

                {/* Date range */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Fecha de creación
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd/MM/yyyy", { locale: es })} -{" "}
                              {format(dateRange.to, "dd/MM/yyyy", { locale: es })}
                            </>
                          ) : (
                            format(dateRange.from, "dd/MM/yyyy", { locale: es })
                          )
                        ) : (
                          "Seleccionar fechas"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => handleDateRangeChange(range || {})}
                        numberOfMonths={2}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sorting */}
                <div className="space-y-2">
                  <Label>Ordenar por</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={filters.sortBy || 'name'} 
                      onValueChange={(value) => handleSortChange(value, filters.sortOrder || 'asc')}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nombre</SelectItem>
                        <SelectItem value="sale_price">Precio</SelectItem>
                        <SelectItem value="stock_quantity">Stock</SelectItem>
                        <SelectItem value="created_at">Fecha creación</SelectItem>
                        <SelectItem value="category_id">Categoría</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={filters.sortOrder || 'asc'} 
                      onValueChange={(value) => handleSortChange(filters.sortBy || 'name', value as 'asc' | 'desc')}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">A-Z</SelectItem>
                        <SelectItem value="desc">Z-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Additional filters */}
                <div className="space-y-2">
                  <Label>Filtros adicionales</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="active-only"
                        checked={filters.isActive === true}
                        onCheckedChange={(checked) => 
                          actions.updateFilters({ isActive: checked ? true : undefined })
                        }
                      />
                      <Label htmlFor="active-only" className="text-sm">Solo productos activos</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="with-images"
                        checked={filters.hasImages === true}
                        onCheckedChange={(checked) => 
                          actions.updateFilters({ hasImages: checked ? true : undefined })
                        }
                      />
                      <Label htmlFor="with-images" className="text-sm">Solo con imágenes</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearAllFilters}>
                    Limpiar todos
                  </Button>
                  <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar filtros
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {computed.filteredProducts.length} productos encontrados
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Active filters display */}
      {computed.hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">Filtros activos:</span>
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            
            let displayValue = String(value);
            let displayKey = key;
            
            // Format display values
            if (key === 'categoryId') {
              const category = categories.find(c => c.id === value);
              displayValue = category?.name || value;
              displayKey = 'Categoría';
            } else if (key === 'stockStatus') {
              const statusMap = {
                'in_stock': 'En stock',
                'low_stock': 'Stock bajo', 
                'out_of_stock': 'Sin stock',
                'critical': 'Crítico'
              };
              displayValue = statusMap[value as keyof typeof statusMap] || value;
              displayKey = 'Estado';
            } else if (key === 'minPrice') {
              displayValue = `Precio min: ${formatCurrency(Number(value))}`;
              displayKey = '';
            } else if (key === 'maxPrice') {
              displayValue = `Precio max: ${formatCurrency(Number(value))}`;
              displayKey = '';
            }
            
            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {displayKey && `${displayKey}: `}{displayValue}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => removeFilter(key)}
                />
              </Badge>
            );
          })}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar todo
          </Button>
        </div>
      )}

      {/* Saved filters */}
      {savedFilters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Filtros Guardados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map(savedFilter => (
                <div key={savedFilter.id} className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSavedFilter(savedFilter)}
                    className="gap-2"
                  >
                    <Tag className="h-3 w-3" />
                    {savedFilter.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSavedFilter(savedFilter.id)}
                    className="h-8 w-8 p-0 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save filter dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Guardar filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="filter-name">Nombre del filtro</Label>
                <Input
                  id="filter-name"
                  placeholder="Ej: Productos sin stock"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveCurrentFilters} disabled={!filterName.trim()}>
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}