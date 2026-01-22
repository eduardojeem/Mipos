'use client';

import { useState } from 'react';
import { Plus, Minus, Package, AlertTriangle, Star, TrendingUp, Eye, ShoppingCart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Product, Category } from '@/types';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  category?: Category;
  onSelect: (product: Product) => void;
  onQuickAdd?: (product: Product, quantity: number) => void;
  viewMode?: 'grid' | 'list';
  showQuickActions?: boolean;
  isPopular?: boolean;
  isTrending?: boolean;
  isWholesaleMode?: boolean;
  className?: string;
}

export default function ProductCard({
  product,
  category,
  onSelect,
  onQuickAdd,
  viewMode = 'grid',
  showQuickActions = true,
  isPopular = false,
  isTrending = false,
  isWholesaleMode = false,
  className = ""
}: ProductCardProps) {
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const isOutOfStock = product.stock_quantity === 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const hasDiscount = false;
  
  // Determinar el precio a mostrar basado en el modo mayorista
  const displayPrice = isWholesaleMode && product.wholesale_price && product.wholesale_price > 0 
    ? product.wholesale_price 
    : product.sale_price;
  
  const discountedPrice = displayPrice;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOutOfStock && onQuickAdd) {
      onQuickAdd(product, quickQuantity);
      setQuickQuantity(1);
    }
  };

  const handleQuantityChange = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newQuantity = Math.max(1, Math.min(product.stock_quantity || 999, quickQuantity + delta));
    setQuickQuantity(newQuantity);
  };

  if (viewMode === 'list') {
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md bg-card border-border ${
          isOutOfStock ? 'opacity-60' : ''
        } ${className}`}
        onClick={() => !isOutOfStock && onSelect(product)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`relative flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center transition-colors duration-200 ${
              product.image_url ? 'bg-muted' : 'bg-gradient-to-br from-primary/10 to-primary/20'
            }`}>
              {product.image_url ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover rounded-lg"
                    unoptimized
                  />
                </div>
              ) : (
                <Package className="h-8 w-8 text-primary" />
              )}
              
              <div className="absolute -top-1 -right-1 flex flex-col gap-1">
                {isPopular && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 transition-colors duration-200">
                    <Star className="h-3 w-3" />
                  </Badge>
                )}
                {isTrending && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 transition-colors duration-200">
                    <TrendingUp className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate text-foreground">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {product.sku && (
                      <Badge variant="outline" className="text-xs transition-colors duration-200">
                        SKU: {product.sku}
                      </Badge>
                    )}
                    {category && (
                      <Badge variant="secondary" className="text-xs transition-colors duration-200">
                        {category.name}
                      </Badge>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="text-right ml-4">
                  <div className="flex items-center gap-2">
                    {isWholesaleMode && product.wholesale_price && product.wholesale_price > 0 && (
                      <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 transition-colors duration-200">
                        Mayorista
                      </Badge>
                    )}
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(product.sale_price)}
                      </span>
                    )}
                    <span className={`font-bold text-lg transition-colors duration-200 ${
                      isWholesaleMode && product.wholesale_price && product.wholesale_price > 0 
                        ? 'text-orange-600' 
                        : hasDiscount 
                        ? 'text-green-400 dark:text-green-400' 
                        : 'text-primary'
                    }`}>
                      {formatCurrency(discountedPrice)}
                    </span>
                    {hasDiscount && (
                      <Badge variant="destructive" className="text-xs transition-colors duration-200">
                        -0%
                      </Badge>
                    )}
                  </div>
                  
                  {/* Mostrar precio normal cuando está en modo mayorista */}
                  {isWholesaleMode && product.wholesale_price && product.wholesale_price > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Normal: {formatCurrency(product.sale_price)}
                    </div>
                  )}
                  
                  <div className="mt-1">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-xs transition-colors duration-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Sin stock
                      </Badge>
                    ) : isLowStock ? (
                      <Badge variant="secondary" className="text-xs transition-colors duration-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Stock bajo: {product.stock_quantity}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs transition-colors duration-200">
                        Stock: {product.stock_quantity}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {showQuickActions && !isOutOfStock && isHovered && (
              <div className="flex items-center gap-2 ml-4">
                <div className="flex items-center border border-border dark:border-border rounded-lg bg-background dark:bg-background transition-colors duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleQuantityChange(-1, e)}
                    disabled={quickQuantity <= 1}
                    className="h-8 w-8 p-0 transition-colors duration-200"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center text-foreground dark:text-foreground">
                    {quickQuantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleQuantityChange(1, e)}
                    disabled={quickQuantity >= (product.stock_quantity || 999)}
                    className="h-8 w-8 p-0 transition-colors duration-200"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleQuickAdd}
                  className="h-8 transition-colors duration-200"
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-card dark:bg-card border-border dark:border-border ${
        isOutOfStock ? 'opacity-60' : ''
      } ${className}`}
      onClick={() => !isOutOfStock && onSelect(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        <div className={`relative aspect-square rounded-t-lg overflow-hidden transition-colors duration-200 ${
          product.image_url ? 'bg-muted dark:bg-muted' : 'bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30'
        }`}>
          {product.image_url ? (
            <div className="relative w-full h-full">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-200 hover:scale-105"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-primary" />
            </div>
          )}
          
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isWholesaleMode && product.wholesale_price && product.wholesale_price > 0 && (
              <Badge variant="outline" className="text-xs font-bold bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 transition-colors duration-200">
                Mayorista
              </Badge>
            )}
            {hasDiscount && (
              <Badge variant="destructive" className="text-xs font-bold transition-colors duration-200">
                -0%
              </Badge>
            )}
            {isPopular && (
              <Badge variant="secondary" className="text-xs transition-colors duration-200">
                <Star className="h-3 w-3 mr-1" />
                Popular
              </Badge>
            )}
            {isTrending && (
              <Badge variant="secondary" className="text-xs transition-colors duration-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                Tendencia
              </Badge>
            )}
          </div>

          {showQuickActions && !isOutOfStock && isHovered && (
            <div className="absolute inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center transition-colors duration-200">
              <div className="bg-background dark:bg-background border border-border dark:border-border rounded-lg p-3 shadow-lg flex items-center gap-2 transition-colors duration-200">
                <div className="flex items-center border border-border dark:border-border rounded bg-background dark:bg-background transition-colors duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleQuantityChange(-1, e)}
                    disabled={quickQuantity <= 1}
                    className="h-7 w-7 p-0 transition-colors duration-200"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="px-2 py-1 text-sm font-medium min-w-[1.5rem] text-center text-foreground dark:text-foreground">
                    {quickQuantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleQuantityChange(1, e)}
                    disabled={quickQuantity >= (product.stock_quantity || 999)}
                    className="h-7 w-7 p-0 transition-colors duration-200"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleQuickAdd}
                  className="h-7 transition-colors duration-200"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center transition-colors duration-200">
              <Badge variant="destructive" className="text-sm font-bold transition-colors duration-200">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Sin Stock
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4 bg-card dark:bg-card transition-colors duration-200">
          <div className="space-y-2">
            <h3 className="font-semibold text-base line-clamp-2 leading-tight text-foreground dark:text-foreground">
              {product.name}
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {product.sku && (
                <Badge variant="outline" className="text-xs transition-colors duration-200">
                  {product.sku}
                </Badge>
              )}
              {category && (
                <Badge variant="secondary" className="text-xs transition-colors duration-200">
                  {category.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(product.sale_price)}
                    </span>
                  )}
                  <span className={`font-bold text-lg transition-colors duration-200 ${
                    isWholesaleMode && product.wholesale_price && product.wholesale_price > 0 
                      ? 'text-orange-600' 
                      : hasDiscount 
                      ? 'text-green-400 dark:text-green-400' 
                      : 'text-primary'
                  }`}>
                    {formatCurrency(discountedPrice)}
                  </span>
                </div>
                {/* Mostrar precio normal cuando está en modo mayorista */}
                {isWholesaleMode && product.wholesale_price && product.wholesale_price > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Normal: {formatCurrency(product.sale_price)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              {isLowStock ? (
                <Badge variant="secondary" className="text-xs transition-colors duration-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Stock bajo: {product.stock_quantity}
                </Badge>
              ) : !isOutOfStock ? (
                <Badge variant="default" className="text-xs transition-colors duration-200">
                  Stock: {product.stock_quantity}
                </Badge>
              ) : (
                <div></div>
              )}
            </div>

            {product.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
