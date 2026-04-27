'use client';

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Heart,
    Eye,
    ShoppingCart,
    Star,
    Check,
    Sparkles,
    Zap
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import { getProductPricing } from '@/lib/public-site/product-pricing';
import type { Product } from '@/types';

interface ProductCardProps {
    product: Product;
    viewMode: 'grid' | 'list' | 'compact';
    isFavorite: boolean;
    onToggleFavorite: (productId: string) => void;
    onQuickView: (product: Product) => void;
    onAddToCart: (product: Product) => void;
    config: any;
    priority?: boolean;
    allowAddToCart?: boolean;
}

const ProductCard = memo(function ProductCard({
    product,
    viewMode,
    isFavorite,
    onToggleFavorite,
    onQuickView,
    onAddToCart,
    config,
    priority = false,
    allowAddToCart = true,
}: ProductCardProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const pricing = getProductPricing(product);

    const isOutOfStock = product.stock_quantity <= 0;
    const hasDiscount = pricing.hasDiscount;
    const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

    const handleAddToCart = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOutOfStock) return;

        setIsAdding(true);
        onAddToCart(product);
        setTimeout(() => setIsAdding(false), 1500);
    }, [product, isOutOfStock, onAddToCart]);

    const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFavorite(product.id);
    }, [product.id, onToggleFavorite]);

    const handleQuickView = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onQuickView(product);
    }, [product, onQuickView]);

    // List view layout
    if (viewMode === 'list') {
        return (
            <Card
                className="group relative overflow-hidden transition-all duration-500 cursor-pointer border-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 rounded-2xl"
                onClick={() => onQuickView(product)}
            >
                <div className="flex relative z-10">
                    {/* Image */}
                    <div className="relative w-32 sm:w-40 flex-shrink-0 overflow-hidden rounded-l-2xl">
                        {product.image_url ? (
                            <div className="relative h-full min-h-[120px]">
                                <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    fill
                                    className={`object-cover transition-all duration-700 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                        }`}
                                    sizes="160px"
                                    loading={priority ? 'eager' : 'lazy'}
                                    onLoad={() => setImageLoaded(true)}
                                />
                                {!imageLoaded && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse" />
                                )}
                            </div>
                        ) : (
                            <div className="h-full min-h-[120px] bg-slate-100 dark:bg-slate-950/50 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                            </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {hasDiscount && (
                                <Badge className="text-[10px] font-bold shadow-xl bg-gradient-to-r from-red-500 to-pink-600 border-0 px-1.5 py-0">
                                    -{pricing.discountPercent}%
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <CardContent className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mb-1 group-hover:text-primary transition-colors duration-300">
                                {product.name}
                            </h3>
                            {product.description && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2 font-medium">
                                    {product.description}
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-extrabold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent tracking-tight">
                                    {formatPrice(pricing.displayPrice, config)}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-9 w-9 rounded-full bg-white/80 dark:bg-white/5 backdrop-blur-md border-0 hover:bg-white dark:hover:bg-white/10"
                                    onClick={handleFavoriteClick}
                                >
                                    <Heart className={`w-4 h-4 transition-all ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : ''}`} />
                                </Button>
                                {allowAddToCart ? (
                                    <Button
                                        size="sm"
                                        disabled={isOutOfStock}
                                        onClick={handleAddToCart}
                                        className={`h-9 px-4 rounded-xl transition-all font-bold tracking-tight ${isAdding 
                                            ? 'bg-green-500 hover:bg-green-600' 
                                            : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20'} text-white border-0`}
                                    >
                                        {isAdding ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>
        );
    }

    // Grid/Compact view layout
    return (
        <Card
            className="group relative overflow-hidden transition-all duration-500 cursor-pointer border-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 rounded-2xl sm:rounded-3xl"
            onClick={() => onQuickView(product)}
        >
            {/* Premium Border Gradient Overlay */}
            <div className="absolute inset-0 p-[1px] rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-200/50 via-transparent to-slate-200/50 dark:from-white/10 dark:via-transparent dark:to-white/5 pointer-events-none z-0" />
            
            <div className="relative z-10 flex flex-col h-full">
            {/* Image Container */}
            <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-950/50">
                <div className={`relative ${viewMode === 'compact' ? 'aspect-square' : 'aspect-[4/3]'}`}>
                    {product.image_url ? (
                        <>
                            <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                className={`object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                    }`}
                                sizes={viewMode === 'compact' ? '(max-width: 640px) 50vw, 25vw' : '(max-width: 640px) 100vw, 33vw'}
                                loading={priority ? 'eager' : 'lazy'}
                                onLoad={() => setImageLoaded(true)}
                            />
                            {!imageLoaded && (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 flex items-center justify-center">
                            <Sparkles className="w-12 h-12 text-muted-foreground/30 animate-pulse" />
                        </div>
                    )}

                    {/* Overlay gradient with better effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                </div>

                {/* Top Left Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                    {hasDiscount && (
                            <Badge className="text-[10px] font-bold shadow-xl bg-gradient-to-r from-red-500 to-pink-600 border-0 animate-bounce-slow px-2">
                                <Zap className="w-3 h-3 mr-1" />
                                -{pricing.discountPercent}%
                            </Badge>
                    )}
                    {isLowStock && !isOutOfStock && (
                        <Badge className="text-[10px] shadow-xl bg-gradient-to-r from-amber-500 to-orange-600 border-0 animate-pulse px-2">
                            <Zap className="w-3 h-3 mr-1" />
                            ¡Últimas {product.stock_quantity}!
                        </Badge>
                    )}
                    {isOutOfStock && (
                        <Badge className="text-[10px] font-bold shadow-xl bg-slate-500 dark:bg-slate-800 text-white border-0 px-2 py-0.5 rounded-lg">
                            Agotado
                        </Badge>
                    )}
                </div>

                {/* Top Right Actions */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 z-10">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 hover:bg-white dark:hover:bg-slate-900 hover:scale-110 transition-all duration-300"
                        onClick={handleFavoriteClick}
                    >
                        <Heart className={`w-4 h-4 transition-all duration-300 ${isFavorite
                                ? 'fill-red-500 text-red-500 scale-110'
                                : 'hover:scale-110'
                            }`} />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 hover:bg-white dark:hover:bg-slate-900 hover:scale-110 transition-all duration-300"
                        onClick={handleQuickView}
                    >
                        <Eye className="w-4 h-4 text-primary" />
                    </Button>
                </div>

                {/* Quick Add Button */}
                {allowAddToCart ? (
                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-all duration-500 ease-out z-20">
                    <Button
                        size="sm"
                        className={`w-full h-11 shadow-2xl transition-all font-bold tracking-tight rounded-xl ${isAdding
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-0 scale-105'
                                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white border-0 hover:shadow-red-500/20 hover:scale-105'
                            } duration-300`}
                        disabled={isOutOfStock}
                        onClick={handleAddToCart}
                    >
                        {isAdding ? (
                            <>
                                <Check className="w-5 h-5 mr-2 animate-bounce" />
                                ¡Listo!
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                Comprar
                            </>
                        )}
                    </Button>
                </div>
                ) : null}
            </div>

            {/* Content */}
            <CardContent className={`${viewMode === 'compact' ? 'p-3' : 'p-4'} flex-1 flex flex-col justify-between transition-colors duration-300`}>
                <div className="mb-2">
                    {/* Title */}
                    <h3 className={`font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300 ${viewMode === 'compact' ? 'text-sm mb-1.5' : 'text-base mb-2.5'
                        }`}>
                        {product.name}
                    </h3>

                    {/* Rating - only on grid */}
                    {viewMode !== 'compact' && product.rating && (
                        <div className="flex items-center gap-1.5 mb-3">
                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`w-3.5 h-3.5 transition-all duration-300 ${i < Math.floor(product.rating || 0)
                                                ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                                                : 'text-slate-200 dark:text-slate-800'
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                {product.rating.toFixed(1)}
                            </span>
                        </div>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-2 flex-wrap mb-2">
                        <span className={`font-extrabold bg-gradient-to-r from-primary via-purple-500 to-rose-500 bg-clip-text text-transparent tracking-tight ${viewMode === 'compact' ? 'text-lg' : 'text-2xl'
                            }`}>
                            {formatPrice(pricing.displayPrice, config)}
                        </span>
                        {pricing.compareAtPrice ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500 line-through opacity-75 font-medium">
                                {formatPrice(pricing.compareAtPrice, config)}
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Stock indicator - only on grid */}
                {viewMode !== 'compact' && (
                    <div className="flex items-center gap-2 mt-4 p-2.5 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                        <div className={`w-2 h-2 rounded-full ${product.stock_quantity > 10 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                product.stock_quantity > 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                    'bg-slate-400 shadow-none'
                            } ${!isOutOfStock && 'animate-pulse'}`} />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {isOutOfStock
                                ? 'Agotado'
                                : product.stock_quantity <= 10
                                    ? `Solo ${product.stock_quantity} unidades`
                                    : 'En Stock'
                            }
                        </span>
                    </div>
                )}
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

export default ProductCard;
