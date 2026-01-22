"use client";
import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Heart, Eye, Share2, Star, ShoppingCart } from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import type { Product } from '@/types';

interface Props {
  product: Product;
  viewMode: 'grid' | 'list' | 'compact';
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onOpenProductDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  config: any;
}

const ProductCard = memo(function ProductCard({
  product,
  viewMode,
  favorites,
  onToggleFavorite,
  onOpenProductDetail,
  onAddToCart,
  config
}: Props) {
  const reviewCount: number | null = (product as any)?.reviewCount ?? (product as any)?.reviews_count ?? null;
  const isFavorite = favorites.includes(product.id);
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <Card className="group overflow-hidden border bg-card rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-primary/10 readable-section">
      <div className="relative">
        {product.image_url ? (
          <Link href={`/catalog/${product.id}`}>
            <Image
              src={product.image_url}
              alt={product.name}
              width={800}
              height={600}
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
              loading="lazy"
              quality={85}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg=="
              className={`w-full object-cover transform-gpu will-change-transform transition-transform duration-500 ease-out group-hover:scale-[1.07] group-hover:brightness-[0.98] ${viewMode === 'list' ? 'h-32' : viewMode === 'compact' ? 'h-36' : 'h-48'
                }`}
            />
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          </Link>
        ) : (
          <Link href={`/catalog/${product.id}`}>
            <div className={`w-full bg-gradient-to-r from-indigo-100 via-pink-100 to-blue-100 dark:from-indigo-950 dark:via-purple-950 dark:to-blue-950 flex items-center justify-center ${viewMode === 'list' ? 'h-32' : viewMode === 'compact' ? 'h-36' : 'h-48'
              }`}>
              <Sparkles className="w-12 h-12 text-muted-foreground" />
            </div>
          </Link>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.discount_percentage && product.discount_percentage > 0 && (
            <Badge variant="destructive" className="text-xs">
              -{product.discount_percentage}%
            </Badge>
          )}
          {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
            <Badge variant="secondary" className="text-xs">
              Últimas unidades
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="destructive" className="text-xs">
              Agotado
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full w-8 h-8 p-0 bg-background hover:bg-muted border"
            onClick={() => onToggleFavorite(product.id)}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full w-8 h-8 p-0 bg-background hover:bg-muted border"
            onClick={() => onOpenProductDetail(product)}
            aria-label="Ver detalles"
          >
            <Eye className="w-4 h-4 text-foreground" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full w-8 h-8 p-0 bg-background hover:bg-muted border"
            onClick={() => { }}
            aria-label="Compartir"
          >
            <Share2 className="w-4 h-4 text-foreground" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4 sm:p-5">
        <div className={viewMode === 'list' ? 'flex items-center gap-4' : ''}>
          <div className="flex-1">
            <Link href={`/catalog/${product.id}`}>
              <h3 className="font-semibold tracking-tight text-foreground text-base md:text-lg mb-1 line-clamp-2 hover:underline readable-text">{product.name}</h3>
            </Link>

            {product.description && viewMode !== 'compact' && (
              <p className="text-sm md:text-base leading-relaxed text-muted-foreground mb-2 line-clamp-2 readable-text">{product.description}</p>
            )}

            {/* Beneficios / Nutrición rápida */}
            {viewMode !== 'compact' && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {typeof product.spf === 'number' && product.spf > 0 && (
                  <Badge variant="secondary" className="text-xs">SPF {product.spf}</Badge>
                )}
                {product.ingredients && (
                  <Badge variant="outline" className="text-xs truncate max-w-[180px]">{product.ingredients.split(',').slice(0, 2).join(', ')}…</Badge>
                )}
              </div>
            )}

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center mb-2">
                <div className="flex items-center" aria-label={`Calificación: ${product.rating} de 5 estrellas`}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < Math.floor(product.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-muted-foreground/40'
                        }`}
                    />
                  ))}
                </div>
                {reviewCount !== null ? (
                  <span className="text-xs text-muted-foreground ml-1">({reviewCount} reseñas)</span>
                ) : (
                  <span className="text-xs text-muted-foreground ml-1">({Number(product.rating).toFixed(1)})</span>
                )}
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                {formatPrice(product.sale_price, config)}
              </span>
              {product.regular_price && product.regular_price > product.sale_price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.regular_price, config)}
                </span>
              )}
            </div>

            {/* Stock Info */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${product.stock_quantity > 10 ? 'bg-green-500' :
                  product.stock_quantity > 0 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              <span className="text-xs text-muted-foreground">
                {product.stock_quantity > 0 ? `${product.stock_quantity} disponibles` : 'Agotado'}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <div className={viewMode === 'list' ? 'flex-shrink-0' : ''}>
            <Button
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock}
              variant="default"
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={isOutOfStock ? 'Producto agotado' : `Agregar ${product.name} al carrito`}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {isOutOfStock ? 'Agotado' : 'Agregar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison para optimizar re-renders
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.favorites.includes(prevProps.product.id) === nextProps.favorites.includes(nextProps.product.id)
  );
});

export default ProductCard;