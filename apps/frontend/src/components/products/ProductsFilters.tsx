'use client';

import React, { memo, useCallback, useState } from 'react';
import { Search, Filter, RefreshCw, X } from 'lucide-react';
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

interface ProductsFiltersProps {
  filters: {
    search?: string;
    categoryId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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
  loading = false
}: ProductsFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  
  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(searchValue, 300);
  
  // Update filters when debounced search changes
  React.useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, onFilterChange]);
  
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);
  
  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    onFilterChange({ search: '' });
  }, [onFilterChange]);
  
  const handleCategoryChange = useCallback((categoryId: string) => {
    onFilterChange({ 
      categoryId: categoryId === 'all' ? '' : categoryId 
    });
  }, [onFilterChange]);
  
  const handleSortChange = useCallback((sortBy: string) => {
    onFilterChange({ sortBy });
  }, [onFilterChange]);
  
  const handleSortOrderChange = useCallback(() => {
    const newOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
    onFilterChange({ sortOrder: newOrder });
  }, [filters.sortOrder, onFilterChange]);
  
  const clearAllFilters = useCallback(() => {
    setSearchValue('');
    onFilterChange({
      search: '',
      categoryId: '',
      sortBy: 'updated_at',
      sortOrder: 'desc'
    });
  }, [onFilterChange]);
  
  const hasActiveFilters = Boolean(
    filters.search || 
    filters.categoryId || 
    (filters.sortBy && filters.sortBy !== 'updated_at') ||
    (filters.sortOrder && filters.sortOrder !== 'desc')
  );
  
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Quick Actions Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos por nombre o SKU..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={handleClearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Refresh Button */}
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filters.categoryId || 'all'}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-[180px]">
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
            </div>
            
            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ordenar:</span>
              <Select
                value={filters.sortBy || 'updated_at'}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Fecha</SelectItem>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="sale_price">Precio</SelectItem>
                  <SelectItem value="stock_quantity">Stock</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSortOrderChange}
                className="px-2"
              >
                {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
            
            {/* Active Filters and Clear */}
            <div className="flex items-center gap-2 ml-auto">
              {hasActiveFilters && (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <Filter className="h-3 w-3" />
                    Filtros activos
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Limpiar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});