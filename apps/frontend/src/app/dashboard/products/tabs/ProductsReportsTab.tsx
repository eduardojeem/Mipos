'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  BarChart3, 
  Calendar,
  Filter,
  TrendingUp,
  Package,
  DollarSign
} from 'lucide-react';
import { useProducts } from '../contexts/ProductsContext';
import { formatCurrency } from '@/lib/utils';
import { AdvancedExportDialog } from '../components/AdvancedExportDialog';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'inventory' | 'sales' | 'financial' | 'analytics';
  format: 'pdf' | 'excel' | 'csv';
  icon: React.ComponentType<any>;
  generateData: (products: any[]) => any[];
}

export default function ProductsReportsTab() {
  const { products, categories, loading } = useProducts();
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const reports: Report[] = [
    {
      id: 'inventory-status',
      name: 'Estado de Inventario',
      description: 'Reporte completo del estado actual del inventario',
      type: 'inventory',
      format: 'excel',
      icon: Package,
      generateData: (products) => products.map(p => ({
        'Código': p.sku,
        'Nombre': p.name,
        'Categoría': p.category?.name || 'Sin categoría',
        'Stock Actual': p.stock_quantity || 0,
        'Stock Mínimo': p.min_stock || 0,
        'Precio Venta': p.sale_price || 0,
        'Precio Costo': p.cost_price || 0,
        'Valor Total': (p.sale_price || 0) * (p.stock_quantity || 0),
        'Estado': (p.stock_quantity || 0) === 0 ? 'Sin Stock' : 
                 (p.stock_quantity || 0) <= (p.min_stock || 0) ? 'Stock Bajo' : 'Normal'
      }))
    },
    {
      id: 'low-stock',
      name: 'Productos con Stock Bajo',
      description: 'Lista de productos que requieren reabastecimiento',
      type: 'inventory',
      format: 'pdf',
      icon: TrendingUp,
      generateData: (products) => products
        .filter(p => {
          const stock = p.stock_quantity || 0;
          const minStock = p.min_stock || 0;
          return stock <= minStock;
        })
        .map(p => ({
          'Código': p.sku,
          'Nombre': p.name,
          'Stock Actual': p.stock_quantity || 0,
          'Stock Mínimo': p.min_stock || 0,
          'Diferencia': (p.min_stock || 0) - (p.stock_quantity || 0),
          'Prioridad': (p.stock_quantity || 0) === 0 ? 'Crítica' : 'Media'
        }))
    },
    {
      id: 'category-analysis',
      name: 'Análisis por Categorías',
      description: 'Distribución y rendimiento por categorías',
      type: 'analytics',
      format: 'excel',
      icon: BarChart3,
      generateData: (products) => {
        const categoryStats = categories.map(cat => {
          const categoryProducts = products.filter(p => p.category_id === cat.id);
          const totalValue = categoryProducts.reduce((sum, p) => sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0);
          const avgPrice = categoryProducts.length > 0 
            ? categoryProducts.reduce((sum, p) => sum + (p.sale_price || 0), 0) / categoryProducts.length 
            : 0;
          
          return {
            'Categoría': cat.name,
            'Total Productos': categoryProducts.length,
            'Valor Total': totalValue,
            'Precio Promedio': avgPrice,
            'Stock Total': categoryProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0),
            'Sin Stock': categoryProducts.filter(p => (p.stock_quantity || 0) === 0).length,
            'Stock Bajo': categoryProducts.filter(p => {
              const stock = p.stock_quantity || 0;
              const minStock = p.min_stock || 0;
              return stock > 0 && stock <= minStock;
            }).length
          };
        });
        
        return categoryStats;
      }
    },
    {
      id: 'price-analysis',
      name: 'Análisis de Precios',
      description: 'Distribución de precios y márgenes de ganancia',
      type: 'financial',
      format: 'excel',
      icon: DollarSign,
      generateData: (products) => products.map(p => {
        const salePrice = p.sale_price || 0;
        const costPrice = p.cost_price || 0;
        const margin = costPrice > 0 ? ((salePrice - costPrice) / salePrice) * 100 : 0;
        
        return {
          'Código': p.sku,
          'Nombre': p.name,
          'Precio Costo': costPrice,
          'Precio Venta': salePrice,
          'Margen %': margin.toFixed(2),
          'Ganancia Unitaria': salePrice - costPrice,
          'Stock': p.stock_quantity || 0,
          'Ganancia Total': (salePrice - costPrice) * (p.stock_quantity || 0)
        };
      })
    },
    {
      id: 'complete-catalog',
      name: 'Catálogo Completo',
      description: 'Listado completo de todos los productos',
      type: 'inventory',
      format: 'csv',
      icon: FileText,
      generateData: (products) => products.map(p => ({
        'ID': p.id,
        'SKU': p.sku,
        'Nombre': p.name,
        'Descripción': p.description || '',
        'Categoría': p.category?.name || 'Sin categoría',
        'Proveedor': p.supplier?.name || 'Sin proveedor',
        'Precio Costo': p.cost_price || 0,
        'Precio Venta': p.sale_price || 0,
        'Stock': p.stock_quantity || 0,
        'Stock Mínimo': p.min_stock || 0,
        'Estado': p.is_active ? 'Activo' : 'Inactivo',
        'Fecha Creación': new Date(p.created_at || Date.now()).toLocaleDateString(),
        'Última Actualización': new Date(p.updated_at || Date.now()).toLocaleDateString()
      }))
    }
  ];

  const handleGenerateReport = async (report: Report) => {
    setGeneratingReport(report.id);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const data = report.generateData(products);
      
      // Generate and download file based on format
      if (report.format === 'csv') {
        downloadCSV(data, `${report.name}.csv`);
      } else if (report.format === 'excel') {
        // Would use a library like xlsx
        console.log('Generating Excel report:', report.name, data);
      } else if (report.format === 'pdf') {
        // Would use a library like jsPDF
        console.log('Generating PDF report:', report.name, data);
      }
      
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport(null);
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'inventory': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'sales': return 'bg-green-50 text-green-700 border-green-200';
      case 'financial': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'analytics': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return '📄';
      case 'excel': return '📊';
      case 'csv': return '📋';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reports overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reportes Disponibles
          </CardTitle>
          <CardDescription>
            Genera reportes detallados basados en {products.length} productos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reports.filter(r => r.type === 'inventory').length}
              </div>
              <p className="text-sm text-muted-foreground">Inventario</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reports.filter(r => r.type === 'sales').length}
              </div>
              <p className="text-sm text-muted-foreground">Ventas</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reports.filter(r => r.type === 'financial').length}
              </div>
              <p className="text-sm text-muted-foreground">Financieros</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {reports.filter(r => r.type === 'analytics').length}
              </div>
              <p className="text-sm text-muted-foreground">Analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          const isGenerating = generatingReport === report.id;
          
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getTypeColor(report.type)}>
                          {report.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {getFormatIcon(report.format)} {report.format.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {report.description}
                </p>
                
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Registros a incluir: {report.generateData(products).length}
                  </div>
                  
                  <Button 
                    onClick={() => handleGenerateReport(report)}
                    disabled={isGenerating || products.length === 0}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Generar Reporte
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex-col"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-6 w-6 mb-2" />
              <span className="font-medium">Exportación Avanzada</span>
              <span className="text-xs text-muted-foreground">Configurar exportación personalizada</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              <span className="font-medium">Reporte Programado</span>
              <span className="text-xs text-muted-foreground">Configurar envío automático</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col">
              <Filter className="h-6 w-6 mb-2" />
              <span className="font-medium">Filtros Personalizados</span>
              <span className="text-xs text-muted-foreground">Crear reportes específicos</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col">
              <BarChart3 className="h-6 w-6 mb-2" />
              <span className="font-medium">Dashboard Ejecutivo</span>
              <span className="text-xs text-muted-foreground">Resumen para gerencia</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Export Dialog */}
      <AdvancedExportDialog 
        open={showExportDialog} 
        onOpenChange={setShowExportDialog} 
      />
    </div>
  );
}