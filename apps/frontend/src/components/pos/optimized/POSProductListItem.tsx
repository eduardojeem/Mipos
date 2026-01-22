'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Search, Plus, AlertTriangle } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface POSProductListItemProps {
    product: Product;
    onViewDetails?: (product: Product) => void;
    onAddToCart?: (product: Product) => void;
    isWholesaleMode?: boolean;
    quickAddMode?: boolean;
    highlightProductId?: string;
}

export const POSProductListItem = memo(({
    product,
    onViewDetails,
    onAddToCart,
    isWholesaleMode,
    quickAddMode,
    highlightProductId
}: POSProductListItemProps) => {
    const [imageError, setImageError] = useState(false);
    const fmtCurrency = useCurrencyFormatter();

    const priceBase = isWholesaleMode && product.wholesale_price
        ? product.wholesale_price
        : product.sale_price;

    const isLowStock = (product.stock_quantity || 0) <= (product.min_stock || 5);
    const isOutOfStock = (product.stock_quantity || 0) === 0;
    const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
    const discountedPrice = hasDiscount ? priceBase * (1 - (product.discount_percentage! / 100)) : priceBase;
    const savings = hasDiscount ? priceBase - discountedPrice : 0;

    return (
        <div
            className={cn(
                "group flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-3 rounded-lg border-2 transition-all duration-200",
                isOutOfStock ? "opacity-60 bg-gray-50" : "bg-white hover:bg-muted/50",
                highlightProductId === product.id
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20 animate-pulse"
                    : "border-gray-200 hover:border-primary/30 hover:shadow-md"
            )}
        >
            {/* Imagen */}
            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden relative border border-gray-200">
                {product.image_url && !imageError ? (
                    <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                        <Package className="w-8 h-8 text-primary" />
                    </div>
                )}
            </div>

            {/* Contenido - Grid responsive */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 w-full">
                {/* Columna 1: Nombre y SKU */}
                <div className="md:col-span-1 min-w-0">
                    <h4 className="font-semibold text-sm leading-tight line-clamp-2 mb-1" title={product.name}>
                        {product.name}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">
                        SKU: {product.sku}
                    </p>
                </div>

                {/* Columna 2: Categoría y Badges */}
                <div className="md:col-span-1 flex flex-wrap items-start gap-1.5">
                    {product.category && (
                        <Badge variant="outline" className="text-xs">
                            {product.category.name}
                        </Badge>
                    )}
                    {hasDiscount && (
                        <Badge variant="destructive" className="text-xs font-bold">
                            -{product.discount_percentage}% OFF
                        </Badge>
                    )}
                    {isOutOfStock && (
                        <Badge variant="destructive" className="text-xs">
                            AGOTADO
                        </Badge>
                    )}
                    {isLowStock && !isOutOfStock && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Stock bajo
                        </Badge>
                    )}
                </div>

                {/* Columna 3: Precio y Stock */}
                <div className="md:col-span-1 space-y-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">
                            {fmtCurrency(discountedPrice)}
                        </span>
                        {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                                {fmtCurrency(priceBase)}
                            </span>
                        )}
                    </div>
                    {hasDiscount && savings > 0 && (
                        <p className="text-xs text-green-600 font-semibold">
                            Ahorras: {fmtCurrency(savings)}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Stock: <span className={cn(
                            "font-semibold",
                            isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-600" : "text-green-600"
                        )}>
                            {product.stock_quantity || 0} unidades
                        </span>
                    </p>
                </div>

                {/* Columna 4: Acciones */}
                <div className="md:col-span-1 flex gap-2 md:justify-end">
                    {!quickAddMode && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails?.(product)}
                            disabled={isOutOfStock}
                            className="flex-1 md:flex-initial"
                        >
                            <Search className="w-4 h-4 mr-1" />
                            Ver
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={() => onAddToCart?.(product)}
                        disabled={isOutOfStock}
                        className="flex-1 md:flex-initial"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                    </Button>
                </div>
            </div>
        </div>
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
        prevProps.highlightProductId === nextProps.highlightProductId
    );
});

POSProductListItem.displayName = 'POSProductListItem';
