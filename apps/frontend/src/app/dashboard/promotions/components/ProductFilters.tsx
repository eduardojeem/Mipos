import React from 'react';
import { Search, Filter, X, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tooltip } from '@/components/ui/tooltip-simple';
import { cn } from '@/lib/utils';
import { ProductFilters as ProductFiltersType } from '@/hooks/useProductFilters';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFiltersChange: (filters: Partial<ProductFiltersType>) => void;
  categories: string[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  className?: string;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  categories,
  hasActiveFilters,
  onResetFilters,
  className
}) => {
  const sortOptions = [
    { value: 'name', label: 'Nombre' },
    { value: 'price', label: 'Precio' },
    { value: 'category', label: 'Categoría' },
    { value: 'stock', label: 'Stock' },
    { value: 'dateAdded', label: 'Fecha agregado' }
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filtros principales simplificados */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Búsqueda mejorada */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o categoría..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-10 h-9 text-sm border-slate-300 focus:border-violet-500 focus:ring-violet-500"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({ search: '' })}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-slate-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2">
          {/* Categoría con contador */}
          <Select
            value={filters.category}
            onValueChange={(value) => onFiltersChange({ category: value })}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm border-slate-300 focus:border-violet-500">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center justify-between w-full">
                  <span>Todas las categorías</span>
                </div>
              </SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ordenamiento mejorado */}
          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-');
              onFiltersChange({ sortBy: sortBy as any, sortOrder: sortOrder as 'asc' | 'desc' });
            }}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm border-slate-300 focus:border-violet-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Nombre A-Z</SelectItem>
              <SelectItem value="name-desc">Nombre Z-A</SelectItem>
              <SelectItem value="price-asc">Precio menor</SelectItem>
              <SelectItem value="price-desc">Precio mayor</SelectItem>
              <SelectItem value="stock-desc">Más stock</SelectItem>
              <SelectItem value="stock-asc">Menos stock</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtros avanzados con indicador mejorado */}
          <Popover>
            <PopoverTrigger asChild>
              <Tooltip content="Filtros avanzados (precio, stock, etc.)">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "h-9 gap-2 px-3 border-slate-300 transition-all duration-200 hover:scale-105",
                    hasActiveFilters && "border-violet-500 bg-violet-50 text-violet-700 animate-pulse"
                  )}
                >
                  <Filter className="h-4 w-4 transition-transform duration-200 hover:rotate-180" />
                  <span className="hidden sm:inline">Más filtros</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 bg-violet-600 text-white h-5 w-5 p-0 text-xs animate-bounce">
                      !
                    </Badge>
                  )}
                </Button>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Filtros Avanzados</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Refina tu búsqueda con opciones adicionales</p>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onResetFilters}
                      className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpiar todo
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Rango de precios mejorado */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Rango de Precio
                    </label>
                    <div className="text-sm font-mono text-slate-600 dark:text-slate-400">
                      ${filters.priceRange[0]} - ${filters.priceRange[1]}
                    </div>
                  </div>
                  
                  <div className="px-2">
                    <Slider
                      value={filters.priceRange}
                      onValueChange={(value) => onFiltersChange({ 
                        priceRange: value as [number, number] 
                      })}
                      max={10000}
                      min={0}
                      step={50}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
                    <span>$0</span>
                    <span>$2,500</span>
                    <span>$5,000</span>
                    <span>$7,500</span>
                    <span>$10,000</span>
                  </div>
                </div>

                <Separator />

                {/* Opciones de stock mejoradas */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Disponibilidad
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Checkbox
                        id="show-out-of-stock"
                        checked={filters.showOutOfStock}
                        onCheckedChange={(checked) => 
                          onFiltersChange({ showOutOfStock: checked === true })
                        }
                        className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor="show-out-of-stock" 
                          className="text-sm font-medium cursor-pointer text-slate-700 dark:text-slate-300"
                        >
                          Incluir productos sin stock
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Mostrar productos que no están disponibles actualmente
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFiltersChange({ 
                        priceRange: [0, 1000],
                        showOutOfStock: false 
                      })}
                      className="flex-1 text-xs"
                    >
                      Productos económicos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFiltersChange({ 
                        sortBy: 'stock',
                        sortOrder: 'desc',
                        showOutOfStock: false 
                      })}
                      className="flex-1 text-xs"
                    >
                      Más disponibles
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filtros activos informativos */}
      {hasActiveFilters && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Filtros aplicados
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200"
            >
              Limpiar todos
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {filters.search && (
              <Badge variant="outline" className="gap-1 text-xs px-2 py-1 bg-white dark:bg-slate-800 border-violet-300">
                <Search className="h-3 w-3" />
                "{filters.search.substring(0, 15)}{filters.search.length > 15 ? '...' : ''}"
                <button
                  onClick={() => onFiltersChange({ search: '' })}
                  className="ml-1 hover:bg-violet-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            )}

            {filters.category !== 'all' && (
              <Badge variant="outline" className="gap-1 text-xs px-2 py-1 bg-white dark:bg-slate-800 border-blue-300">
                <Package className="h-3 w-3" />
                {filters.category}
                <button
                  onClick={() => onFiltersChange({ category: 'all' })}
                  className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            )}

            {(filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) && (
              <Badge variant="outline" className="gap-1 text-xs px-2 py-1 bg-white dark:bg-slate-800 border-green-300">
                💰 ${filters.priceRange[0]} - ${filters.priceRange[1]}
                <button
                  onClick={() => onFiltersChange({ priceRange: [0, 10000] })}
                  className="ml-1 hover:bg-green-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            )}

            {!filters.showOutOfStock && (
              <Badge variant="outline" className="gap-1 text-xs px-2 py-1 bg-white dark:bg-slate-800 border-amber-300">
                ✅ Solo con stock
                <button
                  onClick={() => onFiltersChange({ showOutOfStock: true })}
                  className="ml-1 hover:bg-amber-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            )}

            {(filters.sortBy !== 'name' || filters.sortOrder !== 'asc') && (
              <Badge variant="outline" className="gap-1 text-xs px-2 py-1 bg-white dark:bg-slate-800 border-purple-300">
                📊 {filters.sortBy === 'name' ? 'Nombre' : 
                     filters.sortBy === 'price' ? 'Precio' : 
                     filters.sortBy === 'stock' ? 'Stock' : 'Categoría'} 
                {filters.sortOrder === 'desc' ? ' ↓' : ' ↑'}
                <button
                  onClick={() => onFiltersChange({ sortBy: 'name', sortOrder: 'asc' })}
                  className="ml-1 hover:bg-purple-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};