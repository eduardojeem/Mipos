'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown,
  Package,
  DollarSign,
  Calendar,
  Tag,
  Building,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useProducts } from '../contexts/ProductsContext';

export function EnhancedProductsFilters() {
  const { filters, categories, actions, computed } = useProducts();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);

  // Simple debounce implementation
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedUpdateFilters = useCallback((newFilters: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      actions.updateFilters(newFilters);
    }, 300);
  }, [actions.updateFilters]);

  const stockStatusOptions = [
    { value: 'all', label: 'Todos los estados', icon: Package },
    { value: 'in_stock', label: 'En Stock', icon: Package },
    { value: 'low_stock', label: 'Stock Bajo', icon: Package },
    { value: 'out_of_stock', label: 'Sin Stock', icon: Package },
    { value: 'critical', label: 'Crítico', icon: Package }
  ];

  const sortOptions = [
    { value: 'name', label: 'Nombre' },
    { value: 'created_at', label: 'Fecha de creación' },
    { value: 'sale_price', label: 'Precio' },
    { value: 'stock_quantity', label: 'Stock' },
    { value: 'category', label: 'Categoría' }
  ];

  const handleClearFilters = () => {
    actions.updateFilters({
      search: '',
      categoryId: '',
      supplierId: '',
      minPrice: undefined,
      maxPrice: undefined,
      minStock: undefined,
      maxStock: undefined,
      isActive: undefined,
      dateFrom: '',
      dateTo: '',
      stockStatus: undefined,
      sortBy: 'name',
      sortOrder: 'asc',
      tags: [],
      hasImages: undefined
    });
    setPriceRange([0, 1000000]);
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== '' && value !== null
  ).length;

  return (
    <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
      <CardContent className="p-6 space-y-6">
        {/* Búsqueda Principal */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <Input
                placeholder="Buscar productos por nombre, SKU, descripción..."
                value={filters.search || ''}
                onChange={(e) => debouncedUpdateFilters({ search: e.target.value })}
                className="pl-12 h-12 bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50 text-base"
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => actions.updateFilters({ search: '' })}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex gap-3">
            <Select 
              value={filters.categoryId || 'all'} 
              onValueChange={(value) => actions.updateFilters({ categoryId: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-48 bg-white/50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Categoría" />
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

            <Select 
              value={filters.stockStatus || 'all'} 
              onValueChange={(value) => actions.updateFilters({ stockStatus: value === 'all' ? undefined : value as any })}
            >
              <SelectTrigger className="w-40 bg-white/50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                {stockStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="bg-white/50 dark:bg-zinc-900/50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Avanzado
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Filtros Activos */}
        <AnimatePresence>
          {computed.hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100 mr-2">
                Filtros activos:
              </span>
              
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Búsqueda: "{filters.search}"
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => actions.updateFilters({ search: '' })}
                  />
                </Badge>
              )}

              {filters.categoryId && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Categoría: {categories.find(c => c.id === filters.categoryId)?.name}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => actions.updateFilters({ categoryId: '' })}
                  />
                </Badge>
              )}

              {filters.stockStatus && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Stock: {stockStatusOptions.find(s => s.value === filters.stockStatus)?.label}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => actions.updateFilters({ stockStatus: undefined })}
                  />
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Limpiar todo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtros Avanzados */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 border-t border-border/40 dark:border-white/5 pt-6"
            >
              {/* Rango de Precios */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Rango de Precios
                </label>
                <div className="px-3">
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    max={1000000}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                    <span>${priceRange[0].toLocaleString()}</span>
                    <span>${priceRange[1].toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Rango de Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Stock Mínimo
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minStock || ''}
                    onChange={(e) => debouncedUpdateFilters({ minStock: e.target.value ? Number(e.target.value) : undefined })}
                    className="bg-white/50 dark:bg-zinc-900/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Stock Máximo
                  </label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={filters.maxStock || ''}
                    onChange={(e) => debouncedUpdateFilters({ maxStock: e.target.value ? Number(e.target.value) : undefined })}
                    className="bg-white/50 dark:bg-zinc-900/50"
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Desde
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => debouncedUpdateFilters({ dateFrom: e.target.value })}
                    className="bg-white/50 dark:bg-zinc-900/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Hasta
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => debouncedUpdateFilters({ dateTo: e.target.value })}
                    className="bg-white/50 dark:bg-zinc-900/50"
                  />
                </div>
              </div>

              {/* Ordenamiento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Ordenar por
                  </label>
                  <Select 
                    value={filters.sortBy || 'name'} 
                    onValueChange={(value) => actions.updateFilters({ sortBy: value })}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-zinc-900/50">
                      <SelectValue />
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Orden
                  </label>
                  <Select 
                    value={filters.sortOrder || 'asc'} 
                    onValueChange={(value) => actions.updateFilters({ sortOrder: value as 'asc' | 'desc' })}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-zinc-900/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascendente</SelectItem>
                      <SelectItem value="desc">Descendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resultados */}
        <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            {computed.filteredProducts.length} productos encontrados
            {computed.hasActiveFilters && (
              <span className="text-blue-600 dark:text-blue-400 ml-1">(filtrados)</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.refetch}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}