'use client';

import React, { memo } from 'react';
import { Search, Filter, Grid3x3, List, LayoutGrid, Plus, Download, Upload, RefreshCw, Zap, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useProductsStore } from '@/store/products-store';
import { cn } from '@/lib/utils';

interface ProductsToolbarProps {
    onCreateProduct?: () => void;
    onExport?: () => void;
    onImport?: () => void;
    onRefresh?: () => void;
    selectedCount?: number;
}

export const ProductsToolbar = memo(function ProductsToolbar({
    onCreateProduct,
    onExport,
    onImport,
    onRefresh,
    selectedCount = 0
}: ProductsToolbarProps) {
    const {
        filters,
        currentView,
        isVirtualized,
        showFilters,
        updateFilter,
        setCurrentView,
        toggleFilters,
        toggleVirtualization
    } = useProductsStore();

    return (
        <div className="flex flex-col gap-4 p-4 bg-gradient-to-r from-background to-muted/20 border-b">
            {/* Top Row - Main Actions */}
            <div className="flex items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar productos por nombre o SKU..."
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="pl-10 pr-4 h-10 bg-background/50 backdrop-blur-sm border-muted-foreground/20 focus:border-primary transition-all"
                    />
                    {filters.search && (
                        <Badge
                            variant="secondary"
                            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            onClick={() => updateFilter('search', '')}
                        >
                            ✕
                        </Badge>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                        <Button
                            variant={currentView === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentView('table')}
                            className={cn(
                                "h-8 w-8 p-0 transition-all",
                                currentView === 'table' && "shadow-sm"
                            )}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={currentView === 'grid' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentView('grid')}
                            className={cn(
                                "h-8 w-8 p-0 transition-all",
                                currentView === 'grid' && "shadow-sm"
                            )}
                        >
                            <Grid3x3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={currentView === 'compact' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentView('compact')}
                            className={cn(
                                "h-8 w-8 p-0 transition-all",
                                currentView === 'compact' && "shadow-sm"
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Virtualization Toggle */}
                    <Button
                        variant={isVirtualized ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleVirtualization}
                        className="gap-2 transition-all hover:scale-105"
                    >
                        <Zap className={cn("h-4 w-4", isVirtualized && "animate-pulse")} />
                        {isVirtualized ? 'Virtual' : 'Normal'}
                    </Button>

                    {/* Filters Toggle */}
                    <Button
                        variant={showFilters ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleFilters}
                        className="gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                    </Button>

                    {/* Refresh */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        className="gap-2 hover:rotate-180 transition-transform duration-500"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>

                    {/* More Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Settings2 className="h-4 w-4" />
                                Más
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onExport} className="gap-2">
                                <Download className="h-4 w-4" />
                                Exportar CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onImport} className="gap-2">
                                <Upload className="h-4 w-4" />
                                Importar CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Create Product */}
                    <Button
                        onClick={onCreateProduct}
                        size="sm"
                        className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Producto
                    </Button>
                </div>
            </div>

            {/* Second Row - Quick Filters (only when filters are shown) */}
            {showFilters && (
                <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                    {/* Category Filter */}
                    <Select
                        value={filters.categoryId || 'all'}
                        onValueChange={(value) => updateFilter('categoryId', value === 'all' ? null : value)}
                    >
                        <SelectTrigger className="w-40 h-9 bg-background/50">
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {/* Categories will be populated dynamically */}
                        </SelectContent>
                    </Select>

                    {/* Stock Status Filter */}
                    <Select
                        value={filters.stockStatus}
                        onValueChange={(value: any) => updateFilter('stockStatus', value)}
                    >
                        <SelectTrigger className="w-36 h-9 bg-background/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todo el stock</SelectItem>
                            <SelectItem value="normal">Stock normal</SelectItem>
                            <SelectItem value="low">Stock bajo</SelectItem>
                            <SelectItem value="out">Sin stock</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Image Filter */}
                    <Select
                        value={filters.imageFilter}
                        onValueChange={(value: any) => updateFilter('imageFilter', value)}
                    >
                        <SelectTrigger className="w-32 h-9 bg-background/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="with">Con imagen</SelectItem>
                            <SelectItem value="without">Sin imagen</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Sort By */}
                    <Select
                        value={filters.sortBy}
                        onValueChange={(value) => updateFilter('sortBy', value)}
                    >
                        <SelectTrigger className="w-40 h-9 bg-background/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Nombre</SelectItem>
                            <SelectItem value="sku">SKU</SelectItem>
                            <SelectItem value="sale_price">Precio</SelectItem>
                            <SelectItem value="stock_quantity">Stock</SelectItem>
                            <SelectItem value="created_at">Fecha creación</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Sort Order */}
                    <Select
                        value={filters.sortOrder}
                        onValueChange={(value: any) => updateFilter('sortOrder', value)}
                    >
                        <SelectTrigger className="w-32 h-9 bg-background/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asc">Ascendente</SelectItem>
                            <SelectItem value="desc">Descendente</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Selected Count Badge */}
                    {selectedCount > 0 && (
                        <Badge variant="secondary" className="ml-auto px-3 py-1">
                            {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
});
