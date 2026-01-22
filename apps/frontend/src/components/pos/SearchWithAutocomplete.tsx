'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Package, Tag, Zap, Star, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, cn } from '@/lib/utils';
import type { Product, Category } from '@/types';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface SearchSuggestion {
  id: string;
  type: 'product' | 'category' | 'sku' | 'recent';
  title: string;
  subtitle?: string;
  price?: number;
  category?: string;
  stock?: number;
  data: Product | Category | string;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
}

interface SearchWithAutocompleteProps {
  products: Product[];
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  onProductSelect?: (product: Product) => void;
  onCategorySelect?: (categoryId: string) => void;
  placeholder?: string;
  barcodeMode?: boolean;
  className?: string;
}

export default function SearchWithAutocomplete({
  products,
  categories,
  value,
  onChange,
  onProductSelect,
  onCategorySelect,
  placeholder = "Buscar productos, categorías o SKU...",
  barcodeMode = false,
  className = ""
}: SearchWithAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pos-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Debounced search to improve performance
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setIsLoading(false);
      onChange(query);
    }, 300),
    [onChange]
  );

  // Save recent searches to localStorage
  const saveRecentSearch = (query: string) => {
    if (!query.trim() || query.length < 2) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('pos-recent-searches', JSON.stringify(updated));
  };

  // Enhanced search suggestions with better scoring
  const suggestions = useMemo((): SearchSuggestion[] => {
    if (!value.trim()) {
      // Show recent searches and popular products when no query
      const recentSuggestions = recentSearches.map(search => ({
        id: `recent-${search}`,
        type: 'recent' as const,
        title: search,
        subtitle: 'Búsqueda reciente',
        data: search
      }));

      // Add popular products (high stock or frequently searched)
      const popularProducts = products
        .filter(p => p.stock_quantity > 0)
        .sort((a, b) => b.stock_quantity - a.stock_quantity)
        .slice(0, 3)
        .map(product => {
          const category = categories.find(c => c.id === product.category_id);
          return {
            id: `popular-${product.id}`,
            type: 'product' as const,
            title: product.name,
            subtitle: `${category?.name || 'Sin categoría'} • Popular`,
            price: product.sale_price,
            stock: product.stock_quantity,
            data: product
          };
        });

      return [...recentSuggestions, ...popularProducts];
    }

    const query = value.toLowerCase().trim();
    const results: SearchSuggestion[] = [];

    // Enhanced product matching with scoring
    const matchingProducts = products
      .map(product => {
        const nameMatch = product.name.toLowerCase().includes(query);
        const skuMatch = product.sku?.toLowerCase().includes(query);
        const descMatch = product.description?.toLowerCase().includes(query);
        
        // Calculate relevance score
        let score = 0;
        if (product.name.toLowerCase().startsWith(query)) score += 10;
        else if (nameMatch) score += 5;
        if (product.sku?.toLowerCase() === query) score += 15;
        else if (skuMatch) score += 8;
        if (descMatch) score += 2;
        if (product.stock_quantity > 0) score += 3;
        if (product.stock_quantity > 10) score += 1;

        return { product, score, matches: nameMatch || skuMatch || descMatch };
      })
      .filter(item => item.matches && item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ product }) => {
        const category = categories.find(c => c.id === product.category_id);
        const isLowStock = product.stock_quantity <= (product.min_stock || 5);
        const isOutOfStock = product.stock_quantity === 0;
        
        return {
          id: `product-${product.id}`,
          type: 'product' as const,
          title: product.name,
          subtitle: `${category?.name || 'Sin categoría'} • SKU: ${product.sku || 'N/A'}`,
          price: product.sale_price,
          stock: product.stock_quantity,
          category: category?.name,
          data: product,
          isLowStock,
          isOutOfStock
        };
      });

    results.push(...matchingProducts);

    // Category suggestions
    const matchingCategories = categories
      .filter(category => category.name.toLowerCase().includes(query))
      .slice(0, 3)
      .map(category => ({
        id: `category-${category.id}`,
        type: 'category' as const,
        title: category.name,
        subtitle: 'Categoría',
        data: category
      }));

    results.push(...matchingCategories);

    return results;
  }, [value, products, categories, recentSearches]);

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setIsLoading(true);
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // Clear loading after a short delay if no debounced search
    setTimeout(() => setIsLoading(false), 100);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'product':
      case 'sku':
        const product = suggestion.data as Product;
        onProductSelect?.(product);
        saveRecentSearch(product.name);
        onChange('');
        break;
      case 'category':
        const category = suggestion.data as Category;
        onCategorySelect?.(category.id);
        saveRecentSearch(category.name);
        onChange('');
        break;
      case 'recent':
        const searchTerm = suggestion.data as string;
        onChange(searchTerm);
        break;
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSuggestionSelect(suggestions[highlightedIndex]);
        } else if (value.trim()) {
          handleSearch(value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [isOpen, suggestions, highlightedIndex, value]);



  // Handle search execution
  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      saveRecentSearch(query);
      onChange(query);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onChange, saveRecentSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'product':
      case 'sku':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'category':
        return <Tag className="h-4 w-4 text-green-500" />;
      case 'recent':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('pos-recent-searches');
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" 
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-10 pr-4 h-11 text-base transition-all duration-200",
            barcodeMode && "font-mono tracking-wider",
            className
          )}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-owns={isOpen ? "search-autocomplete" : undefined}
          aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
          aria-label={barcodeMode ? "Escáner de código de barras" : "Búsqueda de productos"}
          aria-describedby="search-help"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              setHighlightedIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Screen reader help text */}
      <div id="search-help" className="sr-only">
        {barcodeMode 
          ? "Escanea un código de barras o escribe para buscar productos"
          : "Escribe para buscar productos o categorías. Usa las flechas para navegar por las sugerencias y Enter para seleccionar."
        }
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 shadow-lg border bg-popover"
          role="listbox"
          id="search-autocomplete"
          aria-label="Sugerencias de búsqueda"
        >
          <CardContent className="p-0">
            <ScrollArea className="max-h-72">
              <div className="p-2 space-y-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    id={`suggestion-${index}`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors motion-reduce:transition-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      index === highlightedIndex && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    tabIndex={-1}
                  >
                    <div className="flex-shrink-0 text-muted-foreground" aria-hidden="true">
                      {suggestion.type === 'product' ? (
                        <Package className="h-4 w-4" />
                      ) : suggestion.type === 'category' ? (
                        <Tag className="h-4 w-4" />
                      ) : suggestion.type === 'sku' ? (
                        <Hash className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {suggestion.title}
                      </div>
                      {suggestion.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {suggestion.subtitle}
                        </div>
                      )}
                    </div>
                    {suggestion.type === 'product' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {suggestion.price && (
                          <span className="text-sm font-medium text-green-600">
                            ${suggestion.price.toFixed(2)}
                          </span>
                        )}
                        {suggestion.stock !== undefined && (
                          <Badge 
                            variant={
                              suggestion.isOutOfStock ? "destructive" :
                              suggestion.isLowStock ? "secondary" : "outline"
                            }
                            className="text-xs"
                            aria-label={`Stock: ${suggestion.stock} unidades`}
                          >
                            {suggestion.stock}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {isOpen && value.trim() && suggestions.length === 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border bg-popover">
          <CardContent className="p-4 text-center text-muted-foreground" role="status" aria-live="polite">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm">No se encontraron resultados</p>
            <p className="text-xs mt-1">
              {barcodeMode 
                ? "Verifica el código de barras escaneado"
                : `Intenta con otros términos de búsqueda`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}