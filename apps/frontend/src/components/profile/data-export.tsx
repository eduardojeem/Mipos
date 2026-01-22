'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';

interface ExportOptions {
  format: 'json' | 'csv';
  includeProfile: boolean;
  includeActivity: boolean;
  includeSessions: boolean;
  includePreferences: boolean;
  fileName: string;
}

export default function DataExport() {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'json',
    includeProfile: true,
    includeActivity: false,
    includeSessions: false,
    includePreferences: false,
    fileName: 'mi-perfil-exportado'
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateOptions = (): string | null => {
    // Validar que al menos una sección esté seleccionada
    if (!options.includeProfile && !options.includeActivity && 
        !options.includeSessions && !options.includePreferences) {
      return 'Debe seleccionar al menos una sección para exportar';
    }

    // Validar nombre del archivo
    if (!options.fileName.trim()) {
      return 'Debe especificar un nombre para el archivo';
    }

    // Validar caracteres especiales en el nombre del archivo
    const invalidChars = /[<>:"\/\\|?*]/g;
    if (invalidChars.test(options.fileName)) {
      return 'El nombre del archivo contiene caracteres no válidos';
    }

    return null;
  };

  const handleExport = async () => {
    setError(null);
    setSuccess(null);

    // Validar opciones antes de proceder
    const validationError = validateOptions();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setIsExporting(true);

    try {
      // Construir parámetros de consulta
      const params = new URLSearchParams({
        format: options.format,
        includeProfile: options.includeProfile.toString(),
        includeActivity: options.includeActivity.toString(),
        includeSessions: options.includeSessions.toString(),
        includePreferences: options.includePreferences.toString()
      });

      const response = await fetch(`/api/profile/export?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      // Determinar el tipo de contenido y extensión del archivo
      const contentType = response.headers.get('content-type') || '';
      const isCSV = options.format === 'csv' || contentType.includes('text/csv');
      const fileExtension = isCSV ? 'csv' : 'json';
      const fileName = `${options.fileName}.${fileExtension}`;

      // Obtener los datos
      let data: string;
      if (isCSV) {
        data = await response.text();
      } else {
        const jsonData = await response.json();
        data = JSON.stringify(jsonData, null, 2);
      }

      // Crear y descargar el archivo
      const blob = new Blob([data], { 
        type: isCSV ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`Archivo "${fileName}" descargado exitosamente`);
      toast.success(`Datos exportados como ${fileName}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la exportación';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
    // Limpiar mensajes cuando el usuario hace cambios
    if (error || success) {
      setError(null);
      setSuccess(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportar Datos del Perfil
        </CardTitle>
        <CardDescription>
          Descarga una copia de tus datos personales en formato JSON o CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mensajes de estado */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Formato de exportación */}
        <div className="space-y-2">
          <Label htmlFor="format">Formato de exportación</Label>
          <Select 
            value={options.format} 
            onValueChange={(value: 'json' | 'csv') => updateOption('format', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON (recomendado)</SelectItem>
              <SelectItem value="csv">CSV (hoja de cálculo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Secciones a incluir */}
        <div className="space-y-3">
          <Label>Secciones a incluir</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeProfile"
                checked={options.includeProfile}
                onCheckedChange={(checked) => updateOption('includeProfile', !!checked)}
              />
              <Label htmlFor="includeProfile" className="text-sm font-normal">
                Información del perfil (datos básicos y extendidos)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeActivity"
                checked={options.includeActivity}
                onCheckedChange={(checked) => updateOption('includeActivity', !!checked)}
              />
              <Label htmlFor="includeActivity" className="text-sm font-normal">
                Actividad reciente (últimas 100 acciones)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSessions"
                checked={options.includeSessions}
                onCheckedChange={(checked) => updateOption('includeSessions', !!checked)}
              />
              <Label htmlFor="includeSessions" className="text-sm font-normal">
                Sesiones activas (información de dispositivos)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePreferences"
                checked={options.includePreferences}
                onCheckedChange={(checked) => updateOption('includePreferences', !!checked)}
              />
              <Label htmlFor="includePreferences" className="text-sm font-normal">
                Preferencias y configuración
              </Label>
            </div>
          </div>
        </div>

        {/* Nombre del archivo */}
        <div className="space-y-2">
          <Label htmlFor="fileName">Nombre del archivo</Label>
          <Input
            id="fileName"
            type="text"
            value={options.fileName}
            onChange={(e) => updateOption('fileName', e.target.value)}
            placeholder="mi-perfil-exportado"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Se agregará automáticamente la extensión .{options.format}
          </p>
        </div>

        {/* Botón de exportación */}
        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar Datos
            </>
          )}
        </Button>

        {/* Información adicional */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Los datos se exportan en tiempo real desde la base de datos</p>
          <p>• La información de seguridad se incluye automáticamente con el perfil</p>
          <p>• Los archivos CSV son compatibles con Excel y Google Sheets</p>
          <p>• Los archivos JSON mantienen la estructura completa de los datos</p>
        </div>
      </CardContent>
    </Card>
  );
}