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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <div className="relative aspect-square bg-muted dark:bg-slate-700">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
          loading="lazy"
        />
        
        {/* Discount Badge */}
        {hasDiscount && discountPercent && discountPercent > 0 && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-rose-500 dark:bg-rose-600 text-white border-none shadow-lg">
              -{discountPercent}%
            </Badge>
          </div>
        )}

        {/* Time Remaining Badge */}
        {timeLeft && timeLeft !== 'Finalizada' && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 text-[10px] shadow-sm">
              <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
              {timeLeft}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3 bg-white dark:bg-slate-800">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-slate-900 dark:text-slate-100">
          {name}
        </h3>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-base font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground dark:text-slate-400 line-through">
              {formatCurrency(basePrice)}
            </span>
          )}
        </div>

        {promotion?.name && (
          <p className="text-xs text-muted-foreground dark:text-slate-400 mb-2 line-clamp-1">
            {promotion.name}
          </p>
        )}

        <Button
          size="sm"
          className="w-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
          onClick={handleAddToCart}
          aria-label={`Agregar ${name} al carrito`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" aria-hidden="true" />
          Agregar
        </Button>
      </CardContent>
    </Card>
  );
}

export const ProductCard = memo(ProductCardComponent);
