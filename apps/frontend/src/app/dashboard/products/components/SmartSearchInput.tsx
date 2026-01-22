'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  Package, 
  Tag, 
  Building2,
  Loader2,
  History
} from 'lucide-react';
import { useProductSearch } from '../hooks/useProductSearch';
import { cn } from '@/lib/utils';

interface SmartSearchInputProps {
  products: any[];
  categories: any[];
  onSearchChange: (term: string) => void;
  onProductSelect?: (productId: string) => void;
  placeholder?: string;
  className?: string;
}

export function SmartSearchInput({
  products,
  categories,
  onSearchChange,
  onProductSelect,
  placeholder = "Buscar productos, categorías, proveedores...",
  className
}: SmartSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const {
    searchTerm,
    isSearching,
    suggestions,
    showSuggestions,
    searchHistory,
    popularSearches,
    handleSearch,
    selectSuggestion,
    clearSearch,
    hideSuggestions,
    showSuggestionsPanel,
    addToHistory,
    clearHistory,
    hasSuggestions
  } = useProductSearch({
    products,
    categories,
    minSearchLength: 1,
    debounceMs: 200,
    maxSuggestions: 8
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

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
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            const suggestion = suggestions[highlightedIndex];
            selectSuggestion(suggestion);
            addToHistory(suggestion.value);
            onSearchChange(suggestion.value);
            if (suggestion.metadata?.productId && onProductSelect) {
              onProductSelect(suggestion.metadata.productId);
            }
          } else if (searchTerm) {
            addToHistory(searchTerm);
            onSearchChange(searchTerm);
            hideSuggestions();
          }
          break;
        case 'Escape':
          hideSuggestions();
          inputRef.current?.blur();
          break;
      }
    };

    if (isFocused) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [
    showSuggestions, 
    suggestions, 
    highlightedIndex, 
    searchTerm, 
    isFocused,
    selectSuggestion,
    addToHistory,
    onSearchChange,
    onProductSelect,
    hideSuggestions
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleSearch(value);
    onSearchChange(value);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    showSuggestionsPanel();
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setIsFocused(false);
      hideSuggestions();
    }, 200);
  };

  const handleSuggestionClick = (suggestion: any, index: number) => {
    selectSuggestion(suggestion);
    addToHistory(suggestion.value);
    onSearchChange(suggestion.value);
    
    if (suggestion.metadata?.productId && onProductSelect) {
      onProductSelect(suggestion.metadata.productId);
    }
    
    inputRef.current?.blur();
  };

  const handleHistoryClick = (term: string) => {
    handleSearch(term);
    onSearchChange(term);
    addToHistory(term);
    inputRef.current?.blur();
  };

  const handleClearSearch = () => {
    clearSearch();
    onSearchChange('');
    inputRef.current?.focus();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return Package;
      case 'category': return Tag;
      case 'supplier': return Building2;
      case 'sku': return Package;
      default: return Search;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product': return 'text-blue-600 bg-blue-50';
      case 'category': return 'text-green-600 bg-green-50';
      case 'supplier': return 'text-purple-600 bg-purple-50';
      case 'sku': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const shouldShowPanel = isFocused && (
    hasSuggestions || 
    searchHistory.length > 0 || 
    (searchTerm.length === 0 && popularSearches.length > 0)
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-10 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Suggestions panel */}
      {shouldShowPanel && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden shadow-lg">
          <CardContent className="p-0">
            {/* Search suggestions */}
            {hasSuggestions && (
              <div className="border-b">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                  Sugerencias
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, index) => {
                    const Icon = getTypeIcon(suggestion.type);
                    const isHighlighted = index === highlightedIndex;
                    
                    return (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion, index)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                          isHighlighted ? "bg-accent" : "hover:bg-accent/50"
                        )}
                      >
                        <div className={cn("p-1 rounded", getTypeColor(suggestion.type))}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {suggestion.label}
                          </div>
                          {suggestion.metadata?.productCount && (
                            <div className="text-xs text-muted-foreground">
                              {suggestion.metadata.productCount} productos
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.type === 'sku' ? 'SKU' : 
                           suggestion.type === 'product' ? 'Producto' :
                           suggestion.type === 'category' ? 'Categoría' : 'Proveedor'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search history */}
            {searchHistory.length > 0 && searchTerm.length === 0 && (
              <div className="border-b">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <History className="h-3 w-3" />
                    Búsquedas recientes
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpiar
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {searchHistory.slice(0, 5).map((term, index) => (
                    <div
                      key={index}
                      onClick={() => handleHistoryClick(term)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{term}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular searches */}
            {popularSearches.length > 0 && searchTerm.length === 0 && !hasSuggestions && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Búsquedas populares
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.slice(0, 6).map((term, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => handleHistoryClick(term)}
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* No results */}
            {searchTerm.length > 0 && !hasSuggestions && !isSearching && (
              <div className="px-3 py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron resultados para "{searchTerm}"</p>
                <p className="text-xs mt-1">Intenta con otros términos de búsqueda</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}