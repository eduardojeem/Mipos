'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  Sun, 
  Moon, 
  Leaf, 
  Snowflake, 
  Flower2,
  Trees,
  Sparkles,
  Power,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { CustomTheme } from '@/components/theme/custom-theme-manager';

export interface SeasonalTheme {
  id: string;
  name: string;
  description: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'holiday' | 'custom';
  theme: CustomTheme | Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>;
  schedule?: {
    startDate?: string;
    endDate?: string;
    startMonth?: number;
    endMonth?: number;
    autoActivate: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export interface SeasonalThemesManagerProps {
  onThemeActivate: (theme: CustomTheme) => void;
  onThemeDeactivate: () => void;
  className?: string;
}

const PREDEFINED_SEASONAL_THEMES: Omit<SeasonalTheme, 'id' | 'createdAt' | 'isActive'>[] = [
  {
    name: 'Primavera',
    description: 'Colores frescos y vibrantes que celebran la renovación',
    season: 'spring',
    theme: {
      name: 'Primavera',
      colors: {
        primary: '#10b981', // verde primavera
        secondary: '#8b5cf6', // púrpura suave
        accent: '#f59e0b', // ámbar dorado
        background: '#fefdf8',
        foreground: '#1f2937',
        muted: '#f3f4f6',
        destructive: '#ef4444',
        border: '#e5e7eb',
        input: '#ffffff',
        ring: '#10b981'
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem'
      },
      typography: {
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
      }
    },
    schedule: {
      startMonth: 3,
      endMonth: 5,
      autoActivate: true
    }
  },
  {
    name: 'Verano',
    description: 'Tonos cálidos y brillantes que evocan días soleados',
    season: 'summer',
    theme: {
      name: 'Verano',
      colors: {
        primary: '#f59e0b', // ámbar brillante
        secondary: '#06b6d4', // cian turquesa
        accent: '#ec4899', // rosa vibrante
        background: '#fffbeb',
        foreground: '#1f2937',
        muted: '#fef3c7',
        destructive: '#dc2626',
        border: '#fde68a',
        input: '#ffffff',
        ring: '#f59e0b'
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem'
      },
      typography: {
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
      }
    },
    schedule: {
      startMonth: 6,
      endMonth: 8,
      autoActivate: true
    }
  },
  {
    name: 'Otoño',
    description: 'Colores cálidos y terrosos que capturan la esencia del otoño',
    season: 'autumn',
    theme: {
      name: 'Otoño',
      colors: {
        primary: '#dc2626', // rojo otoñal
        secondary: '#ea580c', // naranja terracota
        accent: '#d97706', // ámbar oscuro
        background: '#fefbf3',
        foreground: '#1f2937',
        muted: '#f5f1eb',
        destructive: '#b91c1c',
        border: '#e7e5e4',
        input: '#ffffff',
        ring: '#dc2626'
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem'
      },
      typography: {
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
      }
    },
    schedule: {
      startMonth: 9,
      endMonth: 11,
      autoActivate: true
    }
  },
  {
    name: 'Invierno',
    description: 'Paleta fría y serena que refleja la tranquilidad del invierno',
    season: 'winter',
    theme: {
      name: 'Invierno',
      colors: {
        primary: '#1e40af', // azul profundo
        secondary: '#4b5563', // gris pizarra
        accent: '#06b6d4', // azul hielo
        background: '#f8fafc',
        foreground: '#1f2937',
        muted: '#f1f5f9',
        destructive: '#dc2626',
        border: '#e2e8f0',
        input: '#ffffff',
        ring: '#1e40af'
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem'
      },
      typography: {
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
      }
    },
    schedule: {
      startMonth: 12,
      endMonth: 2,
      autoActivate: true
    }
  },
  {
    name: 'Fiestas',
    description: 'Colores festivos y brillantes para la temporada navideña',
    season: 'holiday',
    theme: {
      name: 'Fiestas',
      colors: {
        primary: '#dc2626', // rojo navideño
        secondary: '#16a34a', // verde navideño
        accent: '#fbbf24', // dorado festivo
        background: '#fef2f2',
        foreground: '#1f2937',
        muted: '#fee2e2',
        destructive: '#b91c1c',
        border: '#fecaca',
        input: '#ffffff',
        ring: '#dc2626'
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem'
      },
      typography: {
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
      }
    },
    schedule: {
      startMonth: 12,
      endMonth: 1,
      autoActivate: true
    }
  }
];

const SEASON_ICONS = {
  spring: Flower2,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake,
  holiday: Sparkles,
  custom: Calendar
};

export function SeasonalThemesManager({
  onThemeActivate,
  onThemeDeactivate,
  className
}: SeasonalThemesManagerProps) {
  const toastFn = toast;
  const [themes, setThemes] = useState<SeasonalTheme[]>([]);
  const [activeTheme, setActiveTheme] = useState<SeasonalTheme | null>(null);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Cargar temas estacionales guardados
  const loadSeasonalThemes = useCallback(() => {
    try {
      const saved = localStorage.getItem('seasonalThemes');
      let loadedThemes: SeasonalTheme[] = [];
      
      if (saved) {
        loadedThemes = JSON.parse(saved);
      } else {
        // Crear temas predeterminados si no existen
        loadedThemes = PREDEFINED_SEASONAL_THEMES.map(theme => ({
          ...theme,
          id: `seasonal-${theme.season}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          isActive: false
        }));
      }
      
      setThemes(loadedThemes);
      
      // Verificar si hay un tema activo
      const active = loadedThemes.find(t => t.isActive);
      if (active) {
        setActiveTheme(active);
      }
    } catch (error) {
      console.error('Error loading seasonal themes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los temas estacionales',
        variant: 'destructive'
      });
    }
  }, [toastFn]);

  // Guardar temas estacionales
  const saveSeasonalThemes = useCallback((updatedThemes: SeasonalTheme[]) => {
    try {
      localStorage.setItem('seasonalThemes', JSON.stringify(updatedThemes));
      setThemes(updatedThemes);
    } catch (error) {
      console.error('Error saving seasonal themes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive'
      });
    }
  }, [toastFn]);

  // Activar tema estacional
  const activateTheme = useCallback((theme: SeasonalTheme) => {
    try {
      // Desactivar tema actual si existe
      if (activeTheme) {
        const updatedThemes = themes.map(t => 
          t.id === activeTheme.id ? { ...t, isActive: false } : t
        );
        saveSeasonalThemes(updatedThemes);
        onThemeDeactivate();
      }
      
      // Activar nuevo tema
      const updatedThemes = themes.map(t => 
        t.id === theme.id ? { ...t, isActive: true } : t
      );
      saveSeasonalThemes(updatedThemes);
      
      setActiveTheme(theme);
      onThemeActivate(theme.theme as any);
      
      toastFn({
        title: 'Éxito',
        description: `Tema estacional "${theme.name}" activado`
      });
    } catch (error) {
      console.error('Error activating theme:', error);
      toastFn({
        title: 'Error',
        description: 'No se pudo activar el tema',
        variant: 'destructive'
      });
    }
  }, [themes, activeTheme, saveSeasonalThemes, onThemeActivate, onThemeDeactivate, toast]);

  // Desactivar tema estacional
  const deactivateTheme = useCallback(() => {
    try {
      if (activeTheme) {
        const updatedThemes = themes.map(t => 
          t.id === activeTheme.id ? { ...t, isActive: false } : t
        );
        saveSeasonalThemes(updatedThemes);
        
        setActiveTheme(null);
        onThemeDeactivate();
        
        toastFn({
          title: 'Éxito',
          description: 'Tema estacional desactivado'
        });
      }
    } catch (error) {
      console.error('Error deactivating theme:', error);
      toastFn({
        title: 'Error',
        description: 'No se pudo desactivar el tema',
        variant: 'destructive'
      });
    }
  }, [themes, activeTheme, saveSeasonalThemes, onThemeDeactivate, toast]);

  // Programación automática
  const checkAutoScheduling = useCallback(() => {
    if (!autoScheduling) return;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Buscar tema apropiado para el mes actual
    const appropriateTheme = themes.find(theme => {
      if (!theme.schedule?.autoActivate) return false;
      
      const startMonth = theme.schedule.startMonth;
      const endMonth = theme.schedule.endMonth;
      
      if (startMonth && endMonth) {
        // Manejar rangos que cruzan el año (ej: diciembre - enero)
        if (startMonth <= endMonth) {
          return currentMonth >= startMonth && currentMonth <= endMonth;
        } else {
          return currentMonth >= startMonth || currentMonth <= endMonth;
        }
      }
      
      return false;
    });
    
    // Activar tema apropiado si no está ya activo
    if (appropriateTheme && (!activeTheme || activeTheme.id !== appropriateTheme.id)) {
      activateTheme(appropriateTheme);
    }
    
    // Desactivar si no hay tema apropiado
    if (!appropriateTheme && activeTheme && themes.some(t => t.schedule?.autoActivate)) {
      deactivateTheme();
    }
  }, [themes, activeTheme, autoScheduling, activateTheme, deactivateTheme]);

  // Alternar programación automática
  const toggleAutoScheduling = useCallback(() => {
    const newAutoScheduling = !autoScheduling;
    setAutoScheduling(newAutoScheduling);
    localStorage.setItem('seasonalAutoScheduling', JSON.stringify(newAutoScheduling));
    
    if (newAutoScheduling) {
      checkAutoScheduling();
      toastFn({
        title: 'Programación automática activada',
        description: 'Los temas se cambiarán automáticamente según la temporada'
      });
    } else {
      toastFn({
        title: 'Programación automática desactivada',
        description: 'Los temas deben cambiarse manualmente'
      });
    }
  }, [autoScheduling, checkAutoScheduling, toast]);

  // Actualizar mes actual
  useEffect(() => {
    const updateCurrentMonth = () => {
      setCurrentMonth(new Date().getMonth() + 1);
    };
    
    const interval = setInterval(updateCurrentMonth, 60000); // Actualizar cada minuto
    updateCurrentMonth(); // Actualizar inmediatamente
    
    return () => clearInterval(interval);
  }, []);

  // Verificar programación automática periódicamente
  useEffect(() => {
    if (autoScheduling) {
      const interval = setInterval(checkAutoScheduling, 60000); // Verificar cada minuto
      return () => clearInterval(interval);
    }
  }, [autoScheduling, checkAutoScheduling]);

  // Cargar configuración al montar
  useEffect(() => {
    loadSeasonalThemes();
    
    const savedAutoScheduling = localStorage.getItem('seasonalAutoScheduling');
    if (savedAutoScheduling) {
      setAutoScheduling(JSON.parse(savedAutoScheduling));
    }
  }, [loadSeasonalThemes]);

  const getSeasonIcon = (season: string) => {
    const Icon = SEASON_ICONS[season as keyof typeof SEASON_ICONS] || Calendar;
    return <Icon className="h-4 w-4" />;
  };

  const isThemeSeasonallyAppropriate = (theme: SeasonalTheme) => {
    if (!theme.schedule?.startMonth || !theme.schedule?.endMonth) return false;
    
    const startMonth = theme.schedule.startMonth;
    const endMonth = theme.schedule.endMonth;
    
    if (startMonth <= endMonth) {
      return currentMonth >= startMonth && currentMonth <= endMonth;
    } else {
      return currentMonth >= startMonth || currentMonth <= endMonth;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Temas Estacionales
        </CardTitle>
        <CardDescription>
          Temas que cambian automáticamente según la temporada del año
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Control de programación automática */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Programación automática</div>
              <div className="text-sm text-muted-foreground">
                Cambiar temas automáticamente según la temporada
              </div>
            </div>
          </div>
          <Button
            onClick={toggleAutoScheduling}
            variant={autoScheduling ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Power className="h-3 w-3" />
            {autoScheduling ? 'Activado' : 'Desactivado'}
          </Button>
        </div>

        {/* Estado actual */}
        <div className="text-center p-4 bg-muted/20 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Mes actual</div>
          <div className="text-2xl font-bold">
            {new Date(2000, currentMonth - 1).toLocaleString('es', { month: 'long' })}
          </div>
          {activeTheme && (
            <div className="mt-2 text-sm text-muted-foreground">
              Tema activo: <span className="font-medium">{activeTheme.name}</span>
            </div>
          )}
        </div>

        {/* Lista de temas estacionales */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Temas disponibles ({themes.length})
          </h3>
          
          {themes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay temas estacionales disponibles
            </p>
          ) : (
            <div className="space-y-2">
              {themes.map((theme) => {
                const isAppropriate = isThemeSeasonallyAppropriate(theme);
                const Icon = getSeasonIcon(theme.season);
                
                return (
                  <Card 
                    key={theme.id} 
                    className={cn(
                      "p-4 transition-all",
                      theme.isActive && "ring-2 ring-primary",
                      isAppropriate && !theme.isActive && "border-green-300 bg-green-50/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={cn(
                          "p-2 rounded-lg",
                          theme.isActive ? "bg-primary/10" : "bg-muted"
                        )}>
                          {Icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{theme.name}</h4>
                            {isAppropriate && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Apropiado
                              </span>
                            )}
                            {theme.isActive && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                Activo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {theme.description}
                          </p>
                          
                          {/* Información de programación */}
                          {theme.schedule && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {theme.schedule.startMonth && theme.schedule.endMonth && (
                                <span>
                                  Temporada: {new Date(2000, theme.schedule.startMonth - 1).toLocaleString('es', { month: 'short' })} 
                                  {' - '}
                                  {new Date(2000, theme.schedule.endMonth - 1).toLocaleString('es', { month: 'short' })}
                                </span>
                              )}
                              {theme.schedule.autoActivate && (
                                <span className="ml-2">
                                  • Automático
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Vista previa de colores */}
                          <div className="flex gap-1 mt-3">
                            {Object.entries(theme.theme.colors).slice(0, 6).map(([key, color]) => (
                              <div
                                key={key}
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: color }}
                                title={key}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        {theme.isActive ? (
                          <Button
                            onClick={deactivateTheme}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                          >
                            Desactivar
                          </Button>
                        ) : (
                          <Button
                            onClick={() => activateTheme(theme)}
                            variant="default"
                            size="sm"
                            className="h-8 px-2"
                            disabled={autoScheduling && !isAppropriate}
                          >
                            Activar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Los temas se activan automáticamente cuando están en su temporada</p>
          <p>• Puedes activar manualmente cualquier tema en cualquier momento</p>
          <p>• La programación automática se basa en el mes actual</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function useSeasonalThemes() {
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('seasonalAutoScheduling');
    if (saved) {
      setIsAutoScheduling(JSON.parse(saved));
    }
  }, []);
  
  return {
    isAutoScheduling,
    getCurrentSeason: () => {
      const month = new Date().getMonth() + 1;
      if (month >= 3 && month <= 5) return 'spring';
      if (month >= 6 && month <= 8) return 'summer';
      if (month >= 9 && month <= 11) return 'autumn';
      return 'winter';
    },
    getSeasonName: (season: string) => {
      const names = {
        spring: 'Primavera',
        summer: 'Verano',
        autumn: 'Otoño',
        winter: 'Invierno',
        holiday: 'Fiestas',
        custom: 'Personalizado'
      };
      return names[season as keyof typeof names] || 'Desconocido';
    }
  };
}
