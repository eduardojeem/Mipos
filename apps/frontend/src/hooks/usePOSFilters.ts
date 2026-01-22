import { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import type { Product, Category } from '@/types';

interface UsePOSFiltersOptions {
  products: Product[];
  categories: Category[];
}

export function usePOSFilters({ products, categories }: UsePOSFiltersOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.toLowerCase().trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Defer rendering updates for debounced search to keep UI responsive
  const deferredQuery = useDeferredValue(debouncedQuery);

  const filteredProducts = useMemo(() => {
    let filtered = Array.isArray(products) ? products : [];

    // Filter by search query
    if (deferredQuery) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(deferredQuery) ||
        product.sku?.toLowerCase().includes(deferredQuery) ||
        product.barcode?.toLowerCase().includes(deferredQuery)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    // Sort products
    const getPrice = (p: any) => {
      return (
        (typeof p.sale_price === 'number' ? p.sale_price : undefined) ??
        (typeof p.regular_price === 'number' ? p.regular_price : undefined) ??
        (typeof p.retail_price === 'number' ? p.retail_price : undefined) ??
        (typeof p.price === 'number' ? p.price : undefined) ??
        0
      );
    };

    const compare = (a: any, b: any) => {
      let valA = 0; let valB = 0;
      if (sortBy === 'name') {
        valA = (a.name || '').localeCompare(b.name || '');
        valB = 0; // unused
        // For name, we use localeCompare directly
        return sortOrder === 'asc' ? valA : -valA;
      }
      if (sortBy === 'price') {
        valA = getPrice(a);
        valB = getPrice(b);
      } else if (sortBy === 'stock') {
        valA = a.stock_quantity ?? 0;
        valB = b.stock_quantity ?? 0;
      }
      const result = valA === valB ? 0 : valA > valB ? 1 : -1;
      return sortOrder === 'asc' ? result : -result;
    };

    return filtered.slice().sort(compare);
  }, [products, deferredQuery, selectedCategory, sortBy, sortOrder]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('name');
    setSortOrder('asc');
  }, []);

  return {
    // State
    searchQuery,
    selectedCategory,
    debouncedQuery,
    deferredQuery,
    sortBy,
    sortOrder,

    // Computed
    filteredProducts,
    categories,

    // Actions
    handleSearchChange,
    handleCategoryChange,
    setSortBy,
    setSortOrder,
    clearFilters,
  };
}