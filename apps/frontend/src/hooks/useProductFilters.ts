import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from './useDebounce';

export interface ProductFilters {
  search: string;
  category: string;
  priceRange: [number, number];
  sortBy: 'name' | 'price' | 'dateAdded' | 'category' | 'stock';
  sortOrder: 'asc' | 'desc';
  showOutOfStock: boolean;
}

export interface UseProductFiltersReturn {
  filters: ProductFilters;
  setFilters: (filters: Partial<ProductFilters>) => void;
  debouncedSearch: string;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const defaultFilters: ProductFilters = {
  search: '',
  category: 'all',
  priceRange: [0, 10000],
  sortBy: 'name',
  sortOrder: 'asc',
  showOutOfStock: true
};

/**
 * Hook para manejar filtros de productos con debounce en búsqueda
 */
export const useProductFilters = (initialFilters?: Partial<ProductFilters>): UseProductFiltersReturn => {
  const [filters, setFiltersState] = useState<ProductFilters>({
    ...defaultFilters,
    ...initialFilters
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  const setFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({ ...defaultFilters, ...initialFilters });
  }, [initialFilters]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.category !== 'all' ||
      filters.priceRange[0] !== defaultFilters.priceRange[0] ||
      filters.priceRange[1] !== defaultFilters.priceRange[1] ||
      filters.sortBy !== defaultFilters.sortBy ||
      filters.sortOrder !== defaultFilters.sortOrder ||
      filters.showOutOfStock !== defaultFilters.showOutOfStock
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    debouncedSearch,
    resetFilters,
    hasActiveFilters
  };
};

/**
 * Hook para aplicar filtros a una lista de productos
 */
export const useFilteredProducts = <T extends { 
  name: string; 
  price: number; 
  category?: string; 
  stock?: number;
  dateAdded?: string;
}>(
  products: T[], 
  filters: ProductFilters,
  debouncedSearch: string
) => {
  return useMemo(() => {
    let filtered = [...products];

    // Filtro de búsqueda
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        (product.category?.toLowerCase().includes(searchLower))
      );
    }

    // Filtro de categoría
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Filtro de rango de precios
    filtered = filtered.filter(product =>
      product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    );

    // Filtro de stock
    if (!filters.showOutOfStock) {
      filtered = filtered.filter(product => (product.stock || 0) > 0);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || '';
          bValue = b.category?.toLowerCase() || '';
          break;
        case 'stock':
          aValue = a.stock || 0;
          bValue = b.stock || 0;
          break;
        case 'dateAdded':
          aValue = new Date(a.dateAdded || 0).getTime();
          bValue = new Date(b.dateAdded || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, filters, debouncedSearch]);
};