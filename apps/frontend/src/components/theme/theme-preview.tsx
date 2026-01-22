import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  RotateCcw, 
  Save, 
  Eye,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { themeService, type ThemeOptions } from '@/lib/theme/theme-service';
import { useToast } from '@/components/ui/use-toast';

interface ThemePreviewProps {
  currentSettings: ThemeOptions;
  onSettingsChange: (settings: ThemeOptions) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  hasChanges: boolean;
}

export function ThemePreview({ 
  currentSettings, 
  onSettingsChange, 
  onSave, 
  onReset, 
  hasChanges 
}: ThemePreviewProps) {
  const { toast } = useToast();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSettings, setPreviewSettings] = useState<ThemeOptions | null>(null);
  const [originalSettings, setOriginalSettings] = useState<ThemeOptions | null>(null);

  // Aplicar vista previa cuando cambian los settings
  useEffect(() => {
    if (isPreviewing) {
      themeService.applyThemeOptions(currentSettings);
    }
  }, [currentSettings, isPreviewing]);

  const handlePreviewToggle = () => {
    if (isPreviewing) {
      // Restaurar settings originales
      if (originalSettings) {
        themeService.applyThemeOptions(originalSettings);
        onSettingsChange(originalSettings);
      }
      setIsPreviewing(false);
      setPreviewSettings(null);
      toast({
        title: 'Vista previa desactivada',
        description: 'Se restauró la configuración original',
        variant: 'default'
      });
    } else {
      // Guardar settings originales y activar preview
      const stored = themeService.getStoredThemeOptions();
      if (stored) {
        setOriginalSettings(stored);
      }
      setIsPreviewing(true);
      setPreviewSettings(currentSettings);
      themeService.applyThemeOptions(currentSettings);
      toast({
        title: 'Vista previa activada',
        description: 'Los cambios se aplican en tiempo real',
        variant: 'default'
      });
    }
  };

  const handleSave = async () => {
    try {
      await onSave();
      setIsPreviewing(false);
      setOriginalSettings(null);
      toast({
        title: 'Configuración guardada',
        description: 'Los cambios se han guardado correctamente',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error al guardar',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive'
      });
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      themeService.applyThemeOptions(originalSettings);
      onSettingsChange(originalSettings);
    }
    onReset();
    setIsPreviewing(false);
    setOriginalSettings(null);
    toast({
      title: 'Configuración restaurada',
      description: 'Se han restaurado los valores por defecto',
      variant: 'default'
    });
  };

  const getThemeDescription = () => {
    const { theme, darkIntensity, darkTone, smoothTransitions, scheduleEnabled, scheduleStart, scheduleEnd } = currentSettings;
    
    const parts = [];
    
    // Tema base
    switch (theme) {
      case 'light':
        parts.push('Tema claro');
        break;
      case 'dark':
        parts.push('Tema oscuro');
        if (darkIntensity) {
          parts.push(`${getIntensityLabel(darkIntensity)}`);
        }
        if (darkTone) {
          parts.push(`tono ${getToneLabel(darkTone)}`);
        }
        break;
      case 'system':
        parts.push('Tema del sistema');
        break;
    }

    if (smoothTransitions) {
      parts.push('con transiciones suaves');
    }

    if (scheduleEnabled && scheduleStart && scheduleEnd) {
      parts.push(`programado (${scheduleStart}-${scheduleEnd})`);
    }

    return parts.join(', ');
  };

  const getIntensityLabel = (intensity: string) => {
    switch (intensity) {
      case 'dim': return 'suave';
      case 'normal': return 'normal';
      case 'black': return 'negro puro';
      default: return intensity;
    }
  };

  const getToneLabel = (tone: string) => {
    switch (tone) {
      case 'blue': return 'azulado';
      case 'gray': return 'gris';
      case 'pure': return 'monocromo';
      default: return tone;
    }
  };

  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <CardTitle>Vista Previa del Tema</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="animate-pulse">
                <AlertCircle className="h-3 w-3 mr-1" />
                Cambios sin guardar
              </Badge>
            )}
            {isPreviewing && (
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Preview activo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Estado actual */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Configuración actual:</h4>
          <p className="text-sm text-muted-foreground">{getThemeDescription()}</p>
        </div>

        {/* Controles de preview */}
        <div className="flex gap-2">
          <Button
            variant={isPreviewing ? "secondary" : "outline"}
            onClick={handlePreviewToggle}
            className="flex-1"
          >
            {isPreviewing ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Desactivar Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </>
            )}
          </Button>
          
          <Button
            variant="default"
            onClick={handleSave}
            disabled={!hasChanges || isPreviewing}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>

        {/* Reset */}
        <Button
          variant="ghost"
          onClick={handleReset}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Valores por Defecto
        </Button>

        {/* Información */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            La vista previa aplica los cambios temporalmente para que puedas ver cómo se verá el tema antes de guardar.
          </AlertDescription>
        </Alert>

        {/* Ejemplos visuales */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="p-3 bg-background border rounded-lg text-center">
            <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
            <span className="text-xs text-muted-foreground">Color primario</span>
          </div>
          <div className="p-3 bg-background border rounded-lg text-center">
            <div className="w-8 h-8 bg-secondary rounded mx-auto mb-2"></div>
            <span className="text-xs text-muted-foreground">Color secundario</span>
          </div>
          <div className="p-3 bg-background border rounded-lg text-center">
            <div className="w-8 h-8 bg-muted rounded mx-auto mb-2"></div>
            <span className="text-xs text-muted-foreground">Color de fondo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}