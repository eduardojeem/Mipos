import { useState } from 'react';
import { Save, Bell, Settings, Mail, Smartphone, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermissionGuard } from '@/components/ui/permission-guard';
import {
  useUserSettings,
  useUpdateUserSettings,
  useSystemSettings,
  useUpdateSystemSettings,
  type UserSettings,
  type SystemSettings
} from '../hooks/useOptimizedSettings';

export function NotificationsTab() {
  const { data: userSettings, isLoading: userLoading } = useUserSettings();
  const { data: systemSettings, isLoading: systemLoading } = useSystemSettings();
  const updateUserSettings = useUpdateUserSettings();
  const updateSystemSettings = useUpdateSystemSettings();

  const [localUserSettings, setLocalUserSettings] = useState<Partial<UserSettings>>({});
  const [localSystemSettings, setLocalSystemSettings] = useState<Partial<SystemSettings>>({});

  // Merge server data with local changes
  const currentUserSettings = { ...userSettings, ...localUserSettings };
  const currentSystemSettings = { ...systemSettings, ...localSystemSettings };

  const updateUserSetting = (key: keyof UserSettings, value: any) => {
    setLocalUserSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateSystemSetting = (key: keyof SystemSettings, value: any) => {
    setLocalSystemSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveUserSettings = () => {
    if (Object.keys(localUserSettings).length > 0) {
      updateUserSettings.mutate(localUserSettings);
      setLocalUserSettings({});
    }
  };

  const handleSaveSystemSettings = () => {
    if (Object.keys(localSystemSettings).length > 0) {
      updateSystemSettings.mutate(localSystemSettings);
      setLocalSystemSettings({});
    }
  };

  const hasUserChanges = Object.keys(localUserSettings).length > 0;
  const hasSystemChanges = Object.keys(localSystemSettings).length > 0;

  if (userLoading || systemLoading) {
    return <div className="flex items-center justify-center py-8">Cargando...</div>;
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 animate-in fade-in duration-500">
      {/* User Notifications with premium card style */}
      <Card className="border-none shadow-xl shadow-purple-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-purple-600 text-white shadow-lg shadow-purple-600/20 group-hover:scale-110 transition-transform duration-300">
              <Bell className="h-5 w-5" />
            </div>
            Preferencias Personales
          </CardTitle>
          <CardDescription className="text-base">
            Controla cómo y cuándo quieres ser notificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
            <div className="space-y-0.5">
              <p className="font-semibold text-gray-800 dark:text-gray-200">Estado Maestro</p>
              <p className="text-xs text-muted-foreground">Activar todas las notificaciones</p>
            </div>
            <Switch
              checked={currentUserSettings.notifications_enabled ?? true}
              onCheckedChange={(checked) => updateUserSetting('notifications_enabled', checked)}
            />
          </div>

          <Separator className="bg-muted/50" />

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Correo Electrónico</p>
                  <p className="text-xs text-muted-foreground">Resúmenes y alertas vía email</p>
                </div>
              </div>
              <Switch
                checked={currentUserSettings.email_notifications ?? true}
                onCheckedChange={(checked) => updateUserSetting('email_notifications', checked)}
                disabled={!currentUserSettings.notifications_enabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Notificaciones Push</p>
                  <p className="text-xs text-muted-foreground">Alertas instantáneas en navegador</p>
                </div>
              </div>
              <Switch
                checked={currentUserSettings.push_notifications ?? true}
                onCheckedChange={(checked) => updateUserSetting('push_notifications', checked)}
                disabled={!currentUserSettings.notifications_enabled}
              />
            </div>
          </div>

          {hasUserChanges && (
            <div className="pt-4 animate-in slide-in-from-bottom-2 duration-300">
              <PermissionGuard permission="settings.edit">
                <Button
                  onClick={handleSaveUserSettings}
                  disabled={updateUserSettings.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 rounded-xl py-6 font-bold"
                >
                  {updateUserSettings.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Perfil de Avisos
                </Button>
              </PermissionGuard>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Notifications with premium card style */}
      <Card className="border-none shadow-xl shadow-blue-500/5 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
              <Settings className="h-5 w-5" />
            </div>
            Canales del Sistema
          </CardTitle>
          <CardDescription className="text-base">
            Configuración de flujos y alertas automáticas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Emails Operativos</p>
                  <p className="text-xs text-muted-foreground">Reportes y logs del sistema</p>
                </div>
              </div>
              <Switch
                checked={currentSystemSettings.email_notifications ?? true}
                onCheckedChange={(checked) => updateSystemSetting('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Alertas SMS</p>
                  <p className="text-xs text-muted-foreground">Notificaciones críticas vía SMS</p>
                </div>
              </div>
              <Switch
                checked={currentSystemSettings.sms_notifications ?? false}
                onCheckedChange={(checked) => updateSystemSetting('sms_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Broadcast Global</p>
                  <p className="text-xs text-muted-foreground">Avisos masivos a usuarios</p>
                </div>
              </div>
              <Switch
                checked={currentSystemSettings.push_notifications ?? true}
                onCheckedChange={(checked) => updateSystemSetting('push_notifications', checked)}
              />
            </div>
          </div>

          <Separator className="bg-muted/50" />

          <Alert className="bg-blue-500/5 border-blue-500/10 rounded-xl">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
              Las notificaciones del sistema incluyen alertas de stock bajo,
              movimientos de caja inusuales y logs de seguridad críticos.
            </AlertDescription>
          </Alert>

          {hasSystemChanges && (
            <div className="pt-4 animate-in slide-in-from-bottom-2 duration-300">
              <PermissionGuard permission="settings.edit">
                <Button
                  onClick={handleSaveSystemSettings}
                  disabled={updateSystemSettings.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl py-6 font-bold"
                >
                  {updateSystemSettings.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Confirmar Configuración
                </Button>
              </PermissionGuard>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}