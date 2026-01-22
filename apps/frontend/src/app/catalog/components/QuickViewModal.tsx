'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Heart, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Star, 
  Share2,
  Check,
  Truck,
  Shield,
  RotateCcw,
  Sparkles,
  ZoomIn
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import type { Product } from '@/types';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
  config: any;
}

export default function QuickViewModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
  config,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    onAddToCart(product, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [product, quantity, onAddToCart]);

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(prev + delta, product?.stock_quantity || 99)));
  }, [product?.stock_quantity]);

  if (!product) return null;

  const isOutOfStock = product.stock_quantity <= 0;
  const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
  const images = product.image_url ? [product.image_url] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-inner">
              {images.length > 0 ? (
                <Image
                  src={images[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-contain p-4 transition-transform hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-20 h-20 text-muted-foreground/30" />
                </div>
              )}

              {/* Zoom button */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-4 right-4 rounded-full opacity-0 hover:opacity-100 transition-opacity"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Badges */}
            <div className="absolute top-8 left-8 flex flex-col gap-2">
              {hasDiscount && (
                <Badge variant="destructive" className="text-sm font-bold px-3 py-1">
                  -{product.discount_percentage}% OFF
                </Badge>
              )}
              {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                <Badge variant="secondary" className="text-sm">
                  ¡Últimas {product.stock_quantity} unidades!
                </Badge>
              )}
            </div>

            {/* Thumbnail strip (for multiple images) */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image src={img} alt="" width={64} height={64} className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-6 md:p-8 flex flex-col">
            {/* Header */}
            <div className="flex-1">
              {/* Category */}
              {product.category_id && (
                <Badge variant="outline" className="mb-3 text-xs">
                  Categoría
                </Badge>
              )}

              {/* Title */}
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">
                {product.name}
              </h2>

              {/* Rating */}
              {product.rating && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating || 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.rating.toFixed(1)} • 24 reseñas
                  </span>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl md:text-4xl font-bold text-foreground">
                  {formatPrice(product.sale_price, config)}
                </span>
                {product.regular_price && product.regular_price > product.sale_price && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.regular_price, config)}
                  </span>
                )}
                {hasDiscount && (
                  <Badge variant="destructive" className="ml-2">
                    Ahorras {formatPrice(product.regular_price! - product.sale_price, config)}
                  </Badge>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2 mb-6">
                <div className={`w-3 h-3 rounded-full ${
                  product.stock_quantity > 10 ? 'bg-green-500' :
                  product.stock_quantity > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                }`} />
                <span className={`text-sm font-medium ${
                  isOutOfStock ? 'text-red-600' : 'text-green-600'
                }`}>
                  {isOutOfStock 
                    ? 'Agotado' 
                    : product.stock_quantity <= 5 
                      ? `Solo quedan ${product.stock_quantity} unidades`
                      : `${product.stock_quantity} en stock`
                  }
                </span>
              </div>

              <Separator className="my-6" />

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium text-foreground">Cantidad:</span>
                <div className="flex items-center border rounded-xl overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold text-lg">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Total: <strong>{formatPrice(product.sale_price * quantity, config)}</strong>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <Button
                  size="lg"
                  className={`flex-1 h-14 text-lg font-semibold transition-all ${
                    addedToCart 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:scale-105'
                  }`}
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  {addedToCart ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      ¡Agregado!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Agregar al Carrito
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14"
                  onClick={() => onToggleFavorite(product.id)}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
                <Truck className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs font-medium">Envío Gratis</span>
                <span className="text-[10px] text-muted-foreground">Pedidos +$50</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
                <Shield className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs font-medium">Garantía</span>
                <span className="text-[10px] text-muted-foreground">30 días</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
                <RotateCcw className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs font-medium">Devoluciones</span>
                <span className="text-[10px] text-muted-foreground">Fáciles</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
