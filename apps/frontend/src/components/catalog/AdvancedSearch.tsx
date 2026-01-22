'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Package, Tag, Filter, Sparkles, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Product, Category } from '@/types';

interface AdvancedSearchProps {
  products: Product[];
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  onProductSelect?: (product: Product) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  maxSuggestions?: number;
}

interface SearchSuggestion {
  id: string;
  type: 'product' | 'category' | 'tag' | 'recent' | 'popular' | 'brand';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  data?: any;
  score?: number;
}

interface SearchHistory {
  query: string;
  timestamp: number;
  type: 'search' | 'product';
  productId?: string;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  products,
  categories,
  value,
  onChange,
  onProductSelect,
  placeholder = "Buscar productos, categorías, marcas, SKU...",
  className,
  showFilters = true,
  maxSuggestions = 8
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [popularSearches] = useState<string[]>([
    'laptop', 'mouse', 'teclado', 'monitor', 'auriculares', 'smartphone', 'tablet', 'impresora'
  ]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pos-search-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out old entries (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const filtered = parsed.filter((item: SearchHistory) => item.timestamp > thirtyDaysAgo);
        setSearchHistory(filtered);
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = useCallback((history: SearchHistory[]) => {
    try {
      localStorage.setItem('pos-search-history', JSON.stringify(history.slice(0, 15)));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, []);

  // Add to search history
  const addToHistory = useCallback((query: string, type: 'search' | 'product' = 'search', productId?: string) => {
    if (!query.trim() || query.length < 2) return;
    
    const newEntry: SearchHistory = {
      query: query.trim(),
      timestamp: Date.now(),
      type,
      productId
    };

    setSearchHistory(prev => {
      const filtered = prev.filter(item => 
        !(item.query.toLowerCase() === query.toLowerCase() && item.type === type)
      );
      const updated = [newEntry, ...filtered].slice(0, 15);
      saveSearchHistory(updated);
      return updated;
    });
  }, [saveSearchHistory]);

  // Generate search suggestions with improved scoring
  const suggestions = useMemo(() => {
    if (!value.trim()) {
      const recentSuggestions: SearchSuggestion[] = searchHistory
        .slice(0, 4)
        .map((item, index) => ({
          id: `recent-${index}`,
          type: 'recent' as const,
          title: item.query,
          subtitle: item.type === 'product' ? 'Producto visitado' : 'Búsqueda reciente',
          icon: <Clock className="h-4 w-4" />,
          data: item,
          score: 100 - index
        }));

      const popularSuggestions: SearchSuggestion[] = popularSearches
        .slice(0, 4)
        .map((query, index) => ({
          id: `popular-${index}`,
          type: 'popular' as const,
          title: query,
          subtitle: 'Búsqueda popular',
          icon: <TrendingUp className="h-4 w-4" />,
          data: { query },
          score: 50 - index
        }));

      return [...recentSuggestions, ...popularSuggestions].slice(0, maxSuggestions);
    }

    const query = value.toLowerCase().trim();
    const allSuggestions: SearchSuggestion[] = [];

    // Product suggestions with enhanced scoring
    products.forEach(product => {
      let score = 0;
      const name = product.name.toLowerCase();
      const description = product.description?.toLowerCase() || '';
      const sku = product.sku?.toLowerCase() || '';

      // Exact match gets highest score
      if (name === query) score += 100;
      else if (name.startsWith(query)) score += 80;
      else if (name.includes(query)) score += 60;
      
      // SKU matching
      if (sku === query) score += 90;
      else if (sku.includes(query)) score += 70;
      
      // Description matching
      if (description.includes(query)) score += 30;

      // Boost score for popular/recent products
      if (product.stock_quantity && product.stock_quantity > 0) score += 10;
      
      if (score > 0) {
        allSuggestions.push({
          id: `product-${product.id}`,
          type: 'product',
          title: product.name,
          subtitle: `SKU: ${product.sku} • $${product.sale_price}`,
          icon: <Package className="h-4 w-4" />,
          data: product,
          score
        });
      }
    });

    // Category suggestions
    categories.forEach(category => {
      const name = category.name.toLowerCase();
      let score = 0;

      if (name === query) score += 90;
      else if (name.startsWith(query)) score += 70;
      else if (name.includes(query)) score += 50;

      if (score > 0) {
        allSuggestions.push({
          id: `category-${category.id}`,
          type: 'category',
          title: category.name,
          subtitle: 'Categoría',
          icon: <Tag className="h-4 w-4" />,
          data: category,
          score
        });
      }
    });

    // Sort by score and limit results
    return allSuggestions
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, maxSuggestions);
  }, [value, products, categories, searchHistory, popularSearches, maxSuggestions]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'product':
        addToHistory(suggestion.title, 'product', suggestion.data.id);
        onProductSelect?.(suggestion.data);
        onChange(suggestion.title);
        break;
      case 'category':
        addToHistory(suggestion.title);
        onChange(`categoría:${suggestion.data.name}`);
        break;
      case 'brand':
        addToHistory(suggestion.title);
        onChange(`marca:${suggestion.data.brand}`);
        break;
      case 'recent':
      case 'popular':
        onChange(suggestion.title);
        break;
      default:
        onChange(suggestion.title);
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [addToHistory, onChange, onProductSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else if (value.trim()) {
          handleSearch(value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, suggestions, selectedIndex, value]);



  // Handle search execution
  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      addToHistory(query, 'search');
      onChange(query);
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [onChange, addToHistory]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
    setIsOpen(true);
  }, [onChange]);

  // Handle clear search
  const handleClear = useCallback(() => {
    onChange('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('pos-search-history');
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          className="pl-10 pr-10"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-owns={isOpen ? "search-suggestions" : undefined}
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
          aria-label="Búsqueda avanzada de productos"
          aria-describedby="search-help"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              setSelectedIndex(-1);
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
        Escribe para buscar productos, categorías o marcas. Usa las flechas para navegar por las sugerencias y Enter para seleccionar.
      </div>

      {/* Suggestions dropdown */}
      {isOpen && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 shadow-lg border bg-popover"
          role="listbox"
          id="search-suggestions"
          aria-label="Sugerencias de búsqueda"
        >
          <CardContent className="p-0">
            {suggestions.length > 0 ? (
              <ScrollArea className="max-h-80">
                <div className="p-2 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.id}
                      id={`suggestion-${index}`}
                      role="option"
                      aria-selected={index === selectedIndex}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                        index === selectedIndex && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      tabIndex={-1}
                    >
                      <div className="flex-shrink-0 text-muted-foreground" aria-hidden="true">
                        {suggestion.icon || (
                          suggestion.type === 'product' ? <Package className="h-4 w-4" /> :
                          suggestion.type === 'category' ? <Tag className="h-4 w-4" /> :
                          suggestion.type === 'recent' ? <Clock className="h-4 w-4" /> :
                          suggestion.type === 'popular' ? <TrendingUp className="h-4 w-4" /> :
                          <Search className="h-4 w-4" />
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
                      {suggestion.type === 'product' && suggestion.data?.stock !== undefined && (
                        <Badge 
                          variant={suggestion.data.stock > 0 ? "secondary" : "destructive"}
                          className="text-xs"
                          aria-label={`Stock: ${suggestion.data.stock} unidades`}
                        >
                          {suggestion.data.stock}
                        </Badge>
                      )}
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : value.trim() ? (
              <div className="p-4 text-center text-muted-foreground" role="status" aria-live="polite">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm">No se encontraron sugerencias</p>
                <p className="text-xs mt-1">Presiona Enter para buscar "{value}"</p>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Búsquedas recientes</span>
                  {searchHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-6 text-xs"
                      aria-label="Limpiar historial de búsquedas"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>

                {searchHistory.length === 0 && (
                  <p className="text-xs">Comienza a escribir para ver sugerencias</p>
                )}
              </div>
            )}

            {showFilters && value.trim() && (
              <>
                <Separator />
                <div className="p-3 bg-muted/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Filter className="h-3 w-3" />
                    <span>Filtros rápidos:</span>
                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                      en stock
                    </Badge>
                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                      con descuento
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedSearch;