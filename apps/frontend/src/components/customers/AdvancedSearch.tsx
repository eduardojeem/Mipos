'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  X, 
  Clock, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  ChevronDown,
  Check,
  Plus,
  Minus,
  Info,
  BookOpen,
  Settings
} from 'lucide-react';
import { customerService, UICustomer, CustomerFilters } from '@/lib/customer-service';
import { useToast } from '@/components/ui/use-toast';

interface AdvancedSearchProps {
  customers: UICustomer[];
  onSearchResults: (results: UICustomer[]) => void;
  onFiltersChange: (filters: CustomerFilters) => void;
  currentFilters: CustomerFilters;
}

interface SearchStats {
  totalResults: number;
  searchTime: number;
  searchFields: string[];
}

export default function AdvancedSearch({ 
  customers, 
  onSearchResults, 
  onFiltersChange, 
  currentFilters 
}: AdvancedSearchProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchStats, setSearchStats] = useState<SearchStats>({
    totalResults: customers.length,
    searchTime: 0,
    searchFields: []
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [complexFilterMode, setComplexFilterMode] = useState(false);
  const [complexFilter, setComplexFilter] = useState('');
  const [savedSearches, setSavedSearches] = useState<Array<{
    id: string;
    name: string;
    query: string;
    filters: CustomerFilters;
    createdAt: string;
  }>>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Cargar búsquedas guardadas del localStorage
    const saved = localStorage.getItem('savedCustomerSearches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, currentFilters]);

  const handleSearch = () => {
    if (complexFilterMode && complexFilter) {
      // Búsqueda con filtros complejos
      const results = customerService.searchWithComplexFilters(customers, complexFilter);
      onSearchResults(results);
      setSearchStats({
        totalResults: results.length,
        searchTime: 0,
        searchFields: ['complex']
      });
    } else {
      // Búsqueda inteligente con sugerencias
      const searchResult = customerService.searchCustomersWithSuggestions(customers, searchQuery);
      
      // Aplicar filtros adicionales
      const filteredResults = customerService.filterCustomersAdvanced(searchResult.results, currentFilters);
      
      onSearchResults(filteredResults);
      setSuggestions(searchResult.suggestions);
      setSearchStats({
        totalResults: filteredResults.length,
        searchTime: searchResult.searchStats.searchTime,
        searchFields: searchResult.searchStats.searchFields
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setComplexFilter('');
    onSearchResults(customers);
    setSearchStats({
      totalResults: customers.length,
      searchTime: 0,
      searchFields: []
    });
  };

  const saveCurrentSearch = () => {
    if (!searchName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la búsqueda",
        variant: "destructive"
      });
      return;
    }

    const newSearch = {
      id: Date.now().toString(),
      name: searchName,
      query: complexFilterMode ? complexFilter : searchQuery,
      filters: currentFilters,
      createdAt: new Date().toISOString()
    };

    const updatedSearches = [...savedSearches, newSearch];
    setSavedSearches(updatedSearches);
    localStorage.setItem('savedCustomerSearches', JSON.stringify(updatedSearches));
    
    setSearchName('');
    setShowSaveDialog(false);
    
    toast({
      title: "Búsqueda guardada",
      description: `La búsqueda "${newSearch.name}" ha sido guardada exitosamente`
    });
  };

  const loadSavedSearch = (search: any) => {
    if (search.query.includes(':') || search.query.includes('AND') || search.query.includes('OR')) {
      setComplexFilterMode(true);
      setComplexFilter(search.query);
      setSearchQuery('');
    } else {
      setComplexFilterMode(false);
      setSearchQuery(search.query);
      setComplexFilter('');
    }
    
    onFiltersChange(search.filters);
    
    toast({
      title: "Búsqueda cargada",
      description: `Se ha cargado la búsqueda "${search.name}"`
    });
  };

  const deleteSavedSearch = (searchId: string) => {
    const updatedSearches = savedSearches.filter(s => s.id !== searchId);
    setSavedSearches(updatedSearches);
    localStorage.setItem('savedCustomerSearches', JSON.stringify(updatedSearches));
    
    toast({
      title: "Búsqueda eliminada",
      description: "La búsqueda guardada ha sido eliminada"
    });
  };

  const getFieldDisplayName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      name: 'Nombre',
      email: 'Email',
      phone: 'Teléfono',
      address: 'Dirección',
      tax_id: 'RUC/CI',
      customer_code: 'Código',
      notes: 'Notas',
      tags: 'Etiquetas'
    };
    return fieldNames[field] || field;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Búsqueda Avanzada
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                disabled={!searchQuery && !complexFilter}
              >
                <Plus className="h-4 w-4 mr-1" />
                Guardar
              </Button>
              <Switch
                checked={complexFilterMode}
                onCheckedChange={setComplexFilterMode}
              />
              <Label className="text-sm">Modo Avanzado</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={complexFilterMode ? "complex" : "simple"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="simple" 
                onClick={() => setComplexFilterMode(false)}
              >
                Búsqueda Simple
              </TabsTrigger>
              <TabsTrigger 
                value="complex" 
                onClick={() => setComplexFilterMode(true)}
              >
                Filtros Complejos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="simple" className="space-y-4">
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Buscar por nombre, email, teléfono, código, dirección..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="pl-10 pr-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={clearSearch}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sugerencias */}
                {showSuggestions && suggestions.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 z-50 mt-1">
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        {suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            className="w-full justify-start text-left h-auto p-2"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <Search className="h-4 w-4 mr-2 text-gray-400" />
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Estadísticas de búsqueda */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{searchStats.totalResults} resultados</span>
                </div>
                {searchStats.searchTime > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{searchStats.searchTime}ms</span>
                  </div>
                )}
                {searchStats.searchFields.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span>Campos: {searchStats.searchFields.map(getFieldDisplayName).join(', ')}</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="complex" className="space-y-4">
              <div>
                <Label htmlFor="complex-filter">Expresión de Filtro</Label>
                <Input
                  id="complex-filter"
                  placeholder="Ej: type:vip AND spent:>1000 OR tags:premium"
                  value={complexFilter}
                  onChange={(e) => setComplexFilter(e.target.value)}
                  className="font-mono"
                />
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Operadores disponibles:</strong></p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>• <code>type:vip</code> - Tipo de cliente</div>
                    <div>• <code>spent:&gt;1000</code> - Gasto mayor a</div>
                    <div>• <code>orders:&lt;=5</code> - Órdenes menor o igual</div>
                    <div>• <code>tags:premium</code> - Contiene etiqueta</div>
                  </div>
                  <p className="mt-2"><strong>Conectores:</strong> AND, OR</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Búsquedas guardadas */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Búsquedas Guardadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedSearches.map((search) => (
                <div key={search.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{search.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {new Date(search.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 font-mono">{search.query}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSavedSearch(search)}
                    >
                      Cargar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => deleteSavedSearch(search.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para guardar búsqueda */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Guardar Búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search-name">Nombre de la búsqueda</Label>
                <Input
                  id="search-name"
                  placeholder="Ej: Clientes VIP activos"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Consulta:</strong> {complexFilterMode ? complexFilter : searchQuery}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={saveCurrentSearch}>
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}