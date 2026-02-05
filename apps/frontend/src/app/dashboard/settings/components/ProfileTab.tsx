import { useState } from 'react';
import { Save, Palette, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="max-w-3xl mx-auto">
      {/* Preferences with premium card style */}
      <Card className="border-none shadow-xl shadow-indigo-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform duration-300">
              <Palette className="h-5 w-5" />
            </div>
            Preferencias de Interfaz
          </CardTitle>
          <CardDescription className="text-base">
            Personaliza tu experiencia visual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tema Visual</Label>
              <Select
                value={currentSettings.theme || 'system'}
                onValueChange={(value) => updateSetting('theme', value)}
              >
                <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-indigo-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Oscuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Idioma</Label>
              <Select
                value={currentSettings.language || 'es'}
                onValueChange={(value) => updateSetting('language', value)}
              >
                <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-indigo-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇵🇾 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Diseño del Dashboard</Label>
            <Select
              value={currentSettings.dashboard_layout || 'comfortable'}
              onValueChange={(value) => updateSetting('dashboard_layout', value)}
            >
              <SelectTrigger className="bg-muted/30 border-none h-11 focus-visible:ring-indigo-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="comfortable">Cómodo</SelectItem>
                <SelectItem value="spacious">Espacioso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-muted/50" />

          <div className="space-y-4">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Mostrar tooltips</p>
                <p className="text-xs text-muted-foreground">
                  Ayuda contextual activa
                </p>
              </div>
              <Switch
                checked={currentSettings.show_tooltips ?? true}
                onCheckedChange={(checked) => updateSetting('show_tooltips', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Animaciones</p>
                <p className="text-xs text-muted-foreground">
                  Efectos visuales fluidos
                </p>
              </div>
              <Switch
                checked={currentSettings.enable_animations ?? true}
                onCheckedChange={(checked) => updateSetting('enable_animations', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button with modern style */}
      {hasChanges && (
        <div className="flex justify-end mt-8 animate-in slide-in-from-bottom-4 duration-500">
          <PermissionGuard permission="settings.edit">
            <Button
              onClick={handleSave}
              disabled={updateUserSettings.isPending}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl shadow-indigo-500/20 px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {updateUserSettings.isPending ? (
                <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
              ) : (
                <Save className="h-5 w-5 mr-3" />
              )}
              Guardar Preferencias
            </Button>
          </PermissionGuard>
        </div>
      )}
    </div>
  );
}