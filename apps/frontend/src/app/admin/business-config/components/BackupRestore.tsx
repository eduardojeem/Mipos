'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Upload, 
  History, 
  Save, 
  RotateCcw,
  FileText,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { BusinessConfig } from '@/types/business-config';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BackupRestoreProps {
  config: BusinessConfig;
  onRestore: (config: BusinessConfig) => Promise<void>;
  onReset: () => Promise<void>;
}

interface BackupFile {
  config: BusinessConfig;
  metadata: {
    version: string;
    timestamp: string;
    userAgent: string;
    businessName: string;
  };
}

/**
 * Componente para backup y restore de configuración
 * - Exportar configuración como JSON
 * - Importar configuración desde archivo
 * - Historial de cambios
 * - Reset a valores por defecto
 */
export function BackupRestore({ config, onRestore, onReset }: BackupRestoreProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const createBackup = (): BackupFile => {
    return {
      config,
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        businessName: config.businessName || 'Sin nombre'
      }
    };
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const backup = createBackup();
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `business-config-${format(new Date(), 'yyyy-MM-dd-HHmm', { locale: es })}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Backup exportado",
        description: "La configuración se ha descargado correctamente.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error al exportar",
        description: "No se pudo crear el archivo de backup.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      
      const text = await file.text();
      const backup: BackupFile = JSON.parse(text);
      
      // Validar estructura del backup
      if (!backup.config || !backup.metadata) {
        throw new Error('Archivo de backup inválido');
      }

      // Confirmar restauración
      const confirmed = confirm(
        `¿Restaurar configuración desde backup?\n\n` +
        `Negocio: ${backup.metadata.businessName}\n` +
        `Fecha: ${format(new Date(backup.metadata.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })}\n\n` +
        `Esta acción sobrescribirá la configuración actual.`
      );

      if (!confirmed) return;

      await onRestore(backup.config);
      
      toast({
        title: "Configuración restaurada",
        description: `Backup del ${format(new Date(backup.metadata.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })} aplicado correctamente.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error al importar",
        description: "No se pudo restaurar el archivo de backup. Verifique que sea un archivo válido.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleReset = async () => {
    const confirmed = confirm(
      '¿Resetear toda la configuración a valores por defecto?\n\n' +
      'Esta acción no se puede deshacer y eliminará toda la configuración personalizada.'
    );

    if (!confirmed) return;

    try {
      setIsResetting(true);
      await onReset();
      
      toast({
        title: "Configuración reseteada",
        description: "Todos los valores han sido restaurados a los valores por defecto.",
      });
    } catch (error) {
      console.error('Reset error:', error);
      toast({
        title: "Error al resetear",
        description: "No se pudo resetear la configuración.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export/Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Backup y Restauración
          </CardTitle>
          <CardDescription>
            Exporta tu configuración como respaldo o importa una configuración previa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium">Exportar Configuración</h4>
              </div>
              <p className="text-sm text-slate-600">
                Descarga un archivo JSON con toda tu configuración actual
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full gap-2"
                variant="outline"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Descargar Backup
                  </>
                )}
              </Button>
            </div>

            {/* Import */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-green-500" />
                <h4 className="font-medium">Importar Configuración</h4>
              </div>
              <p className="text-sm text-slate-600">
                Restaura una configuración desde un archivo de backup
              </p>
              <label className="block">
                <Button
                  disabled={isImporting}
                  className="w-full gap-2"
                  variant="outline"
                  asChild
                >
                  <span>
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Seleccionar Archivo
                      </>
                    )}
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  disabled={isImporting}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Config Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-sm font-medium">Negocio</p>
                <p className="text-sm text-slate-600">{config.businessName || 'Sin nombre'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-sm font-medium">Última modificación</p>
                <p className="text-sm text-slate-600">
                  {format(new Date(config.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Estado</p>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Configurado
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Zona de Peligro
          </CardTitle>
          <CardDescription>
            Acciones irreversibles que afectarán toda la configuración
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-100">Resetear Configuración</h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                Restaura todos los valores a la configuración por defecto
              </p>
            </div>
            <Button
              onClick={handleReset}
              disabled={isResetting}
              variant="destructive"
              className="gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reseteando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Resetear Todo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}