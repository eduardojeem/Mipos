import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save, RotateCcw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UnsavedChangesIndicatorProps {
  hasChanges: boolean;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  className?: string;
  showDetailed?: boolean;
}

export function UnsavedChangesIndicator({ 
  hasChanges, 
  onSave, 
  onReset, 
  isSaving = false, 
  className = '',
  showDetailed = true 
}: UnsavedChangesIndicatorProps) {
  if (!hasChanges) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Badge principal */}
      <Badge 
        variant="secondary" 
        className={cn(
          'animate-pulse',
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          'border-yellow-300 dark:border-yellow-700'
        )}
      >
        <AlertCircle className="h-3 w-3 mr-1" />
        Cambios sin guardar
      </Badge>

      {showDetailed && (
        <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <div className="space-y-3">
              <p>Has realizado cambios que aún no han sido guardados.</p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-3 w-3 mr-2" />
                  )}
                  Guardar cambios
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReset}
                  disabled={isSaving}
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                >
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Descartar
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface ThemeSpecificUnsavedIndicatorProps {
  themeChanges: {
    theme?: boolean;
    darkIntensity?: boolean;
    darkTone?: boolean;
    smoothTransitions?: boolean;
    scheduleEnabled?: boolean;
    scheduleStart?: boolean;
    scheduleEnd?: boolean;
  };
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
}

export function ThemeSpecificUnsavedIndicator({ 
  themeChanges, 
  onSave, 
  onReset, 
  isSaving = false 
}: ThemeSpecificUnsavedIndicatorProps) {
  const hasThemeChanges = Object.values(themeChanges).some(Boolean);
  
  if (!hasThemeChanges) return null;

  const getChangeDescription = () => {
    const changes = [];
    
    if (themeChanges.theme) changes.push('tema');
    if (themeChanges.darkIntensity) changes.push('intensidad del modo oscuro');
    if (themeChanges.darkTone) changes.push('tono de color');
    if (themeChanges.smoothTransitions) changes.push('transiciones suaves');
    if (themeChanges.scheduleEnabled) changes.push('programación automática');
    if (themeChanges.scheduleStart || themeChanges.scheduleEnd) changes.push('horarios de programa');
    
    if (changes.length === 0) return '';
    if (changes.length === 1) return `Cambio en ${changes[0]}`;
    if (changes.length === 2) return `Cambios en ${changes.join(' y ')}`;
    return `Cambios en ${changes.slice(0, -1).join(', ')} y ${changes[changes.length - 1]}`;
  };

  return (
    <div className="space-y-2">
      <Badge 
        variant="secondary" 
        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700"
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        {getChangeDescription()}
      </Badge>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onSave}
          disabled={isSaving}
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700 mr-2"></div>
          ) : (
            <Save className="h-3 w-3 mr-2" />
          )}
          Aplicar cambios
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          disabled={isSaving}
          className="text-blue-600 hover:bg-blue-50"
        >
          <RotateCcw className="h-3 w-3 mr-2" />
          Revertir
        </Button>
      </div>
    </div>
  );
}

interface AutoSaveIndicatorProps {
  autoSaveEnabled: boolean;
  lastSaved?: Date;
  isSaving?: boolean;
}

export function AutoSaveIndicator({ autoSaveEnabled, lastSaved, isSaving }: AutoSaveIndicatorProps) {
  if (!autoSaveEnabled) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isSaving ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
          Guardando automáticamente...
        </>
      ) : lastSaved ? (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          Guardado automáticamente {lastSaved.toLocaleTimeString()}
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          Auto-guardado activado
        </>
      )}
    </div>
  );
}