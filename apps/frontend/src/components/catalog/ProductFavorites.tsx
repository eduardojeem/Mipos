'use client';

import React, { useState, useEffect } from 'react';
import { Heart, X, ShoppingCart, Eye, Filter, Grid, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ProductRating } from './ProductRating';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { Product } from '@/types';

interface ProductWithMetadata extends Product {
  rating?: number;
  createdAt?: string;
}

interface ProductFavoritesProps {
  favorites: ProductWithMetadata[];
  onRemoveFavorite: (productId: string) => void;
  onAddToCart?: (product: ProductWithMetadata) => void;
  onViewProduct?: (product: ProductWithMetadata) => void;
  onAddToComparison?: (product: ProductWithMetadata) => void;
  isLoading?: boolean;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'price-asc' | 'price-desc' | 'date-added' | 'rating';

export const ProductFavorites: React.FC<ProductFavoritesProps> = ({
  favorites,
  onRemoveFavorite,
  onAddToCart,
  onViewProduct,
  onAddToComparison,
  isLoading = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-added');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);

  // Get unique categories from favorites
  const categories = React.useMemo(() => {
    const cats = favorites
      .map(product => product.category?.name)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(cats));
  }, [favorites]);

  // Calculate price range
  useEffect(() => {
    if (favorites.length > 0) {
      const prices = favorites.map(p => p.sale_price).filter(Boolean);
      if (prices.length > 0) {
        setPriceRange({
          min: Math.min(...prices),
          max: Math.max(...prices)
        });
      }
    }
  }, [favorites]);

  // Filter and sort favorites
  const filteredAndSortedFavorites = React.useMemo(() => {
    let filtered = favorites;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category?.name === selectedCategory);
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return (a.sale_price || 0) - (b.sale_price || 0);
        case 'price-desc':
          return (b.sale_price || 0) - (a.sale_price || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'date-added':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return filtered;
  }, [favorites, searchTerm, selectedCategory, sortBy]);

  const handleRemoveFavorite = (productId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onRemoveFavorite(productId);
  };

  const handleAddToCart = (product: Product, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onAddToCart?.(product);
  };

  if (isLoading) {
    return (
      <div className={cn('flex justify-center py-12', className)}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mis Favoritos</h1>
          <p className="text-muted-foreground">
            {favorites.length} {favorites.length === 1 ? 'producto guardado' : 'productos guardados'}
          </p>
        </div>

        {favorites.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          type="no-results"
          onClearFilters={() => window.location.href = '/products'}
        />
      ) : (
        <>
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en favoritos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-added">Agregado recientemente</SelectItem>
                    <SelectItem value="name">Nombre A-Z</SelectItem>
                    <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                    <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
                    <SelectItem value="rating">Mejor calificación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active filters */}
              {(searchTerm || selectedCategory !== 'all') && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Búsqueda: "{searchTerm}"
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSearchTerm('')}
                      />
                    </Badge>
                  )}
                  {selectedCategory !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      Categoría: {selectedCategory}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedCategory('all')}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {filteredAndSortedFavorites.length === 0 ? (
            <EmptyState
              type="no-results"
              onClearFilters={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
            />
          ) : (
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            )}>
              {filteredAndSortedFavorites.map((product) => (
                <Card
                  key={product.id}
                  className={cn(
                    'group cursor-pointer hover:shadow-lg transition-all duration-200',
                    viewMode === 'list' && 'flex flex-row'
                  )}
                  onClick={() => onViewProduct?.(product)}
                >
                  <div className={cn(
                    'relative',
                    viewMode === 'list' ? 'w-32 h-32 flex-shrink-0' : 'aspect-square'
                  )}>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded-t-lg flex items-center justify-center">
                        <Heart className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Favorite button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleRemoveFavorite(product.id, e)}
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-sm"
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </Button>

                    {/* Stock badge */}
                    {product.stock_quantity !== undefined && product.stock_quantity <= 5 && (
                      <Badge
                        variant={product.stock_quantity === 0 ? 'destructive' : 'secondary'}
                        className="absolute bottom-2 left-2"
                      >
                        {product.stock_quantity === 0 ? 'Agotado' : `Solo ${product.stock_quantity}`}
                      </Badge>
                    )}
                  </div>

                  <CardContent className={cn(
                    'p-4',
                    viewMode === 'list' && 'flex-1 flex flex-col justify-between'
                  )}>
                    <div className="space-y-2">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>

                      {product.category && (
                        <Badge variant="outline" className="text-xs">
                          {product.category.name}
                        </Badge>
                      )}

                      {product.rating !== undefined && (
                        <ProductRating
                          rating={product.rating}
                          showCount={false}
                          size="sm"
                        />
                      )}

                      <div className="text-2xl font-bold text-primary">
                        ${product.sale_price?.toLocaleString()}
                      </div>

                      {viewMode === 'list' && product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className={cn(
                      'flex gap-2 mt-4',
                      viewMode === 'list' ? 'flex-row' : 'flex-col'
                    )}>
                      <Button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={product.stock_quantity === 0}
                        className="flex-1"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {product.stock_quantity === 0 ? 'Agotado' : 'Agregar'}
                      </Button>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onViewProduct?.(product);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {onAddToComparison && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onAddToComparison(product);
                            }}
                          >
                            <Filter className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Summary */}
          {filteredAndSortedFavorites.length > 0 && priceRange && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Productos mostrados:</span> {filteredAndSortedFavorites.length}
                  </div>
                  <div>
                    <span className="font-medium">Rango de precios:</span> ${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Categorías:</span> {categories.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ProductFavorites;