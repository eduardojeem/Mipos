'use client';

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart3 } from 'lucide-react';
import { useProducts } from '../contexts/ProductsContext';
import { formatCurrency } from '@/lib/utils';
import dynamic from 'next/dynamic';

const ProductCharts = dynamic(() => import('../components/ProductCharts'), { ssr: false });

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  color: string;
}

export default function ProductsAnalyticsTab() {
  const { products, categories, loading } = useProducts();

  const analytics = useMemo(() => {
    if (!products.length) return null;

    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: monthLabels[d.getMonth()] };
    });

    const toMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Category distribution
    const categoryDistribution = categories.map(category => {
      const categoryProducts = products.filter(p => p.category_id === category.id);
      const totalValue = categoryProducts.reduce((sum, p) => sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0);
      return {
        name: category.name,
        value: categoryProducts.length,
        totalValue,
        percentage: (categoryProducts.length / products.length) * 100
      };
    }).filter(item => item.value > 0);

    // Stock levels
    const stockLevels = [
      {
        name: 'En Stock',
        value: products.filter(p => (p.stock_quantity || 0) > (p.min_stock || 0)).length,
        color: '#10b981'
      },
      {
        name: 'Stock Bajo',
        value: products.filter(p => {
          const stock = p.stock_quantity || 0;
          const minStock = p.min_stock || 0;
          return stock > 0 && stock <= minStock;
        }).length,
        color: '#f59e0b'
      },
      {
        name: 'Sin Stock',
        value: products.filter(p => (p.stock_quantity || 0) === 0).length,
        color: '#ef4444'
      }
    ];

    // Top productos por valor
    const topProducts = [...products]
      .map(p => ({
        ...p,
        totalValue: (p.sale_price || 0) * (p.stock_quantity || 0)
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Rangos de precios
    const priceRanges = [
      { range: '0 - 50k', min: 0, max: 50000 },
      { range: '50k - 100k', min: 50000, max: 100000 },
      { range: '100k - 200k', min: 100000, max: 200000 },
      { range: '200k+', min: 200000, max: Infinity }
    ].map(range => ({
      ...range,
      count: products.filter(p => {
        const price = p.sale_price || 0;
        return price >= range.min && price < range.max;
      }).length
    }));

    // Series por mes usando created_at como proxy
    const monthAgg = lastSixMonths.map(({ year, month, label }) => {
      const monthProducts = products.filter(p => {
        const createdAt = new Date(p.created_at || 0);
        return createdAt.getFullYear() === year && createdAt.getMonth() === month;
      });
      const salesCount = monthProducts.length;
      const revenue = monthProducts.reduce((sum, p) => sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0);
      return { month: label, sales: salesCount, revenue, products: salesCount };
    });

    const monthlyRevenue = monthAgg.map(m => ({ month: m.month, revenue: m.revenue, cost: Math.round(m.revenue * 0.75), profit: Math.round(m.revenue * 0.25) }));

    return {
      categoryDistribution,
      stockLevels,
      topProducts,
      priceRanges,
      salesTrend: monthAgg,
      monthlyRevenue
    };
  }, [products, categories]);

  const metrics: AnalyticsMetric[] = useMemo(() => {
    if (!products.length) return [];

    const totalValue = products.reduce((sum, p) => sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0);
    const avgPrice = products.reduce((sum, p) => sum + (p.sale_price || 0), 0) / products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
    const lowStockCount = products.filter(p => {
      const stock = p.stock_quantity || 0;
      const minStock = p.min_stock || 0;
      return stock > 0 && stock <= minStock;
    }).length;

    return [
      {
        label: 'Valor Total Inventario',
        value: formatCurrency(totalValue),
        icon: DollarSign,
        color: 'text-green-600'
      },
      {
        label: 'Precio Promedio',
        value: formatCurrency(avgPrice),
        icon: TrendingUp,
        color: 'text-blue-600'
      },
      {
        label: 'Stock Total',
        value: totalStock.toLocaleString(),
        icon: Package,
        color: 'text-purple-600'
      },
      {
        label: 'Productos con Stock Bajo',
        value: lowStockCount,
        icon: TrendingDown,
        color: 'text-orange-600'
      }
    ];
  }, [products]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-80 bg-gray-200 rounded animate-pulse" />
          <div className="h-80 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No hay datos para analizar</h3>
        <p className="text-muted-foreground">Agrega productos para ver analytics detallados</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                {metric.change && (
                  <p className={`text-xs ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}% desde el mes pasado
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribución por categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.categoryDistribution.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(${index * 45}, 70%, 50%)` }}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{category.value} productos</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {category.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Niveles de stock */}
        <Card>
          <CardHeader>
            <CardTitle>Niveles de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.stockLevels.map((level, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: level.color }}
                    />
                    <span className="text-sm font-medium">{level.name}</span>
                  </div>
                  <Badge variant="secondary">{level.value} productos</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rangos de precios */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Precios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.priceRanges.map((range, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{range.range}</span>
                  <Badge variant="outline">{range.count} productos</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top productos por valor */}
        <Card>
          <CardHeader>
            <CardTitle>Top Productos por Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topProducts.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[150px]">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(product.totalValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.stock_quantity} unidades
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos avanzados */}
      <ProductCharts data={{
        salesTrend: analytics.salesTrend,
        categoryDistribution: analytics.categoryDistribution,
        stockLevels: analytics.stockLevels,
        topProducts: analytics.topProducts.slice(0, 5),
        monthlyRevenue: analytics.monthlyRevenue
      }} />
    </div>
  );
}
