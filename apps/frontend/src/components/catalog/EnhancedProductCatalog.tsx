'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/lib/toast';

interface Product {
  id: string;
  name: string;
  code: string;
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
  image?: string;
  images?: string[];
  supplier?: {
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  productCount?: number;
}

interface EnhancedProductCatalogProps {
  products: Product[];
  categories: Category[];
  isLoading?: boolean;
  onEdit?: (product: Product) => void;
  onView?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  onRefresh?: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  children?: React.ReactNode;
}

export default function EnhancedProductCatalog({
  products,
  categories,
  isLoading = false,
  onEdit,
  onView,
  onDelete,
  onToggleFavorite,
  onExport,
  onRefresh,
  viewMode = 'grid',
  onViewModeChange,
  canEdit = true,
  canDelete = true,
  canExport = true,
  children
}: EnhancedProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Enhanced filtering with multiple criteria
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Search filter
      const matchesSearch = debouncedSearchTerm === '' || 
        product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.category?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.supplier?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === 'all' || 
        product.categoryId === selectedCategory ||
        product.category?.id === selectedCategory;

      // Stock filter
      const matchesStock = stockFilter === 'all' ||
        (stockFilter === 'in-stock' && product.stock > 0) ||
        (stockFilter === 'out-of-stock' && product.stock === 0) ||
        (stockFilter === 'low-stock' && product.stock > 0 && product.stock <= product.minStock) ||
        (stockFilter === 'critical' && product.stock > 0 && product.stock <= Math.floor(product.minStock * 0.3));

      // Price range filter
      const matchesPrice = priceRange === 'all' ||
        (priceRange === '0-50000' && product.price <= 50000) ||
        (priceRange === '50000-100000' && product.price > 50000 && product.price <= 100000) ||
        (priceRange === '100000-500000' && product.price > 100000 && product.price <= 500000) ||
        (priceRange === '500000+' && product.price > 500000);

      return matchesSearch && matchesCategory && matchesStock && matchesPrice;
    });

    // Sorting
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
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
          aValue = a.category?.name?.toLowerCase() || '';
          bValue = b.category?.name?.toLowerCase() || '';
          break;
        case 'created':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [products, debouncedSearchTerm, selectedCategory, stockFilter, priceRange, sortBy, sortOrder]);

  const handleExport = useCallback((format: 'csv' | 'excel' | 'pdf') => {
    if (onExport) {
      onExport(format);
      toast.success(`Exportando productos en formato ${format.toUpperCase()}`);
    }
  }, [onExport]);

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
      toast.success('Catálogo actualizado');
    }
  }, [onRefresh]);

  const stats = useMemo(() => ({
    total: products.length,
    filtered: filteredProducts.length,
    inStock: products.filter(p => p.stock > 0).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
    categories: categories.length
  }), [products, filteredProducts.length, categories.length]);

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">Catálogo de Productos</CardTitle>
            <CardDescription>
              {stats.filtered} de {stats.total} productos mostrados
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            {canExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.inStock}</div>
              <div className="text-sm text-muted-foreground">En stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
              <div className="text-sm text-muted-foreground">Sin stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
              <div className="text-sm text-muted-foreground">Stock bajo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.categories}</div>
              <div className="text-sm text-muted-foreground">Categorías</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.filtered}</div>
              <div className="text-sm text-muted-foreground">Filtrados</div>
            </div>
          </div>

          {/* Enhanced search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} ({category.productCount || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Estado de stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="in-stock">En stock</SelectItem>
                <SelectItem value="out-of-stock">Sin stock</SelectItem>
                <SelectItem value="low-stock">Stock bajo</SelectItem>
                <SelectItem value="critical">Stock crítico</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Rango de precio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los precios</SelectItem>
                <SelectItem value="0-50000">0 - 50.000 ₲</SelectItem>
                <SelectItem value="50000-100000">50.000 - 100.000 ₲</SelectItem>
                <SelectItem value="100000-500000">100.000 - 500.000 ₲</SelectItem>
                <SelectItem value="500000+">500.000+ ₲</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort and view controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ordenar por:</span>
              <Select value={sortBy} onValueChange={setSortBy} disabled={isLoading}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="code">Código</SelectItem>
                  <SelectItem value="price">Precio</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                  <SelectItem value="created">Fecha creación</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                disabled={isLoading}
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </Button>
            </div>

            {onViewModeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Vista:</span>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onViewModeChange('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onViewModeChange('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results section - populated by parent component */}
      <div className="min-h-96">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando productos...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-96">
              <div className="text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
                <p className="text-muted-foreground">
                  Intenta ajustar los filtros o busca con términos diferentes.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          children
        )}
      </div>
    </div>
  );
}