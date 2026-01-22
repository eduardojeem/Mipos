'use client';

import React, { memo, useMemo } from 'react';
import Image from 'next/image';
import { Package, Edit, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface OptimizedProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  className?: string;
  showActions?: boolean;
}

export const OptimizedProductCard = memo(function OptimizedProductCard({
  product,
  onEdit,
  onDelete,
  onView,
  className = '',
  showActions = true
}: OptimizedProductCardProps) {
  
  // Función auxiliar para calcular estado del stock
  const getStockInfo = (stock: number, minStock: number) => {
    if (stock === 0) return { status: 'out', variant: 'destructive' as const, label: 'Sin stock', icon: AlertTriangle };
    if (stock <= Math.max(1, minStock * 0.5)) return { status: 'critical', variant: 'destructive' as const, label: 'Crítico', icon: AlertTriangle };
    if (stock <= minStock) return { status: 'low', variant: 'secondary' as const, label: 'Bajo', icon: Package };
    return { status: 'normal', variant: 'default' as const, label: 'Normal', icon: Package };
  };

  // Memoizar cálculos costosos
  const stockInfo = useMemo(() => {
    const stock = product.stock_quantity || 0;
    const minStock = product.min_stock || 5;
    return { stock, ...getStockInfo(stock, minStock) };
  }, [product.stock_quantity, product.min_stock]);
  
  const priceInfo = useMemo(() => {
    const salePrice = product.sale_price || 0;
    const costPrice = product.cost_price || 0;
    const margin = costPrice > 0 ? ((salePrice - costPrice) / costPrice) * 100 : 0;
    
    return {
      salePrice,
      costPrice,
      margin,
      formattedSalePrice: `Gs ${salePrice.toLocaleString('es-PY')}`,
      formattedCostPrice: costPrice > 0 ? `Gs ${costPrice.toLocaleString('es-PY')}` : null,
      hasGoodMargin: margin >= 30 // 30% margin threshold
    };
  }, [product.sale_price, product.cost_price]);
  
  const categoryName = useMemo(() => {
    if (typeof product.category === 'object' && product.category?.name) {
      return product.category.name;
    }
    return 'Sin categoría';
  }, [product.category]);
  
  const StockIcon = stockInfo.icon;
  
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
      "border-border/40 bg-card/50 backdrop-blur-sm",
      className
    )}>
      {/* Imagen del producto */}
      <div className="relative aspect-square bg-muted/30 overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name || 'Product'}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/20 to-muted/40">
            <Package className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}
        
        {/* Badge de stock superpuesto */}
        <div className="absolute bottom-2 left-2">
          <Badge 
            variant={stockInfo.variant} 
            className={cn(
              "gap-1 shadow-sm backdrop-blur-sm",
              stockInfo.status === 'critical' && "animate-pulse"
            )}
          >
            <StockIcon className="h-3 w-3" />
            {stockInfo.stock}
          </Badge>
        </div>
        
        {/* Badge de margen si es bueno */}
        {priceInfo.hasGoodMargin && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="bg-green-500 text-white text-xs">
              +{priceInfo.margin.toFixed(0)}%
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-3 space-y-2">
        {/* Información básica del producto */}
        <div className="space-y-1">
          <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] leading-tight">
            {product.name || 'Sin nombre'}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">SKU: {product.sku || 'N/A'}</span>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {categoryName}
            </Badge>
          </div>
        </div>
        
        {/* Información de precios */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {priceInfo.formattedSalePrice}
            </span>
            {stockInfo.status !== 'normal' && (
              <span className={cn(
                "text-xs font-medium",
                stockInfo.status === 'out' && "text-destructive",
                stockInfo.status === 'critical' && "text-destructive",
                stockInfo.status === 'low' && "text-orange-600"
              )}>
                {stockInfo.label}
              </span>
            )}
          </div>
          
          {priceInfo.formattedCostPrice && (
            <p className="text-xs text-muted-foreground">
              Costo: {priceInfo.formattedCostPrice}
            </p>
          )}
        </div>
        
        {/* Acciones */}
        {showActions && (
          <div className="flex items-center gap-1 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1"
              onClick={() => onView?.(product)}
            >
              <Eye className="h-3 w-3" />
              Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1"
              onClick={() => onEdit?.(product)}
            >
              <Edit className="h-3 w-3" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onDelete?.(product.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Componente de skeleton para loading
export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-muted animate-pulse" />
      <CardContent className="p-3 space-y-2">
        <div className="space-y-1">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
        </div>
        <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
        <div className="flex gap-1 pt-2">
          <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
          <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
});