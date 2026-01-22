'use client';

import React, { useState } from 'react';
import { X, Check, Minus, Star, Package, ShoppingCart, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ProductRating } from './ProductRating';
import type { Product } from '@/types';

interface ProductWithMetadata extends Product {
  rating?: number;
  reviewCount?: number;
  isNew?: boolean;
  isPopular?: boolean;
  isTrending?: boolean;
  brand?: string;
  weight?: string;
  dimensions?: string;
}

interface ProductComparisonProps {
  products: ProductWithMetadata[];
  onRemoveProduct: (productId: string) => void;
  onAddToCart?: (product: ProductWithMetadata) => void;
  onToggleFavorite?: (product: ProductWithMetadata) => void;
  onViewProduct?: (product: ProductWithMetadata) => void;
  className?: string;
  maxProducts?: number;
}

interface ComparisonFeature {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'price' | 'rating' | 'badge';
  getValue: (product: ProductWithMetadata) => any;
  format?: (value: any) => string;
}

export const ProductComparison: React.FC<ProductComparisonProps> = ({
  products,
  onRemoveProduct,
  onAddToCart,
  onToggleFavorite,
  onViewProduct,
  className,
  maxProducts = 4
}) => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'price', 'rating', 'stock', 'category', 'brand', 'description'
  ]);

  // Define comparison features
  const comparisonFeatures: ComparisonFeature[] = [
    {
      key: 'price',
      label: 'Precio',
      type: 'price',
      getValue: (product) => product.sale_price,
      format: (value) => `$${value?.toLocaleString()}`
    },
    {
      key: 'rating',
      label: 'Calificación',
      type: 'rating',
      getValue: (product) => product.rating || 0
    },
    {
      key: 'stock',
      label: 'Stock disponible',
      type: 'number',
      getValue: (product) => product.stock_quantity,
      format: (value) => `${value} unidades`
    },
    {
      key: 'category',
      label: 'Categoría',
      type: 'text',
      getValue: (product) => product.category?.name || 'Sin categoría'
    },
    {
      key: 'brand',
      label: 'Marca',
      type: 'text',
      getValue: (product) => product.brand || 'Sin marca'
    },
    {
      key: 'sku',
      label: 'SKU',
      type: 'text',
      getValue: (product) => product.sku
    },
    {
      key: 'description',
      label: 'Descripción',
      type: 'text',
      getValue: (product) => product.description || 'Sin descripción'
    },
    {
      key: 'weight',
      label: 'Peso',
      type: 'text',
      getValue: (product) => product.weight,
      format: (value) => value ? `${value} kg` : 'No especificado'
    },
    {
      key: 'dimensions',
      label: 'Dimensiones',
      type: 'text',
      getValue: (product) => product.dimensions || 'No especificado'
    }
  ];

  const renderFeatureValue = (feature: ComparisonFeature, product: Product) => {
    const value = feature.getValue(product);
    
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (feature.type) {
      case 'price':
        return (
          <span className="font-semibold text-lg">
            {feature.format ? feature.format(value) : `$${value}`}
          </span>
        );
      
      case 'rating':
        return (
          <ProductRating 
            rating={value} 
            showCount={false} 
            size="sm"
          />
        );
      
      case 'boolean':
        return value ? (
          <Check className="h-5 w-5 text-green-500" />
        ) : (
          <X className="h-5 w-5 text-red-500" />
        );
      
      case 'badge':
        return <Badge variant="secondary">{value}</Badge>;
      
      case 'number':
        return (
          <span className="font-medium">
            {feature.format ? feature.format(value) : value.toLocaleString()}
          </span>
        );
      
      default:
        return (
          <span className="text-sm">
            {feature.format ? feature.format(value) : value}
          </span>
        );
    }
  };

  const getHighlightClass = (feature: ComparisonFeature, product: Product, allProducts: Product[]) => {
    const value = feature.getValue(product);
    
    if (feature.type === 'price') {
      const prices = allProducts.map(p => feature.getValue(p)).filter(v => v != null);
      const minPrice = Math.min(...prices);
      if (value === minPrice) return 'bg-green-50 border-green-200';
    }
    
    if (feature.type === 'rating') {
      const ratings = allProducts.map(p => feature.getValue(p)).filter(v => v != null);
      const maxRating = Math.max(...ratings);
      if (value === maxRating && value > 0) return 'bg-[hsla(var(--accent),0.08)] border-[hsla(var(--accent),0.3)]';
    }
    
    if (feature.type === 'number' && feature.key === 'stock') {
      const stocks = allProducts.map(p => feature.getValue(p)).filter(v => v != null);
      const maxStock = Math.max(...stocks);
      if (value === maxStock) return 'bg-[hsla(var(--primary),0.08)] border-[hsla(var(--primary),0.3)]';
    }
    
    return '';
  };

  if (products.length === 0) {
    return (
      <Card className={cn('text-center py-12', className)}>
        <CardContent>
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No hay productos para comparar</h3>
          <p className="text-muted-foreground">
            Agrega productos al comparador para ver sus diferencias lado a lado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comparar productos</h2>
          <p className="text-muted-foreground">
            Comparando {products.length} de {maxProducts} productos máximo
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Características:</span>
          <select
            multiple
            value={selectedFeatures}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              setSelectedFeatures(values);
            }}
            className="text-sm border rounded px-2 py-1"
          >
            {comparisonFeatures.map(feature => (
              <option key={feature.key} value={feature.key}>
                {feature.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Table */}
      <Card>
        <ScrollArea className="w-full">
          <div className="min-w-full">
            {/* Product Headers */}
            <div className="grid grid-cols-1 gap-4 p-6 border-b" 
                 style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}>
              <div className="font-medium text-muted-foreground">Producto</div>
              {products.map((product) => (
                <Card key={product.id} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveProduct(product.id)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 z-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <CardContent className="p-4 pt-8">
                    <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-primary">
                        ${product.sale_price?.toLocaleString()}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => onAddToCart?.(product)}
                          className="flex-1"
                          disabled={product.stock_quantity === 0}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Agregar
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onToggleFavorite?.(product)}
                        >
                          <Heart className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewProduct?.(product)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Feature Comparison */}
            <div className="divide-y">
              {comparisonFeatures
                .filter(feature => selectedFeatures.includes(feature.key))
                .map((feature) => (
                  <div
                    key={feature.key}
                    className="grid gap-4 p-4 hover:bg-muted/20 transition-colors"
                    style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}
                  >
                    <div className="font-medium text-sm flex items-center">
                      {feature.label}
                    </div>
                    
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={cn(
                          'flex items-center justify-center p-3 rounded-lg border border-transparent transition-colors',
                          getHighlightClass(feature, product, products)
                        )}
                      >
                        {renderFeatureValue(feature, product)}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span>Mejor precio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border" style={{ backgroundColor: 'hsla(var(--accent),0.08)', borderColor: 'hsla(var(--accent),0.3)' }}></div>
              <span>Mejor calificación</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border" style={{ backgroundColor: 'hsla(var(--primary),0.08)', borderColor: 'hsla(var(--primary),0.3)' }}></div>
              <span>Mayor stock</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductComparison;