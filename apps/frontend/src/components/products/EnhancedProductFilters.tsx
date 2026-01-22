'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  DollarSign,
  Package,
  Tag,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAdvancedFilters, useSearchSuggestions, ProductFilters } from '@/hooks/useAdvancedFilters';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: Category;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  discount_percentage?: number;
  created_at: string;
  // Campos específicos de cosméticos
  brand?: string;
  shade?: string;
  skin_type?: 'grasa' | 'seca' | 'mixta' | 'sensible' | 'normal' | 'todo_tipo';
  ingredients?: string;
  volume?: string;
  spf?: number;
  finish?: 'mate' | 'satinado' | 'brillante' | 'natural';
  coverage?: 'ligera' | 'media' | 'completa';
  waterproof?: boolean;
  vegan?: boolean;
  cruelty_free?: boolean;
  expiration_date?: string;
}

interface EnhancedProductFiltersProps {
  products: Product[];
  categories: Category[];
  onFiltersChange: (filteredProducts: Product[], filters?: ProductFilters) => void;
  className?: string;
}

export default function EnhancedProductFilters({
  products,
  categories,
  onFiltersChange,
  className
}: EnhancedProductFiltersProps) {
  const {
    filters,
    debouncedSearch,
    updateFilter,
    resetFilters,
    activeFiltersCount,
    applyFilters
  } = useAdvancedFilters();

  const suggestions = useSearchSuggestions(products, filters.search);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Aplicar filtros a los productos
  React.useEffect(() => {
    const filteredProducts = applyFilters(products, (product, filters) => {
      // Filtro de búsqueda
      const searchMatch = !filters.debouncedSearch || 
        product.name.toLowerCase().includes(filters.debouncedSearch.toLowerCase()) ||
        (product.sku?.toLowerCase().includes(filters.debouncedSearch.toLowerCase()) ?? false) ||
        (product.category?.name.toLowerCase().includes(filters.debouncedSearch.toLowerCase()) ?? false);

      // Filtro de categoría
      const categoryMatch = filters.category === 'all' || product.category?.id === filters.category;

      // Filtro de rango de precios
      const priceMatch = product.sale_price >= filters.priceRange[0] && product.sale_price <= filters.priceRange[1];

      // Filtro de estado de stock
      let stockMatch = true;
      switch (filters.stockStatus) {
        case 'in_stock':
          stockMatch = product.stock_quantity > product.min_stock;
          break;
        case 'low_stock':
          stockMatch = product.stock_quantity <= product.min_stock && product.stock_quantity > 0;
          break;
        case 'out_of_stock':
          stockMatch = product.stock_quantity === 0;
          break;
        case 'critical':
          stockMatch = product.stock_quantity <= product.min_stock * 0.5;
          break;
      }

      // Filtro de descuento
      const discountMatch = filters.hasDiscount === null ||
        (filters.hasDiscount && (product.discount_percentage || 0) > 0) ||
        (!filters.hasDiscount && (product.discount_percentage || 0) === 0);

      // Filtro de fecha
      let dateMatch = true;
      if (filters.dateRange.from || filters.dateRange.to) {
        const productDate = new Date(product.created_at);
        if (filters.dateRange.from) {
          dateMatch = dateMatch && productDate >= filters.dateRange.from;
        }
        if (filters.dateRange.to) {
          dateMatch = dateMatch && productDate <= filters.dateRange.to;
        }
      }

      // Filtros específicos de cosméticos
      const brandMatch = !filters.brand || product.brand === filters.brand;
      const skinTypeMatch = !filters.skinType || product.skin_type === filters.skinType;
      const finishMatch = !filters.finish || product.finish === filters.finish;
      const coverageMatch = !filters.coverage || product.coverage === filters.coverage;
      const waterproofMatch = filters.waterproof === null || product.waterproof === filters.waterproof;
      const veganMatch = filters.vegan === null || product.vegan === filters.vegan;
      const crueltyFreeMatch = filters.crueltyFree === null || product.cruelty_free === filters.crueltyFree;
      
      // Filtro de SPF
      let spfMatch = true;
      if (filters.spfRange && filters.spfRange !== 'all') {
        const spf = product.spf || 0;
        switch (filters.spfRange) {
          case 'none':
            spfMatch = spf === 0;
            break;
          case 'low':
            spfMatch = spf >= 1 && spf <= 15;
            break;
          case 'medium':
            spfMatch = spf >= 16 && spf <= 30;
            break;
          case 'high':
            spfMatch = spf >= 31 && spf <= 50;
            break;
          case 'very-high':
            spfMatch = spf > 50;
            break;
        }
      }

      return searchMatch && categoryMatch && priceMatch && stockMatch && discountMatch && dateMatch &&
             brandMatch && skinTypeMatch && finishMatch && coverageMatch && waterproofMatch && 
             veganMatch && crueltyFreeMatch && spfMatch;
    });

    // Aplicar ordenamiento
    filteredProducts.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Map sort fields to correct property names
      switch (filters.sortBy) {
        case 'price':
          aValue = a.sale_price;
          bValue = b.sale_price;
          break;
        case 'stock':
          aValue = a.stock_quantity;
          bValue = b.stock_quantity;
          break;
        case 'category':
          aValue = a.category?.name || '';
          bValue = b.category?.name || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a[filters.sortBy as keyof Product];
          bValue = b[filters.sortBy as keyof Product];
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    onFiltersChange(filteredProducts, filters);
  }, [products, filters, debouncedSearch, onFiltersChange, applyFilters]);

  const handleSuggestionClick = (suggestion: string) => {
    updateFilter('search', suggestion);
    setShowSuggestions(false);
  };

  const maxPrice = Math.max(...products.map(p => p.sale_price), 1000);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Filtros de Productos</CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={activeFiltersCount === 0}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Búsqueda Principal */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos, SKU, categorías..."
              value={filters.search}
              onChange={(e) => {
                updateFilter('search', e.target.value);
                setShowSuggestions(e.target.value.length > 1);
              }}
              onFocus={() => setShowSuggestions(filters.search.length > 1)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-4"
            />
          </div>

          {/* Sugerencias de búsqueda */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 mt-1">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <Search className="h-3 w-3 inline mr-2 text-muted-foreground" />
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filtros Rápidos */}
        <div className="flex flex-wrap gap-2">
          <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.stockStatus} onValueChange={(value) => updateFilter('stockStatus', value as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado de stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="in_stock">En stock</SelectItem>
              <SelectItem value="low_stock">Stock bajo</SelectItem>
              <SelectItem value="out_of_stock">Sin stock</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={`${filters.sortBy}-${filters.sortOrder}`} 
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-');
              updateFilter('sortBy', sortBy as any);
              updateFilter('sortOrder', sortOrder as any);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
              <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
              <SelectItem value="price-asc">Precio (menor a mayor)</SelectItem>
              <SelectItem value="price-desc">Precio (mayor a menor)</SelectItem>
              <SelectItem value="stock-asc">Stock (menor a mayor)</SelectItem>
              <SelectItem value="stock-desc">Stock (mayor a menor)</SelectItem>
              <SelectItem value="created_at-desc">Más recientes</SelectItem>
              <SelectItem value="created_at-asc">Más antiguos</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros Avanzados
            <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvancedFilters && "rotate-180")} />
          </Button>
        </div>

        {/* Filtros Avanzados */}
        <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
          <CollapsibleContent className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Rango de Precios */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Rango de Precios: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                </Label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
                  max={maxPrice}
                  min={0}
                  step={10}
                  className="w-full"
                />
              </div>

              {/* Filtro de Descuento */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Productos con Descuento
                </Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={filters.hasDiscount === true}
                    onCheckedChange={(checked) => 
                      updateFilter('hasDiscount', checked ? true : null)
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    Solo productos en oferta
                  </span>
                </div>
              </div>

              {/* Filtro de Fecha */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Creación
                </Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        {filters.dateRange.from ? 
                          filters.dateRange.from.toLocaleDateString() : 
                          'Desde'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateRange.from}
                        onSelect={(date) => 
                          updateFilter('dateRange', { ...filters.dateRange, from: date })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        {filters.dateRange.to ? 
                          filters.dateRange.to.toLocaleDateString() : 
                          'Hasta'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateRange.to}
                        onSelect={(date) => 
                          updateFilter('dateRange', { ...filters.dateRange, to: date })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Filtro por Marca */}
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select
                  value={filters.brand || 'all'}
                  onValueChange={(value) => updateFilter('brand', value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las marcas</SelectItem>
                    {Array.from(new Set(products.map(p => p.brand).filter(Boolean))).map(brand => (
                      <SelectItem key={brand} value={brand!}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Tipo de Piel */}
              <div className="space-y-2">
                <Label>Tipo de Piel</Label>
                <Select
                  value={filters.skinType || 'all'}
                  onValueChange={(value) => updateFilter('skinType', value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="grasa">Grasa</SelectItem>
                    <SelectItem value="seca">Seca</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                    <SelectItem value="sensible">Sensible</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="todo_tipo">Todo tipo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Acabado */}
              <div className="space-y-2">
                <Label>Acabado</Label>
                <Select
                  value={filters.finish || 'all'}
                  onValueChange={(value) => updateFilter('finish', value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los acabados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los acabados</SelectItem>
                    <SelectItem value="mate">Mate</SelectItem>
                    <SelectItem value="satinado">Satinado</SelectItem>
                    <SelectItem value="brillante">Brillante</SelectItem>
                    <SelectItem value="natural">Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Cobertura */}
              <div className="space-y-2">
                <Label>Cobertura</Label>
                <Select
                  value={filters.coverage || 'all'}
                  onValueChange={(value) => updateFilter('coverage', value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las coberturas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las coberturas</SelectItem>
                    <SelectItem value="ligera">Ligera</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="completa">Completa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Características Especiales — removido */}

              {/* Filtro por SPF */}
              <div className="space-y-2">
                <Label>Factor de Protección Solar (SPF)</Label>
                <Select
                  value={filters.spfRange || 'all'}
                  onValueChange={(value) => updateFilter('spfRange', value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cualquier SPF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cualquier SPF</SelectItem>
                    <SelectItem value="none">Sin SPF</SelectItem>
                    <SelectItem value="low">SPF 1-15</SelectItem>
                    <SelectItem value="medium">SPF 16-30</SelectItem>
                    <SelectItem value="high">SPF 31-50</SelectItem>
                    <SelectItem value="very-high">SPF 50+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resumen de Resultados */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                Mostrando {products.length} productos
              </span>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-blue-700 hover:text-blue-800"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar todos los filtros
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}