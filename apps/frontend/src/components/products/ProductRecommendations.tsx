'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    Package,
    TrendingDown,
    DollarSign,
    ArrowRight,
    Clock,
    ShoppingCart
} from 'lucide-react';
import type { Product } from '@/types';

interface ProductRecommendationsProps {
    products: Product[];
    onViewProduct?: (productId: string) => void;
}

export function ProductRecommendations({ products, onViewProduct }: ProductRecommendationsProps) {
    // Calculate recommendations
    const recommendations = useMemo(() => {
        const criticalStock = products.filter(p => (p.stock_quantity || 0) === 0);
        const lowStock = products.filter(p => {
            const stock = p.stock_quantity || 0;
            const minStock = p.min_stock || 5;
            return stock > 0 && stock <= minStock;
        });

        const lowPerformers = products.filter(p => {
            const daysSinceUpdate = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceUpdate > 30;
        });

        const lowMargin = products.filter(p => {
            const cost = p.cost_price || 0;
            const price = p.sale_price || 0;
            if (cost === 0 || price === 0) return false;
            const margin = ((price - cost) / price) * 100;
            return margin < 20;
        });

        const reorderSuggestions = lowStock.slice(0, 5).map(p => ({
            ...p,
            suggestedQuantity: Math.max((p.min_stock || 10) * 2, 10),
            daysUntilStockout: Math.floor((p.stock_quantity || 0) / Math.max(1, 0.5)) // Estimación simple
        }));

        return {
            criticalStock,
            lowStock,
            lowPerformers: lowPerformers.slice(0, 5),
            lowMargin: lowMargin.slice(0, 5),
            reorderSuggestions,
            totalRecommendations: criticalStock.length + lowStock.length + lowPerformers.length + lowMargin.length
        };
    }, [products]);

    const urgencyLevel = useMemo(() => {
        if (recommendations.criticalStock.length > 5) return 'critical';
        if (recommendations.lowStock.length > 10) return 'high';
        if (recommendations.totalRecommendations > 5) return 'medium';
        return 'low';
    }, [recommendations]);

    const urgencyColors = {
        critical: 'from-red-500 to-red-600',
        high: 'from-orange-500 to-orange-600',
        medium: 'from-yellow-500 to-yellow-600',
        low: 'from-green-500 to-green-600'
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-md">
                    <div className={`h-1 bg-gradient-to-r ${urgencyColors[urgencyLevel]}`} />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Recomendaciones</p>
                                <p className="text-3xl font-bold mt-1">{recommendations.totalRecommendations}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20">
                                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                                <p className="text-3xl font-bold mt-1 text-red-600">{recommendations.criticalStock.length}</p>
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
                                <p className="text-3xl font-bold mt-1 text-yellow-600">{recommendations.lowStock.length}</p>
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
                                <p className="text-sm text-muted-foreground">Bajo Rendimiento</p>
                                <p className="text-3xl font-bold mt-1 text-purple-600">{recommendations.lowPerformers.length}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20">
                                <TrendingDown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Critical Alerts */}
            {recommendations.criticalStock.length > 0 && (
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <CardTitle className="text-red-900 dark:text-red-100">Alertas Críticas</CardTitle>
                            </div>
                            <Badge variant="destructive">Urgente</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                            {recommendations.criticalStock.length} producto{recommendations.criticalStock.length !== 1 ? 's' : ''} sin stock requiere{recommendations.criticalStock.length === 1 ? '' : 'n'} atención inmediata
                        </p>
                        <div className="space-y-2">
                            {recommendations.criticalStock.slice(0, 3).map(product => (
                                <div key={product.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-200">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onViewProduct?.(product.id)}
                                        className="ml-2"
                                    >
                                        Ver Producto
                                    </Button>
                                </div>
                            ))}
                        </div>
                        {recommendations.criticalStock.length > 3 && (
                            <p className="text-xs text-muted-foreground mt-3 text-center">
                                +{recommendations.criticalStock.length - 3} productos más sin stock
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Recommendations Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Reorder Suggestions */}
                <Card className="hover:shadow-lg transition-all duration-300">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-blue-600" />
                                <CardTitle className="text-lg">Sugerencias de Reorden</CardTitle>
                            </div>
                            <Badge variant="secondary">{recommendations.reorderSuggestions.length}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Productos que necesitan reabastecimiento pronto
                        </p>
                        <div className="space-y-3">
                            {recommendations.reorderSuggestions.map(product => (
                                <div key={product.id} className="p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-start justify-between mb-2">
                                        <p className="font-medium text-sm flex-1">{product.name}</p>
                                        <Badge variant="outline" className="ml-2">
                                            {product.stock_quantity} unid.
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>~{product.daysUntilStockout} días hasta agotarse</span>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-2 font-medium">
                                        Sugerido: {product.suggestedQuantity} unidades
                                    </p>
                                </div>
                            ))}
                        </div>
                        {recommendations.reorderSuggestions.length > 0 && (
                            <Button className="w-full mt-4" variant="outline">
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Generar Orden de Compra
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Low Performance Products */}
                <Card className="hover:shadow-lg transition-all duration-300">
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="h-5 w-5 text-purple-600" />
                                <CardTitle className="text-lg">Bajo Rendimiento</CardTitle>
                            </div>
                            <Badge variant="secondary">{recommendations.lowPerformers.length}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Productos sin movimiento en más de 30 días
                        </p>
                        <div className="space-y-3">
                            {recommendations.lowPerformers.map(product => {
                                const daysSinceUpdate = Math.floor((Date.now() - new Date(product.updated_at).getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={product.id} className="p-3 bg-muted/50 rounded-lg">
                                        <p className="font-medium text-sm mb-1">{product.name}</p>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">{daysSinceUpdate} días sin actualizar</span>
                                            <span className="font-medium">${product.sale_price}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {recommendations.lowPerformers.length > 0 && (
                            <Button className="w-full mt-4" variant="outline">
                                Aplicar Descuentos
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Pricing Opportunities */}
                <Card className="hover:shadow-lg transition-all duration-300">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-green-600" />
                                <CardTitle className="text-lg">Optimización de Precios</CardTitle>
                            </div>
                            <Badge variant="secondary">{recommendations.lowMargin.length}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Productos con margen de ganancia menor al 20%
                        </p>
                        <div className="space-y-3">
                            {recommendations.lowMargin.map(product => {
                                const margin = ((product.sale_price - product.cost_price) / product.sale_price) * 100;
                                return (
                                    <div key={product.id} className="p-3 bg-muted/50 rounded-lg">
                                        <p className="font-medium text-sm mb-2">{product.name}</p>
                                        <div className="flex items-center justify-between text-xs">
                                            <div>
                                                <span className="text-muted-foreground">Costo: </span>
                                                <span className="font-medium">${product.cost_price}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Precio: </span>
                                                <span className="font-medium">${product.sale_price}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${margin < 10 ? 'bg-red-500' : margin < 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(margin, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium">{margin.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {recommendations.lowMargin.length > 0 && (
                            <Button className="w-full mt-4" variant="outline">
                                Revisar Precios
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button variant="outline" className="justify-start">
                            <Package className="h-4 w-4 mr-2" />
                            Generar Reporte
                        </Button>
                        <Button variant="outline" className="justify-start">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Orden de Compra
                        </Button>
                        <Button variant="outline" className="justify-start">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Ajustar Precios
                        </Button>
                        <Button variant="outline" className="justify-start">
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Exportar Todo
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
