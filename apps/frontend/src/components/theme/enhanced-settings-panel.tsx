'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Palette, 
  Type, 
  Layers, 
  Calendar, 
  Save, 
  RotateCcw,
  Download,
  Upload,
  Settings as SettingsIcon,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { ColorPicker, ColorPaletteSelector } from './color-picker';
import { CustomThemeManager, CustomTheme } from '@/components/theme/custom-theme-manager';
import { TypographySelector, TypographyConfig, useTypographyDefaults } from '@/components/theme/typography-selector';
import { SpacingControls, SpacingConfig, useSpacingDefaults } from '@/components/theme/spacing-controls';
import { SeasonalThemesManager } from '@/components/theme/seasonal-themes-manager';
import { useCustomThemes } from '@/hooks/use-custom-themes';
import { themeService } from '@/lib/theme/theme-service';

export interface SettingsPanelProps {
  className?: string;
}

export interface ThemeSettings {
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
  typography: TypographyConfig;
  spacing: SpacingConfig;
  mode: 'light' | 'dark' | 'auto';
  autoMode: {
    enabled: boolean;
    lightTime: string;
    darkTime: string;
  };
}

const BASE_DEFAULT_SETTINGS: Omit<ThemeSettings, 'typography' | 'spacing'> = {
  colors: {
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
  },
  mode: 'light',
  autoMode: {
    enabled: false,
    lightTime: '06:00',
    darkTime: '18:00'
  }
};

function useDefaultSettings(): ThemeSettings {
  const typography = useTypographyDefaults();
  const spacing = useSpacingDefaults();
  return {
    ...BASE_DEFAULT_SETTINGS,
    typography,
    spacing
  };
}

export function EnhancedSettingsPanel({ className }: SettingsPanelProps) {
  const defaultSettings = useDefaultSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('colors');
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Custom themes hook
  const {
    themes: customThemes,
    activeTheme: activeCustomTheme,
    applyTheme: applyCustomTheme,
    deactivateTheme: deactivateCustomTheme,
    createTheme: createCustomTheme,
    updateTheme: updateCustomTheme,
    deleteTheme: deleteCustomTheme,
    exportTheme: exportCustomTheme,
    importTheme: importCustomTheme
  } = useCustomThemes({
    onThemeChange: (theme) => {
      if (theme) {
        // Apply custom theme to current settings
        setSettings(prev => ({
          ...prev,
          colors: theme.colors,
          typography: theme.typography,
          spacing: theme.spacing
        }));
      }
    }
  });

  // Filter settings based on search term
  const filteredSettings = useMemo(() => {
    if (!searchTerm) return settings;
    
    const term = searchTerm.toLowerCase();
    return {
      ...settings,
      colors: Object.fromEntries(
        Object.entries(settings.colors).filter(([key]) => 
          key.toLowerCase().includes(term)
        )
      )
    };
  }, [settings, searchTerm]);

  // Load saved settings
  const loadSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('themeSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar la configuración guardada',
        variant: 'destructive'
      });
    }
  }, [defaultSettings, toast]);

  // Save settings
  const saveSettings = useCallback(async () => {
    try {
      localStorage.setItem('themeSettings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      
      // Persist theme options (basic subset compatible with ThemeService)
      const theme = settings.mode === 'auto' ? 'system' : (settings.mode === 'dark' ? 'dark' : 'light');
      await themeService.persistThemeOptions({
        theme,
        smoothTransitions: true,
        scheduleEnabled: settings.autoMode.enabled,
        scheduleStart: settings.autoMode.lightTime,
        scheduleEnd: settings.autoMode.darkTime
      });
      
      toast({
        title: 'Éxito',
        description: 'Configuración guardada y aplicada'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive'
      });
    }
  }, [settings, toast]);

  // Reset settings
  const resetSettings = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres restablecer todos los valores predeterminados?')) {
      setSettings(defaultSettings);
      setHasUnsavedChanges(true);
      
      // Deactivate any active custom theme
      if (activeCustomTheme) {
        deactivateCustomTheme();
      }
      
      toast({
        title: 'Restablecido',
        description: 'Configuración restablecida a valores predeterminados'
      });
    }
  }, [activeCustomTheme, deactivateCustomTheme, toast, defaultSettings]);

  // Export settings
  const exportSettings = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        settings: settings,
        customThemes: customThemes
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Éxito',
        description: 'Configuración exportada exitosamente'
      });
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo exportar la configuración',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  }, [settings, customThemes, toast]);

  // Import settings
  const importSettings = useCallback(async () => {
    setIsImporting(true);
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        setIsImporting(false);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const importData = JSON.parse(content);
          
          if (!importData.settings) {
            throw new Error('Archivo de configuración inválido');
          }
          
          // Import settings
          setSettings({ ...defaultSettings, ...importData.settings });
          
          // Import custom themes if available
          if (importData.customThemes && Array.isArray(importData.customThemes)) {
            for (const theme of importData.customThemes) {
              await createCustomTheme(theme);
            }
          }
          
          setHasUnsavedChanges(true);
          
          toast({
            title: 'Éxito',
            description: 'Configuración importada exitosamente'
          });
        } catch (error) {
          console.error('Error importing settings:', error);
          toast({
            title: 'Error',
            description: 'No se pudo importar la configuración',
            variant: 'destructive'
          });
        } finally {
          setIsImporting(false);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }, [createCustomTheme, toast, defaultSettings]);

  // Handle color changes
  const handleColorChange = useCallback((colorKey: keyof ThemeSettings['colors'], value: string) => {
    setSettings(prev => ({
      ...prev,
      colors: { ...prev.colors, [colorKey]: value }
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle typography changes
  const handleTypographyChange = useCallback((typography: TypographyConfig) => {
    setSettings(prev => ({ ...prev, typography }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle spacing changes
  const handleSpacingChange = useCallback((spacing: SpacingConfig) => {
    setSettings(prev => ({ ...prev, spacing }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle mode changes
  const handleModeChange = useCallback((mode: 'light' | 'dark' | 'auto') => {
    setSettings(prev => ({ ...prev, mode }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle auto mode changes
  const handleAutoModeChange = useCallback((updates: Partial<ThemeSettings['autoMode']>) => {
    setSettings(prev => ({
      ...prev,
      autoMode: { ...prev.autoMode, ...updates }
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Watch for changes in settings
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(defaultSettings);
    setHasUnsavedChanges(hasChanges);
  }, [settings, defaultSettings]);

  const tabs = [
    { id: 'colors', label: 'Colores', icon: Palette },
    { id: 'typography', label: 'Tipografía', icon: Type },
    { id: 'spacing', label: 'Espaciado', icon: Layers },
    { id: 'themes', label: 'Temas', icon: SettingsIcon },
    { id: 'seasonal', label: 'Estacional', icon: Calendar }
  ];

  const filteredTabs = tabs.filter(tab => 
    searchTerm === '' || tab.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuración de Apariencia</h2>
          <p className="text-muted-foreground">
            Personaliza la apariencia de tu aplicación
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar configuración..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Button
            onClick={importSettings}
            variant="outline"
            size="sm"
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          
          <Button
            onClick={exportSettings}
            variant="outline"
            size="sm"
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          
          <Button
            onClick={resetSettings}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </Button>
          
          <Button
            onClick={saveSettings}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="font-medium text-yellow-800">Cambios sin guardar</div>
              <div className="text-sm text-yellow-700">
                Tienes cambios pendientes. No se olvide de guardar para aplicar los cambios.
              </div>
            </div>
          </div>
          <Button
            onClick={saveSettings}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Guardar ahora
          </Button>
        </div>
      )}

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 lg:grid-cols-5 gap-2">
          {filteredTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ColorPaletteSelector
              colors={settings.colors}
              onColorsChange={(colors: ThemeSettings['colors']) => setSettings(prev => ({ ...prev, colors }))}
              title="Paleta de colores"
              description="Selecciona colores para tu tema personalizado"
            />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Colores individuales</h3>
              {Object.entries(settings.colors).map(([key, value]) => (
                <ColorPicker
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={value}
                  onChange={(newValue: string) => handleColorChange(key as keyof ThemeSettings['colors'], newValue)}
                  className="w-full"
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography">
          <TypographySelector
            value={settings.typography}
            onChange={handleTypographyChange}
          />
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing">
          <SpacingControls
            value={settings.spacing}
            onChange={handleSpacingChange}
          />
        </TabsContent>

        {/* Themes Tab */}
        <TabsContent value="themes" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <CustomThemeManager
              currentTheme={settings.colors}
              currentSpacing={settings.spacing}
              currentTypography={settings.typography}
              onThemeSelect={async (theme) => {
                setSettings(prev => ({
                  ...prev,
                  colors: theme.colors,
                  typography: theme.typography,
                  spacing: theme.spacing
                }));
                applyCustomTheme(theme);
              }}
              onThemeUpdate={(theme) => updateCustomTheme(theme.id, theme)}
              onThemeDelete={deleteCustomTheme}
            />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Configuración actual
                </CardTitle>
                <CardDescription>
                  Vista previa de tu configuración actual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Modo de tema</Label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleModeChange('light')}
                      variant={settings.mode === 'light' ? 'default' : 'outline'}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Sun className="h-4 w-4" />
                      Claro
                    </Button>
                    <Button
                      onClick={() => handleModeChange('dark')}
                      variant={settings.mode === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Moon className="h-4 w-4" />
                      Oscuro
                    </Button>
                    <Button
                      onClick={() => handleModeChange('auto')}
                      variant={settings.mode === 'auto' ? 'default' : 'outline'}
                      size="sm"
                    >
                      Automático
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Cambio automático</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={settings.autoMode.lightTime}
                      onChange={(e) => handleAutoModeChange({ lightTime: e.target.value })}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={settings.autoMode.darkTime}
                      onChange={(e) => handleAutoModeChange({ darkTime: e.target.value })}
                      className="w-32"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Seasonal Tab */}
        <TabsContent value="seasonal">
          <SeasonalThemesManager
            onThemeActivate={applyCustomTheme}
            onThemeDeactivate={deactivateCustomTheme}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function useSettingsSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    
    const term = searchTerm.toLowerCase();
    const results = [];
    
    // Search in colors
    const colorMatches = Object.keys(BASE_DEFAULT_SETTINGS.colors).filter(key => 
      key.toLowerCase().includes(term)
    );
    if (colorMatches.length > 0) {
      results.push({ category: 'Colores', matches: colorMatches.length });
    }
    
    // Search in typography
    if ('tipografía'.includes(term) || 'typography'.includes(term)) {
      results.push({ category: 'Tipografía', matches: 1 });
    }
    
    // Search in spacing
    if ('espaciado'.includes(term) || 'spacing'.includes(term)) {
      results.push({ category: 'Espaciado', matches: 1 });
    }
    
    // Search in themes
    if ('temas'.includes(term) || 'themes'.includes(term)) {
      results.push({ category: 'Temas', matches: 1 });
    }
    
    // Search in seasonal
    if ('estacional'.includes(term) || 'seasonal'.includes(term)) {
      results.push({ category: 'Estacional', matches: 1 });
    }
    
    return results;
  }, [searchTerm]);
  
  return {
    searchTerm,
    setSearchTerm,
    searchResults
  };
}
