'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  SlidersHorizontal,
  Calendar,
  DollarSign,
  Package,
  Tag,
  RotateCcw,
  Save,
  BookmarkPlus,
  Bookmark
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { DatePicker } from '@/components/ui/date-picker';

interface Product {
  id: string;
  name: string;
  code?: string;
  description?: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  discount_percentage?: number;
  createdAt: Date;
  updatedAt: Date;
  is_active?: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface SearchFilters {
  searchTerm: string;
  categoryIds: string[];
  supplierId?: string;
  supplierName?: string;
  priceRange: [number, number];
  stockRange: [number, number];
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'critical';
  hasDiscount: boolean | null;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  state: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'price' | 'stock' | 'category' | 'created' | 'updated';
  sortOrder: 'asc' | 'desc';
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
}

interface AdvancedSearchProps {
  products: Product[];
  categories: Category[];
  onFiltersChange: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
}

const defaultFilters: SearchFilters = {
  searchTerm: '',
  categoryIds: [],
  supplierId: undefined,
  supplierName: '',
  priceRange: [0, 1000],
  stockRange: [0, 1000],
  stockStatus: 'all',
  hasDiscount: null,
  dateRange: {},
  state: 'all',
  sortBy: 'name',
  sortOrder: 'asc'
};

export default function AdvancedSearch({ 
  products, 
  categories, 
  onFiltersChange, 
  initialFilters 
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    ...defaultFilters,
    ...initialFilters
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchInput, setSearchInput] = useState(filters.searchTerm);

  useEffect(() => {
    const t = setTimeout(() => {
      if (filters.searchTerm !== searchInput) {
        const next = { ...filters, searchTerm: searchInput } as SearchFilters;
        setFilters(next);
        onFiltersChange(next);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, filters, onFiltersChange]);

  // Calcular rangos dinámicos basados en los productos
  const priceRange = useMemo(() => {
    if (products.length === 0) return [0, 1000];
    const prices = products.map(p => p.price);
    return [Math.min(...prices), Math.max(...prices)];
  }, [products]);

  const stockRange = useMemo(() => {
    if (products.length === 0) return [0, 1000];
    const stocks = products.map(p => p.stock);
    return [Math.min(...stocks), Math.max(...stocks)];
  }, [products]);

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p: any) => {
      const id = p.supplier_id;
      const name = p.supplier?.name;
      if (id && name && !map.has(id)) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // Filtrar productos basado en los criterios
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Búsqueda por texto
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(product => {
        const name = (product.name || '').toLowerCase();
        const code = ((product.code as string | undefined) ?? (product as any).sku ?? '').toLowerCase();
        const desc = (product.description || '').toLowerCase();
        const categoryName = (product.category?.name || '').toLowerCase();
        const supplierName = ((product as any).supplier?.name || '').toLowerCase();
        return (
          name.includes(searchLower) ||
          code.includes(searchLower) ||
          desc.includes(searchLower) ||
          categoryName.includes(searchLower) ||
          supplierName.includes(searchLower)
        );
      });
    }

    // Filtro por proveedor
    if (filters.supplierId) {
      filtered = filtered.filter(product => (product as any).supplier_id === filters.supplierId);
    }

    if (filters.supplierName && filters.supplierName.trim().length > 0) {
      const nameLower = filters.supplierName.toLowerCase();
      filtered = filtered.filter(product => (product as any).supplier?.name?.toLowerCase().includes(nameLower));
    }

    // Filtro por categorías
    if (filters.categoryIds.length > 0) {
      filtered = filtered.filter(product =>
        filters.categoryIds.includes(product.categoryId)
      );
    }

    // Filtro por rango de precios
    filtered = filtered.filter(product =>
      product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    );

    // Filtro por rango de stock
    filtered = filtered.filter(product =>
      product.stock >= filters.stockRange[0] && product.stock <= filters.stockRange[1]
    );

    // Filtro por estado de stock
    if (filters.stockStatus !== 'all') {
      filtered = filtered.filter(product => {
        switch (filters.stockStatus) {
          case 'in_stock':
            return product.stock > product.minStock;
          case 'low_stock':
            return product.stock <= product.minStock && product.stock > 0;
          case 'out_of_stock':
            return product.stock === 0;
          case 'critical':
            return product.stock <= product.minStock * 0.5;
          default:
            return true;
        }
      });
    }

    // Filtro por estado activo/inactivo
    if (filters.state !== 'all') {
      const desired = filters.state === 'active';
      filtered = filtered.filter(product => {
        if (typeof product.is_active === 'boolean') return product.is_active === desired;
        return true;
      });
    }

    // Filtro por descuento
    if (filters.hasDiscount !== null) {
      filtered = filtered.filter(product =>
        filters.hasDiscount 
          ? (product.discount_percentage && product.discount_percentage > 0)
          : (!product.discount_percentage || product.discount_percentage === 0)
      );
    }

    // Filtro por fecha
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(product => {
        const productDate = new Date(product.createdAt);
        if (filters.dateRange.from && productDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && productDate > filters.dateRange.to) return false;
        return true;
      });
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'stock':
          aValue = a.stock;
          bValue = b.stock;
          break;
        case 'category':
          aValue = a.category?.name.toLowerCase() || '';
          bValue = b.category?.name.toLowerCase() || '';
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updated':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, filters]);

  const emitFilters = (next: SearchFilters) => {
    onFiltersChange(next);
  };

  // Actualizar rangos cuando cambien los filtros iniciales
  useEffect(() => {
    if (filters.priceRange[1] === 1000 && priceRange[1] !== 1000) {
      setFilters(prev => ({
        ...prev,
        priceRange: [priceRange[0], priceRange[1]]
      }));
    }
    if (filters.stockRange[1] === 1000 && stockRange[1] !== 1000) {
      setFilters(prev => ({
        ...prev,
        stockRange: [stockRange[0], stockRange[1]]
      }));
    }
  }, [priceRange, stockRange, filters.priceRange, filters.stockRange]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const next = { ...filters, [key]: value } as SearchFilters;
    setFilters(next);
    emitFilters(next);
  };

  const resetFilters = () => {
    const next = {
      ...defaultFilters,
      priceRange: [priceRange[0], priceRange[1]],
      stockRange: [stockRange[0], stockRange[1]]
    } as SearchFilters;
    setFilters(next);
    emitFilters(next);
  };

  const saveSearch = () => {
    if (!searchName.trim()) {
      toast.error('Por favor ingresa un nombre para la búsqueda');
      return;
    }

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName.trim(),
      filters: { ...filters },
      createdAt: new Date()
    };

    setSavedSearches(prev => [...prev, newSearch]);
    setSearchName('');
    setSaveDialogOpen(false);
    toast.success('Búsqueda guardada exitosamente');
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters);
    toast.success(`Búsqueda "${savedSearch.name}" cargada`);
  };

  const deleteSavedSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== id));
    toast.success('Búsqueda eliminada');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.categoryIds.length > 0) count++;
    if (filters.priceRange[0] !== priceRange[0] || filters.priceRange[1] !== priceRange[1]) count++;
    if (filters.stockRange[0] !== stockRange[0] || filters.stockRange[1] !== stockRange[1]) count++;
    if (filters.stockStatus !== 'all') count++;
    if (filters.hasDiscount !== null) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.state !== 'all') count++;
    return count;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Avanzada
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()} filtros activos
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {savedSearches.length > 0 && (
              <Select onValueChange={(value) => {
                const savedSearch = savedSearches.find(s => s.id === value);
                if (savedSearch) loadSavedSearch(savedSearch);
              }}>
                <SelectTrigger className="w-[200px]">
                  <Bookmark className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Búsquedas guardadas" />
                </SelectTrigger>
                <SelectContent>
                  {savedSearches.map(search => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </DialogTrigger>
              <DialogContent aria-labelledby="save-search-title">
                <DialogHeader>
                  <DialogTitle id="save-search-title">Guardar Búsqueda</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="searchName">Nombre de la búsqueda</Label>
                    <Input
                      id="searchName"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="Ej: Productos con stock bajo"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveSearch}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {isExpanded ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Búsqueda básica - siempre visible */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, código, descripción o categoría..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
          </div>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="shrink-0"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </div>

        {/* Filtros avanzados - colapsables */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Proveedor */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Proveedor
                </Label>
                <Select
                  value={filters.supplierId || ''}
                  onValueChange={(value) => {
                    if (value === 'all' || value === '') {
                      handleFilterChange('supplierId', undefined);
                    } else {
                      handleFilterChange('supplierId', value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los proveedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proveedores</SelectItem>
                    {supplierOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Buscar por nombre de proveedor..."
                  value={filters.supplierName || ''}
                  onChange={(e) => handleFilterChange('supplierName', e.target.value)}
                />
              </div>
              {/* Categorías */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Categorías
                </Label>
                <Select
                  value={filters.categoryIds.length === 1 ? filters.categoryIds[0] : ''}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      handleFilterChange('categoryIds', []);
                    } else {
                      handleFilterChange('categoryIds', [value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado de Stock */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Estado de Stock
                </Label>
                <Select
                  value={filters.stockStatus}
                  onValueChange={(value) => handleFilterChange('stockStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="in_stock">En Stock</SelectItem>
                    <SelectItem value="low_stock">Stock Bajo</SelectItem>
                    <SelectItem value="out_of_stock">Sin Stock</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Estado
                </Label>
                <Select
                  value={filters.state}
                  onValueChange={(value) => handleFilterChange('state', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ordenamiento */}
              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nombre</SelectItem>
                      <SelectItem value="price">Precio</SelectItem>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="category">Categoría</SelectItem>
                      <SelectItem value="created">Fecha Creación</SelectItem>
                      <SelectItem value="updated">Última Actualización</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={(value) => handleFilterChange('sortOrder', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">↑</SelectItem>
                      <SelectItem value="desc">↓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rangos de precio y stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Rango de Precios: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                </Label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => handleFilterChange('priceRange', value)}
                  max={priceRange[1]}
                  min={priceRange[0]}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Rango de Stock: {filters.stockRange[0]} - {filters.stockRange[1]}
                </Label>
                <Slider
                  value={filters.stockRange}
                  onValueChange={(value) => handleFilterChange('stockRange', value)}
                  max={stockRange[1]}
                  min={stockRange[0]}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Rango de fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Desde
                </Label>
                <DatePicker
                  date={filters.dateRange.from}
                  onDateChange={(date) => handleFilterChange('dateRange', { ...filters.dateRange, from: date })}
                  placeholder="Seleccionar fecha inicial"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Hasta
                </Label>
                <DatePicker
                  date={filters.dateRange.to}
                  onDateChange={(date) => handleFilterChange('dateRange', { ...filters.dateRange, to: date })}
                  placeholder="Seleccionar fecha final"
                />
              </div>
            </div>

            {/* Filtros adicionales */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasDiscount"
                  checked={filters.hasDiscount === true}
                  onCheckedChange={(checked) => 
                    handleFilterChange('hasDiscount', checked ? true : null)
                  }
                />
                <Label htmlFor="hasDiscount">Solo productos con descuento</Label>
              </div>
            </div>

            {/* Resumen de resultados */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                Mostrando {filteredProducts.length} de {products.length} productos
              </span>
              {getActiveFiltersCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-blue-700 hover:text-blue-800"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
