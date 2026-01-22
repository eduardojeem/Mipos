'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Package, Edit, Trash2, Star, BarChart3, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
    product: Product;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
    onToggleFavorite?: (id: string) => void;
}

export const ProductCard = memo(function ProductCard({
    product,
    isSelected = false,
    onSelect,
    onEdit,
    onDelete,
    onToggleFavorite
}: ProductCardProps) {
    const stock = product.stock_quantity || 0;
    const minStock = product.min_stock || 0;
    const isLowStock = stock > 0 && stock <= minStock;
    const isOutOfStock = stock === 0;

    const stockStatus = isOutOfStock
        ? { label: 'Sin stock', variant: 'destructive' as const, icon: AlertTriangle }
        : isLowStock
            ? { label: 'Stock bajo', variant: 'secondary' as const, icon: AlertTriangle }
            : { label: 'Stock normal', variant: 'default' as const, icon: Package };

    const StockIcon = stockStatus.icon;

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                isSelected && "ring-2 ring-primary shadow-lg"
            )}
        >
            {/* Selection Checkbox */}
            {onSelect && (
                <div className="absolute top-3 left-3 z-10">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelect(product.id)}
                        className="bg-background/80 backdrop-blur-sm"
                    />
                </div>
            )}

            {/* Favorite Button */}
            {onToggleFavorite && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={() => onToggleFavorite(product.id)}
                >
                    <Star
                            className={cn(
                                "h-4 w-4 transition-colors",
                                ((product as any)?.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")
                            )}
                    />
                </Button>
            )}

            {/* Product Image */}
            <div className="relative aspect-square bg-muted overflow-hidden">
                {product.image_url ? (
                    <Image
                        src={product.image_url}
                        alt={product.name || 'Product'}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted to-muted/50">
                        <Package className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                )}

                {/* Stock Badge Overlay */}
                <div className="absolute bottom-2 left-2">
                    <Badge variant={stockStatus.variant} className="gap-1 shadow-md">
                        <StockIcon className="h-3 w-3" />
                        {stock}
                    </Badge>
                </div>
            </div>

            <CardContent className="p-4 space-y-3">
                {/* Product Name & SKU */}
                <div className="space-y-1">
                    <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                        {product.name || 'Sin nombre'}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                        SKU: {product.sku || 'N/A'}
                    </p>
                </div>

                {/* Price & Category */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        {(product as any).offer_price != null && (product as any).offer_price > 0 ? (
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground line-through">
                                    Gs {(((product as any).sale_price || 0) as number).toLocaleString('es-PY', { minimumFractionDigits: 0 })}
                                </p>
                                <p className="text-lg font-bold text-primary">
                                    Gs {(((product as any).offer_price || 0) as number).toLocaleString('es-PY', { minimumFractionDigits: 0 })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-lg font-bold text-primary">
                                Gs {(((product as any).sale_price || 0) as number).toLocaleString('es-PY', { minimumFractionDigits: 0 })}
                            </p>
                        )}
                        {(product as any).cost_price && (
                            <p className="text-xs text-muted-foreground">
                                Costo: Gs {(((product as any).cost_price || 0) as number).toLocaleString('es-PY', { minimumFractionDigits: 0 })}
                            </p>
                        )}
                    </div>
                    {product.category && (
                        <Badge variant="outline" className="text-xs">
                            {typeof product.category === 'object' ? product.category.name : product.category}
                        </Badge>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => onEdit?.(product)}
                    >
                        <Edit className="h-3 w-3" />
                        Editar
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                                <BarChart3 className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onDelete?.(product.id)} className="text-destructive gap-2">
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
});

interface ProductsGridProps {
    products: Product[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
    onToggleFavorite?: (id: string) => void;
    isLoading?: boolean;
}

export const ProductsGrid = memo(function ProductsGrid({
    products,
    selectedIds = new Set(),
    onSelect,
    onEdit,
    onDelete,
    onToggleFavorite,
    isLoading = false
}: ProductsGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <div className="aspect-square bg-muted animate-pulse" />
                        <CardContent className="p-4 space-y-3">
                            <div className="h-4 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                            <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center p-6">
                <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
                <p className="text-sm text-muted-foreground">
                    Intenta ajustar los filtros o crea un nuevo producto
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedIds.has(product.id)}
                    onSelect={onSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                />
            ))}
        </div>
    );
});
