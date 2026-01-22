'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Palette,
  FileText
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export interface CustomTheme {
  id: string;
  name: string;
  description?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    destructive: string;
    border: string;
    input: string;
    ring: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomThemeManagerProps {
  currentTheme: Partial<CustomTheme['colors']>;
  currentSpacing?: CustomTheme['spacing'];
  currentTypography?: CustomTheme['typography'];
  onThemeSelect: (theme: CustomTheme) => void;
  onThemeUpdate: (theme: CustomTheme) => void;
  onThemeDelete: (themeId: string) => void;
  className?: string;
}

export function CustomThemeManager({
  currentTheme,
  currentSpacing = {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem'
  },
  currentTypography = {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem'
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  onThemeSelect,
  onThemeUpdate,
  onThemeDelete,
  className
}: CustomThemeManagerProps) {
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [editingTheme, setEditingTheme] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');

  // Cargar temas guardados al montar
  const loadSavedThemes = useCallback(() => {
    try {
      const saved = localStorage.getItem('customThemes');
      if (saved) {
        const parsed = JSON.parse(saved);
        setThemes(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading themes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los temas personalizados',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Guardar temas en localStorage
  const saveThemes = useCallback((updatedThemes: CustomTheme[]) => {
    try {
      localStorage.setItem('customThemes', JSON.stringify(updatedThemes));
      setThemes(updatedThemes);
    } catch (error) {
      console.error('Error saving themes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Crear nuevo tema basado en la configuración actual
  const createTheme = useCallback(() => {
    if (!newThemeName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del tema es requerido',
        variant: 'destructive'
      });
      return;
    }

    const newTheme: CustomTheme = {
      id: `theme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newThemeName.trim(),
      description: newThemeDescription.trim() || undefined,
      colors: {
        primary: currentTheme.primary || '#3b82f6',
        secondary: currentTheme.secondary || '#64748b',
        accent: currentTheme.accent || '#f59e0b',
        background: currentTheme.background || '#ffffff',
        foreground: currentTheme.foreground || '#020617',
        muted: currentTheme.muted || '#f1f5f9',
        destructive: currentTheme.destructive || '#ef4444',
        border: currentTheme.border || '#e2e8f0',
        input: currentTheme.input || '#ffffff',
        ring: currentTheme.ring || '#3b82f6'
      },
      spacing: currentSpacing,
      typography: currentTypography,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedThemes = [...themes, newTheme];
    saveThemes(updatedThemes);
    
    setNewThemeName('');
    setNewThemeDescription('');
    setIsCreating(false);
    
    toast({
      title: 'Éxito',
      description: `Tema "${newTheme.name}" creado exitosamente`
    });
  }, [newThemeName, newThemeDescription, currentTheme, currentSpacing, currentTypography, themes, saveThemes, toast]);

  // Actualizar tema existente
  const updateTheme = useCallback((themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    const updatedTheme: CustomTheme = {
      ...theme,
      name: editName.trim() || theme.name,
      description: editDescription.trim() || undefined,
      colors: {
        primary: currentTheme.primary || theme.colors.primary,
        secondary: currentTheme.secondary || theme.colors.secondary,
        accent: currentTheme.accent || theme.colors.accent,
        background: currentTheme.background || theme.colors.background,
        foreground: currentTheme.foreground || theme.colors.foreground,
        muted: currentTheme.muted || theme.colors.muted,
        destructive: currentTheme.destructive || theme.colors.destructive,
        border: currentTheme.border || theme.colors.border,
        input: currentTheme.input || theme.colors.input,
        ring: currentTheme.ring || theme.colors.ring
      },
      spacing: currentSpacing || theme.spacing,
      typography: currentTypography || theme.typography,
      updatedAt: new Date().toISOString()
    };

    const updatedThemes = themes.map(t => t.id === themeId ? updatedTheme : t);
    saveThemes(updatedThemes);
    onThemeUpdate(updatedTheme);
    
    setEditingTheme(null);
    setEditName('');
    setEditDescription('');
    
    toast({
      title: 'Éxito',
      description: `Tema "${updatedTheme.name}" actualizado`
    });
  }, [themes, editName, editDescription, currentTheme, currentSpacing, currentTypography, saveThemes, onThemeUpdate, toast]);

  // Eliminar tema
  const deleteTheme = useCallback((themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    if (window.confirm(`¿Estás seguro de que quieres eliminar el tema "${theme.name}"?`)) {
      const updatedThemes = themes.filter(t => t.id !== themeId);
      saveThemes(updatedThemes);
      onThemeDelete(themeId);
      
      toast({
        title: 'Éxito',
        description: `Tema "${theme.name}" eliminado`,
        variant: 'default'
      });
    }
  }, [themes, saveThemes, onThemeDelete, toast]);

  // Exportar tema
  const exportTheme = useCallback((theme: CustomTheme) => {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        theme: theme
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Éxito',
        description: `Tema "${theme.name}" exportado`
      });
    } catch (error) {
      console.error('Error exporting theme:', error);
      toast({
        title: 'Error',
        description: 'No se pudo exportar el tema',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Importar tema
  const importTheme = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const importData = JSON.parse(content);
          
          if (!importData.theme || !importData.theme.name) {
            throw new Error('Archivo de tema inválido');
          }
          
          const newTheme: CustomTheme = {
            ...importData.theme,
            id: `theme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          const updatedThemes = [...themes, newTheme];
          saveThemes(updatedThemes);
          
          toast({
            title: 'Éxito',
            description: `Tema "${newTheme.name}" importado exitosamente`
          });
        } catch (error) {
          console.error('Error importing theme:', error);
          toast({
            title: 'Error',
            description: 'No se pudo importar el tema. El archivo puede estar corrupto.',
            variant: 'destructive'
          });
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }, [themes, saveThemes, toast]);

  // Iniciar edición
  const startEdit = useCallback((theme: CustomTheme) => {
    setEditingTheme(theme.id);
    setEditName(theme.name);
    setEditDescription(theme.description || '');
  }, []);

  // Cancelar edición
  const cancelEdit = useCallback(() => {
    setEditingTheme(null);
    setEditName('');
    setEditDescription('');
  }, []);

  // Cargar temas al montar
  useState(() => {
    loadSavedThemes();
  });

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Temas Personalizados
        </CardTitle>
        <CardDescription>
          Crea, gestiona y comparte configuraciones de temas personalizadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controles principales */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setIsCreating(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Guardar como tema
          </Button>
          <Button
            onClick={importTheme}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar tema
          </Button>
        </div>

        {/* Formulario de creación */}
        {isCreating && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Nuevo Tema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme-name">Nombre del tema *</Label>
                <Input
                  id="theme-name"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="Ej: Tema Corporativo"
                  className="max-w-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-description">Descripción (opcional)</Label>
                <Input
                  id="theme-description"
                  value={newThemeDescription}
                  onChange={(e) => setNewThemeDescription(e.target.value)}
                  placeholder="Describe las características de este tema"
                  className="max-w-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={createTheme}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Crear tema
                </Button>
                <Button
                  onClick={() => setIsCreating(false)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de temas */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Temas guardados ({themes.length})
          </h3>
          
          {themes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay temas personalizados guardados aún
            </p>
          ) : (
            <div className="space-y-2">
              {themes.map((theme) => (
                <Card key={theme.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {editingTheme === theme.id ? (
                        <div className="space-y-3">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nombre del tema"
                            className="max-w-sm"
                          />
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Descripción (opcional)"
                            className="max-w-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => updateTheme(theme.id)}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Check className="h-3 w-3" />
                              Guardar
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <X className="h-3 w-3" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{theme.name}</h4>
                            {theme.description && (
                              <span className="text-sm text-muted-foreground">
                                - {theme.description}
                              </span>
                            )}
                          </div>
                          
                          {/* Vista previa de colores */}
                          <div className="flex gap-1 mt-2">
                            {Object.entries(theme.colors).slice(0, 6).map(([key, color]) => (
                              <div
                                key={key}
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: color }}
                                title={key}
                              />
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <span>Creado: {new Date(theme.createdAt).toLocaleDateString()}</span>
                            {theme.updatedAt !== theme.createdAt && (
                              <span>• Actualizado: {new Date(theme.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {editingTheme !== theme.id && (
                      <div className="flex gap-1">
                        <Button
                          onClick={() => onThemeSelect(theme)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                        >
                          Aplicar
                        </Button>
                        <Button
                          onClick={() => startEdit(theme)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => exportTheme(theme)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => deleteTheme(theme.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
