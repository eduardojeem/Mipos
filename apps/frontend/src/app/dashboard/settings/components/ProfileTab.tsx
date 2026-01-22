import { useState } from 'react';
import { Save, User, Palette, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useUserSettings, useUpdateUserSettings, type UserSettings } from '../hooks/useOptimizedSettings';

export function ProfileTab() {
  const { data: userSettings, isLoading } = useUserSettings();
  const updateUserSettings = useUpdateUserSettings();
  const [localSettings, setLocalSettings] = useState<Partial<UserSettings>>({});

  // Merge server data with local changes
  const currentSettings = { ...userSettings, ...localSettings };

  const updateSetting = (key: keyof UserSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(localSettings).length > 0) {
      updateUserSettings.mutate(localSettings);
      setLocalSettings({});
    }
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Cargando...</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
          <CardDescription>
            Actualiza tu información de perfil y datos de contacto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                value={currentSettings.first_name || ''}
                onChange={(e) => updateSetting('first_name', e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                value={currentSettings.last_name || ''}
                onChange={(e) => updateSetting('last_name', e.target.value)}
                placeholder="Tu apellido"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={currentSettings.email || ''}
              onChange={(e) => updateSetting('email', e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={currentSettings.phone || ''}
              onChange={(e) => updateSetting('phone', e.target.value)}
              placeholder="+595 21 123 4567"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Preferencias de Interfaz
          </CardTitle>
          <CardDescription>
            Personaliza tu experiencia de usuario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tema</Label>
            <Select 
              value={currentSettings.theme || 'system'} 
              onValueChange={(value) => updateSetting('theme', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Claro
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Oscuro
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Sistema
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Idioma</Label>
            <Select 
              value={currentSettings.language || 'es'} 
              onValueChange={(value) => updateSetting('language', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">🇵🇾 Español</SelectItem>
                <SelectItem value="en">🇺🇸 English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Diseño del Dashboard</Label>
            <Select 
              value={currentSettings.dashboard_layout || 'comfortable'} 
              onValueChange={(value) => updateSetting('dashboard_layout', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="comfortable">Cómodo</SelectItem>
                <SelectItem value="spacious">Espacioso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar tooltips</Label>
                <p className="text-sm text-muted-foreground">
                  Ayuda contextual en elementos de la interfaz
                </p>
              </div>
              <Switch
                checked={currentSettings.show_tooltips ?? true}
                onCheckedChange={(checked) => updateSetting('show_tooltips', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Animaciones</Label>
                <p className="text-sm text-muted-foreground">
                  Efectos visuales y transiciones
                </p>
              </div>
              <Switch
                checked={currentSettings.enable_animations ?? true}
                onCheckedChange={(checked) => updateSetting('enable_animations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Guardado automático</Label>
                <p className="text-sm text-muted-foreground">
                  Guardar cambios automáticamente
                </p>
              </div>
              <Switch
                checked={currentSettings.auto_save ?? true}
                onCheckedChange={(checked) => updateSetting('auto_save', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="md:col-span-2">
          <PermissionGuard permission="settings.edit">
            <Button 
              onClick={handleSave} 
              disabled={updateUserSettings.isPending} 
              className="w-full"
            >
              {updateUserSettings.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          </PermissionGuard>
        </div>
      )}
    </div>
  );
}