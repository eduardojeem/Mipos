'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollapsibleProductCard, type Product as CardProduct } from './CollapsibleProductCard';
import type { Product } from '@/types';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  SortAsc, 
  SortDesc,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Eye,
  Settings,
  LayoutGrid,
  LayoutList
} from 'lucide-react';

// Mapping function to convert Supabase Product to CollapsibleProductCard Product
const mapSupabaseProductToCardProduct = (product: Product): CardProduct => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.sale_price,
  costPrice: product.cost_price,
  stock: product.stock_quantity,
  minStock: product.min_stock,
  maxStock: product.max_stock,
  sku: product.sku,
  barcode: product.barcode,
  category: product.category ? {
    id: product.category.id,
    name: product.category.name
  } : undefined,
  supplier: product.supplier ? {
    id: product.supplier.id,
    name: product.supplier.name
  } : undefined,
  createdAt: product.created_at,
  updatedAt: product.updated_at,
  isActive: product.is_active
});

interface ProductGridViewProps {
  products: Product[];
  categories: Array<{ id: string; name: string; color?: string }>;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onViewProduct?: (product: Product) => void;
  loading?: boolean;
}

type ViewMode = 'grid' | 'list' | 'compact';
type SortField = 'name' | 'price' | 'stock' | 'createdAt' | 'salesCount';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'inactive' | 'low-stock' | 'out-of-stock';

export function ProductGridView({
  products,
  categories,
  onEditProduct,
  onDeleteProduct,
  onViewProduct,
  loading = false
}: ProductGridViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Create wrapper functions to handle type conversion
  const handleEditProduct = (cardProduct: CardProduct) => {
    if (onEditProduct) {
      // Find the original product from the products array
      const originalProduct = products.find(p => p.id === cardProduct.id);
      if (originalProduct) {
        onEditProduct(originalProduct);
      }
    }
  };

  const handleViewProduct = (cardProduct: CardProduct) => {
    if (onViewProduct) {
      // Find the original product from the products array
      const originalProduct = products.find(p => p.id === cardProduct.id);
      if (originalProduct) {
        onViewProduct(originalProduct);
      }
    }
  };

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Filtro de búsqueda
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      // Filtro de categoría
      const matchesCategory = selectedCategory === 'all' || product.category?.id === selectedCategory;

      // Filtro de estado
      let matchesStatus = true;
      switch (filterStatus) {
        case 'active':
          matchesStatus = product.is_active;
          break;
        case 'inactive':
          matchesStatus = !product.is_active;
          break;
        case 'low-stock':
          matchesStatus = product.stock_quantity > 0 && product.stock_quantity <= product.min_stock;
          break;
        case 'out-of-stock':
          matchesStatus = product.stock_quantity === 0;
          break;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Map sort fields to correct property names
      switch (sortField) {
        case 'price':
          aValue = a.sale_price;
          bValue = b.sale_price;
          break;
        case 'stock':
          aValue = a.stock_quantity;
          bValue = b.stock_quantity;
          break;
        case 'createdAt':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'salesCount':
          // salesCount doesn't exist in Product interface, use 0 as default
          aValue = 0;
          bValue = 0;
          break;
        default:
          aValue = a[sortField as keyof Product];
          bValue = b[sortField as keyof Product];
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, filterStatus, sortField, sortOrder]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = filteredAndSortedProducts.length;
    const active = filteredAndSortedProducts.filter(p => p.is_active).length;
    const lowStock = filteredAndSortedProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock).length;
    const outOfStock = filteredAndSortedProducts.filter(p => p.stock_quantity === 0).length;

    return { total, active, lowStock, outOfStock };
  }, [filteredAndSortedProducts]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleExpandAll = () => {
    if (expandedCards.size === filteredAndSortedProducts.length) {
      setExpandedCards(new Set());
    } else {
      setExpandedCards(new Set(filteredAndSortedProducts.map(p => p.id)));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total productos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.active}</div>
                <div className="text-sm text-muted-foreground">Activos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{stats.lowStock}</div>
                <div className="text-sm text-muted-foreground">Stock bajo</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{stats.outOfStock}</div>
                <div className="text-sm text-muted-foreground">Sin stock</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de filtrado y vista */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros y Vista
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('compact')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos por nombre, SKU o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="grid gap-4 md:grid-cols-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

            <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="low-stock">Stock bajo</SelectItem>
                <SelectItem value="out-of-stock">Sin stock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="price">Precio</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="createdAt">Fecha creación</SelectItem>
                <SelectItem value="salesCount">Ventas</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex-1"
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4 mr-2" />
                ) : (
                  <SortDesc className="h-4 w-4 mr-2" />
                )}
                {sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
              </Button>
              
              {viewMode !== 'compact' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleExpandAll}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {expandedCards.size === filteredAndSortedProducts.length ? 'Contraer' : 'Expandir'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de productos */}
      {filteredAndSortedProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
            <p className="text-muted-foreground">
              Intenta ajustar los filtros o términos de búsqueda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`
          grid gap-4 
          ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 
            viewMode === 'list' ? 'grid-cols-1' : 
            'grid-cols-1 lg:grid-cols-2'}
        `}>
          {filteredAndSortedProducts.map(product => (
            <CollapsibleProductCard
              key={product.id}
              product={mapSupabaseProductToCardProduct(product)}
              onEdit={handleEditProduct}
              onDelete={onDeleteProduct}
              onView={handleViewProduct}
              defaultExpanded={expandedCards.has(product.id)}
              compact={viewMode === 'compact'}
            />
          ))}
        </div>
      )}

      {/* Información de resultados */}
      <div className="text-center text-sm text-muted-foreground">
        Mostrando {filteredAndSortedProducts.length} de {products.length} productos
      </div>
    </div>
  );
}