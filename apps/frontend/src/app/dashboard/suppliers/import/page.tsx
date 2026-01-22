'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Users,
  ArrowRight,
  Info
} from 'lucide-react';
import api from '@/lib/api';

// Types
interface ImportedSupplier {
  row: number;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  address: string;
  city: string;
  country: string;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  paymentTerms?: string;
  creditLimit?: number;
  discount?: number;
  notes?: string;
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  warnings: number;
  suppliers: ImportedSupplier[];
}

interface ImportProgress {
  stage: 'idle' | 'parsing' | 'validating' | 'importing' | 'completed' | 'error';
  progress: number;
  message: string;
}

const CSV_TEMPLATE_HEADERS = [
  'name',
  'email', 
  'phone',
  'website',
  'address',
  'city',
  'country',
  'category',
  'status',
  'paymentTerms',
  'creditLimit',
  'discount',
  'notes'
];

const SAMPLE_DATA = [
  {
    name: 'TechSupply Corp',
    email: 'contact@techsupply.com',
    phone: '+52 55 1234 5678',
    website: 'https://techsupply.com',
    address: 'Av. Reforma 123',
    city: 'Ciudad de México',
    country: 'México',
    category: 'Tecnología',
    status: 'active',
    paymentTerms: '30 días',
    creditLimit: '50000',
    discount: '15',
    notes: 'Proveedor estratégico de tecnología'
  },
  {
    name: 'Local Materials',
    email: 'info@localmaterials.com',
    phone: '+52 33 9876 5432',
    website: '',
    address: 'Calle Industrial 456',
    city: 'Guadalajara',
    country: 'México',
    category: 'Materiales',
    status: 'active',
    paymentTerms: '60 días',
    creditLimit: '30000',
    discount: '8',
    notes: 'Proveedor local de materiales'
  }
];

export default function ImportSuppliersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [previewData, setPreviewData] = useState<ImportedSupplier[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // File handling
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Error',
          description: 'Por favor selecciona un archivo CSV válido',
          variant: 'destructive',
        });
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'Error',
          description: 'El archivo es demasiado grande. Máximo 10MB permitido',
          variant: 'destructive',
        });
        return;
      }
      
      setFile(selectedFile);
      setImportResult(null);
      setPreviewData([]);
      setShowPreview(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Create a proper ChangeEvent-like object
      const mockEvent = {
        target: { 
          files: [droppedFile] as unknown as FileList,
          value: ''
        },
        currentTarget: null,
        preventDefault: () => {},
        stopPropagation: () => {},
        nativeEvent: {} as Event,
        bubbles: false,
        cancelable: false,
        defaultPrevented: false,
        eventPhase: 0,
        isTrusted: false,
        timeStamp: Date.now(),
        type: 'change',
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
        persist: () => {}
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(mockEvent);
    }
  }, []);

  // CSV parsing
  const parseCSV = (csvText: string): ImportedSupplier[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('El archivo CSV debe contener al menos una fila de encabezados y una fila de datos');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const suppliers: ImportedSupplier[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const supplier: ImportedSupplier = {
        row: i + 1,
        name: '',
        email: '',
        address: '',
        city: '',
        country: '',
        category: '',
        status: 'active',
        errors: [],
        warnings: []
      };

      // Map CSV columns to supplier properties
      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header.toLowerCase()) {
          case 'name':
          case 'nombre':
            supplier.name = value;
            break;
          case 'email':
          case 'correo':
            supplier.email = value;
            break;
          case 'phone':
          case 'telefono':
          case 'teléfono':
            supplier.phone = value;
            break;
          case 'website':
          case 'sitio_web':
            supplier.website = value;
            break;
          case 'address':
          case 'direccion':
          case 'dirección':
            supplier.address = value;
            break;
          case 'city':
          case 'ciudad':
            supplier.city = value;
            break;
          case 'country':
          case 'pais':
          case 'país':
            supplier.country = value;
            break;
          case 'category':
          case 'categoria':
          case 'categoría':
            supplier.category = value;
            break;
          case 'status':
          case 'estado':
            supplier.status = value as 'active' | 'inactive' | 'pending';
            break;
          case 'paymentterms':
          case 'payment_terms':
          case 'terminos_pago':
            supplier.paymentTerms = value;
            break;
          case 'creditlimit':
          case 'credit_limit':
          case 'limite_credito':
            supplier.creditLimit = value ? Number(value) : undefined;
            break;
          case 'discount':
          case 'descuento':
            supplier.discount = value ? Number(value) : undefined;
            break;
          case 'notes':
          case 'notas':
            supplier.notes = value;
            break;
        }
      });

      suppliers.push(supplier);
    }

    return suppliers;
  };

  // Validation
  const validateSupplier = (supplier: ImportedSupplier): void => {
    // Required fields
    if (!supplier.name.trim()) {
      supplier.errors.push('El nombre es requerido');
    }
    if (!supplier.email.trim()) {
      supplier.errors.push('El email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.email)) {
      supplier.errors.push('El formato del email es inválido');
    }
    if (!supplier.address.trim()) {
      supplier.errors.push('La dirección es requerida');
    }
    if (!supplier.city.trim()) {
      supplier.errors.push('La ciudad es requerida');
    }
    if (!supplier.country.trim()) {
      supplier.errors.push('El país es requerido');
    }
    if (!supplier.category.trim()) {
      supplier.errors.push('La categoría es requerida');
    }

    // Status validation
    if (!['active', 'inactive', 'pending'].includes(supplier.status)) {
      supplier.errors.push('El estado debe ser: active, inactive o pending');
    }

    // Optional field validations
    if (supplier.website && !supplier.website.startsWith('http')) {
      supplier.warnings.push('El sitio web debería incluir http:// o https://');
    }
    
    if (supplier.creditLimit && supplier.creditLimit < 0) {
      supplier.errors.push('El límite de crédito no puede ser negativo');
    }
    
    if (supplier.discount && (supplier.discount < 0 || supplier.discount > 100)) {
      supplier.errors.push('El descuento debe estar entre 0 y 100');
    }

    // Warnings
    if (!supplier.phone) {
      supplier.warnings.push('No se proporcionó número de teléfono');
    }
    if (!supplier.paymentTerms) {
      supplier.warnings.push('No se especificaron términos de pago');
    }
  };

  // Preview data
  const previewImport = async () => {
    if (!file) return;

    setProgress({
      stage: 'parsing',
      progress: 25,
      message: 'Analizando archivo CSV...'
    });

    try {
      const csvText = await file.text();
      const suppliers = parseCSV(csvText);

      setProgress({
        stage: 'validating',
        progress: 50,
        message: 'Validando datos...'
      });

      // Validate each supplier
      suppliers.forEach(validateSupplier);

      setPreviewData(suppliers);
      setShowPreview(true);
      
      setProgress({
        stage: 'completed',
        progress: 100,
        message: 'Vista previa lista'
      });

      toast({
        title: 'Vista previa generada',
        description: `Se procesaron ${suppliers.length} registros`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setProgress({
        stage: 'error',
        progress: 0,
        message: 'Error al procesar el archivo'
      });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar el archivo CSV',
        variant: 'destructive',
      });
    }
  };

  // Import data
  const importSuppliers = async () => {
    if (!previewData.length) return;

    const validSuppliers = previewData.filter(s => s.errors.length === 0);
    if (validSuppliers.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay registros válidos para importar',
        variant: 'destructive',
      });
      return;
    }

    setProgress({
      stage: 'importing',
      progress: 0,
      message: 'Importando proveedores...'
    });

    try {
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < validSuppliers.length; i++) {
        const supplier = validSuppliers[i];
        
        try {
          await api.post('/suppliers', {
            name: supplier.name,
            email: supplier.email,
            phone: supplier.phone,
            website: supplier.website,
            address: supplier.address,
            city: supplier.city,
            country: supplier.country,
            category: supplier.category,
            status: supplier.status,
            paymentTerms: supplier.paymentTerms,
            creditLimit: supplier.creditLimit,
            discount: supplier.discount,
            notes: supplier.notes
          });
          
          successful++;
        } catch (error) {
          console.error(`Error importing supplier ${supplier.name}:`, error);
          supplier.errors.push('Error al guardar en la base de datos');
          failed++;
        }

        const progress = ((i + 1) / validSuppliers.length) * 100;
        setProgress({
          stage: 'importing',
          progress,
          message: `Importando ${i + 1} de ${validSuppliers.length}...`
        });
      }

      const result: ImportResult = {
        total: previewData.length,
        successful,
        failed,
        warnings: previewData.filter(s => s.warnings.length > 0).length,
        suppliers: previewData
      };

      setImportResult(result);
      setProgress({
        stage: 'completed',
        progress: 100,
        message: 'Importación completada'
      });

      toast({
        title: 'Importación completada',
        description: `${successful} proveedores importados exitosamente`,
      });
    } catch (error) {
      console.error('Error during import:', error);
      setProgress({
        stage: 'error',
        progress: 0,
        message: 'Error durante la importación'
      });
      toast({
        title: 'Error',
        description: 'Error durante la importación de proveedores',
        variant: 'destructive',
      });
    }
  };

  // Download template
  const downloadTemplate = () => {
    const csvContent = [
      CSV_TEMPLATE_HEADERS.join(','),
      ...SAMPLE_DATA.map(row => 
        CSV_TEMPLATE_HEADERS.map(header => 
          row[header as keyof typeof row] || ''
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_proveedores.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Reset import
  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    setPreviewData([]);
    setShowPreview(false);
    setProgress({
      stage: 'idle',
      progress: 0,
      message: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importación CSV</h1>
          <p className="text-muted-foreground">
            Importa proveedores masivamente desde un archivo CSV
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar Plantilla
          </Button>
          {(file || importResult) && (
            <Button variant="outline" onClick={resetImport}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Nuevo Import
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
          <TabsTrigger value="instructions">Instrucciones</TabsTrigger>
          {showPreview && <TabsTrigger value="preview">Vista Previa</TabsTrigger>}
          {importResult && <TabsTrigger value="results">Resultados</TabsTrigger>}
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {!file ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Seleccionar Archivo CSV
                </CardTitle>
                <CardDescription>
                  Arrastra y suelta tu archivo CSV aquí o haz clic para seleccionar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecciona tu archivo CSV</h3>
                  <p className="text-muted-foreground mb-4">
                    Arrastra y suelta o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Máximo 10MB • Formato CSV únicamente
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Archivo Seleccionado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {progress.stage !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{progress.message}</span>
                      <span className="text-sm text-muted-foreground">{progress.progress}%</span>
                    </div>
                    <Progress value={progress.progress} />
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    onClick={previewImport}
                    disabled={progress.stage === 'parsing' || progress.stage === 'validating'}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Vista Previa
                  </Button>
                  {showPreview && (
                    <Button 
                      onClick={importSuppliers}
                      disabled={progress.stage === 'importing' || previewData.filter(s => s.errors.length === 0).length === 0}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Importar Proveedores
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Instrucciones de Importación</CardTitle>
              <CardDescription>
                Sigue estas instrucciones para preparar tu archivo CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Formato del Archivo</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>El archivo debe estar en formato CSV (valores separados por comas)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>La primera fila debe contener los encabezados de columna</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Codificación UTF-8 recomendada para caracteres especiales</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Tamaño máximo del archivo: 10MB</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-3">Columnas Requeridas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Badge variant="destructive">Obligatorias</Badge>
                    <ul className="text-sm space-y-1">
                      <li>• name (Nombre)</li>
                      <li>• email (Correo electrónico)</li>
                      <li>• address (Dirección)</li>
                      <li>• city (Ciudad)</li>
                      <li>• country (País)</li>
                      <li>• category (Categoría)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="secondary">Opcionales</Badge>
                    <ul className="text-sm space-y-1">
                      <li>• phone (Teléfono)</li>
                      <li>• website (Sitio web)</li>
                      <li>• status (Estado)</li>
                      <li>• paymentTerms (Términos de pago)</li>
                      <li>• creditLimit (Límite de crédito)</li>
                      <li>• discount (Descuento)</li>
                      <li>• notes (Notas)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Valores Válidos</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Status:</strong> active, inactive, pending
                  </div>
                  <div>
                    <strong>Email:</strong> Formato válido (ejemplo@dominio.com)
                  </div>
                  <div>
                    <strong>Website:</strong> URL completa con http:// o https://
                  </div>
                  <div>
                    <strong>Credit Limit:</strong> Número positivo
                  </div>
                  <div>
                    <strong>Discount:</strong> Número entre 0 y 100
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Consejo:</strong> Descarga la plantilla de ejemplo para ver el formato correcto y los datos de muestra.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {showPreview && (
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Vista Previa de Importación</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{previewData.filter(s => s.errors.length === 0).length} Válidos</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{previewData.filter(s => s.errors.length > 0).length} Con errores</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span>{previewData.filter(s => s.warnings.length > 0).length} Con advertencias</span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {previewData.map((supplier, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{supplier.name || `Fila ${supplier.row}`}</h4>
                          <p className="text-sm text-muted-foreground">{supplier.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {supplier.errors.length === 0 ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Válido
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Error
                            </Badge>
                          )}
                          {supplier.warnings.length > 0 && (
                            <Badge variant="secondary">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Advertencia
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                        <div><strong>Ciudad:</strong> {supplier.city}</div>
                        <div><strong>País:</strong> {supplier.country}</div>
                        <div><strong>Categoría:</strong> {supplier.category}</div>
                        <div><strong>Estado:</strong> {supplier.status}</div>
                      </div>

                      {supplier.errors.length > 0 && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-red-600 mb-1">Errores:</p>
                          <ul className="text-sm text-red-600 space-y-1">
                            {supplier.errors.map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {supplier.warnings.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-yellow-600 mb-1">Advertencias:</p>
                          <ul className="text-sm text-yellow-600 space-y-1">
                            {supplier.warnings.map((warning, i) => (
                              <li key={i}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {importResult && (
          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resultados de Importación</CardTitle>
                <CardDescription>
                  Resumen del proceso de importación completado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{importResult.total}</div>
                      <div className="text-sm text-muted-foreground">Total Procesados</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.successful}</div>
                      <div className="text-sm text-muted-foreground">Exitosos</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                      <div className="text-sm text-muted-foreground">Fallidos</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{importResult.warnings}</div>
                      <div className="text-sm text-muted-foreground">Advertencias</div>
                    </CardContent>
                  </Card>
                </div>

                {importResult.successful > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>¡Importación exitosa!</strong> Se importaron {importResult.successful} proveedores correctamente.
                      Puedes verlos en la sección principal de proveedores.
                    </AlertDescription>
                  </Alert>
                )}

                {importResult.failed > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Algunos registros fallaron.</strong> {importResult.failed} proveedores no pudieron ser importados.
                      Revisa los errores en la vista previa y corrige el archivo CSV.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-center">
                  <Button onClick={resetImport}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Realizar Nueva Importación
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}