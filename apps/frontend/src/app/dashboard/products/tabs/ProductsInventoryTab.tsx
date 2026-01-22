'use client';

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useProducts } from '../contexts/ProductsContext';
import { formatCurrency } from '@/lib/utils';
import dynamic from 'next/dynamic';

const InventoryManagement = dynamic(() => import('@/components/products/InventoryManagement').then(m => ({ default: m.InventoryManagement })), { ssr: false });

interface InventoryAlert {
  id: string;
  type: 'out_of_stock' | 'low_stock' | 'overstock' | 'no_movement';
  severity: 'critical' | 'warning' | 'info';
  product: any;
  message: string;
  recommendation: string;
}

export default function ProductsInventoryTab() {
  const { products, categories, loading, actions } = useProducts();

  const inventoryStats = useMemo(() => {
    if (!products.length) return null;

    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0);
    const totalUnits = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
    
    const outOfStock = products.filter(p => (p.stock_quantity || 0) === 0);
    const lowStock = products.filter(p => {
      const stock = p.stock_quantity || 0;
      const minStock = p.min_stock || 0;
      return stock > 0 && stock <= minStock;
    });
    const adequateStock = products.filter(p => {
      const stock = p.stock_quantity || 0;
      const minStock = p.min_stock || 0;
      return stock > minStock;
    });

    // Calculate turnover (mock data - would need sales data)
    const slowMoving = products.filter(p => {
      // Mock logic: products with high stock relative to min stock
      const stock = p.stock_quantity || 0;
      const minStock = p.min_stock || 1;
      return stock > minStock * 5;
    });

    return {
      totalProducts,
      totalValue,
      totalUnits,
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      adequateStock: adequateStock.length,
      slowMoving: slowMoving.length,
      stockDistribution: {
        outOfStock: (outOfStock.length / totalProducts) * 100,
        lowStock: (lowStock.length / totalProducts) * 100,
        adequateStock: (adequateStock.length / totalProducts) * 100
      }
    };
  }, [products]);

  const inventoryAlerts = useMemo((): InventoryAlert[] => {
    if (!products.length) return [];

    const alerts: InventoryAlert[] = [];

    // Out of stock alerts
    products
      .filter(p => (p.stock_quantity || 0) === 0)
      .forEach(product => {
        alerts.push({
          id: `out-${product.id}`,
          type: 'out_of_stock',
          severity: 'critical',
          product,
          message: 'Sin stock disponible',
          recommendation: 'Reabastecer inmediatamente'
        });
      });

    // Low stock alerts
    products
      .filter(p => {
        const stock = p.stock_quantity || 0;
        const minStock = p.min_stock || 0;
        return stock > 0 && stock <= minStock;
      })
      .forEach(product => {
        alerts.push({
          id: `low-${product.id}`,
          type: 'low_stock',
          severity: 'warning',
          product,
          message: `Stock bajo: ${product.stock_quantity} unidades`,
          recommendation: 'Considerar reabastecimiento'
        });
      });

    // Overstock alerts (mock logic)
    products
      .filter(p => {
        const stock = p.stock_quantity || 0;
        const minStock = p.min_stock || 1;
        return stock > minStock * 10;
      })
      .slice(0, 5) // Limit to 5 for demo
      .forEach(product => {
        alerts.push({
          id: `over-${product.id}`,
          type: 'overstock',
          severity: 'info',
          product,
          message: `Posible sobrestock: ${product.stock_quantity} unidades`,
          recommendation: 'Revisar niveles de inventario'
        });
      });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [products]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'warning': return TrendingDown;
      case 'info': return TrendingUp;
      default: return Package;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!inventoryStats) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No hay datos de inventario</h3>
        <p className="text-muted-foreground">Agrega productos para ver el estado del inventario</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inventory overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.totalUnits.toLocaleString()} unidades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inventoryStats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.stockDistribution.outOfStock.toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStock}</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.stockDistribution.lowStock.toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Adecuado</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inventoryStats.adequateStock}</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.stockDistribution.adequateStock.toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Stock Adecuado</span>
                <span>{inventoryStats.adequateStock} productos</span>
              </div>
              <Progress value={inventoryStats.stockDistribution.adequateStock} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Stock Bajo</span>
                <span>{inventoryStats.lowStock} productos</span>
              </div>
              <Progress 
                value={inventoryStats.stockDistribution.lowStock} 
                className="h-2"
                // Custom color for warning
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Sin Stock</span>
                <span>{inventoryStats.outOfStock} productos</span>
              </div>
              <Progress 
                value={inventoryStats.stockDistribution.outOfStock} 
                className="h-2"
                // Custom color for critical
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory alerts */}
      {inventoryAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alertas de Inventario</CardTitle>
              <Button variant="outline" size="sm" onClick={actions.refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventoryAlerts.slice(0, 10).map((alert) => {
                const Icon = getSeverityIcon(alert.severity);
                return (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{alert.product.name}</p>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Recomendación: {alert.recommendation}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'default' : 'secondary'}>
                          {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Advertencia' : 'Info'}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Stock: {alert.product.stock_quantity || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {inventoryAlerts.length > 10 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    Ver todas las alertas ({inventoryAlerts.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced inventory management */}
      <InventoryManagement 
        products={products || []}
        categories={categories || []}
        onAdjustStock={async (productId, adjustment, reason) => {
          console.log('Adjust stock:', productId, adjustment, reason);
          // TODO: Implement stock adjustment
        }}
        onViewProduct={(productId) => {
          console.log('View product:', productId);
          // TODO: Implement view product
        }}
      />
    </div>
  );
}