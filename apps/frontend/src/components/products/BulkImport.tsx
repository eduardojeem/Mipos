'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Info,
  MapPin
} from 'lucide-react';
import { toast } from '@/lib/toast';
import * as XLSX from 'xlsx';

interface ImportedProduct {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  discount_percentage?: number;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
  rowNumber: number;
}

interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'email';
  min?: number;
  max?: number;
  pattern?: RegExp;
}

interface BulkImportProps {
  onImport: (products: ImportedProduct[]) => Promise<void>;
  categories: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

const VALIDATION_RULES: ValidationRule[] = [
  { field: 'name', required: true, type: 'string', min: 2, max: 100 },
  { field: 'code', required: true, type: 'string', min: 2, max: 50 },
  { field: 'category', required: true, type: 'string' },
  { field: 'price', required: true, type: 'number', min: 0 },
  { field: 'costPrice', required: true, type: 'number', min: 0 },
  { field: 'stock', required: true, type: 'number', min: 0 },
  { field: 'minStock', required: true, type: 'number', min: 0 },
  { field: 'discount_percentage', required: false, type: 'number', min: 0, max: 100 }
];

const FIELD_MAPPING = {
  'Nombre': 'name',
  'Código': 'code',
  'Descripción': 'description',
  'Categoría': 'category',
  'Precio': 'price',
  'Precio Costo': 'costPrice',
  'Stock': 'stock',
  'Stock Mínimo': 'minStock',
  'Descuento %': 'discount_percentage'
};

export default function BulkImport({ onImport, categories, isLoading = false }: BulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<ImportedProduct[]>([]);
  const [validationResults, setValidationResults] = useState<{
    valid: number;
    warnings: number;
    errors: number;
  }>({ valid: 0, warnings: 0, errors: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [showMapping, setShowMapping] = useState(false);
  const [rawData, setRawData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Formato de archivo no válido. Solo se permiten archivos CSV y Excel.');
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const data = await readFile(file);
      setRawData(data);
      
      if (data.length === 0) {
        toast.error('El archivo está vacío o no contiene datos válidos.');
        return;
      }

      // Detectar mapeo automático de campos
      const headers = Object.keys(data[0]);
      const autoMapping: Record<string, string> = {};
      
      headers.forEach(header => {
        const mappedField = FIELD_MAPPING[header as keyof typeof FIELD_MAPPING];
        if (mappedField) {
          autoMapping[header] = mappedField;
        }
      });

      setFieldMapping(autoMapping);
      
      // Si no se detectaron todos los campos requeridos, mostrar mapeo manual
      const requiredFields = VALIDATION_RULES.filter(rule => rule.required).map(rule => rule.field);
      const mappedFields = Object.values(autoMapping);
      const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
      
      if (missingFields.length > 0) {
        setShowMapping(true);
        toast.warning(`Se requiere mapeo manual para los campos: ${missingFields.join(', ')}`);
      } else {
        processData(data, autoMapping);
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
      toast.error('Error al procesar el archivo. Verifica el formato.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const readFile = useCallback((file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let jsonData: any[] = [];

          if (file.type === 'text/csv') {
            // Procesar CSV
            const text = data as string;
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
              resolve([]);
              return;
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            jsonData = lines.slice(1).map((line, index) => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const obj: any = {};
              headers.forEach((header, i) => {
                obj[header] = values[i] || '';
              });
              obj._rowNumber = index + 2; // +2 porque empezamos desde la línea 2
              return obj;
            });
          } else {
            // Procesar Excel
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
              resolve([]);
              return;
            }

            const headers = jsonData[0] as string[];
            jsonData = jsonData.slice(1).map((row: any[], index) => {
              const obj: any = {};
              headers.forEach((header, i) => {
                obj[header] = row[i] || '';
              });
              obj._rowNumber = index + 2;
              return obj;
            }).filter(row => Object.values(row).some(val => val !== ''));
          }

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error leyendo archivo'));

      if (file.type === 'text/csv') {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  }, []);

  const processData = useCallback((data: any[], mapping: Record<string, string>) => {
    setProgress(25);
    
    const products: ImportedProduct[] = data.map((row, index) => {
      const product: Partial<ImportedProduct> = {
        id: `import_${index}`,
        rowNumber: row._rowNumber || index + 2,
        errors: [],
        warnings: []
      };

      // Mapear campos
      Object.entries(mapping).forEach(([originalField, mappedField]) => {
        const value = row[originalField];
        
        // Skip fields mapped to "none"
        if (mappedField === 'none' || !mappedField) {
          return;
        }
        
        if (mappedField === 'price' || mappedField === 'costPrice' || 
            mappedField === 'stock' || mappedField === 'minStock' || 
            mappedField === 'discount_percentage') {
          (product as any)[mappedField] = parseFloat(value) || 0;
        } else {
          (product as any)[mappedField] = value?.toString().trim() || '';
        }
      });

      // Validar producto
      const validation = validateProduct(product as ImportedProduct);
      return {
        ...product,
        ...validation
      } as ImportedProduct;
    });

    setProgress(75);
    
    // Calcular estadísticas de validación
    const stats = products.reduce((acc, product) => {
      if (product.status === 'valid') acc.valid++;
      else if (product.status === 'warning') acc.warnings++;
      else acc.errors++;
      return acc;
    }, { valid: 0, warnings: 0, errors: 0 });

    setImportedData(products);
    setValidationResults(stats);
    setSelectedProducts(products.filter(p => p.status !== 'error').map(p => p.id));
    setProgress(100);
    
    toast.success(`Archivo procesado: ${stats.valid} válidos, ${stats.warnings} con advertencias, ${stats.errors} con errores`);
  }, []);

  const validateProduct = (product: ImportedProduct): Partial<ImportedProduct> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    VALIDATION_RULES.forEach(rule => {
      const value = product[rule.field as keyof ImportedProduct];
      
      if (rule.required && (!value || value === '')) {
        errors.push(`${rule.field} es requerido`);
        return;
      }

      if (value && rule.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(`${rule.field} debe ser un número válido`);
        } else {
          if (rule.min !== undefined && numValue < rule.min) {
            errors.push(`${rule.field} debe ser mayor o igual a ${rule.min}`);
          }
          if (rule.max !== undefined && numValue > rule.max) {
            errors.push(`${rule.field} debe ser menor o igual a ${rule.max}`);
          }
        }
      }

      if (value && rule.type === 'string') {
        const strValue = String(value);
        if (rule.min && strValue.length < rule.min) {
          errors.push(`${rule.field} debe tener al menos ${rule.min} caracteres`);
        }
        if (rule.max && strValue.length > rule.max) {
          errors.push(`${rule.field} debe tener máximo ${rule.max} caracteres`);
        }
      }
    });

    // Validaciones específicas
    if (product.category && !categories.find(c => c.name === product.category)) {
      warnings.push(`Categoría "${product.category}" no existe, se creará automáticamente`);
    }

    if (product.price && product.costPrice && product.price <= product.costPrice) {
      warnings.push('El precio de venta es menor o igual al precio de costo');
    }

    if (product.stock && product.minStock && product.stock <= product.minStock) {
      warnings.push('El stock actual está por debajo del stock mínimo');
    }

    let status: 'valid' | 'warning' | 'error' = 'valid';
    if (errors.length > 0) status = 'error';
    else if (warnings.length > 0) status = 'warning';

    return { errors, warnings, status };
  };

  const handleImport = async () => {
    const productsToImport = importedData.filter(p => 
      selectedProducts.includes(p.id) && p.status !== 'error'
    );

    if (productsToImport.length === 0) {
      toast.error('No hay productos válidos seleccionados para importar');
      return;
    }

    try {
      await onImport(productsToImport);
      toast.success(`${productsToImport.length} productos importados exitosamente`);
      resetImport();
    } catch (error) {
      console.error('Error importando productos:', error);
      toast.error('Error al importar productos');
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportedData([]);
    setValidationResults({ valid: 0, warnings: 0, errors: 0 });
    setSelectedProducts([]);
    setFieldMapping({});
    setShowMapping(false);
    setRawData([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['Nombre', 'Código', 'Descripción', 'Categoría', 'Precio', 'Precio Costo', 'Stock', 'Stock Mínimo', 'Descuento %'],
      ['Producto Ejemplo', 'PROD001', 'Descripción del producto', 'Electrónicos', '99.99', '50.00', '100', '10', '5']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
    
    toast.success('Plantilla descargada exitosamente');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(importedData.filter(p => p.status !== 'error').map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importación Masiva de Productos
          </CardTitle>
          <CardDescription>
            Importa múltiples productos desde archivos CSV o Excel de forma rápida y eficiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
              <TabsTrigger value="template">Plantilla</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              {!file ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="font-semibold">Selecciona un archivo</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sube un archivo CSV o Excel con los datos de tus productos
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Seleccionar Archivo
                      </Button>
                      <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Plantilla
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetImport}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  </div>

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Procesando archivo...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                    </div>
                  )}

                  {showMapping && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Mapeo de Campos</CardTitle>
                        <CardDescription>
                          Asocia las columnas de tu archivo con los campos del sistema
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          {Object.keys(rawData[0] || {}).filter(key => key !== '_rowNumber').map(header => (
                            <div key={header} className="space-y-2">
                              <Label>{header}</Label>
                              <Select
                                value={fieldMapping[header] || 'none'}
                                onValueChange={(value) => setFieldMapping(prev => ({ ...prev, [header]: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No mapear</SelectItem>
                                  {VALIDATION_RULES.map(rule => (
                                    <SelectItem key={rule.field} value={rule.field}>
                                      {rule.field} {rule.required && '*'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button onClick={() => processData(rawData, fieldMapping)}>
                            <MapPin className="h-4 w-4 mr-2" />
                            Aplicar Mapeo
                          </Button>
                          <Button variant="outline" onClick={() => setShowMapping(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {importedData.length > 0 && !showMapping && (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="text-2xl font-bold text-green-600">{validationResults.valid}</p>
                                <p className="text-sm text-muted-foreground">Válidos</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-yellow-500" />
                              <div>
                                <p className="text-2xl font-bold text-yellow-600">{validationResults.warnings}</p>
                                <p className="text-sm text-muted-foreground">Advertencias</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="text-2xl font-bold text-red-600">{validationResults.errors}</p>
                                <p className="text-sm text-muted-foreground">Errores</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>Productos a Importar</CardTitle>
                            <div className="flex gap-2">
                              <Badge variant="outline">
                                {selectedProducts.length} seleccionados
                              </Badge>
                              <Button
                                size="sm"
                                onClick={handleImport}
                                disabled={selectedProducts.length === 0 || isLoading}
                              >
                                {isLoading ? (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                Importar Seleccionados
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">
                                    <Checkbox
                                      checked={selectedProducts.length === importedData.filter(p => p.status !== 'error').length}
                                      onCheckedChange={handleSelectAll}
                                    />
                                  </TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Fila</TableHead>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Código</TableHead>
                                  <TableHead>Categoría</TableHead>
                                  <TableHead>Precio</TableHead>
                                  <TableHead>Stock</TableHead>
                                  <TableHead>Problemas</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importedData.map((product) => (
                                  <TableRow key={product.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedProducts.includes(product.id)}
                                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                                        disabled={product.status === 'error'}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {getStatusIcon(product.status)}
                                        <Badge variant={
                                          product.status === 'valid' ? 'default' :
                                          product.status === 'warning' ? 'secondary' : 'destructive'
                                        }>
                                          {product.status === 'valid' ? 'Válido' :
                                           product.status === 'warning' ? 'Advertencia' : 'Error'}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell>{product.rowNumber}</TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="font-mono">{product.code}</TableCell>
                                    <TableCell>{product.category}</TableCell>
                                    <TableCell>€{product.price?.toFixed(2)}</TableCell>
                                    <TableCell>{product.stock}</TableCell>
                                    <TableCell>
                                      {product.errors.length > 0 && (
                                        <div className="space-y-1">
                                          {product.errors.map((error, index) => (
                                            <div key={index} className="text-xs text-red-600 flex items-center gap-1">
                                              <XCircle className="h-3 w-3" />
                                              {error}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {product.warnings.length > 0 && (
                                        <div className="space-y-1">
                                          {product.warnings.map((warning, index) => (
                                            <div key={index} className="text-xs text-yellow-600 flex items-center gap-1">
                                              <AlertTriangle className="h-3 w-3" />
                                              {warning}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="template" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Plantilla de Importación</CardTitle>
                  <CardDescription>
                    Descarga la plantilla para asegurar el formato correcto de tus datos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      La plantilla incluye todos los campos necesarios con ejemplos de datos.
                      Los campos marcados con * son obligatorios.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h4 className="font-medium">Campos requeridos:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• <strong>Nombre*:</strong> Nombre del producto (2-100 caracteres)</li>
                      <li>• <strong>Código*:</strong> Código único del producto (2-50 caracteres)</li>
                      <li>• <strong>Categoría*:</strong> Categoría del producto</li>
                      <li>• <strong>Precio*:</strong> Precio de venta (número mayor a 0)</li>
                      <li>• <strong>Precio Costo*:</strong> Precio de costo (número mayor a 0)</li>
                      <li>• <strong>Stock*:</strong> Cantidad en inventario (número mayor o igual a 0)</li>
                      <li>• <strong>Stock Mínimo*:</strong> Stock mínimo para alertas (número mayor o igual a 0)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Campos opcionales:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• <strong>Descripción:</strong> Descripción detallada del producto</li>
                      <li>• <strong>Descuento %:</strong> Porcentaje de descuento (0-100)</li>
                    </ul>
                  </div>

                  <Button onClick={downloadTemplate} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Plantilla Excel
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}