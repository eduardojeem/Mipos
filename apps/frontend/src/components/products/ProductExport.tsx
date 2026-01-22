'use client';

import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage,
  Settings,
  Check,
  X,
  Calendar,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';
import type { Product, Category } from '@/types';
import { exportCsv } from '@/utils/products';

interface ProductExportProps {
  products: Product[];
  categories: Category[];
  selectedProducts?: string[];
  className?: string;
}

interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  fields: string[];
  filters: {
    category: string;
    stockStatus: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
  includeImages: boolean;
  fileName: string;
}

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: FileText, description: 'Archivo de valores separados por comas' },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Hoja de cálculo de Microsoft Excel' },
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Documento PDF con formato' },
  { value: 'json', label: 'JSON', icon: FileText, description: 'Formato de datos JSON' }
];

const AVAILABLE_FIELDS = [
  { key: 'name', label: 'Nombre del Producto', required: true },
  { key: 'sku', label: 'SKU', required: true },
  { key: 'description', label: 'Descripción', required: false },
  { key: 'category', label: 'Categoría', required: false },
  { key: 'price', label: 'Precio de Venta', required: false },
  { key: 'costPrice', label: 'Precio de Costo', required: false },
  { key: 'stock', label: 'Stock Actual', required: false },
  { key: 'minStock', label: 'Stock Mínimo', required: false },
  { key: 'discount_percentage', label: 'Descuento (%)', required: false },
  { key: 'createdAt', label: 'Fecha de Creación', required: false },
  { key: 'updatedAt', label: 'Última Actualización', required: false }
];

export default function ProductExport({ 
  products, 
  categories, 
  selectedProducts = [], 
  className = '' 
}: ProductExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    fields: ['name', 'sku', 'price', 'stock', 'category'],
    filters: {
      category: 'all',
      stockStatus: 'all',
      dateRange: {
        start: '',
        end: ''
      }
    },
    includeImages: false,
    fileName: `productos_${new Date().toISOString().split('T')[0]}`
  });

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    const field = AVAILABLE_FIELDS.find(f => f.key === fieldKey);
    if (field?.required && !checked) {
      toast.error('Este campo es obligatorio y no se puede desmarcar');
      return;
    }

    setConfig(prev => ({
      ...prev,
      fields: checked 
        ? [...prev.fields, fieldKey]
        : prev.fields.filter(f => f !== fieldKey)
    }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        dateRange: {
          ...prev.filters.dateRange,
          [type]: value
        }
      }
    }));
  };

  const getFilteredProducts = () => {
    let filtered = selectedProducts.length > 0 
      ? products.filter(p => selectedProducts.includes(p.id))
      : products;

    // Aplicar filtros
    if (config.filters.category !== 'all') {
      filtered = filtered.filter(p => p.category_id === config.filters.category);
    }

    if (config.filters.stockStatus !== 'all') {
      filtered = filtered.filter(p => {
        const stockStatus = p.stock_quantity === 0 ? 'out' : p.stock_quantity <= p.min_stock ? 'low' : 'good';
        return stockStatus === config.filters.stockStatus;
      });
    }

    if (config.filters.dateRange.start) {
      const startDate = new Date(config.filters.dateRange.start);
      filtered = filtered.filter(p => new Date(p.created_at) >= startDate);
    }

    if (config.filters.dateRange.end) {
      const endDate = new Date(config.filters.dateRange.end);
      filtered = filtered.filter(p => new Date(p.created_at) <= endDate);
    }

    return filtered;
  };

  const generateCSV = (data: Product[]) => exportCsv(data, config.fields);

  const generateJSON = (data: Product[]) => {
    const exportData = data.map(product => {
      const exportProduct: any = {};
      config.fields.forEach(field => {
        switch (field) {
          case 'category':
            exportProduct[field] = product.category?.name || 'Sin categoría';
            break;
          default:
            exportProduct[field] = product[field as keyof Product];
        }
      });
      return exportProduct;
    });

    return JSON.stringify(exportData, null, 2);
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const withBom = mimeType.startsWith('text/csv') ? ('\ufeff' + content) : content;
    const blob = new Blob([withBom], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const filteredProducts = getFilteredProducts();
      
      if (filteredProducts.length === 0) {
        toast.error('No hay productos para exportar con los filtros seleccionados');
        return;
      }

      let content: string;
      let fileName: string;
      let mimeType: string;

      switch (config.format) {
        case 'csv':
          content = generateCSV(filteredProducts);
          fileName = `${config.fileName}.csv`;
          mimeType = 'text/csv;charset=utf-8;';
          break;
        
        case 'json':
          content = generateJSON(filteredProducts);
          fileName = `${config.fileName}.json`;
          mimeType = 'application/json;charset=utf-8;';
          break;
        
        case 'excel':
          content = generateCSV(filteredProducts);
          fileName = `${config.fileName}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        
        case 'pdf':
          // Para PDF, necesitaríamos una librería como jsPDF
          toast.info('Exportación a PDF próximamente...');
          return;
        
        default:
          throw new Error('Formato no soportado');
      }

      downloadFile(content, fileName, mimeType);
      
      toast.success(`${filteredProducts.length} productos exportados correctamente`);
      setIsOpen(false);
      
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Error al exportar los productos');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormat = EXPORT_FORMATS.find(f => f.value === config.format);
  const filteredCount = getFilteredProducts().length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
          {selectedProducts.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedProducts.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Exportar Productos</span>
          </DialogTitle>
          <DialogDescription>
            Configura las opciones de exportación para tus productos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formato de exportación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formato de Exportación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {EXPORT_FORMATS.map((format) => {
                  const Icon = format.icon;
                  return (
                    <div
                      key={format.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        config.format === format.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setConfig(prev => ({ ...prev, format: format.value as any }))}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-6 w-6" />
                        <div>
                          <p className="font-medium">{format.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {format.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Campos a exportar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campos a Exportar</CardTitle>
              <CardDescription>
                Selecciona qué información incluir en la exportación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {AVAILABLE_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.key}
                      checked={config.fields.includes(field.key)}
                      onCheckedChange={(checked) => handleFieldToggle(field.key, checked as boolean)}
                      disabled={field.required}
                    />
                    <Label 
                      htmlFor={field.key} 
                      className={`text-sm ${field.required ? 'font-medium' : ''}`}
                    >
                      {field.label}
                      {field.required && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Obligatorio
                        </Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros de Exportación</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select 
                    value={config.filters.category} 
                    onValueChange={(value) => handleFilterChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
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

                <div className="space-y-2">
                  <Label>Estado de Stock</Label>
                  <Select 
                    value={config.filters.stockStatus} 
                    onValueChange={(value) => handleFilterChange('stockStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="good">Stock Normal</SelectItem>
                      <SelectItem value="low">Stock Bajo</SelectItem>
                      <SelectItem value="out">Sin Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Inicio</Label>
                  <Input
                    type="date"
                    value={config.filters.dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Fin</Label>
                  <Input
                    type="date"
                    value={config.filters.dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configuración Adicional</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Archivo</Label>
                <Input
                  value={config.fileName}
                  onChange={(e) => setConfig(prev => ({ ...prev, fileName: e.target.value }))}
                  placeholder="nombre_del_archivo"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImages"
                  checked={config.includeImages}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, includeImages: checked as boolean }))
                  }
                />
                <Label htmlFor="includeImages">
                  Incluir URLs de imágenes
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {selectedFormat && <selectedFormat.icon className="h-5 w-5" />}
                  <div>
                    <p className="font-medium">
                      {filteredCount} producto(s) serán exportados
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Formato: {selectedFormat?.label} • Campos: {config.fields.length}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {filteredCount} productos
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || filteredCount === 0}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar {filteredCount} Productos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}