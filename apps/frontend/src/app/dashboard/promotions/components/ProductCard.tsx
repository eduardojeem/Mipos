import React, { memo, useCallback } from 'react';
import { Package, Trash2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LazyImage } from '@/components/ui/lazy-image';
import { Tooltip } from '@/components/ui/tooltip-simple';
import { cn } from '@/lib/utils';
import { PromotionProduct } from '../hooks/usePromotionProducts';

interface ProductCardProps {
  product: PromotionProduct;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  isSelected?: boolean;
  onSelect?: (productId: string) => void;
  onRemove: (productId: string) => void;
  showSelection?: boolean;
  className?: string;
}

export const ProductCard = memo<ProductCardProps>(({
  product,
  discountType,
  discountValue,
  isSelected = false,
  onSelect,
  onRemove,
  showSelection = false,
  className
}) => {
  const calculateDiscountedPrice = useCallback((price: number) => {
    if (discountType === 'PERCENTAGE') {
      return price * (1 - discountValue / 100);
    } else {
      return Math.max(0, price - discountValue);
    }
  }, [discountType, discountValue]);

  const discountedPrice = calculateDiscountedPrice(product.price);
  const savings = product.price - discountedPrice;
  const savingsPercentage = product.price > 0 ? (savings / product.price) * 100 : 0;

  const handleSelect = useCallback(() => {
    if (onSelect) {
      onSelect(product.id);
    }
  }, [onSelect, product.id]);

  const handleRemove = useCallback(() => {
    onRemove(product.id);
  }, [onRemove, product.id]);

  const isOutOfStock = (product.stock || 0) <= 0;
  const isLowStock = (product.stock || 0) > 0 && (product.stock || 0) <= 5;

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "transition-all duration-300 ease-out cursor-pointer",
      "hover:shadow-xl hover:shadow-violet-500/10 hover:scale-[1.03] hover:border-violet-300",
      "hover:-translate-y-1",
      isSelected && [
        "ring-2 ring-violet-500 ring-offset-2",
        "bg-gradient-to-br from-violet-50 to-indigo-50",
        "dark:from-violet-950/30 dark:to-indigo-950/30",
        "border-violet-300 dark:border-violet-700",
        "shadow-xl shadow-violet-500/20",
        "scale-[1.02] -translate-y-1"
      ],
      isOutOfStock && "opacity-60 cursor-not-allowed grayscale",
      !isOutOfStock && "hover:cursor-pointer",
      className
    )}
    onClick={!isOutOfStock && showSelection ? handleSelect : undefined}
    >
      <CardContent className="p-3 relative">
        {/* Indicador de selección animado */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-violet-600 text-white rounded-full p-1 animate-pulse shadow-lg">
            <CheckCircle2 className="h-3 w-3 animate-bounce" />
          </div>
        )}
        
        {/* Efecto shimmer en hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        
        <div className="space-y-2">
          {/* Header con checkbox y botón eliminar */}
          <div className="flex items-start justify-between">
            {showSelection && (
              <Tooltip content={isSelected ? "Deseleccionar producto" : "Seleccionar producto"}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={handleSelect}
                  disabled={isOutOfStock}
                  className={cn(
                    "data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600",
                    "transition-all duration-200 hover:scale-110",
                    isSelected && "scale-110"
                  )}
                />
              </Tooltip>
            )}
            <Tooltip content="Remover de la promoción">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className={cn(
                  "h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 ml-auto transition-all duration-200 hover:scale-110",
                  showSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </Tooltip>
          </div>

          {/* Imagen y nombre */}
          <div className="flex gap-3">
            <LazyImage
              src={product.imageUrl}
              alt={product.name}
              className="w-12 h-12 flex-shrink-0"
              fallbackIcon={<Package className="h-6 w-6 text-slate-400" />}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-xs leading-tight truncate mb-1">
                {product.name}
              </h4>
              
              {/* Badges compactos */}
              <div className="flex flex-wrap gap-1">
                {product.category && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                    {product.category}
                  </Badge>
                )}
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                    Sin stock
                  </Badge>
                )}
                {isLowStock && (
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-amber-600 border-amber-300">
                    Bajo
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Precio destacado con descuento */}
          <div className="space-y-2">
            {/* Precio principal destacado con animaciones */}
            <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-2 border border-green-200 dark:border-green-800 overflow-hidden group-hover:shadow-md transition-shadow duration-300">
              {/* Efecto de brillo en el precio */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-200/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              
              <div className="relative z-10">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-green-700 dark:text-green-400 transition-all duration-300 group-hover:scale-105">
                      ${discountedPrice.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 line-through transition-opacity duration-300 group-hover:opacity-70">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full transition-all duration-300 group-hover:scale-110">
                    -{savingsPercentage.toFixed(0)}%
                  </div>
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1 font-medium">
                  💰 Ahorras ${savings.toFixed(2)}
                </div>
              </div>
            </div>
            
            {/* Stock info con tooltip */}
            <Tooltip 
              content={
                isOutOfStock 
                  ? "Producto sin stock disponible" 
                  : isLowStock 
                    ? "Stock bajo - considera reabastecer pronto"
                    : "Stock disponible para la venta"
              }
            >
              <div className="flex items-center gap-1 text-xs cursor-help">
                {isOutOfStock ? (
                  <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
                <span className={cn(
                  "font-medium transition-colors duration-200",
                  isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-slate-600"
                )}>
                  {product.stock || 0} disponibles
                </span>
                {isLowStock && !isOutOfStock && (
                  <Info className="h-3 w-3 text-amber-500 animate-pulse" />
                )}
              </div>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

/**
 * Skeleton para ProductCard durante la carga
 */
export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn("animate-pulse", className)}>
    <CardContent className="p-3">
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        </div>
      </div>
    </CardContent>
  </Card>
);