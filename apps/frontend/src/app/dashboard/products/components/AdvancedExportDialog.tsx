'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  File,
  Settings,
  Calendar,
  Filter,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ExportService, ExportField } from '../services/ExportService';
import { useProducts } from '../contexts/ProductsContext';
import { toast } from '@/lib/toast';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';

interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'csv' | 'excel' | 'pdf';
  fields: string[];
  icon: React.ComponentType<any>;
}

export function AdvancedExportDialog({ open, onOpenChange }: AdvancedExportDialogProps) {
  const { products, computed } = useProducts();
  const { config } = useBusinessConfig();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Export configuration
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel' | 'pdf'>('excel');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'sku', 'name', 'category', 'stock_quantity', 'sale_price'
  ]);
  const [filename, setFilename] = useState('');
  const [includeFiltered, setIncludeFiltered] = useState(true);
  const [customTemplate, setCustomTemplate] = useState('');

  // Predefined templates
  const templates: ExportTemplate[] = [
    {
      id: 'inventory',
      name: 'Reporte de Inventario',
      description: 'Stock, precios y valores totales',
      format: 'excel',
      fields: ['sku', 'name', 'category', 'stock_quantity', 'min_stock', 'cost_price', 'sale_price'],
      icon: FileSpreadsheet
    },
    {
      id: 'catalog',
      name: 'Catálogo de Productos',
      description: 'Lista completa para clientes',
      format: 'pdf',
      fields: ['sku', 'name', 'description', 'category', 'sale_price'],
      icon: FileText
    },
    {
      id: 'low-stock',
      name: 'Productos con Stock Bajo',
      description: 'Para reabastecimiento',
      format: 'excel',
      fields: ['sku', 'name', 'category', 'stock_quantity', 'min_stock', 'supplier'],
      icon: AlertCircle
    },
    {
      id: 'price-list',
      name: 'Lista de Precios',
      description: 'Precios de costo y venta',
      format: 'excel',
      fields: ['sku', 'name', 'category', 'cost_price', 'sale_price', 'profit_margin'],
      icon: File
    }
  ];

  const availableFields = ExportService.getAvailableFields();
  
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel': return FileSpreadsheet;
      case 'pdf': return FileText;
      case 'csv': return File;
      default: return File;
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'excel': return 'text-green-600 bg-green-50';
      case 'pdf': return 'text-red-600 bg-red-50';
      case 'csv': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleTemplateSelect = (template: ExportTemplate) => {
    setSelectedFormat(template.format);
    setSelectedFields(template.fields);
    setFilename(template.name.toLowerCase().replace(/\s+/g, '_'));
  };

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    if (checked) {
      setSelectedFields(prev => [...prev, fieldKey]);
    } else {
      setSelectedFields(prev => prev.filter(f => f !== fieldKey));
    }
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Selecciona al menos un campo para exportar');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const productsToExport = includeFiltered ? computed.filteredProducts : products;
      
      const exportOptions = {
        fields: selectedFields,
        filename: filename || `productos_${selectedFormat}_${Date.now()}`,
        includeTotals: true,
        applyAutoFilter: true,
        title: 'Productos',
        branding: {
          name: config.businessName,
          logoDataUrl: config.branding?.logo,
          address: `${config.address.street}, ${config.address.city}`,
          phone: config.contact.phone,
        },
      };

      // Validate options
      const validation = ExportService.validateExportOptions(exportOptions);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      await ExportService.exportProducts(productsToExport, selectedFormat, exportOptions);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      setTimeout(() => {
        toast.success(`Exportación ${selectedFormat.toUpperCase()} completada`);
        onOpenChange(false);
        setExportProgress(0);
      }, 500);

    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar productos');
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickExport = async (template: ExportTemplate) => {
    setIsExporting(true);
    
    try {
      const productsToExport = includeFiltered ? computed.filteredProducts : products;
      
      const branding = {
        name: config.businessName,
        logoDataUrl: config.branding?.logo,
        address: `${config.address.street}, ${config.address.city}`,
        phone: config.contact.phone,
      };
      const baseOptions = {
        fields: template.fields,
        filename: template.name.toLowerCase().replace(/\s+/g, '_'),
        includeTotals: template.format === 'excel',
        applyAutoFilter: template.format === 'excel',
        title: template.name,
        branding,
      };
      if (template.id === 'low-stock') {
        const lowStockProducts = productsToExport.filter((p: any) => {
          const stock = p.stock_quantity || 0;
          const min = p.min_stock || 0;
          return stock <= min;
        });
        await ExportService.exportProducts(lowStockProducts, template.format, baseOptions);
      } else {
        await ExportService.exportProducts(productsToExport, template.format, baseOptions);
      }
      
      toast.success(`${template.name} exportado correctamente`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Productos
          </DialogTitle>
          <DialogDescription>
            Configura y exporta tus productos en diferentes formatos
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
            <TabsTrigger value="advanced">Avanzado</TabsTrigger>
          </TabsList>

          {/* Templates tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(template => {
                const Icon = template.icon;
                const FormatIcon = getFormatIcon(template.format);
                
                return (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        <div className={`p-1 rounded ${getFormatColor(template.format)}`}>
                          <FormatIcon className="h-4 w-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-xs text-muted-foreground">
                          Campos incluidos: {template.fields.length}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTemplateSelect(template)}
                            className="flex-1"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Personalizar
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleQuickExport(template)}
                            disabled={isExporting}
                            className="flex-1"
                          >
                            {isExporting ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            Exportar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Custom tab */}
          <TabsContent value="custom" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Format selection */}
              <div className="space-y-3">
                <Label>Formato de exportación</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['csv', 'excel', 'pdf'] as const).map(format => {
                    const Icon = getFormatIcon(format);
                    return (
                      <Button
                        key={format}
                        variant={selectedFormat === format ? 'default' : 'outline'}
                        onClick={() => setSelectedFormat(format)}
                        className="flex-col h-auto p-4"
                      >
                        <Icon className="h-6 w-6 mb-2" />
                        <span className="text-xs">{format.toUpperCase()}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Filename */}
              <div className="space-y-3">
                <Label htmlFor="filename">Nombre del archivo</Label>
                <Input
                  id="filename"
                  placeholder={`productos_${selectedFormat}_${Date.now()}`}
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                />
              </div>
            </div>

            {/* Field selection */}
            <div className="space-y-3">
              <Label>Campos a incluir</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                {availableFields.map(field => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.key}
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={(checked) => handleFieldToggle(field.key, checked as boolean)}
                    />
                    <Label htmlFor={field.key} className="text-sm">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedFields.length} campos seleccionados
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label>Opciones</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-filtered"
                    checked={includeFiltered}
                    onCheckedChange={(checked) => setIncludeFiltered(!!checked)}
                  />
                  <Label htmlFor="include-filtered" className="text-sm">
                    Solo productos filtrados ({computed.filteredProducts.length} productos)
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Advanced tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-template">Plantilla personalizada (JSON)</Label>
                <Textarea
                  id="custom-template"
                  placeholder={JSON.stringify({
                    format: 'excel',
                    fields: ['sku', 'name', 'category'],
                    filename: 'mi_exportacion'
                  }, null, 2)}
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  className="font-mono text-sm"
                  rows={10}
                />
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>Formato JSON esperado:</p>
                <pre className="mt-2 p-2 bg-muted rounded text-xs">
{`{
  "format": "excel|csv|pdf",
  "fields": ["sku", "name", "category"],
  "filename": "nombre_archivo",
  "includeImages": false
}`}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Export progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Exportando...</span>
              <span>{exportProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {includeFiltered 
                ? `${computed.filteredProducts.length} productos a exportar`
                : `${products.length} productos a exportar`
              }
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleExport}
                disabled={isExporting || selectedFields.length === 0}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar {selectedFormat.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
