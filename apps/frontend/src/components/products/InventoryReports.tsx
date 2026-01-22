'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  AlertTriangle,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/lib/toast';

interface Product {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  min_stock: number;
  sale_price: number;
  cost_price: number;
  category_id: string;
  category?: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  categoryId?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy?: 'name' | 'stock' | 'value' | 'category';
  sortOrder?: 'asc' | 'desc';
}

interface InventoryReportsProps {
  products: Product[];
  categories: Category[];
}

export default function InventoryReports({ products, categories }: InventoryReportsProps) {
  const [filters, setFilters] = useState<ReportFilters>({
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Calcular estadísticas del inventario
  const inventoryStats = useMemo(() => {
    const filteredProducts = applyFilters(products, filters);
    
    const totalProducts = filteredProducts.length;
    const totalValue = filteredProducts.reduce((sum, product) => 
      sum + (product.stock_quantity * product.sale_price), 0
    );
    const totalCostValue = filteredProducts.reduce((sum, product) => 
      sum + (product.stock_quantity * product.cost_price), 0
    );
    const totalStock = filteredProducts.reduce((sum, product) => sum + product.stock_quantity, 0);
    
    const outOfStock = filteredProducts.filter(p => p.stock_quantity === 0).length;
    const lowStock = filteredProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock).length;
    const inStock = filteredProducts.filter(p => p.stock_quantity > p.min_stock).length;
    
    const categoryStats = categories.map(category => {
      const categoryProducts = filteredProducts.filter(p => p.category_id === category.id);
      return {
        category: category.name,
        count: categoryProducts.length,
        value: categoryProducts.reduce((sum, p) => sum + (p.stock_quantity * p.sale_price), 0),
        stock: categoryProducts.reduce((sum, p) => sum + p.stock_quantity, 0)
      };
    }).filter(stat => stat.count > 0);

    const topValueProducts = [...filteredProducts]
      .sort((a, b) => (b.stock_quantity * b.sale_price) - (a.stock_quantity * a.sale_price))
      .slice(0, 10);

    const lowStockProducts = filteredProducts
      .filter(p => p.stock_quantity <= p.min_stock)
      .sort((a, b) => a.stock_quantity - b.stock_quantity);

    return {
      totalProducts,
      totalValue,
      totalCostValue,
      totalStock,
      outOfStock,
      lowStock,
      inStock,
      categoryStats,
      topValueProducts,
      lowStockProducts,
      profitMargin: totalValue > 0 ? ((totalValue - totalCostValue) / totalValue) * 100 : 0
    };
  }, [products, categories, filters]);

  function applyFilters(products: Product[], filters: ReportFilters): Product[] {
    let filtered = [...products];

    // Filtrar por categoría
    if (filters.categoryId) {
      filtered = filtered.filter(p => p.category_id === filters.categoryId);
    }

    // Filtrar por estado de stock
    if (filters.stockStatus && filters.stockStatus !== 'all') {
      switch (filters.stockStatus) {
        case 'out_of_stock':
          filtered = filtered.filter(p => p.stock_quantity === 0);
          break;
        case 'low_stock':
          filtered = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock);
          break;
        case 'in_stock':
          filtered = filtered.filter(p => p.stock_quantity > p.min_stock);
          break;
      }
    }

    // Filtrar por fechas
    if (filters.dateFrom) {
      filtered = filtered.filter(p => new Date(p.created_at) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(p => new Date(p.created_at) <= filters.dateTo!);
    }

    // Ordenar
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filters.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'stock':
            aValue = a.stock_quantity;
            bValue = b.stock_quantity;
            break;
          case 'value':
            aValue = a.stock_quantity * a.sale_price;
            bValue = b.stock_quantity * b.sale_price;
            break;
          case 'category':
            aValue = a.category?.name || '';
            bValue = b.category?.name || '';
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const generatePDFReport = async () => {
    setIsGenerating(true);
    try {
      // Simular generación de PDF
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // En una implementación real, aquí usarías una librería como jsPDF o html2pdf
      const reportData = {
        title: 'Reporte de Inventario',
        date: new Date().toLocaleDateString('es-ES'),
        stats: inventoryStats,
        products: applyFilters(products, filters)
      };
      
      // Crear contenido del PDF (simulado)
      const pdfContent = `
        REPORTE DE INVENTARIO
        Fecha: ${reportData.date}
        
        RESUMEN EJECUTIVO:
        - Total de productos: ${inventoryStats.totalProducts}
        - Valor total del inventario: ${formatCurrency(inventoryStats.totalValue)}
        - Productos sin stock: ${inventoryStats.outOfStock}
        - Productos con stock bajo: ${inventoryStats.lowStock}
        - Margen de ganancia: ${formatPercentage(inventoryStats.profitMargin)}
        
        PRODUCTOS CON MAYOR VALOR:
        ${inventoryStats.topValueProducts.map((p, i) => 
          `${i + 1}. ${p.name} - ${formatCurrency(p.stock_quantity * p.sale_price)}`
        ).join('\n')}
      `;
      
      // Crear y descargar archivo
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-inventario-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Reporte PDF generado exitosamente');
    } catch (error) {
      toast.error('Error al generar el reporte PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExcelReport = async () => {
    setIsGenerating(true);
    try {
      // Simular generación de Excel
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const filteredProducts = applyFilters(products, filters);
      
      // Crear contenido CSV (simulando Excel)
      const csvContent = [
        ['Código', 'Nombre', 'Categoría', 'Stock', 'Stock Mínimo', 'Precio', 'Valor Total', 'Estado'].join(','),
        ...filteredProducts.map(product => [
          product.sku,
          `"${product.name}"`,
          `"${product.category?.name || 'Sin categoría'}"`,
          product.stock_quantity,
          product.min_stock,
          product.sale_price,
          product.stock_quantity * product.sale_price,
          product.stock_quantity === 0 ? 'Sin Stock' : product.stock_quantity <= product.min_stock ? 'Stock Bajo' : 'En Stock'
        ].join(','))
      ].join('\n');
      
      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Reporte Excel generado exitosamente');
    } catch (error) {
      toast.error('Error al generar el reporte Excel');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros de Reporte</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="category-filter">Categoría</Label>
              <Select
                value={filters.categoryId || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, categoryId: value === 'all' ? undefined : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stock-filter">Estado de Stock</Label>
              <Select
                value={filters.stockStatus || 'all'}
                onValueChange={(value: any) => 
                  setFilters(prev => ({ ...prev, stockStatus: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in_stock">En Stock</SelectItem>
                  <SelectItem value="low_stock">Stock Bajo</SelectItem>
                  <SelectItem value="out_of_stock">Sin Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-by">Ordenar por</Label>
              <Select
                value={filters.sortBy || 'name'}
                onValueChange={(value: any) => 
                  setFilters(prev => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="value">Valor</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-order">Orden</Label>
              <Select
                value={filters.sortOrder || 'asc'}
                onValueChange={(value: any) => 
                  setFilters(prev => ({ ...prev, sortOrder: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendente</SelectItem>
                  <SelectItem value="desc">Descendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{inventoryStats.totalProducts}</p>
                <p className="text-sm text-gray-600">Total Productos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(inventoryStats.totalValue)}</p>
                <p className="text-sm text-gray-600">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{formatPercentage(inventoryStats.profitMargin)}</p>
                <p className="text-sm text-gray-600">Margen Ganancia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{inventoryStats.outOfStock + inventoryStats.lowStock}</p>
                <p className="text-sm text-gray-600">Requieren Atención</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de reportes */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="categories">Por Categorías</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="top-products">Top Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>En Stock ({inventoryStats.inStock})</span>
                    <span>{((inventoryStats.inStock / inventoryStats.totalProducts) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={(inventoryStats.inStock / inventoryStats.totalProducts) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Stock Bajo ({inventoryStats.lowStock})</span>
                    <span>{((inventoryStats.lowStock / inventoryStats.totalProducts) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={(inventoryStats.lowStock / inventoryStats.totalProducts) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Sin Stock ({inventoryStats.outOfStock})</span>
                    <span>{((inventoryStats.outOfStock / inventoryStats.totalProducts) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={(inventoryStats.outOfStock / inventoryStats.totalProducts) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis por Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventoryStats.categoryStats.map((stat, index) => (
                  <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{stat.category}</h4>
                      <p className="text-sm text-gray-600">{stat.count} productos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(stat.value)}</p>
                      <p className="text-sm text-gray-600">{stat.stock} unidades</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productos que Requieren Atención</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inventoryStats.lowStockProducts.map((product) => (
                  <div key={product.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{product.name}</h4>
                      <p className="text-sm text-gray-600">{product.sku}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={product.stock_quantity === 0 ? 'destructive' : 'secondary'}>
                        {product.stock_quantity === 0 ? 'Sin Stock' : `${product.stock_quantity} unidades`}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        Mín: {product.min_stock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productos con Mayor Valor en Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inventoryStats.topValueProducts.map((product, index) => (
                  <div key={product.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="text-sm text-gray-600">{product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(product.stock_quantity * product.sale_price)}</p>
                      <p className="text-sm text-gray-600">{product.stock_quantity} × {formatCurrency(product.sale_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botones de exportación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Exportar Reportes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={generatePDFReport}
              disabled={isGenerating}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>{isGenerating ? 'Generando...' : 'Exportar PDF'}</span>
            </Button>
            
            <Button 
              onClick={generateExcelReport}
              disabled={isGenerating}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{isGenerating ? 'Generando...' : 'Exportar Excel'}</span>
            </Button>
            
            <Button 
              onClick={() => window.print()}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 mt-4">
            Los reportes incluyen todos los productos filtrados con estadísticas detalladas del inventario.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}