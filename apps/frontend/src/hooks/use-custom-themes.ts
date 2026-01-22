'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { CustomTheme } from '@/components/theme/custom-theme-manager';

export interface UseCustomThemesOptions {
  onThemeChange?: (theme: CustomTheme | null) => void;
  autoSave?: boolean;
}

export function useCustomThemes(options: UseCustomThemesOptions = {}) {
  const { onThemeChange, autoSave = true } = options;
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [activeTheme, setActiveTheme] = useState<CustomTheme | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar temas desde localStorage
  const loadThemes = useCallback(async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Guardar temas en localStorage
  const saveThemes = useCallback(async (updatedThemes: CustomTheme[]) => {
    try {
      localStorage.setItem('customThemes', JSON.stringify(updatedThemes));
      setThemes(updatedThemes);
      
      if (autoSave) {
        toast({
          title: 'Éxito',
          description: 'Cambios guardados automáticamente'
        });
      }
    } catch (error) {
      console.error('Error saving themes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive'
      });
    }
  }, [toast, autoSave]);

  // Aplicar tema
  const applyTheme = useCallback((theme: CustomTheme) => {
    try {
      setActiveTheme(theme);
      
      // Aplicar colores al CSS root
      const root = document.documentElement;
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
      
      // Aplicar espaciado
      Object.entries(theme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
      
      // Aplicar tipografía
      if (theme.typography.fontFamily) {
        root.style.setProperty('--font-family', theme.typography.fontFamily);
      }
      
      Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value);
      });
      
      Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
        root.style.setProperty(`--line-height-${key}`, value);
      });
      
      // Guardar tema activo
      localStorage.setItem('activeCustomTheme', JSON.stringify(theme));
      
      onThemeChange?.(theme);
      
      toast({
        title: 'Éxito',
        description: `Tema "${theme.name}" aplicado exitosamente`
      });
    } catch (error) {
      console.error('Error applying theme:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aplicar el tema',
        variant: 'destructive'
      });
    }
  }, [onThemeChange, toast]);

  // Desactivar tema personalizado
  const deactivateTheme = useCallback(() => {
    try {
      setActiveTheme(null);
      localStorage.removeItem('activeCustomTheme');
      
      // Restablecer variables CSS a valores por defecto
      const root = document.documentElement;
      
      // Restablecer colores
      const defaultColors = {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        background: '#ffffff',
        foreground: '#020617',
        muted: '#f1f5f9',
        destructive: '#ef4444',
        border: '#e2e8f0',
        input: '#ffffff',
        ring: '#3b82f6'
      };
      
      Object.entries(defaultColors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
      
      // Restablecer espaciado
      const defaultSpacing = {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem'
      };
      
      Object.entries(defaultSpacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
      
      // Restablecer tipografía
      root.style.setProperty('--font-family', 'Inter, system-ui, sans-serif');
      
      const defaultFontSizes = {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem'
      };
      
      Object.entries(defaultFontSizes).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value);
      });
      
      const defaultLineHeights = {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75'
      };
      
      Object.entries(defaultLineHeights).forEach(([key, value]) => {
        root.style.setProperty(`--line-height-${key}`, value);
      });
      
      onThemeChange?.(null);
      
      toast({
        title: 'Éxito',
        description: 'Tema personalizado desactivado'
      });
    } catch (error) {
      console.error('Error deactivating theme:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desactivar el tema',
        variant: 'destructive'
      });
    }
  }, [onThemeChange, toast]);

  // Crear nuevo tema
  const createTheme = useCallback(async (themeData: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTheme: CustomTheme = {
        ...themeData,
        id: `theme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedThemes = [...themes, newTheme];
      await saveThemes(updatedThemes);
      
      toast({
        title: 'Éxito',
        description: `Tema "${newTheme.name}" creado exitosamente`
      });
      
      return newTheme;
    } catch (error) {
      console.error('Error creating theme:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el tema',
        variant: 'destructive'
      });
      throw error;
    }
  }, [themes, saveThemes, toast]);

  // Actualizar tema existente
  const updateTheme = useCallback(async (themeId: string, updates: Partial<CustomTheme>) => {
    try {
      const updatedThemes = themes.map(theme => 
        theme.id === themeId 
          ? { ...theme, ...updates, updatedAt: new Date().toISOString() }
          : theme
      );
      
      await saveThemes(updatedThemes);
      
      // Si el tema actualizado es el activo, actualizarlo también
      if (activeTheme?.id === themeId) {
        const updatedTheme = updatedThemes.find(t => t.id === themeId);
        if (updatedTheme) {
          applyTheme(updatedTheme);
        }
      }
      
      toast({
        title: 'Éxito',
        description: 'Tema actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el tema',
        variant: 'destructive'
      });
      throw error;
    }
  }, [themes, activeTheme, saveThemes, applyTheme, toast]);

  // Eliminar tema
  const deleteTheme = useCallback(async (themeId: string) => {
    try {
      const themeToDelete = themes.find(t => t.id === themeId);
      if (!themeToDelete) return;
      
      const updatedThemes = themes.filter(theme => theme.id !== themeId);
      await saveThemes(updatedThemes);
      
      // Si el tema eliminado era el activo, desactivarlo
      if (activeTheme?.id === themeId) {
        deactivateTheme();
      }
      
      toast({
        title: 'Éxito',
        description: `Tema "${themeToDelete.name}" eliminado`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el tema',
        variant: 'destructive'
      });
      throw error;
    }
  }, [themes, activeTheme, saveThemes, deactivateTheme, toast]);

  // Exportar tema
  const exportTheme = useCallback(async (theme: CustomTheme) => {
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
      throw error;
    }
  }, [toast]);

  // Importar tema
  const importTheme = useCallback(async () => {
    return new Promise<CustomTheme | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = async (event) => {
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
            await saveThemes(updatedThemes);
            
            toast({
              title: 'Éxito',
              description: `Tema "${newTheme.name}" importado exitosamente`
            });
            
            resolve(newTheme);
          } catch (error) {
            console.error('Error importing theme:', error);
            toast({
              title: 'Error',
              description: 'No se pudo importar el tema. El archivo puede estar corrupto.',
              variant: 'destructive'
            });
            resolve(null);
          }
        };
        
        reader.readAsText(file);
      };
      
      input.click();
    });
  }, [themes, saveThemes, toast]);

  // Cargar tema activo guardado
  const loadActiveTheme = useCallback(async () => {
    try {
      const saved = localStorage.getItem('activeCustomTheme');
      if (saved) {
        const theme = JSON.parse(saved);
        applyTheme(theme);
      }
    } catch (error) {
      console.error('Error loading active theme:', error);
    }
  }, [applyTheme]);

  // Inicializar al montar
  useEffect(() => {
    loadThemes();
    loadActiveTheme();
  }, [loadThemes, loadActiveTheme]);

  return {
    themes,
    activeTheme,
    isLoading,
    
    // Actions
    applyTheme,
    deactivateTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    exportTheme,
    importTheme,
    loadThemes,
    saveThemes
  };
}
