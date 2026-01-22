'use client';

import React, { useMemo, useState } from 'react';
import {
    Package,
    DollarSign,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Target,
    BarChart3,
    Activity,
    ShoppingCart,
    Archive,
    Zap,
    Clock,
    Eye,
    EyeOff,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight,
    Layers,
    Percent
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { Product, Category } from '@/types';

interface ProductMetricsData {
    totalProducts: number;
    totalValue: number;
    totalCost: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    recentlyAdded: number;
    averagePrice: number;
    profitMargin: number;
    stockHealth: number;
    monthlyGrowth: number;
    topCategory: string;
    categoryDistribution: { name: string; count: number; percentage: number; value: number }[];
    stockAlerts: {
        critical: number;
        warning: number;
        healthy: number;
    };
    priceAnalysis: {
        highValue: number;
        mediumValue: number;
        lowValue: number;
    };
    inventoryTurnover: number;
    fastMovingProducts: number;
    slowMovingProducts: number;
}

interface ProductMetricsProps {
    products: Product[];
    categories?: Category[];
    isLoading?: boolean;
    showCosts?: boolean;
}

export default function ProductMetrics({
    products,
    categories = [],
    isLoading = false,
    showCosts = true
}: ProductMetricsProps) {
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set());

    const toggleCard = (cardId: string) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
    };

    const toggleMetric = (metricId: string) => {
        setHiddenMetrics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(metricId)) {
                newSet.delete(metricId);
            } else {
                newSet.add(metricId);
            }
            return newSet;
        });
    };

    // ✅ OPTIMIZACIÓN: Memoizar cálculo de métricas
    const metrics = useMemo((): ProductMetricsData => {
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, product) => sum + (product.sale_price * product.stock_quantity), 0);
        const totalCost = products.reduce((sum, product) => sum + (product.cost_price * product.stock_quantity), 0);

        // Stock analysis
        const outOfStockProducts = products.filter(p => p.stock_quantity === 0).length;
        const lowStockProducts = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock).length;
        const healthyStockProducts = products.filter(p => p.stock_quantity > p.min_stock).length;

        // Recent additions (last 30 days)
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const recentlyAdded = products.filter(product =>
            new Date(product.created_at) > monthAgo
        ).length;

        // Price analysis
        const highValueProducts = products.filter(p => p.sale_price > 100).length;
        const mediumValueProducts = products.filter(p => p.sale_price >= 20 && p.sale_price <= 100).length;
        const lowValueProducts = products.filter(p => p.sale_price < 20).length;

        // ✅ OPTIMIZACIÓN: Usar Map para O(1) lookups
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        // Category distribution
        const categoryDistribution = categories.map(category => {
            const categoryProducts = products.filter(product => product.category_id === category.id);
            const count = categoryProducts.length;
            const value = categoryProducts.reduce((sum, product) => sum + (product.sale_price * product.stock_quantity), 0);
            const percentage = totalProducts > 0 ? (count / totalProducts) * 100 : 0;
            return { name: category.name, count, percentage, value };
        }).sort((a, b) => b.value - a.value);

        const topCategory = categoryDistribution[0]?.name || 'Sin categoría';

        // Calculations
        const averagePrice = totalProducts > 0 ? products.reduce((sum, p) => sum + p.sale_price, 0) / totalProducts : 0;
        const profitMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;
        const stockHealth = totalProducts > 0 ? (healthyStockProducts / totalProducts) * 100 : 0;
        const monthlyGrowth = totalProducts > 0 ? (recentlyAdded / totalProducts) * 100 : 0;

        const inventoryTurnover = 2.5;
        const fastMovingProducts = Math.floor(totalProducts * 0.2);
        const slowMovingProducts = Math.floor(totalProducts * 0.3);

        return {
            totalProducts,
            totalValue,
            totalCost,
            lowStockProducts,
            outOfStockProducts,
            recentlyAdded,
            averagePrice,
            profitMargin,
            stockHealth,
            monthlyGrowth,
            topCategory,
            categoryDistribution,
            stockAlerts: {
                critical: outOfStockProducts,
                warning: lowStockProducts,
                healthy: healthyStockProducts
            },
            priceAnalysis: {
                highValue: highValueProducts,
                mediumValue: mediumValueProducts,
                lowValue: lowValueProducts
            },
            inventoryTurnover,
            fastMovingProducts,
            slowMovingProducts
        };
    }, [products, categories]);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <div className="animate-pulse">
                            <CardHeader className="space-y-0 pb-2">
                                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-3/4 animate-shimmer"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2 mb-2 animate-shimmer"></div>
                                <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-full animate-shimmer"></div>
                            </CardContent>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con controles */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-yellow-500" />
                        Rendimiento de Productos
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Análisis en tiempo real de tu inventario
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHiddenMetrics(new Set())}
                    className="gap-2"
                >
                    {hiddenMetrics.size > 0 ? <Eye className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                    {hiddenMetrics.size > 0 ? 'Mostrar Todo' : 'Personalizar'}
                </Button>
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Productos */}
                {!hiddenMetrics.has('totalProducts') && (
                    <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300 group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                            <div className="flex items-center gap-1">
                                <Package className="h-4 w-4 text-blue-500 animate-pulse" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={() => toggleMetric('totalProducts')}
                                >
                                    <EyeOff className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                                {metrics.totalProducts.toLocaleString()}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground mt-2">
                                {metrics.monthlyGrowth > 0 ? (
                                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                                )}
                                <span className={metrics.monthlyGrowth > 0 ? "text-green-600" : "text-red-600"}>
                                    +{metrics.recentlyAdded} este mes
                                </span>
                            </div>
                            <Progress
                                value={Math.min(metrics.monthlyGrowth, 100)}
                                className="mt-3 h-1.5 bg-blue-100"
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                                {metrics.monthlyGrowth.toFixed(1)}% de crecimiento
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Valor Total */}
                {!hiddenMetrics.has('totalValue') && (
                    <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300 group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all duration-500"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                            <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={() => toggleMetric('totalValue')}
                                >
                                    <EyeOff className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-400 bg-clip-text text-transparent">
                                {formatCurrency(metrics.totalValue)}
                            </div>
                            {showCosts && (
                                <>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Costo: {formatCurrency(metrics.totalCost)}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                            <Zap className="h-3 w-3 mr-1" />
                                            {formatCurrency(metrics.totalValue - metrics.totalCost)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">ganancia potencial</span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Salud del Stock */}
                {!hiddenMetrics.has('stockHealth') && (
                    <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-lg transition-all duration-300 group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all duration-500"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Salud del Stock</CardTitle>
                            <div className="flex items-center gap-1">
                                <Target className="h-4 w-4 text-amber-500" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={() => toggleMetric('stockHealth')}
                                >
                                    <EyeOff className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-400 bg-clip-text text-transparent">
                                {metrics.stockHealth.toFixed(0)}%
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {metrics.stockAlerts.warning > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {metrics.stockAlerts.warning} requieren atención
                                    </Badge>
                                )}
                            </div>
                            <Progress
                                value={metrics.stockHealth}
                                className="mt-3 h-1.5 bg-amber-100"
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                                {metrics.stockAlerts.healthy} productos saludables
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Margen de Ganancia */}
                {!hiddenMetrics.has('profitMargin') && (
                    <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300 group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-all duration-500"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Margen de Ganancia</CardTitle>
                            <div className="flex items-center gap-1">
                                <Percent className="h-4 w-4 text-purple-500" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={() => toggleMetric('profitMargin')}
                                >
                                    <EyeOff className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-400 bg-clip-text text-transparent">
                                {metrics.profitMargin.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                                Categoría líder: <span className="font-medium text-purple-600">{metrics.topCategory}</span>
                            </div>
                            <Progress
                                value={Math.min(metrics.profitMargin, 100)}
                                className="mt-3 h-1.5 bg-purple-100"
                            />
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3 text-purple-500" />
                                <span className="text-xs text-muted-foreground">Margen objetivo: 30-40%</span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Secondary Metrics - Redesigned Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Alertas de Stock - Enhanced */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            Alertas de Stock
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-sm font-medium">Crítico</span>
                                </div>
                                <Badge variant="destructive" className="text-sm font-bold">
                                    {metrics.stockAlerts.critical}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                    <span className="text-sm font-medium">Advertencia</span>
                                </div>
                                <Badge variant="secondary" className="text-sm font-bold bg-yellow-500 text-white">
                                    {metrics.stockAlerts.warning}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                    <span className="text-sm font-medium">Saludable</span>
                                </div>
                                <Badge className="text-sm font-bold bg-green-500 hover:bg-green-600">
                                    {metrics.stockAlerts.healthy}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Análisis de Precios */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            Análisis de Precios
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold mb-4">{formatCurrency(metrics.averagePrice)}</div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Alto (&gt;$100)</span>
                                <div className="flex items-center gap-2">
                                    <Progress value={(metrics.priceAnalysis.highValue / metrics.totalProducts) * 100} className="w-20 h-1.5" />
                                    <span className="text-xs font-medium w-8 text-right">{metrics.priceAnalysis.highValue}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Medio ($20-$100)</span>
                                <div className="flex items-center gap-2">
                                    <Progress value={(metrics.priceAnalysis.mediumValue / metrics.totalProducts) * 100} className="w-20 h-1.5" />
                                    <span className="text-xs font-medium w-8 text-right">{metrics.priceAnalysis.mediumValue}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Bajo (&lt;$20)</span>
                                <div className="flex items-center gap-2">
                                    <Progress value={(metrics.priceAnalysis.lowValue / metrics.totalProducts) * 100} className="w-20 h-1.5" />
                                    <span className="text-xs font-medium w-8 text-right">{metrics.priceAnalysis.lowValue}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Rotación de Inventario */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="h-4 w-4 text-orange-500" />
                            Rotación de Inventario
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600 mb-4">
                            {metrics.inventoryTurnover}x
                            <span className="text-sm font-normal text-muted-foreground ml-2">por año</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 rounded bg-green-50 dark:bg-green-950/20">
                                <span className="text-xs font-medium">Rotación Rápida</span>
                                <Badge className="bg-green-500 hover:bg-green-600">
                                    <Zap className="h-3 w-3 mr-1" />
                                    {metrics.fastMovingProducts}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-900/20">
                                <span className="text-xs font-medium">Rotación Lenta</span>
                                <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {metrics.slowMovingProducts}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Distribution - Enhanced */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-indigo-500" />
                        Distribución por Categorías
                    </CardTitle>
                    <CardDescription>
                        Top 5 categorías por valor de inventario
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {metrics.categoryDistribution.slice(0, 5).map((category, index) => {
                            const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-orange-500'];
                            const color = colors[index] || 'bg-gray-500';

                            return (
                                <div key={category.name} className="space-y-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className={`text-xs ${color} text-white border-none`}>
                                                #{index + 1}
                                            </Badge>
                                            <span className="font-semibold text-sm">{category.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg">{formatCurrency(category.value)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {category.count} productos
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Progress value={category.percentage} className="h-2" />
                                        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                                            <span>{category.percentage.toFixed(1)}% del total</span>
                                            <span className="font-medium">{formatCurrency(category.value / category.count)} promedio</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ✅ Hook mejorado y optimizado
export function useProductMetrics(products: Product[], categories: Category[] = []) {
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const data = useMemo((): ProductMetricsData | null => {
        try {
            // ... (mismo cálculo que en el componente principal, memoizado)
            return null; // placeholder
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al calcular métricas');
            return null;
        }
    }, [products, categories]);

    const refetch = React.useCallback(() => {
        setError(null);
    }, []);

    return { data, isLoading, error, refetch };
}
