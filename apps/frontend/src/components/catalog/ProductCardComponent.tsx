'use client';

import { useState } from 'react';
import { 
  Package, Star, Heart, ShoppingCart, Sparkles, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import LazyImage from './LazyImage';
import type { Product, Category } from '@/types';

type ViewMode = 'grid' | 'list' | 'compact' | 'detailed';

interface ProductWithMetadata extends Product {
  isNew?: boolean;
  isPopular?: boolean;
  isTrending?: boolean;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  lastSold?: Date;
  discount?: number;
  originalPrice?: number;
}

interface ProductCardComponentProps {
  product: ProductWithMetadata;
  category?: Category;
  onSelect: (product: Product) => void;
  viewMode: ViewMode;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
}

export default function ProductCardComponent({
  product,
  category,
  onSelect,
  viewMode,
  isFavorite,
  onToggleFavorite
}: ProductCardComponentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isOutOfStock = product.stock_quantity === 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= (product.min_stock || 5);
  const hasDiscount = product.discount && product.discount > 0;
  
  const discountedPrice = hasDiscount 
    ? product.sale_price * (1 - product.discount! / 100)
    : product.sale_price;

  const handleClick = () => {
    if (!isOutOfStock) {
      onSelect(product);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(product.id);
  };

  if (viewMode === 'compact') {
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-card border shadow-sm ${
          isOutOfStock ? 'opacity-60' : ''
        }`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-2 sm:space-y-3">
            {/* Product Image */}
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden group-hover:shadow-lg transition-shadow duration-300">
              <LazyImage
                src={product.image_url}
                alt={product.name}
                className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                decoding="async"
                sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                onLoad={() => setImageLoaded(true)}
              />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Badges */}
              <div className="absolute top-1 left-1 flex flex-col gap-1 z-10">
                {product.isNew && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-1 py-0 text-white shadow-sm bg-[hsl(var(--accent))]"
                  >
                    Nuevo
                  </Badge>
                )}
                {hasDiscount && (
                  <Badge 
                    variant="destructive" 
                    className="text-xs px-1 py-0 bg-red-600 text-white shadow-sm"
                  >
                    -{product.discount}%
                  </Badge>
                )}
              </div>

              {/* Favorite Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteClick}
                className={`
                  absolute top-1 right-1 h-6 w-6 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-300 z-10
                  ${isFavorite 
                    ? 'bg-red-100 text-red-500 hover:bg-red-200 scale-110' 
                    : 'bg-white/80 text-gray-400 hover:bg-white hover:text-red-500'
                  }
                  backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-125
                  ${isHovered || isFavorite ? 'opacity-100' : 'opacity-0'}
                `}
              >
                <Heart className={`h-2 w-2 sm:h-3 sm:w-3 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Product Info */}
            <div className="space-y-1">
              <h3 className="font-medium text-sm leading-snug line-clamp-2 text-foreground">{product.name}</h3>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm sm:text-base text-primary">{formatCurrency(discountedPrice)}</span>
                <Badge variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'outline'} className="text-sm">
                  {product.stock_quantity}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'list') {
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md bg-card border shadow-sm ${
          isOutOfStock ? 'opacity-60' : ''
        }`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Product Image */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              <LazyImage
                src={product.image_url}
                alt={product.name}
                className="w-full h-full"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base truncate text-foreground">{product.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFavoriteClick}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                    >
                      <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>{category?.name}</span>
                    {product.sku && (
                      <>
                        <span>•</span>
                        <span className="font-mono">SKU: {product.sku}</span>
                      </>
                    )}
                  </div>

                  {product.rating && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < Math.floor(product.rating!) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-muted-foreground">({product.reviewCount})</span>
                    </div>
                  )}
                </div>
                
                <div className="text-right ml-2 sm:ml-4">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(product.sale_price)}
                      </span>
                    )}
                    <span className="font-bold text-base sm:text-lg text-primary">{formatCurrency(discountedPrice)}</span>
                  </div>
                  
                  {/* Mostrar precio mayorista en vista de lista */}
                  {product.wholesale_price && product.wholesale_price > 0 && (
                    <div className="flex items-center justify-end gap-1 mb-1">
                      <Badge 
                        variant="outline" 
                        className="text-sm"
                      >
                        Mayorista: {formatCurrency(product.wholesale_price)}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'outline'} className="text-sm">
                      {isOutOfStock ? 'Sin stock' : `Stock: ${product.stock_quantity}`}
                    </Badge>
                    
                    {hasDiscount && (
                      <Badge variant="destructive" className="text-sm">
                        -{product.discount}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'detailed') {
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isOutOfStock ? 'opacity-60' : ''
        }`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Product Image */}
            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
              {product.image_url ? (
                <LazyImage
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                  onLoad={() => setImageLoaded(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400" />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.isNew && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Nuevo
                  </Badge>
                )}
                {product.isPopular && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                )}
                {hasDiscount && (
                  <Badge variant="destructive" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    -{product.discount}%
                  </Badge>
                )}
              </div>

              {/* Favorite Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteClick}
                className={`absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white transition-all ${
                  isHovered || isFavorite ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
              </Button>
            </div>

            {/* Product Details */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="font-bold text-lg sm:text-xl mb-2">{product.name}</h3>
                <p className="text-muted-foreground text-sm mb-2">{category?.name}</p>
                
                {product.rating && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < Math.floor(product.rating!) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {product.rating.toFixed(1)} ({product.reviewCount} reseñas)
                    </span>
                  </div>
                )}

                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {hasDiscount && (
                      <span className="text-base sm:text-lg text-muted-foreground line-through">
                        {formatCurrency(product.sale_price)}
                      </span>
                    )}
                    <span className="font-bold text-xl sm:text-2xl text-primary">{formatCurrency(discountedPrice)}</span>
                  </div>
                  
                  {/* Mostrar precio mayorista si existe */}
                  {product.wholesale_price && product.wholesale_price > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: 'hsla(var(--primary), 0.08)',
                          color: 'hsl(var(--primary))',
                          borderColor: 'hsla(var(--primary), 0.3)'
                        }}
                      >
                        Mayorista: {formatCurrency(product.wholesale_price)}
                      </Badge>
                      {product.min_wholesale_quantity && (
                        <span className="text-xs text-muted-foreground">
                          (min. {product.min_wholesale_quantity})
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {product.sku && (
                      <span className="text-sm font-mono text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                        SKU: {product.sku}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <Badge 
                    variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'}
                    className="mb-2"
                  >
                    {isOutOfStock ? 'Sin stock' : `Stock: ${product.stock_quantity}`}
                  </Badge>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleClick}
                      disabled={isOutOfStock}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default grid view
  return (
      <Card 
      className={`
        group relative overflow-hidden cursor-pointer transition-all duration-300 
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.02]
        bg-card border shadow-sm
        ${isOutOfStock ? 'opacity-75 grayscale-[0.3]' : ''}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-3 sm:p-4">
        {/* Background kept clean and minimal for subtle focus */}
        
        <div className="relative space-y-2 sm:space-y-3">
          {/* Product Image */}
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              <LazyImage
              src={product.image_url}
              alt={product.name}
              className="w-full h-full"
              onLoad={() => setImageLoaded(true)}
              sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
              loading="lazy"
              decoding="async"
            />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isNew && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  Nuevo
                </Badge>
              )}
              {hasDiscount && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  -{product.discount}%
                </Badge>
              )}
            </div>

            {/* Favorite Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteClick}
              className={`absolute top-2 right-2 h-6 w-6 sm:h-8 sm:w-8 p-0 bg-white/80 hover:bg-white transition-all ${
                isHovered || isFavorite ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
            </Button>

            {/* Quick Actions */}
            {isHovered && !isOutOfStock && (
              <div className="absolute bottom-2 left-2 right-2 z-10">
                <Button
                  size="sm"
                  onClick={handleClick}
                  className="w-full bg-background/95 hover:bg-background text-foreground border text-sm shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
                >
                  <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Agregar al carrito
                </Button>
              </div>
            )}
          </div>

          {/* Product Info */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2 flex-1 group-hover:text-primary transition-colors duration-200 text-foreground">{product.name}</h3>
              </div>
              
              <p className="text-sm text-muted-foreground">{category?.name}</p>
              
              {product.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star 
                        key={i} 
                        className={`h-3 w-3 transition-colors duration-200 ${
                          i < Math.floor(product.rating!) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-muted-foreground/40'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">({product.reviewCount})</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through block">
                  {formatCurrency(product.sale_price)}
                </span>
              )}
              <span className="font-semibold text-base text-primary group-hover:text-primary/80 transition-colors duration-200">
                {formatCurrency(discountedPrice)}
              </span>
                </div>
                
                <Badge 
                  variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'outline'} 
                  className="text-sm transition-all duration-200"
                >
                  {isOutOfStock ? 'Sin stock' : `Stock: ${product.stock_quantity}`}
                </Badge>
              </div>
            </div>
            {/* Loading Overlay for Out of Stock */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-muted/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                <div className="text-center">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                  <span className="text-sm text-muted-foreground font-medium">Producto Agotado</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }