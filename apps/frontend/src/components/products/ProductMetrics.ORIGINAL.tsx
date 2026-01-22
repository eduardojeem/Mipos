'use client';

import React from 'react';
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
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
    critical: number; // stock = 0
    warning: number;  // stock <= min_stock
    healthy: number;  // stock > min_stock
  };
  priceAnalysis: {
    highValue: number;    // productos > $100
    mediumValue: number;  // productos $20-$100
    lowValue: number;     // productos < $20
  };
  inventoryTurnover: number;
  fastMovingProducts: number;
  slowMovingProducts: number;
}

interface ProductMetricsProps {
  products: Product[];
  categories?: Category[];
  isLoading?: boolean;
}

export default function ProductMetrics({ products, categories = [], isLoading = false }: ProductMetricsProps) {

  const calculateMetrics = (): ProductMetricsData => {
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

    // Category distribution with values
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

    // Simulated metrics (in real app, these would come from sales data)
    const inventoryTurnover = 2.5; // Average inventory turnover ratio
    const fastMovingProducts = Math.floor(totalProducts * 0.2); // Top 20% sellers
    const slowMovingProducts = Math.floor(totalProducts * 0.3); // Bottom 30% sellers

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
  };

  const metrics = calculateMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{metrics.recentlyAdded} este mes
            </div>
            <Progress value={metrics.monthlyGrowth} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Costo: {formatCurrency(metrics.totalCost)}
            </div>
            <div className="text-xs text-green-600 font-medium">
              Ganancia: {formatCurrency(metrics.totalValue - metrics.totalCost)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salud del Stock</CardTitle>
            <Target className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.stockHealth.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.stockAlerts.warning} necesitan atención
            </div>
            <Progress value={metrics.stockHealth} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen de Ganancia</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.profitMargin.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              Categoría líder: {metrics.topCategory}
            </div>
            <Progress value={metrics.profitMargin} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs">Crítico</span>
                <Badge variant="destructive" className="text-xs">
                  {metrics.stockAlerts.critical}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Advertencia</span>
                <Badge variant="secondary" className="text-xs">
                  {metrics.stockAlerts.warning}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Saludable</span>
                <Badge variant="default" className="text-xs bg-green-500">
                  {metrics.stockAlerts.healthy}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averagePrice)}</div>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs">
                <span>Alto (&gt;$100)</span>
                <span>{metrics.priceAnalysis.highValue}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Medio ($20-$100)</span>
                <span>{metrics.priceAnalysis.mediumValue}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Bajo (&lt;$20)</span>
                <span>{metrics.priceAnalysis.lowValue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotación de Inventario</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inventoryTurnover}x</div>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs">
                <span>Rápido</span>
                <Badge variant="default" className="text-xs bg-green-500">
                  {metrics.fastMovingProducts}
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span>Lento</span>
                <Badge variant="secondary" className="text-xs">
                  {metrics.slowMovingProducts}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {metrics.monthlyGrowth.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.recentlyAdded} productos nuevos
            </div>
            <div className="flex items-center mt-2">
              {metrics.monthlyGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className="text-xs">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Distribución por Categorías
          </CardTitle>
          <CardDescription>
            Valor de inventario y cantidad de productos por categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.categoryDistribution.slice(0, 5).map((category, index) => (
              <div key={category.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(category.value)}</div>
                    <div className="text-xs text-muted-foreground">
                      {category.count} productos
                    </div>
                  </div>
                </div>
                <Progress value={category.percentage} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {category.percentage.toFixed(1)}% del inventario total
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook personalizado para obtener métricas de productos
export function useProductMetrics(products: Product[], categories: Category[] = []) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const calculateMetrics = React.useCallback((): ProductMetricsData => {
    try {
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

      // Category distribution with values
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

      // Simulated metrics (in real app, these would come from sales data)
      const inventoryTurnover = 2.5; // Average inventory turnover ratio
      const fastMovingProducts = Math.floor(totalProducts * 0.2); // Top 20% sellers
      const slowMovingProducts = Math.floor(totalProducts * 0.3); // Bottom 30% sellers

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular métricas');
      throw err;
    }
  }, [products, categories]);

  const data = React.useMemo(() => {
    try {
      return calculateMetrics();
    } catch {
      return null;
    }
  }, [calculateMetrics]);

  const refetch = React.useCallback(() => {
    setError(null);
    // In this case, refetch would trigger a recalculation
    // which happens automatically when products or categories change
  }, []);

  return { data, isLoading, error, refetch };
}