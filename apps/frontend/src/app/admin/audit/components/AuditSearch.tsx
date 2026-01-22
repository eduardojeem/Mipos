'use client'

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Clock, 
  User, 
  Database, 
  Activity,
  X,
  History,
  TrendingUp
} from 'lucide-react';

interface AuditSearchProps {
  onSearch: (query: string) => void;
  theme: 'light' | 'dark';
}

interface SearchSuggestion {
  type: 'action' | 'resource' | 'user' | 'recent';
  value: string;
  label: string;
  count?: number;
}

export function AuditSearch({ onSearch, theme }: AuditSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('audit-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Guardar búsquedas recientes
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 10); // Mantener solo las últimas 10
    
    setRecentSearches(updated);
    localStorage.setItem('audit-recent-searches', JSON.stringify(updated));
  };

  // Obtener sugerencias del servidor
  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/audit/suggestions?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      const newSuggestions: SearchSuggestion[] = [
        ...(data.actions || []).map((item: any) => ({
          type: 'action' as const,
          value: item.value,
          label: item.label,
          count: item.count
        })),
        ...(data.resources || []).map((item: any) => ({
          type: 'resource' as const,
          value: item.value,
          label: item.label,
          count: item.count
        })),
        ...(data.users || []).map((item: any) => ({
          type: 'user' as const,
          value: item.value,
          label: item.label,
          count: item.count
        }))
      ];

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce para las sugerencias
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Manejar búsqueda
  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      onSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  // Manejar selección de sugerencia
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    handleSearch(suggestion.value);
  };

  // Manejar teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'action': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'resource': return <Database className="h-4 w-4 text-purple-500" />;
      case 'user': return <User className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSuggestionTypeLabel = (type: string) => {
    switch (type) {
      case 'action': return 'Acción';
      case 'resource': return 'Recurso';
      case 'user': return 'Usuario';
      default: return 'Reciente';
    }
  };

  return (
    <div className="relative">
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardContent className="p-4">
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar por acción, recurso, usuario, IP..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 pr-10"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => {
                      setQuery('');
                      onSearch('');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <Button onClick={() => handleSearch()} disabled={!query.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>

            {/* Búsquedas recientes como badges */}
            {recentSearches.length > 0 && !query && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Búsquedas recientes:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sugerencias */}
      {showSuggestions && (query.length >= 2 || recentSearches.length > 0) && (
        <div
          ref={suggestionsRef}
          className={`absolute top-full left-0 right-0 z-50 mt-1 rounded-md border shadow-lg ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="max-h-80 overflow-y-auto">
            {/* Sugerencias de autocompletado */}
            {suggestions.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-3 w-3" />
                  Sugerencias
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{suggestion.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {getSuggestionTypeLabel(suggestion.type)}
                        </Badge>
                      </div>
                      {suggestion.count && (
                        <span className="text-xs text-gray-500">
                          {suggestion.count} registro{suggestion.count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Búsquedas recientes */}
            {query.length < 2 && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <History className="h-3 w-3" />
                  Búsquedas recientes
                </div>
                {recentSearches.slice(0, 8).map((search, index) => (
                  <button
                    key={index}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    onClick={() => {
                      setQuery(search);
                      handleSearch(search);
                    }}
                  >
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="flex-1 truncate">{search}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Estado de carga */}
            {isLoading && (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Buscando sugerencias...
              </div>
            )}

            {/* Sin resultados */}
            {query.length >= 2 && !isLoading && suggestions.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No se encontraron sugerencias</p>
                <p className="text-xs">Presiona Enter para buscar "{query}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}