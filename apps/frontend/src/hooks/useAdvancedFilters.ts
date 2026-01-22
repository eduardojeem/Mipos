'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export interface ProductFilters {
  search: string;
  category: string;
  priceRange: [number, number];
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'critical';
  sortBy: 'name' | 'price' | 'stock' | 'category' | 'created_at';
  sortOrder: 'asc' | 'desc';
  dateRange: {
    from?: Date;
    to?: Date;
  };
  hasDiscount: boolean | null;
  tags: string[];
  // Filtros específicos de cosméticos
  brand?: string | null;
  skinType?: string | null;
  finish?: string | null;
  coverage?: string | null;
  waterproof?: boolean | null;
  vegan?: boolean | null;
  crueltyFree?: boolean | null;
  spfRange?: string | null;
}

const DEFAULT_FILTERS: ProductFilters = {
  search: '',
  category: 'all',
  priceRange: [0, 10000],
  stockStatus: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  dateRange: {},
  hasDiscount: null,
  tags: [],
  // Valores por defecto para filtros de cosméticos
  brand: null,
  skinType: null,
  finish: null,
  coverage: null,
  waterproof: null,
  vegan: null,
  crueltyFree: null,
  spfRange: null
};

export const useAdvancedFilters = (storageKey = 'product-filters') => {
  // Cargar filtros desde localStorage
  const [filters, setFilters] = useState<ProductFilters>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_FILTERS, ...parsed };
        }
      } catch (error) {
        console.warn('Error loading filters from localStorage:', error);
      }
    }
    return DEFAULT_FILTERS;
  });

  // Debounce para la búsqueda
  const debouncedSearch = useDebounce(filters.search, 300);

  // Guardar filtros en localStorage cuando cambien
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filters));
      } catch (error) {
        console.warn('Error saving filters to localStorage:', error);
      }
    }
  }, [filters, storageKey]);

  // Función para actualizar filtros
  const updateFilter = <K extends keyof ProductFilters>(
    key: K,
    value: ProductFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Función para resetear filtros
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Función para obtener filtros activos (no por defecto)
  const getActiveFilters = useMemo(() => {
    const active: Partial<ProductFilters> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      const defaultValue = DEFAULT_FILTERS[key as keyof ProductFilters];
      
      if (key === 'priceRange') {
        const [min, max] = value as [number, number];
        const [defaultMin, defaultMax] = defaultValue as [number, number];
        if (min !== defaultMin || max !== defaultMax) {
          active[key as keyof ProductFilters] = value;
        }
      } else if (key === 'dateRange') {
        const range = value as { from?: Date; to?: Date };
        if (range.from || range.to) {
          active[key as keyof ProductFilters] = value;
        }
      } else if (key === 'tags') {
        const tags = value as string[];
        if (tags.length > 0) {
          active[key as keyof ProductFilters] = value;
        }
      } else if (value !== defaultValue) {
        active[key as keyof ProductFilters] = value;
      }
    });
    
    return active;
  }, [filters]);

  // Contador de filtros activos
  const activeFiltersCount = Object.keys(getActiveFilters).length;

  // Función para aplicar filtros a una lista de productos
  const applyFilters = <T extends any>(products: T[], filterFn: (product: T, filters: ProductFilters & { debouncedSearch: string }) => boolean) => {
    return products.filter(product => 
      filterFn(product, { ...filters, debouncedSearch })
    );
  };

  return {
    filters,
    debouncedSearch,
    updateFilter,
    resetFilters,
    getActiveFilters,
    activeFiltersCount,
    applyFilters
  };
};

// Hook para sugerencias de búsqueda
export const useSearchSuggestions = (products: any[], searchTerm: string) => {
  return useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const suggestions = new Set<string>();
    const term = searchTerm.toLowerCase();

    products.forEach(product => {
      // Sugerencias de nombres de productos
      if (product.name?.toLowerCase().includes(term)) {
        suggestions.add(product.name);
      }
      
      // Sugerencias de categorías
      if (product.category?.name?.toLowerCase().includes(term)) {
        suggestions.add(product.category.name);
      }
      
      // Sugerencias de SKU
      if (product.sku?.toLowerCase().includes(term)) {
        suggestions.add(product.sku);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }, [products, searchTerm]);
};