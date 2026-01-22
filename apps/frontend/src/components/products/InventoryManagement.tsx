'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Package,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Plus,
    Minus,
    Edit,
    Search,
    Filter,
    Download,
    BarChart3,
    Clock,
    ArrowUpDown
} from 'lucide-react';
import type { Product, Category } from '@/types';

interface InventoryManagementProps {
    products: Product[];
    categories: Category[];
    onAdjustStock?: (productId: string, adjustment: number, reason: string) => Promise<void>;
    onViewProduct?: (productId: string) => void;
}

type StockStatus = 'critical' | 'low' | 'normal' | 'high';
type AdjustmentType = 'increment' | 'decrement' | 'set';

export function InventoryManagement({ products, categories, onAdjustStock, onViewProduct }: InventoryManagementProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<StockStatus | 'all'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Adjust stock modal
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('increment');
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');

    // Helper functions
    const getStockStatus = (current: number, min: number): StockStatus => {
        if (current === 0) return 'critical';
        if (current <= min) return 'low';
        if (current < min * 3) return 'normal';
        return 'high';
    };

    const getStockPercentage = (current: number, min: number): number => {
        const target = min * 3;
        return Math.min((current / target) * 100, 100);
    };

    const getInventoryValue = (product: Product): number => {
        return (product.stock_quantity || 0) * (product.cost_price || 0);
    };

    // Calculate stats
    const stats = useMemo(() => {
        const totalValue = products.reduce((sum, p) => sum + getInventoryValue(p), 0);
        const criticalProducts = products.filter(p => getStockStatus(p.stock_quantity || 0, p.min_stock || 5) === 'critical');
        const lowStockProducts = products.filter(p => getStockStatus(p.stock_quantity || 0, p.min_stock || 5) === 'low');

        const recentlyUpdated = products.filter(p => {
            const daysSinceUpdate = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceUpdate <= 30;
        });

        const rotationRate = products.length > 0 ? (recentlyUpdated.length / products.length) * 100 : 0;

        return {
            totalValue,
            criticalCount: criticalProducts.length,
            lowStockCount: lowStockProducts.length,
            rotationRate: Math.round(rotationRate)
        };
    }, [products]);

    // Filtered and sorted products
    const filteredProducts = useMemo(() => {
        let filtered = products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = categoryFilter === 'all' || p.category_id === categoryFilter;

            const status = getStockStatus(p.stock_quantity || 0, p.min_stock || 5);
            const matchesStock = stockFilter === 'all' || status === stockFilter;

            return matchesSearch && matchesCategory && matchesStock;
        });

        // Sort
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'stock':
                    aValue = a.stock_quantity || 0;
                    bValue = b.stock_quantity || 0;
                    break;
                case 'value':
                    aValue = getInventoryValue(a);
                    bValue = getInventoryValue(b);
                    break;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [products, searchQuery, categoryFilter, stockFilter, sortBy, sortOrder]);

    const handleOpenAdjustModal = (product: Product) => {
        setSelectedProduct(product);
        setAdjustmentType('increment');
        setAdjustmentAmount('');
        setAdjustmentReason('');
        setShowAdjustModal(true);
    };

    const handleAdjustStock = async () => {
        if (!selectedProduct || !adjustmentAmount || !adjustmentReason) return;

        const amount = parseInt(adjustmentAmount);
        if (isNaN(amount)) return;

        let finalAdjustment = amount;
        if (adjustmentType === 'decrement') {
            finalAdjustment = -amount;
        } else if (adjustmentType === 'set') {
            finalAdjustment = amount - (selectedProduct.stock_quantity || 0);
        }

        await onAdjustStock?.(selectedProduct.id, finalAdjustment, adjustmentReason);
        setShowAdjustModal(false);
    };

    const getStatusBadge = (status: StockStatus) => {
        const configs = {
            critical: { label: 'Sin Stock', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
            low: { label: 'Stock Bajo', className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' },
            normal: { label: 'Normal', className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
            high: { label: 'Stock Alto', className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' }
        };

        const config = configs[status];
        return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
    };

    const getStockColor = (status: StockStatus) => {
        const colors = {
            critical: 'bg-red-500',
            low: 'bg-yellow-500',
            normal: 'bg-green-500',
            high: 'bg-blue-500'
        };
        return colors[status];
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-md">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Valor Total</p>
                                <p className="text-3xl font-bold mt-1">${stats.totalValue.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground mt-1">Inventario completo</p>
                            </div>
                            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20">
                                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Stock Crítico</p>
                                <p className="text-3xl font-bold mt-1 text-red-600">{stats.criticalCount}</p>
                                <p className="text-xs text-muted-foreground mt-1">Sin stock</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20">
                                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <div className="h-1 bg-gradient-to-r from-yellow-500 to-yellow-600" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                                <p className="text-3xl font-bold mt-1 text-yellow-600">{stats.lowStockCount}</p>
                                <p className="text-xs text-muted-foreground mt-1">Requiere reorden</p>
                            </div>
                            <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/20">
                                <Package className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Rotación</p>
                                <p className="text-3xl font-bold mt-1 text-purple-600">{stats.rotationRate}%</p>
                                <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20">
                                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros y Búsqueda
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar producto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todas las categorías" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las categorías</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Estado de stock" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="critical">Sin Stock</SelectItem>
                                <SelectItem value="low">Stock Bajo</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">Stock Alto</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ordenar por" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Nombre</SelectItem>
                                <SelectItem value="stock">Stock</SelectItem>
                                <SelectItem value="value">Valor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Stock Levels Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Niveles de Stock</CardTitle>
                            <CardDescription>{filteredProducts.length} productos</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Exportar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                                <ArrowUpDown className="h-4 w-4 mr-2" />
                                {sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredProducts.map(product => {
                            const status = getStockStatus(product.stock_quantity || 0, product.min_stock || 5);
                            const percentage = getStockPercentage(product.stock_quantity || 0, product.min_stock || 5);
                            const value = getInventoryValue(product);

                            return (
                                <div key={product.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-medium truncate">{product.name}</h4>
                                                {getStatusBadge(status)}
                                            </div>
                                            <p className="text-sm text-muted-foreground">SKU: {product.sku || 'N/A'}</p>

                                            {/* Stock Progress Bar */}
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                                    <span>Stock: {product.stock_quantity || 0} / Mín: {product.min_stock || 5}</span>
                                                    <span>{percentage.toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${getStockColor(status)}`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Valor</p>
                                            <p className="text-lg font-bold">${value.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                ${product.cost_price || 0} × {product.stock_quantity || 0}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenAdjustModal(product)}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Ajustar
                                            </Button>
                                            {onViewProduct && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onViewProduct(product.id)}
                                                >
                                                    Ver
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredProducts.length === 0 && (
                            <div className="text-center py-12">
                                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No se encontraron productos</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Adjust Stock Modal */}
            <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajustar Stock</DialogTitle>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="space-y-4">
                            <div>
                                <p className="font-medium">{selectedProduct.name}</p>
                                <p className="text-sm text-muted-foreground">Stock actual: {selectedProduct.stock_quantity || 0}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo de Ajuste</Label>
                                <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="increment">
                                            <div className="flex items-center gap-2">
                                                <Plus className="h-4 w-4" />
                                                Incrementar
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="decrement">
                                            <div className="flex items-center gap-2">
                                                <Minus className="h-4 w-4" />
                                                Decrementar
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="set">
                                            <div className="flex items-center gap-2">
                                                <Edit className="h-4 w-4" />
                                                Establecer Valor
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Cantidad</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    placeholder="Ingrese la cantidad"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Razón del Ajuste</Label>
                                <Input
                                    value={adjustmentReason}
                                    onChange={(e) => setAdjustmentReason(e.target.value)}
                                    placeholder="Ej: Inventario físico, devolución, etc."
                                />
                            </div>

                            {adjustmentAmount && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-medium">Resultado:</p>
                                    <p className="text-sm text-muted-foreground">
                                        {adjustmentType === 'set'
                                            ? `Nuevo stock: ${adjustmentAmount}`
                                            : `${selectedProduct.stock_quantity || 0} ${adjustmentType === 'increment' ? '+' : '-'} ${adjustmentAmount} = ${adjustmentType === 'increment'
                                                ? (selectedProduct.stock_quantity || 0) + parseInt(adjustmentAmount || '0')
                                                : (selectedProduct.stock_quantity || 0) - parseInt(adjustmentAmount || '0')
                                            }`
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdjustModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAdjustStock}
                            disabled={!adjustmentAmount || !adjustmentReason}
                        >
                            Aplicar Ajuste
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
