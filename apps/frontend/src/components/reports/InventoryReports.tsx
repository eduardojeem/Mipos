'use client';

import React from 'react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  Download,
  Filter,
  Calendar,
  Target,
  Activity,
  ShoppingCart
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  min_stock: number;
  sale_price: number;
  cost_price: number;
  category_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface InventoryReportsProps {
  products: Product[];
  categories: Category[];
  onExportReport?: (reportType: string) => void;
}

interface StockAlert {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  severity: 'critical' | 'warning' | 'info';
  category: string;
}

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  value: number;
  metric: string;
  trend: 'up' | 'down' | 'stable';
  category: string;
}

export const InventoryReports: React.FC<InventoryReportsProps> = ({
  products,
  categories,
  onExportReport
}) => {
  const fmtCurrency = useCurrencyFormatter();
  // Calcular alertas de stock
  const stockAlerts: StockAlert[] = products
    .filter(p => p.stock_quantity <= p.min_stock)
    .map(p => {
      const category = categories.find(c => c.id === p.category_id);
      return {
        id: p.id,
        productName: p.name,
        sku: p.sku,
        currentStock: p.stock_quantity,
        minStock: p.min_stock,
        severity: p.stock_quantity === 0 ? 'critical' as const : 
                 p.stock_quantity <= p.min_stock * 0.5 ? 'warning' as const : 'info' as const,
        category: category?.name || 'Sin categoría'
      };
    })
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

  // Productos más vendidos (simulado basado en valor de inventario)
  const topSellingProducts: TopProduct[] = products
    .map(p => {
      const category = categories.find(c => c.id === p.category_id);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        value: p.stock_quantity * p.sale_price,
        metric: fmtCurrency(p.stock_quantity * p.sale_price),
        trend: Math.random() > 0.3 ? 'up' as const : Math.random() > 0.5 ? 'down' as const : 'stable' as const,
        category: category?.name || 'Sin categoría'
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Productos de menor rotación (menor valor de inventario)
  const slowMovingProducts: TopProduct[] = products
    .filter(p => p.stock_quantity > 0)
    .map(p => {
      const category = categories.find(c => c.id === p.category_id);
      const daysSinceAdded = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        value: daysSinceAdded,
        metric: `${daysSinceAdded} días`,
        trend: 'down' as const,
        category: category?.name || 'Sin categoría'
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Stock por categoría
  const stockByCategory = categories.map(category => {
    const categoryProducts = products.filter(p => p.category_id === category.id);
    const totalStock = categoryProducts.reduce((sum, p) => sum + p.stock_quantity, 0);
    const totalValue = categoryProducts.reduce((sum, p) => sum + (p.stock_quantity * p.sale_price), 0);
    const lowStockCount = categoryProducts.filter(p => p.stock_quantity <= p.min_stock).length;
    
    return {
      id: category.id,
      name: category.name,
      productCount: categoryProducts.length,
      totalStock,
      totalValue,
      lowStockCount,
      stockHealth: categoryProducts.length > 0 ? 
        ((categoryProducts.length - lowStockCount) / categoryProducts.length) * 100 : 100
    };
  }).sort((a, b) => b.totalValue - a.totalValue);

  

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reportes de Inventario</h2>
          <p className="text-muted-foreground">
            Análisis detallado del estado del inventario y alertas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExportReport?.('inventory')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Alertas de Stock Crítico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Alertas de Stock ({stockAlerts.length})
          </CardTitle>
          <CardDescription>
            Productos que requieren reabastecimiento inmediato
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockAlerts.length > 0 ? (
            <div className="space-y-3">
              {stockAlerts.slice(0, 8).map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{alert.productName}</h4>
                      <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                        {alert.severity === 'critical' ? 'Crítico' : 
                         alert.severity === 'warning' ? 'Advertencia' : 'Info'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>SKU: {alert.sku}</span>
                      <span>Categoría: {alert.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      Stock: {alert.currentStock}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Mín: {alert.minStock}
                    </div>
                  </div>
                </div>
              ))}
              {stockAlerts.length > 8 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm">
                    Ver {stockAlerts.length - 8} alertas más
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay alertas de stock críticas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock por Categoría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Stock por Categoría
          </CardTitle>
          <CardDescription>
            Distribución y salud del inventario por categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stockByCategory.map(category => (
              <div key={category.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{category.name}</h4>
                  <Badge variant="outline">
                    {category.productCount} productos
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {category.totalStock.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Unidades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {fmtCurrency(category.totalValue)}
                    </div>
                    <div className="text-xs text-muted-foreground">Valor Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {category.lowStockCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Stock Bajo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {category.stockHealth.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Salud</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Salud del Stock</span>
                    <span>{category.stockHealth.toFixed(1)}%</span>
                  </div>
                  <Progress value={category.stockHealth} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Productos Top y de Baja Rotación */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Productos Más Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Productos Más Vendidos
            </CardTitle>
            <CardDescription>
              Top 10 por valor de inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellingProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(product.trend)}
                    <span className="text-sm font-bold">{product.metric}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Productos de Baja Rotación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Productos de Baja Rotación
            </CardTitle>
            <CardDescription>
              Productos con mayor tiempo en inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowMovingProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-bold">{product.metric}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen Ejecutivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Resumen Ejecutivo
          </CardTitle>
          <CardDescription>
            Métricas clave del inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center p-4 rounded-lg bg-blue-50">
              <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">
                {products.length}
              </div>
              <div className="text-sm text-blue-700">Total Productos</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-green-50">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">
                {fmtCurrency(products.reduce((sum, p) => sum + (p.stock_quantity * p.sale_price), 0))}
              </div>
              <div className="text-sm text-green-700">Valor Total</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-red-50">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-red-600">
                {stockAlerts.length}
              </div>
              <div className="text-sm text-red-700">Alertas Activas</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-purple-50">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">
                {categories.length}
              </div>
              <div className="text-sm text-purple-700">Categorías</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryReports;