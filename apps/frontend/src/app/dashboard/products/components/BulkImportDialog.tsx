'use client';

import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  X, 
  ArrowRight,
  Settings,
  Eye,
  Play,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// import { useDropzone } from 'react-dropzone';
import ImportService, {
  type ImportPreview,
  type ImportMapping,
  type ImportOptions,
  type ImportResult,
  type ImportValidationError
} from '../services/ImportService';
import { toast } from '@/lib/toast';

interface BulkImportDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onImportComplete?: (result: ImportResult) => void;
}

export default function BulkImportDialog({ 
  open: controlledOpen, 
  onOpenChange, 
  onImportComplete 
}: BulkImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'import' | 'result'>('upload');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    skipFirstRow: true,
    updateExisting: false,
    validateOnly: false,
    batchSize: 50,
    duplicateStrategy: 'skip'
  });
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validationError = ImportService.validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      toast.info('Procesando archivo...');
      const filePreview = await ImportService.parseFile(file);
      setPreview(filePreview);
      setCurrentStep('mapping');
      toast.success(`Archivo procesado: ${filePreview.totalRows} filas encontradas`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar el archivo');
    }
  }, []);

  // Temporary simple file input instead of dropzone
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onDrop([files[0]]);
    }
  };

  const handleMappingChange = (csvColumn: string, productField: string) => {
    if (!preview) return;

    const newMapping = { ...preview.mapping };
    if (productField === '') {
      delete newMapping[csvColumn];
    } else {
      newMapping[csvColumn] = productField;
    }

    const updatedPreview = ImportService.updateMapping(preview, newMapping);
    setPreview(updatedPreview);
  };

  const handleImport = async () => {
    if (!preview) return;

    setIsImporting(true);
    setCurrentStep('import');
    setImportProgress(0);

    try {
      const result = await ImportService.importProducts(
        preview,
        importOptions,
        (progress, message) => {
          setImportProgress(progress);
          setImportMessage(message);
        }
      );

      setImportResult(result);
      setCurrentStep('result');
      
      if (result.success) {
        toast.success(`Importación completada: ${result.imported} productos procesados`);
        onImportComplete?.(result);
      } else {
        toast.error('La importación falló. Revisa los errores.');
      }
    } catch (error) {
      toast.error(`Error durante la importación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setCurrentStep('upload');
    setPreview(null);
    setImportResult(null);
    setImportProgress(0);
    setImportMessage('');
    setIsImporting(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetDialog, 300); // Reset after dialog closes
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Productos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importación Masiva de Productos
          </DialogTitle>
          <DialogDescription>
            Importa múltiples productos desde archivos CSV o Excel
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6 space-x-2">
            {[
              { key: 'upload', label: 'Subir', icon: Upload },
              { key: 'mapping', label: 'Mapear', icon: Settings },
              { key: 'preview', label: 'Vista Previa', icon: Eye },
              { key: 'import', label: 'Importar', icon: Play },
              { key: 'result', label: 'Resultado', icon: CheckCircle }
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = ['upload', 'mapping', 'preview', 'import'].indexOf(currentStep) > 
                                 ['upload', 'mapping', 'preview', 'import'].indexOf(step.key);
              
              return (
                <React.Fragment key={step.key}>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : isCompleted 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-4 w-4" />
                    <span>{step.label}</span>
                  </div>
                  {index < 4 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <ScrollArea className="h-[500px]">
            {/* Step 1: Upload */}
            {currentStep === 'upload' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Subir Archivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center border-muted-foreground/25 hover:border-primary/50 transition-colors">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <div>
                        <p className="text-lg mb-2">
                          Selecciona un archivo para importar
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Formatos soportados: CSV, Excel (.xlsx, .xls) - Máximo 10MB
                        </p>
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileInput}
                          className="hidden"
                          id="file-upload"
                        />
                        <Button asChild>
                          <label htmlFor="file-upload" className="cursor-pointer">
                            Seleccionar Archivo
                          </label>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Plantilla de Ejemplo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Descarga una plantilla con el formato correcto y datos de ejemplo
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => ImportService.generateTemplate()}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Descargar Plantilla
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {currentStep === 'mapping' && preview && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Mapeo de Columnas</CardTitle>
                    <div className="flex items-center space-x-4 text-sm">
                      <Badge variant="outline">{preview.totalRows} filas</Badge>
                      <Badge variant="outline">{preview.headers.length} columnas</Badge>
                      <Badge variant={preview.validRows === preview.totalRows ? 'default' : 'destructive'}>
                        {preview.validRows} válidas
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Mapea las columnas de tu archivo a los campos de producto correspondientes
                      </p>
                      
                      <div className="grid gap-4">
                        {preview.headers.map((header, index) => (
                          <div key={index} className="flex items-center space-x-4 p-3 border rounded">
                            <div className="flex-1">
                              <Label className="font-medium">{header}</Label>
                              <p className="text-xs text-muted-foreground">
                                Ejemplo: {preview.data[0]?.[index] || 'Sin datos'}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <Select
                                value={preview.mapping[header] || ''}
                                onValueChange={(value) => handleMappingChange(header, value === 'none' ? '' : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No mapear</SelectItem>
                                  {ImportService.getProductColumns().map((column) => (
                                    <SelectItem key={column.key} value={column.key}>
                                      {column.label} {column.required && '*'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {preview.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Errores de Validación ({preview.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {preview.errors.slice(0, 10).map((error, index) => (
                            <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
                              <span className="font-medium">Fila {error.row}:</span> {error.error}
                            </div>
                          ))}
                          {preview.errors.length > 10 && (
                            <p className="text-sm text-muted-foreground">
                              ... y {preview.errors.length - 10} errores más
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => ImportService.exportValidationErrors(preview.errors)}
                        className="mt-3 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Exportar Errores
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep('preview')}
                    disabled={preview.validRows === 0}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Preview & Options */}
            {currentStep === 'preview' && preview && (
              <div className="space-y-6">
                <Tabs defaultValue="options" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="options">Opciones</TabsTrigger>
                    <TabsTrigger value="preview">Vista Previa</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="options" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Opciones de Importación</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="skip-first-row">Omitir primera fila (encabezados)</Label>
                          <Switch
                            id="skip-first-row"
                            checked={importOptions.skipFirstRow}
                            onCheckedChange={(checked) => 
                              setImportOptions(prev => ({ ...prev, skipFirstRow: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="update-existing">Actualizar productos existentes</Label>
                          <Switch
                            id="update-existing"
                            checked={importOptions.updateExisting}
                            onCheckedChange={(checked) => 
                              setImportOptions(prev => ({ ...prev, updateExisting: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="validate-only">Solo validar (no importar)</Label>
                          <Switch
                            id="validate-only"
                            checked={importOptions.validateOnly}
                            onCheckedChange={(checked) => 
                              setImportOptions(prev => ({ ...prev, validateOnly: checked }))
                            }
                          />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label htmlFor="batch-size">Tamaño de lote</Label>
                          <Input
                            id="batch-size"
                            type="number"
                            min="10"
                            max="100"
                            value={importOptions.batchSize}
                            onChange={(e) => 
                              setImportOptions(prev => ({ 
                                ...prev, 
                                batchSize: parseInt(e.target.value) || 50 
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Número de productos a procesar por lote (10-100)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="duplicate-strategy">Estrategia para duplicados</Label>
                          <Select
                            value={importOptions.duplicateStrategy}
                            onValueChange={(value: any) => 
                              setImportOptions(prev => ({ ...prev, duplicateStrategy: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Omitir duplicados</SelectItem>
                              <SelectItem value="update">Actualizar duplicados</SelectItem>
                              <SelectItem value="create_new">Crear nuevos con sufijo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Vista Previa de Datos</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {importOptions.skipFirstRow ? preview.totalRows - 1 : preview.totalRows} filas a procesar
                          </Badge>
                          <Badge variant={preview.validRows > 0 ? 'default' : 'destructive'}>
                            {preview.validRows} válidas
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-60">
                          <div className="text-xs">
                            <div className="grid grid-cols-4 gap-2 font-medium mb-2 p-2 bg-muted rounded">
                              <div>Fila</div>
                              <div>Campo</div>
                              <div>Valor</div>
                              <div>Estado</div>
                            </div>
                            {preview.data.slice(0, 5).map((row, rowIndex) => (
                              <div key={rowIndex} className="space-y-1">
                                {Object.entries(preview.mapping).map(([csvCol, productField]) => {
                                  const colIndex = preview.headers.indexOf(csvCol);
                                  const value = row[colIndex];
                                  const hasError = preview.errors.some(e => 
                                    e.row === rowIndex + 2 && e.column.includes(productField)
                                  );
                                  
                                  return (
                                    <div key={`${rowIndex}-${csvCol}`} className={`grid grid-cols-4 gap-2 p-2 rounded ${
                                      hasError ? 'bg-destructive/10' : 'bg-muted/50'
                                    }`}>
                                      <div>{rowIndex + 2}</div>
                                      <div className="truncate">{productField}</div>
                                      <div className="truncate">{value?.toString() || '-'}</div>
                                      <div>
                                        {hasError ? (
                                          <Badge variant="destructive" className="text-xs">Error</Badge>
                                        ) : (
                                          <Badge variant="default" className="text-xs">OK</Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={preview.validRows === 0 || isImporting}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {importOptions.validateOnly ? 'Validar' : 'Importar'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Import Progress */}
            {currentStep === 'import' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {importOptions.validateOnly ? 'Validando...' : 'Importando...'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={importProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {importMessage}
                    </p>
                    <div className="text-center">
                      <Badge variant="outline">
                        {Math.round(importProgress)}% completado
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Results */}
            {currentStep === 'result' && importResult && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className={`text-lg flex items-center gap-2 ${
                      importResult.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {importResult.success ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                      {importOptions.validateOnly ? 'Validación' : 'Importación'} 
                      {importResult.success ? ' Completada' : ' Fallida'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {importResult.imported}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {importOptions.validateOnly ? 'Válidos' : 'Importados'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {importResult.failed}
                        </div>
                        <div className="text-sm text-muted-foreground">Fallidos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {importResult.duplicates}
                        </div>
                        <div className="text-sm text-muted-foreground">Duplicados</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {importResult.errors.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Errores</div>
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Errores encontrados:</h4>
                        <ScrollArea className="h-32">
                          <div className="space-y-1">
                            {importResult.errors.slice(0, 10).map((error, index) => (
                              <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
                                <span className="font-medium">Fila {error.row}:</span> {error.error}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        {importResult.errors.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => ImportService.exportValidationErrors(importResult.errors)}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Exportar Errores
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={resetDialog}>
                    Nueva Importación
                  </Button>
                  <Button onClick={handleClose}>
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
