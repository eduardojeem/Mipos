/**
 * Reusable ProductCard component
 * Displays product information with image, price, discount, and add to cart button
 */

'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock } from 'lucide-react';
import { getTimeRemaining } from '../utils/timeCalculations';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    image: string;
    basePrice: number;
    offerPrice?: number;
    discountPercent?: number;
    stock?: number;
    isActive?: boolean;
  };
  promotion?: {
    name: string;
    endDate?: string;
  };
  onAddToCart: (product: any) => void;
  formatCurrency: (n: number) => string;
}

function ProductCardComponent({
  product,
  promotion,
  onAddToCart,
  formatCurrency,
}: ProductCardProps) {
  const { id, name, image, basePrice, offerPrice, discountPercent, stock, isActive } = product;
  const hasDiscount = offerPrice !== undefined && offerPrice < basePrice;
  const displayPrice = offerPrice ?? basePrice;
  const timeLeft = promotion?.endDate ? getTimeRemaining(promotion.endDate) : null;

  const handleAddToCart = () => {
    const base = Number(basePrice || 0);
    const offer = Number(offerPrice ?? NaN);
    const effectiveOffer = offer > 0 && offer < base ? offer : undefined;
    onAddToCart({
      id,
      name,
      sale_price: base,
      offer_price: effectiveOffer,
      image_url: image,
      stock_quantity: stock ?? 999,
      is_active: isActive ?? true,
    });
  };

  return (
    <Card className="card-product group border-0 shadow-lg hover:shadow-2xl animate-slide-up">
      <div className="image-overlay relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 50vw, 25vw"
          loading="lazy"
        />
        
        {/* Premium gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Discount Badge - Premium style */}
        {hasDiscount && discountPercent && discountPercent > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="badge-hot text-xs font-bold px-3 py-1 shadow-xl">
              🔥 -{discountPercent}%
            </Badge>
          </div>
        )}

        {/* Time Remaining Badge - Premium glassmorphism */}
        {timeLeft && timeLeft !== 'Finalizada' && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="glass-card text-[10px] font-semibold px-2 py-1 border-0 shadow-lg">
              <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
              {timeLeft}
            </Badge>
          </div>
        )}

        {/* Quick action button on hover */}
        <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button
            size="sm"
            className="w-full btn-premium shadow-xl backdrop-blur-sm"
            onClick={handleAddToCart}
            aria-label={`Agregar ${name} al carrito`}
          >
            <ShoppingCart className="w-4 h-4 mr-2" aria-hidden="true" />
            Agregar al Carrito
          </Button>
        </div>
      </div>

      <CardContent className="p-4 bg-white dark:bg-slate-800">
        <h3 className="font-bold text-sm line-clamp-2 mb-2 text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {name}
        </h3>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg font-black bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            {formatCurrency(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground dark:text-slate-400 line-through opacity-75">
              {formatCurrency(basePrice)}
            </span>
          )}
        </div>

        {promotion?.name && (
          <div className="mb-3">
            <Badge variant="outline" className="text-[10px] font-medium border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-400">
              ✨ {promotion.name}
            </Badge>
          </div>
        )}

        {/* Stock indicator */}
        {stock !== undefined && stock > 0 && stock < 10 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-2">
            ⚠️ Solo quedan {stock} unidades
          </p>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-300 hover:scale-105 font-semibold shadow-md hover:shadow-xl group-hover:shadow-purple-500/50"
          onClick={handleAddToCart}
          aria-label={`Agregar ${name} al carrito`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" aria-hidden="true" />
          Comprar Ahora
        </Button>
      </CardContent>
    </Card>
  );
}

export const ProductCard = memo(ProductCardComponent);
