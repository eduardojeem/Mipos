'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Bell, 
  Moon, 
  Sun, 
  Globe, 
  Monitor,
  Mail,
  MessageSquare,
  Shield,
  Save,
  TrendingUp,
  FileText
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    sales: boolean;
    inventory: boolean;
    reports: boolean;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
  };
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'es',
  notifications: {
    email: true,
    push: true,
    sales: true,
    inventory: true,
    reports: false,
  },
  privacy: {
    profileVisible: true,
    activityVisible: false,
  },
};

export function PreferencesSettings() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load preferences from localStorage or API
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, []);

  const updatePreference = (path: string, value: any) => {
    setPreferences(prev => {
      const newPreferences = { ...prev };
      const keys = path.split('.');
      let current: any = newPreferences;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPreferences;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Save to localStorage (in production, you would save to your API)
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasChanges(false);
      toast.success('Preferencias guardadas correctamente');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error al guardar las preferencias');
    } finally {
      setIsLoading(false);
    }
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const ThemeIcon = themeIcons[preferences.theme];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Configuración de Preferencias
        </CardTitle>
        <CardDescription>
          Personaliza tu experiencia en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ThemeIcon className="w-4 h-4" />
            <Label className="text-sm font-medium">Tema</Label>
          </div>
          <Select
            value={preferences.theme}
            onValueChange={(value: 'light' | 'dark' | 'system') => 
              updatePreference('theme', value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center">
                  <Sun className="w-4 h-4 mr-2" />
                  Claro
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center">
                  <Moon className="w-4 h-4 mr-2" />
                  Oscuro
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center">
                  <Monitor className="w-4 h-4 mr-2" />
                  Sistema
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Language Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <Label className="text-sm font-medium">Idioma</Label>
          </div>
          <Select
            value={preferences.language}
            onValueChange={(value: 'es' | 'en') => 
              updatePreference('language', value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Notification Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <Label className="text-sm font-medium">Notificaciones</Label>
          </div>
          
          <div className="space-y-3 pl-4 sm:pl-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 min-w-0">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Label htmlFor="email-notifications" className="text-sm">Notificaciones por email</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.notifications.email}
                onCheckedChange={(checked) => 
                  updatePreference('notifications.email', checked)
                }
              />
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 min-w-0">
                <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Label htmlFor="push-notifications" className="text-sm">Notificaciones push</Label>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.notifications.push}
                onCheckedChange={(checked) => 
                  updatePreference('notifications.push', checked)
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="sales-notifications">Notificaciones de ventas</Label>
              <Switch
                id="sales-notifications"
                checked={preferences.notifications.sales}
                onCheckedChange={(checked) => 
                  updatePreference('notifications.sales', checked)
                }
              />
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 min-w-0">
                <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Label htmlFor="inventory-notifications" className="text-sm">Alertas de inventario</Label>
              </div>
              <Switch
                id="inventory-notifications"
                checked={preferences.notifications.inventory}
                onCheckedChange={(checked) => 
                  updatePreference('notifications.inventory', checked)
                }
              />
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Label htmlFor="reports-notifications" className="text-sm">Reportes automáticos</Label>
              </div>
              <Switch
                id="reports-notifications"
                checked={preferences.notifications.reports}
                onCheckedChange={(checked) => 
                  updatePreference('notifications.reports', checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Privacy Settings */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <Label className="text-sm font-medium">Privacidad</Label>
          </div>
          
          <div className="space-y-4 pl-4 sm:pl-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="profile-visible" className="text-sm">Perfil visible</Label>
                <p className="text-xs text-muted-foreground">
                  Permite que otros usuarios vean tu perfil
                </p>
              </div>
              <Switch
                id="profile-visible"
                checked={preferences.privacy.profileVisible}
                onCheckedChange={(checked) => 
                  updatePreference('privacy.profileVisible', checked)
                }
                className="flex-shrink-0"
              />
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="activity-visible" className="text-sm">Actividad visible</Label>
                <p className="text-xs text-muted-foreground">
                  Muestra tu actividad reciente a otros usuarios
                </p>
              </div>
              <Switch
                id="activity-visible"
                checked={preferences.privacy.activityVisible}
                onCheckedChange={(checked) => 
                  updatePreference('privacy.activityVisible', checked)
                }
                className="flex-shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}