'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Minus, Plus, Package2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CartItem } from '@/hooks/useCart';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

interface POSCartItemProps {
    item: CartItem & { product?: Product };
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemoveItem: (productId: string) => void;
    compact?: boolean;
    isRecentlyAdded?: boolean;
}

export const POSCartItem = memo(({
    item,
    onUpdateQuantity,
    onRemoveItem,
    compact = false,
    isRecentlyAdded = false
}: POSCartItemProps) => {
    const [imageError, setImageError] = useState(false);
    const isLowStock = (item.product?.stock_quantity || 0) - item.quantity <= (item.product?.min_stock || 5);
    const hasDiscount = item.product?.discount_percentage && item.product.discount_percentage > 0;
    const stockAvailable = (item.product?.stock_quantity || 0);
    const originalPrice = item.product?.sale_price || item.price;
    const savings = hasDiscount && item.product?.discount_percentage
        ? (originalPrice * (item.product.discount_percentage / 100)) * item.quantity
        : 0;

    return (
        <div className={cn(
            "group bg-white dark:bg-gray-900 rounded-xl border-2",
            isRecentlyAdded
                ? "border-green-500 bg-green-50 dark:bg-green-950/20 animate-pulse"
                : "border-gray-100 dark:border-gray-800",
            "hover:border-primary/30 dark:hover:border-primary/30 hover:shadow-lg",
            "transition-all duration-300",
            compact ? 'p-3' : 'p-4'
        )}>
            <div className="flex items-start gap-3">
                {/* Product Image */}
                <div className={cn(
                    "rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-gray-200 dark:border-gray-700 relative",
                    compact ? "w-14 h-14" : "w-16 h-16"
                )}>
                    {item.product?.image_url && !imageError ? (
                        <Image
                            src={item.product.image_url}
                            alt={item.product_name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 56px, 64px"
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30">
                            <Package2 className={cn(
                                "text-primary",
                                compact ? "w-6 h-6" : "w-8 h-8"
                            )} />
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                            <h4
                                className={cn(
                                    "font-semibold text-gray-900 dark:text-gray-100",
                                    "line-clamp-2 group-hover:line-clamp-none",
                                    "group-hover:text-primary transition-colors",
                                    compact ? "text-sm" : "text-base"
                                )}
                                title={item.product_name}
                            >
                                {item.product_name}
                            </h4>
                            {item.product?.sku && (
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                    SKU: {item.product.sku}
                                </p>
                            )}
                        </div>

                        {/* Delete Button - Always Visible */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "text-destructive hover:text-destructive hover:bg-destructive/10",
                                "transition-all duration-200 flex-shrink-0",
                                compact ? "h-7 w-7 p-0" : "h-8 w-8 p-0"
                            )}
                            onClick={() => onRemoveItem(item.product_id)}
                            aria-label={`Eliminar ${item.product_name} del carrito`}
                        >
                            <Trash2 className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                        </Button>
                    </div>

                    {/* Price and Badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className={cn(
                            "font-bold text-primary",
                            compact ? "text-sm" : "text-base"
                        )}>
                            {formatCurrency(item.price)}
                        </span>
                        <span className="text-xs text-muted-foreground">c/u</span>

                        {hasDiscount && originalPrice > item.price && (
                            <>
                                <span className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(originalPrice)}
                                </span>
                                {savings > 0 && (
                                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                                        Ahorras: {formatCurrency(savings)}
                                    </span>
                                )}
                            </>
                        )}

                        {hasDiscount && (
                            <Badge variant="secondary" className="bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs px-1.5 py-0">
                                -{item.product?.discount_percentage}% OFF
                            </Badge>
                        )}

                        {isLowStock && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                Stock bajo
                            </Badge>
                        )}
                    </div>

                    {/* Stock Info */}
                    {stockAvailable > 0 && (
                        <p className="text-xs text-muted-foreground mb-3">
                            Stock disponible: <span className="font-semibold">{stockAvailable} unidades</span>
                        </p>
                    )}

                    {/* Quantity Controls and Total */}
                    <div className="flex items-center justify-between gap-3">
                        {/* Quantity Controls - Larger */}
                        <div className="flex items-center gap-2 bg-muted/30 dark:bg-gray-800/30 rounded-lg p-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "rounded-md border-gray-300 dark:border-gray-600",
                                    "hover:bg-primary/10 hover:border-primary",
                                    "transition-all duration-200",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    compact ? "h-8 w-8 p-0" : "h-9 w-9 p-0"
                                )}
                                onClick={() => onUpdateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                                aria-label="Disminuir cantidad"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>

                            <span className={cn(
                                "font-bold text-gray-900 dark:text-gray-100 min-w-[3rem] text-center",
                                compact ? "text-base" : "text-lg"
                            )}>
                                {item.quantity}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "rounded-md border-gray-300 dark:border-gray-600",
                                    "hover:bg-primary/10 hover:border-primary",
                                    "transition-all duration-200",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    compact ? "h-8 w-8 p-0" : "h-9 w-9 p-0"
                                )}
                                onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                                disabled={item.quantity >= stockAvailable}
                                aria-label="Aumentar cantidad"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Total - Highlighted */}
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                            <span className={cn(
                                "font-black text-primary",
                                compact ? "text-lg" : "text-xl"
                            )}>
                                {formatCurrency(item.total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

POSCartItem.displayName = 'POSCartItem';

