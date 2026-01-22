'use client';

import React, { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Package,
  TrendingDown,
  Sparkles,
  AlertCircle,
  Check,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product, quantity: number) => void;
  className?: string;
  showFeatures?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

export const ProductDetailModal = memo(({
  product,
  isOpen,
  onClose,
  onAddToCart,
  className,
  showFeatures = false,
  isFavorite,
  onToggleFavorite
}: ProductDetailModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const fmtCurrency = useCurrencyFormatter();

  // Reset state when product changes or modal closes
  useEffect(() => {
    if (product && isOpen) {
      setQuantity(1);
      setImageError(false);
      setAddedToCart(false);
    }
  }, [product, isOpen]);

  if (!product) return null;

  const priceBase = product.sale_price || 0;
  const isLowStock = (product.stock_quantity || 0) <= (product.min_stock || 5);
  const isOutOfStock = (product.stock_quantity || 0) === 0;
  const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
  const discountedPrice = hasDiscount ? priceBase * (1 - (product.discount_percentage! / 100)) : priceBase;
  const savings = hasDiscount ? priceBase - discountedPrice : 0;
  const maxQuantity = product.stock_quantity || 0;

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(maxQuantity, prev + delta)));
  };

  const handleAddToCart = () => {
    if (onAddToCart && !isOutOfStock) {
      onAddToCart(product, quantity);
      setAddedToCart(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-4xl p-0 gap-0 overflow-hidden bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50",
        className
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-2 max-h-[90vh]">
          {/* Left: Image */}
          <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 lg:min-h-[600px] flex items-center justify-center p-8">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>

            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(product.id)}
                aria-pressed={!!isFavorite}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                className="absolute top-4 right-16 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'text-rose-600' : 'text-muted-foreground'}`} />
              </Button>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
              {hasDiscount && (
                <Badge className="bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0 shadow-lg">
                  <Sparkles className="w-3 h-3 mr-1" />
                  -{product.discount_percentage}% OFF
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="destructive" className="shadow-lg">
                  AGOTADO
                </Badge>
              )}
              {isLowStock && !isOutOfStock && (
                <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Solo {product.stock_quantity}
                </Badge>
              )}
            </div>

            {/* Image */}
            <div className="relative w-full aspect-square max-w-md">
              {product.image_url && !imageError ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/20 rounded-2xl">
                  <Package className="w-32 h-32 text-primary/40" strokeWidth={1.5} />
                </div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex flex-col p-8 overflow-y-auto max-h-[90vh]">
            {/* Category */}
            {product.category && (
              <Badge variant="outline" className="w-fit mb-4 text-xs uppercase tracking-wider">
                {product.category.name}
              </Badge>
            )}

            {/* Title */}
            <h2 className="text-3xl font-black mb-2 text-gray-900 dark:text-gray-100 leading-tight">
              {product.name}
            </h2>

            {/* SKU */}
            <p className="text-sm text-muted-foreground font-mono mb-6">
              SKU: {product.sku}
            </p>

            {/* Price */}
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-black text-primary">
                  {fmtCurrency(discountedPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-xl text-muted-foreground line-through">
                    {fmtCurrency(priceBase)}
                  </span>
                )}
              </div>
              {hasDiscount && savings > 0 && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-lg font-bold">
                    Ahorras {fmtCurrency(savings)}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Descripción
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Stock */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Disponibilidad
              </h3>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  isOutOfStock ? "bg-red-500" : isLowStock ? "bg-orange-500" : "bg-green-500"
                )} />
                <span className="text-sm font-medium">
                  {isOutOfStock ? 'Agotado' : `${product.stock_quantity} unidades disponibles`}
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Cantidad
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="h-12 w-12 rounded-none hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <div className="px-6 py-3 min-w-[4rem] text-center">
                      <span className="text-2xl font-bold">{quantity}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= maxQuantity}
                      className="h-12 w-12 rounded-none hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Máximo: {maxQuantity}
                  </span>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={isOutOfStock || addedToCart}
              className={cn(
                "w-full h-14 text-lg font-bold shadow-lg transition-all duration-300",
                "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                addedToCart && "bg-green-600 hover:bg-green-600"
              )}
            >
              {addedToCart ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  ¡Agregado al carrito!
                </>
              ) : isOutOfStock ? (
                'Producto agotado'
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Agregar {quantity} {quantity === 1 ? 'unidad' : 'unidades'} al carrito
                </>
              )}
            </Button>

            {/* Additional Info */}
            {showFeatures && (
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Información adicional
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {product.category && (
                    <>
                      <span className="text-muted-foreground">Categoría:</span>
                      <span className="font-medium">{product.category.name}</span>
                    </>
                  )}
                  {product.supplier && (
                    <>
                      <span className="text-muted-foreground">Proveedor:</span>
                      <span className="font-medium">{product.supplier.name}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Stock mínimo:</span>
                  <span className="font-medium">{product.min_stock || 'No definido'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ProductDetailModal.displayName = 'ProductDetailModal';

export default ProductDetailModal;
