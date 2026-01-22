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
}: ProductCardProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const isOutOfStock = product.stock_quantity <= 0;
    const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
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
                className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => onQuickView(product)}
            >
                <div className="flex">
                    {/* Image */}
                    <div className="relative w-32 sm:w-40 flex-shrink-0">
                        {product.image_url ? (
                            <div className="relative h-full min-h-[120px]">
                                <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    fill
                                    className={`object-cover transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                        }`}
                                    sizes="160px"
                                    loading={priority ? 'eager' : 'lazy'}
                                    onLoad={() => setImageLoaded(true)}
                                />
                                {!imageLoaded && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
                                )}
                            </div>
                        ) : (
                            <div className="h-full min-h-[120px] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {hasDiscount && (
                                <Badge variant="destructive" className="text-[10px] px-1.5">
                                    -{product.discount_percentage}%
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <CardContent className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                                {product.name}
                            </h3>
                            {product.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                    {product.description}
                                </p>
                            )}

                            {/* Rating */}
                            {product.rating && (
                                <div className="flex items-center gap-1 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-3 h-3 ${i < Math.floor(product.rating || 0)
                                                    ? 'text-yellow-400 fill-yellow-400'
                                                    : 'text-gray-200'
                                                }`}
                                        />
                                    ))}
                                    <span className="text-xs text-muted-foreground ml-1">
                                        ({product.rating.toFixed(1)})
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-foreground">
                                    {formatPrice(product.sale_price, config)}
                                </span>
                                {product.regular_price && product.regular_price > product.sale_price && (
                                    <span className="text-sm text-muted-foreground line-through">
                                        {formatPrice(product.regular_price, config)}
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleFavoriteClick}
                                >
                                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={isOutOfStock}
                                    onClick={handleAddToCart}
                                    className={`transition-all ${isAdding ? 'bg-green-600' : 'bg-red-600 hover:bg-red-700 text-white'} duration-200 hover:shadow-lg hover:scale-105`}
                                >
                                    {isAdding ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                                </Button>
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
            className="group overflow-hidden hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 transition-all duration-500 cursor-pointer bg-card border-2 border-transparent hover:border-primary/20"
            onClick={() => onQuickView(product)}
        >
            {/* Image Container */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>

                {/* Top Left Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                    {hasDiscount && (
                        <Badge className="text-xs font-bold shadow-xl bg-gradient-to-r from-red-500 to-pink-600 border-0 animate-bounce-slow">
                            <Zap className="w-3 h-3 mr-1" />
                            -{product.discount_percentage}%
                        </Badge>
                    )}
                    {isLowStock && !isOutOfStock && (
                        <Badge className="text-[10px] shadow-xl bg-gradient-to-r from-amber-500 to-orange-600 border-0 animate-pulse">
                            <Zap className="w-3 h-3 mr-1" />
                            ¡Últimas {product.stock_quantity}!
                        </Badge>
                    )}
                    {isOutOfStock && (
                        <Badge className="text-xs shadow-xl bg-gradient-to-r from-gray-600 to-gray-700 border-0">
                            Agotado
                        </Badge>
                    )}
                </div>

                {/* Top Right Actions */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 z-10">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md hover:bg-white dark:hover:bg-slate-900 hover:scale-110 transition-all duration-300"
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
                        className="h-10 w-10 rounded-full shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md hover:bg-white dark:hover:bg-slate-900 hover:scale-110 transition-all duration-300"
                        onClick={handleQuickView}
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                </div>

                {/* Quick Add Button */}
                <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-all duration-500 ease-out">
                    <Button
                        size="sm"
                        className={`w-full shadow-2xl transition-all font-semibold ${isAdding
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 scale-105'
                                : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:scale-105'
                            } duration-300`}
                        disabled={isOutOfStock}
                        onClick={handleAddToCart}
                    >
                        {isAdding ? (
                            <>
                                <Check className="w-4 h-4 mr-2 animate-bounce" />
                                ¡Agregado!
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Agregar al carrito
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <CardContent className={`${viewMode === 'compact' ? 'p-3' : 'p-4'} bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50`}>
                {/* Title */}
                <h3 className={`font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300 ${viewMode === 'compact' ? 'text-sm mb-1' : 'text-base mb-2'
                    }`}>
                    {product.name}
                </h3>

                {/* Rating - only on grid */}
                {viewMode !== 'compact' && product.rating && (
                    <div className="flex items-center gap-1 mb-3">
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 transition-all duration-300 ${i < Math.floor(product.rating || 0)
                                            ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                                            : 'text-gray-200 dark:text-gray-700'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                            {product.rating.toFixed(1)}
                        </span>
                    </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 flex-wrap mb-2">
                    <span className={`font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent ${viewMode === 'compact' ? 'text-lg' : 'text-xl'
                        }`}>
                        {formatPrice(product.sale_price, config)}
                    </span>
                    {product.regular_price && product.regular_price > product.sale_price && (
                        <span className="text-sm text-muted-foreground line-through opacity-75">
                            {formatPrice(product.regular_price, config)}
                        </span>
                    )}
                </div>

                {/* Stock indicator - only on grid */}
                {viewMode !== 'compact' && (
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/50">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${product.stock_quantity > 10 ? 'bg-green-500 shadow-lg shadow-green-500/50' :
                                product.stock_quantity > 0 ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50' :
                                    'bg-red-500 shadow-lg shadow-red-500/50'
                            }`} />
                        <span className="text-xs font-medium text-muted-foreground">
                            {isOutOfStock
                                ? 'Sin stock'
                                : product.stock_quantity <= 10
                                    ? `Solo ${product.stock_quantity} disponibles`
                                    : 'Disponible'
                            }
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.product.id === nextProps.product.id &&
        prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
        prevProps.product.sale_price === nextProps.product.sale_price &&
        prevProps.viewMode === nextProps.viewMode &&
        prevProps.isFavorite === nextProps.isFavorite &&
        prevProps.priority === nextProps.priority
    );
});

export default ProductCard;
