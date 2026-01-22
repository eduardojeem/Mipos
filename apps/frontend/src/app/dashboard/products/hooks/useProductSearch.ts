import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { Product } from '@/types';

interface SearchSuggestion {
  id: string;
  type: 'product' | 'category' | 'supplier' | 'sku';
  label: string;
  value: string;
  metadata?: any;
}

interface UseProductSearchOptions {
  products: Product[];
  categories: any[];
  minSearchLength?: number;
  debounceMs?: number;
  maxSuggestions?: number;
}

export function useProductSearch({
  products,
  categories,
  minSearchLength = 2,
  debounceMs = 300,
  maxSuggestions = 10
}: UseProductSearchOptions) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SearchSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  // Generate search suggestions
  const generateSuggestions = useCallback((term: string): SearchSuggestion[] => {
    if (term.length < minSearchLength) return [];

    const suggestions: SearchSuggestion[] = [];
    const termLower = term.toLowerCase();

    // Search in products
    products.forEach(product => {
      // Match by name
      if (product.name?.toLowerCase().includes(termLower)) {
        suggestions.push({
          id: `product-name-${product.id}`,
          type: 'product',
          label: product.name,
          value: product.name,
          metadata: { productId: product.id, type: 'name' }
        });
      }

      // Match by SKU
      if (product.sku?.toLowerCase().includes(termLower)) {
        suggestions.push({
          id: `product-sku-${product.id}`,
          type: 'sku',
          label: `${product.sku} - ${product.name}`,
          value: product.sku,
          metadata: { productId: product.id, type: 'sku' }
        });
      }

      // Match by description
      if (product.description?.toLowerCase().includes(termLower)) {
        suggestions.push({
          id: `product-desc-${product.id}`,
          type: 'product',
          label: `${product.name} (${product.description.substring(0, 50)}...)`,
          value: product.name,
          metadata: { productId: product.id, type: 'description' }
        });
      }
    });

    // Search in categories
    categories.forEach(category => {
      if (category.name?.toLowerCase().includes(termLower)) {
        const productCount = products.filter(p => p.category_id === category.id).length;
        suggestions.push({
          id: `category-${category.id}`,
          type: 'category',
          label: `${category.name} (${productCount} productos)`,
          value: category.name,
          metadata: { categoryId: category.id, productCount }
        });
      }
    });

    // Search in suppliers (if available)
    const suppliers = Array.from(new Set(
      products
        .map(p => p.supplier?.name)
        .filter(Boolean)
    ));

    suppliers.forEach(supplierName => {
      if (supplierName?.toLowerCase().includes(termLower)) {
        const productCount = products.filter(p => p.supplier?.name === supplierName).length;
        suggestions.push({
          id: `supplier-${supplierName}`,
          type: 'supplier',
          label: `${supplierName} (${productCount} productos)`,
          value: supplierName,
          metadata: { supplierName, productCount }
        });
      }
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.label === suggestion.label)
      )
      .slice(0, maxSuggestions);

    return uniqueSuggestions;
  }, [products, categories, minSearchLength, maxSuggestions]);

  // Update suggestions when search term changes
  useEffect(() => {
    if (debouncedSearchTerm.length >= minSearchLength) {
      setIsSearching(true);
      
      // Simulate async search (could be replaced with API call)
      const timeoutId = setTimeout(() => {
        const newSuggestions = generateSuggestions(debouncedSearchTerm);
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
        setIsSearching(false);
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
    }
  }, [debouncedSearchTerm, generateSuggestions, minSearchLength]);

  // Search functions
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setSelectedSuggestion(null);
  }, []);

  const selectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    setSelectedSuggestion(suggestion);
    setSearchTerm(suggestion.value);
    setShowSuggestions(false);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSelectedSuggestion(null);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  const showSuggestionsPanel = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchTerm || searchTerm.length < minSearchLength) {
      return products;
    }

    const termLower = searchTerm.toLowerCase();
    
    return products.filter(product => {
      // If a specific suggestion was selected, use its metadata for precise filtering
      if (selectedSuggestion?.metadata) {
        const { metadata } = selectedSuggestion;
        
        if (metadata.productId) {
          return product.id === metadata.productId;
        }
        
        if (metadata.categoryId) {
          return product.category_id === metadata.categoryId;
        }
        
        if (metadata.supplierName) {
          return product.supplier?.name === metadata.supplierName;
        }
      }

      // General text search
      return (
        product.name?.toLowerCase().includes(termLower) ||
        product.sku?.toLowerCase().includes(termLower) ||
        product.description?.toLowerCase().includes(termLower) ||
        product.category?.name?.toLowerCase().includes(termLower) ||
        product.supplier?.name?.toLowerCase().includes(termLower)
      );
    });
  }, [products, searchTerm, selectedSuggestion, minSearchLength]);

  // Search history (stored in localStorage)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('product-search-history');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const addToHistory = useCallback((term: string) => {
    if (term.length < minSearchLength) return;
    
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
    setSearchHistory(newHistory);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('product-search-history', JSON.stringify(newHistory));
    }
  }, [searchHistory, minSearchLength]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('product-search-history');
    }
  }, []);

  // Popular searches (based on frequency)
  const popularSearches = useMemo(() => {
    const categoryNames = categories.map(c => c.name).slice(0, 5);
    const supplierNames = Array.from(new Set(
      products.map(p => p.supplier?.name).filter(Boolean)
    )).slice(0, 3);
    
    return [...categoryNames, ...supplierNames];
  }, [categories, products]);

  return {
    // State
    searchTerm,
    isSearching,
    suggestions,
    selectedSuggestion,
    showSuggestions,
    filteredProducts,
    searchHistory,
    popularSearches,
    
    // Actions
    handleSearch,
    selectSuggestion,
    clearSearch,
    hideSuggestions,
    showSuggestionsPanel,
    addToHistory,
    clearHistory,
    
    // Computed
    hasResults: filteredProducts.length > 0,
    hasSuggestions: suggestions.length > 0,
    isMinLength: searchTerm.length >= minSearchLength
  };
}