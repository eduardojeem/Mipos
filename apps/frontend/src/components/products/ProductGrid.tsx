'use client';

import React from 'react';
import Image from 'next/image';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    Package,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Star,
    StarOff,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
    id: string;
    name: string;
    code: string;
    description?: string;
    stock: number;
    minStock: number;
    price: number;
    costPrice: number;
    categoryId: string;
    category?: {
        id: string;
        name: string;
    };
    discount_percentage?: number;
    image?: string;
    images?: string[];
    supplier?: {
        name: string;
    };
    createdAt: Date;
    updatedAt: Date;
    isFavorite?: boolean;
}

interface ProductGridProps {
    products: Product[];
    onEdit?: (product: Product) => void;
    onDelete?: (productId: string) => void;
    onView?: (product: Product) => void;
    onToggleFavorite?: (productId: string) => void;
    isLoading?: boolean;
    currentPage?: number;
    itemsPerPage?: number;
    onPageChange?: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
    totalItems?: number;
    hasMore?: boolean;
    onLoadMore?: () => Promise<void>;
    canEdit?: boolean;
    canDelete?: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function ProductGrid({
    products,
    onEdit,
    onDelete,
    onView,
    onToggleFavorite,
    isLoading = false,
    currentPage = 1,
    itemsPerPage = 25,
    onPageChange,
    onItemsPerPageChange,
    totalItems = 0,
    hasMore = false,
    onLoadMore,
    canEdit = true,
    canDelete = true,
}: ProductGridProps) {
    const fmtCurrency = useCurrencyFormatter();

    const getStockStatus = (product: Product) => {
        if (product.stock === 0) return 'out';
        if (product.stock <= product.minStock) return 'low';
        return 'normal';
    };

    const getStockBadge = (product: Product) => {
        const status = getStockStatus(product);
        switch (status) {
            case 'out':
                return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Sin Stock</Badge>;
            case 'low':
                return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Stock Bajo</Badge>;
            default:
                return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Normal</Badge>;
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <div className="aspect-square bg-muted animate-pulse" />
                            <CardHeader className="space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200">
                        <div className="relative aspect-square bg-muted group">
                            {product.image || product.images?.[0] ? (
                                <Image
                                    src={product.image || product.images?.[0] || ''}
                                    alt={product.name}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Package className="h-12 w-12 text-muted-foreground/50" />
                                </div>
                            )}

                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 shadow-sm"
                                    onClick={() => onToggleFavorite?.(product.id)}
                                    aria-label={product.isFavorite ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
                                >
                                    {product.isFavorite ? (
                                        <Star className="h-4 w-4 text-yellow-500 fill-current" aria-hidden="true" />
                                    ) : (
                                        <Star className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    )}
                                </Button>
                            </div>

                            <div className="absolute top-2 left-2">
                                {getStockBadge(product)}
                            </div>
                        </div>

                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h3 className="font-semibold text-base line-clamp-1" title={product.name}>
                                        {product.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                        {product.code}
                                    </p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="h-8 w-8 p-0 -mr-2"
                                            aria-label={`Abrir menú de acciones para ${product.name}`}
                                        >
                                            <span className="sr-only">Abrir menú</span>
                                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onView?.(product)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Ver detalles
                                        </DropdownMenuItem>
                                        {canEdit && (
                                            <DropdownMenuItem onClick={() => onEdit?.(product)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        {canDelete && (
                                            <DropdownMenuItem
                                                onClick={() => onDelete?.(product.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-2 flex-grow">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Categoría:</span>
                                    <span className="font-medium truncate max-w-[120px]">{product.category?.name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Stock:</span>
                                    <span className="font-medium">{product.stock}</span>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="p-4 pt-0 border-t bg-muted/5 mt-auto">
                            <div className="w-full flex justify-between items-center pt-3">
                                <span className="text-xs text-muted-foreground">Precio</span>
                                {(product as any).offer_price != null && (product as any).offer_price > 0 ? (
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground line-through">{fmtCurrency(product.price)}</div>
                                        <div className="font-bold text-lg text-primary">{fmtCurrency((product as any).offer_price)}</div>
                                    </div>
                                ) : (
                                    <span className="font-bold text-lg text-primary">{fmtCurrency(product.price)}</span>
                                )}
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Mostrar</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => onItemsPerPageChange?.(Number(value))}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option.toString()}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span>por página</span>
                    <span className="mx-2">|</span>
                    <span>
                        Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} -{' '}
                        {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange?.(1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange?.(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1 mx-2">
                        <span className="text-sm font-medium">
                            Página {currentPage} de {totalPages}
                        </span>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange?.(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange?.(totalPages)}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
