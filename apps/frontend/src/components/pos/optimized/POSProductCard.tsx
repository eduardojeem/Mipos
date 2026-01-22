'use client';

import React, { memo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Eye, Sparkles, TrendingDown, AlertCircle } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { cn } from '@/lib/utils';
import { ResponsiveProductImage } from '@/components/pos/ResponsiveProductImage';
import type { Product } from '@/types';

interface POSProductCardProps {
    product: Product;
    onViewDetails?: (product: Product) => void;
    onAddToCart?: (product: Product) => void;
    isWholesaleMode?: boolean;
    quickAddMode?: boolean;
    highlightProductId?: string;
    isMobile?: boolean;
    index?: number;
}

export const POSProductCard = memo(({
    product,
    onViewDetails,
    onAddToCart,
    isWholesaleMode,
    quickAddMode,
    highlightProductId,
    isMobile = false,
    index = 0
}: POSProductCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const fmtCurrency = useCurrencyFormatter();

    const priceBase = isWholesaleMode && product.wholesale_price
        ? product.wholesale_price
        : (product.sale_price || 0);

    const isLowStock = (product.stock_quantity || 0) <= (product.min_stock || 5);
    const isOutOfStock = (product.stock_quantity || 0) === 0;
    const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
    const discountedPrice = hasDiscount ? priceBase * (1 - (product.discount_percentage! / 100)) : priceBase;
    const savings = hasDiscount ? priceBase - discountedPrice : 0;
    const isHighlighted = highlightProductId === product.id;

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300 w-full max-w-[220px]",
                "bg-card",
                "border-2 rounded-2xl shadow-sm",
                isOutOfStock && "opacity-70 grayscale",
                isHighlighted
                    ? "border-green-500 shadow-lg shadow-green-500/20 scale-[1.02]"
                    : "border-border hover:border-primary/40 hover:shadow-xl",
                !isOutOfStock && "hover:scale-[1.02]"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Animated gradient overlay */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/10 opacity-0 transition-opacity duration-500 pointer-events-none",
                isHovered && !isOutOfStock && "opacity-100"
            )} />

            {/* Top badges section */}
            <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2">
                {/* Left badges */}
                <div className="flex flex-col gap-1.5">
                    {hasDiscount && (
                        <Badge className="bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0 shadow-lg shadow-rose-500/30 animate-in slide-in-from-left">
                            <Sparkles className="w-3 h-3 mr-1" />
                            -{product.discount_percentage}%
                        </Badge>
                    )}
                    {isOutOfStock && (
                        <Badge variant="destructive" className="shadow-lg animate-in slide-in-from-left delay-75">
                            AGOTADO
                        </Badge>
                    )}
                </div>

                {/* Right badges */}
                <div className="flex flex-col gap-1.5 items-end">
                    {isLowStock && !isOutOfStock && (
                        <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/30 animate-pulse">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {product.stock_quantity}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Image section with improved aspect ratio */}
            <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-muted/40">
                <ResponsiveProductImage
                    src={product.image_url}
                    alt={product.name}
                    index={index}
                    className={cn(
                        "transition-transform duration-500",
                        isHovered && !isOutOfStock && "scale-110"
                    )}
                />

                {/* Quick action overlay on hover */}
                {!quickAddMode && (
                    <div className={cn(
                        "absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 transition-opacity duration-300",
                        isHovered && !isOutOfStock ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-popover/90 hover:bg-popover shadow-lg"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails?.(product);
                            }}
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            className="shadow-lg"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart?.(product);
                            }}
                            disabled={isOutOfStock}
                        >
                            <ShoppingCart className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Content section */}
            <div className="p-3 space-y-2 relative z-10 flex flex-col h-full">
                {/* Category badge */}
                {product.category && (
                    <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider w-fit">
                        {product.category.name}
                    </Badge>
                )}

                {/* Product name - 2 lines for better readability */}
                <h3
                    className="font-bold text-sm leading-snug line-clamp-2 min-h-[2.25rem] text-foreground"
                    title={product.name}
                >
                    {product.name}
                </h3>

                {/* Price section - Well sized and visible */}
                <div className="space-y-1 flex-1 flex flex-col justify-center">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl font-black text-primary tracking-tight">
                            {discountedPrice > 0 ? fmtCurrency(discountedPrice) : '$0.00'}
                        </span>
                        {hasDiscount && priceBase > 0 && (
                            <span className="text-xs text-muted-foreground line-through font-medium">
                                {fmtCurrency(priceBase)}
                            </span>
                        )}
                    </div>

                    {hasDiscount && savings > 0 && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <TrendingDown className="w-3 h-3" />
                            <span className="text-[10px] font-bold">
                                Ahorras {fmtCurrency(savings)}
                            </span>
                        </div>
                    )}
                </div>

                {/* SKU - Minimal */}
                <p className="text-[9px] text-muted-foreground/70 font-mono">
                    {product.sku}
                </p>

                {/* Action buttons - Clear and accessible */}
                <div className="space-y-1.5">
                    <Button
                        className={cn(
                            "w-full h-9 text-xs font-bold shadow-md transition-all duration-300",
                            "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:shadow-lg",
                            isHighlighted && "animate-pulse"
                        )}
                        onClick={() => onAddToCart?.(product)}
                        disabled={isOutOfStock}
                    >
                        <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                        {isOutOfStock ? 'Agotado' : 'Agregar'}
                    </Button>

                    {!quickAddMode && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[11px] font-medium hover:bg-muted"
                            onClick={() => onViewDetails?.(product)}
                        >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                        </Button>
                    )}
                </div>
            </div>

            {/* Highlight pulse effect */}
            {isHighlighted && (
                <div className="absolute inset-0 rounded-2xl border-2 border-green-500 animate-ping opacity-75 pointer-events-none" />
            )}
        </Card>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.product.id === nextProps.product.id &&
        prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
        prevProps.product.sale_price === nextProps.product.sale_price &&
        prevProps.product.wholesale_price === nextProps.product.wholesale_price &&
        prevProps.product.discount_percentage === nextProps.product.discount_percentage &&
        prevProps.product.updated_at === nextProps.product.updated_at &&
        prevProps.isWholesaleMode === nextProps.isWholesaleMode &&
        prevProps.quickAddMode === nextProps.quickAddMode &&
        prevProps.highlightProductId === nextProps.highlightProductId &&
        prevProps.isMobile === nextProps.isMobile &&
        prevProps.index === nextProps.index
    );
});

POSProductCard.displayName = 'POSProductCard';
