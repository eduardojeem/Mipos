'use client';

import { memo, useCallback, useState, type MouseEvent } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Check,
  Eye,
  Heart,
  ShoppingCart,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import { getProductPricing } from '@/lib/public-site/product-pricing';
import type { BusinessConfig } from '@/types/business-config';
import type { Product } from '@/types';

interface ProductCardOptimizedProps {
  product: Product;
  viewMode: 'grid' | 'list' | 'compact';
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  config: BusinessConfig;
  priority?: boolean;
}

const ProductCardOptimized = memo(function ProductCardOptimized({
  product,
  viewMode,
  isFavorite,
  onToggleFavorite,
  onQuickView,
  onAddToCart,
  config,
  priority = false,
}: ProductCardOptimizedProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const pricing = getProductPricing(product);

  const isOutOfStock = Number(product.stock_quantity ?? 0) <= 0;
  const hasDiscount = pricing.hasDiscount;
  const isLowStock = Number(product.stock_quantity ?? 0) > 0 && Number(product.stock_quantity ?? 0) <= 5;
  const priceLabel = formatPrice(pricing.displayPrice, config);
  const comparePriceLabel = pricing.compareAtPrice ? formatPrice(pricing.compareAtPrice, config) : null;
  const savingsLabel = hasDiscount ? formatPrice(pricing.savings, config) : null;
  const imageUrl =
    product.image_url ||
    (Array.isArray(product.images) && typeof product.images[0] === 'string'
      ? product.images[0]
      : product.images?.[0] && typeof product.images[0] === 'object'
        ? product.images[0].url
        : null) ||
    null;

  const handleAddToCart = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    if (isOutOfStock) {
      return;
    }

    setIsAdding(true);
    onAddToCart(product);
    window.setTimeout(() => setIsAdding(false), 1500);
  }, [isOutOfStock, onAddToCart, product]);

  const handleFavoriteClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    onToggleFavorite(product.id);
  }, [onToggleFavorite, product.id]);

  const handleQuickView = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    onQuickView(product);
  }, [onQuickView, product]);

  if (viewMode === 'list') {
    return (
      <Card
        className={`group cursor-pointer overflow-hidden border transition-all duration-300 ${
          hasDiscount
            ? 'border-emerald-200/80 bg-white shadow-md shadow-slate-200/40 dark:border-emerald-900/40 dark:bg-slate-950/60'
            : 'border-slate-200/70 bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/60'
        }`}
        onClick={() => onQuickView(product)}
      >
        <div className="flex">
          <div className="relative w-32 flex-shrink-0 sm:w-40">
            {imageUrl ? (
              <div className="relative h-full min-h-[132px]">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  className={`object-cover transition-all duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  sizes="160px"
                  loading={priority ? 'eager' : 'lazy'}
                  onLoad={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700" />
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[132px] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                <Sparkles className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}

            <div className="absolute left-2 top-2 flex flex-col gap-1">
              {hasDiscount ? (
                <Badge className="border border-emerald-200 bg-white/95 px-2 py-1 text-[10px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/40 dark:bg-slate-950/90 dark:text-emerald-300">
                  Promo -{pricing.discountPercent}%
                </Badge>
              ) : null}
              {isOutOfStock ? (
                <Badge variant="secondary" className="px-2 py-1 text-[10px] font-semibold">
                  Agotado
                </Badge>
              ) : null}
            </div>
          </div>

          <CardContent className="flex flex-1 flex-col justify-between p-4">
            <div>
              <h3 className="mb-1 line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                {product.name}
              </h3>
              {hasDiscount && savingsLabel ? (
                <div className="mb-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  Ahorro {savingsLabel}
                </div>
              ) : null}
              {product.description ? (
                <p className="mb-2 line-clamp-1 text-sm text-muted-foreground">
                  {product.description}
                </p>
              ) : null}

              {product.rating ? (
                <div className="mb-2 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`h-3 w-3 ${
                        index < Math.floor(product.rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({product.rating.toFixed(1)})
                  </span>
                </div>
              ) : null}
            </div>

            <div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-foreground">
                      {priceLabel}
                    </span>
                    {comparePriceLabel ? (
                      <span className="text-sm text-muted-foreground line-through">
                        {comparePriceLabel}
                      </span>
                    ) : null}
                  </div>
                  {hasDiscount ? (
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Promocion vigente
                    </span>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFavoriteClick}>
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    className={`transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                      isAdding
                        ? 'bg-green-600'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isAdding ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {hasDiscount && comparePriceLabel ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  Antes {comparePriceLabel} · Ahora {priceLabel}
                </div>
              ) : null}
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-0 backdrop-blur-md transition-all duration-500 sm:rounded-3xl ${
        hasDiscount
          ? 'border border-emerald-200/80 bg-white shadow-lg shadow-slate-200/40 dark:border-emerald-900/40 dark:bg-slate-950/60 dark:shadow-none'
          : 'bg-white/40 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-primary/20 dark:bg-slate-900/40 dark:shadow-none'
      } hover:-translate-y-2`}
      onClick={() => onQuickView(product)}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-0 rounded-2xl p-[1px] sm:rounded-3xl ${
          hasDiscount
            ? 'bg-gradient-to-br from-emerald-200/70 via-transparent to-slate-200/70 dark:from-emerald-900/30 dark:via-transparent dark:to-slate-800/70'
            : 'bg-gradient-to-br from-slate-200/50 via-transparent to-slate-200/50 dark:from-white/10 dark:via-transparent dark:to-white/5'
        }`}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div
          className={`relative overflow-hidden ${
            hasDiscount
              ? 'bg-slate-100 dark:bg-slate-950/50'
              : 'bg-slate-100 dark:bg-slate-950/50'
          }`}
        >
          <div className={`relative overflow-hidden ${viewMode === 'compact' ? 'aspect-square' : 'aspect-[4/3]'}`}>
            {imageUrl ? (
              <>
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  className={`object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  sizes={
                    viewMode === 'compact'
                      ? '(max-width: 640px) 50vw, 25vw'
                      : '(max-width: 640px) 100vw, 33vw'
                  }
                  loading={priority ? 'eager' : 'lazy'}
                  onLoad={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
                <Sparkles className="h-12 w-12 animate-pulse text-muted-foreground/30" />
              </div>
            )}

            <div
              className={`absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${
                hasDiscount
                  ? 'bg-gradient-to-t from-slate-900/45 via-transparent to-transparent'
                  : 'bg-gradient-to-t from-slate-900/40 via-transparent to-transparent'
              }`}
            />
            <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%]" />
          </div>

          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
            {hasDiscount ? (
              <Badge className="border border-emerald-200 bg-white/95 text-[10px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/40 dark:bg-slate-950/90 dark:text-emerald-300">
                Promo -{pricing.discountPercent}%
              </Badge>
            ) : null}
            {isLowStock && !isOutOfStock ? (
              <Badge className="border-0 bg-amber-500 text-[10px] shadow-lg">
                <Zap className="mr-1 h-3 w-3" />
                Ultimas {product.stock_quantity}
              </Badge>
            ) : null}
            {isOutOfStock ? (
              <Badge className="rounded-lg border-0 bg-slate-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xl dark:bg-slate-800">
                Agotado
              </Badge>
            ) : null}
          </div>

          <div className="absolute right-3 top-3 z-10 flex translate-x-4 flex-col gap-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full bg-white/95 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white dark:bg-slate-900/95 dark:hover:bg-slate-900"
              onClick={handleFavoriteClick}
            >
              <Heart className={`h-4 w-4 transition-all duration-300 ${isFavorite ? 'scale-110 fill-red-500 text-red-500' : 'hover:scale-110'}`} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full border border-white/20 bg-white/80 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-white dark:border-white/10 dark:bg-slate-900/80 dark:hover:bg-slate-900"
              onClick={handleQuickView}
            >
              <Eye className="h-4 w-4 text-primary" />
            </Button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 translate-y-full p-4 transition-all duration-500 ease-out group-hover:translate-y-0">
            <Button
              size="sm"
              className={`h-11 w-full rounded-xl font-bold tracking-tight shadow-2xl transition-all duration-300 ${
                isAdding
                  ? 'scale-105 border-0 bg-gradient-to-r from-green-500 to-emerald-600'
                  : 'border-0 bg-gradient-to-r from-red-600 to-rose-600 text-white hover:scale-105 hover:from-red-700 hover:to-rose-700 hover:shadow-red-500/20'
              }`}
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              {isAdding ? (
                <>
                  <Check className="mr-2 h-5 w-5 animate-bounce" />
                  Listo
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Comprar
                </>
              )}
            </Button>
          </div>
        </div>

        <CardContent
          className={`${viewMode === 'compact' ? 'p-3' : 'p-4'} ${
            hasDiscount
              ? 'bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50'
              : 'bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50'
          }`}
        >
          {hasDiscount ? (
            <div className="mb-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Promocion vigente
            </div>
          ) : null}

          <h3
            className={`line-clamp-2 font-bold leading-tight text-slate-800 transition-colors duration-300 group-hover:text-primary dark:text-slate-100 ${
              viewMode === 'compact' ? 'mb-1.5 text-sm' : 'mb-2.5 text-base'
            }`}
          >
            {product.name}
          </h3>

          {viewMode !== 'compact' && product.rating ? (
            <div className="mb-3 flex items-center gap-1">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-3.5 w-3.5 transition-all duration-300 ${
                      index < Math.floor(product.rating || 0)
                        ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                        : 'text-gray-200 dark:text-gray-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {product.rating.toFixed(1)}
              </span>
            </div>
          ) : null}

          {hasDiscount && savingsLabel ? (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                Ahorro {savingsLabel}
              </p>
              {comparePriceLabel ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Antes {comparePriceLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mb-2 flex flex-wrap items-baseline gap-2">
            <span
              className={`font-extrabold tracking-tight ${
                hasDiscount
                  ? 'text-slate-900 dark:text-slate-50'
                  : 'bg-gradient-to-r from-primary via-purple-500 to-rose-500 bg-clip-text text-transparent'
              } ${viewMode === 'compact' ? 'text-lg' : 'text-2xl'}`}
            >
              {priceLabel}
            </span>
            {comparePriceLabel ? (
              <span className="text-xs font-medium text-slate-400 line-through dark:text-slate-500">
                {comparePriceLabel}
              </span>
            ) : null}
          </div>

          {viewMode !== 'compact' ? (
            <div
              className={`mt-4 flex items-center gap-2 rounded-xl border p-2.5 ${
                hasDiscount
                  ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                  : 'border-slate-200/50 bg-slate-100/50 dark:border-white/5 dark:bg-white/5'
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  Number(product.stock_quantity ?? 0) > 10
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : Number(product.stock_quantity ?? 0) > 0
                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-400 shadow-none'
                } ${!isOutOfStock ? 'animate-pulse' : ''}`}
              />
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  hasDiscount ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {isOutOfStock
                  ? 'Agotado'
                  : Number(product.stock_quantity ?? 0) <= 10
                    ? `Solo ${product.stock_quantity} unidades`
                    : hasDiscount
                      ? 'Promocion disponible'
                      : 'En stock'}
              </span>
            </div>
          ) : null}
        </CardContent>
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
    prevProps.product.sale_price === nextProps.product.sale_price &&
    prevProps.product.offer_price === nextProps.product.offer_price &&
    prevProps.product.regular_price === nextProps.product.regular_price &&
    prevProps.product.discount_percentage === nextProps.product.discount_percentage &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.priority === nextProps.priority
  );
});

export default ProductCardOptimized;
