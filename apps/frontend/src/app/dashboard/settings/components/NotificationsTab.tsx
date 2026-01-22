import { useState } from 'react';
import { Save, Bell, Settings, Mail, Smartphone, Info } from 'lucide-react';
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
    <div className="grid gap-6 md:grid-cols-2">
      {/* User Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones Personales
          </CardTitle>
          <CardDescription>
            Controla las notificaciones que recibes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones Generales</Label>
              <p className="text-sm text-muted-foreground">
                Recibir todas las notificaciones del sistema
              </p>
            </div>
            <Switch
              checked={currentUserSettings.notifications_enabled ?? true}
              onCheckedChange={(checked) => updateUserSetting('notifications_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">
                  Notificaciones por correo electrónico
                </p>
              </div>
            </div>
            <Switch
              checked={currentUserSettings.email_notifications ?? true}
              onCheckedChange={(checked) => updateUserSetting('email_notifications', checked)}
              disabled={!currentUserSettings.notifications_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <div>
                <Label>Push</Label>
                <p className="text-sm text-muted-foreground">
                  Notificaciones push en el navegador
                </p>
              </div>
            </div>
            <Switch
              checked={currentUserSettings.push_notifications ?? true}
              onCheckedChange={(checked) => updateUserSetting('push_notifications', checked)}
              disabled={!currentUserSettings.notifications_enabled}
            />
          </div>

          {hasUserChanges && (
            <PermissionGuard permission="settings.edit">
              <Button 
                onClick={handleSaveUserSettings} 
                disabled={updateUserSettings.isPending} 
                className="w-full"
              >
                {updateUserSettings.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Preferencias
              </Button>
            </PermissionGuard>
          )}
        </CardContent>
      </Card>

      {/* System Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notificaciones del Sistema
          </CardTitle>
          <CardDescription>
            Configuración de alertas automáticas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <div>
                <Label>Email del Sistema</Label>
                <p className="text-sm text-muted-foreground">
                  Alertas importantes por email
                </p>
              </div>
            </div>
            <Switch
              checked={currentSystemSettings.email_notifications ?? true}
              onCheckedChange={(checked) => updateSystemSetting('email_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <div>
                <Label>SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Alertas críticas por mensaje de texto
                </p>
              </div>
            </div>
            <Switch
              checked={currentSystemSettings.sms_notifications ?? false}
              onCheckedChange={(checked) => updateSystemSetting('sms_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <div>
                <Label>Push del Sistema</Label>
                <p className="text-sm text-muted-foreground">
                  Notificaciones push automáticas
                </p>
              </div>
            </div>
            <Switch
              checked={currentSystemSettings.push_notifications ?? true}
              onCheckedChange={(checked) => updateSystemSetting('push_notifications', checked)}
            />
          </div>

          <Separator />

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Las notificaciones del sistema incluyen alertas de stock bajo,
              errores críticos y actualizaciones importantes.
            </AlertDescription>
          </Alert>

          {hasSystemChanges && (
            <PermissionGuard permission="settings.edit">
              <Button 
                onClick={handleSaveSystemSettings} 
                disabled={updateSystemSettings.isPending} 
                className="w-full"
              >
                {updateSystemSettings.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Configuración
              </Button>
            </PermissionGuard>
          )}
        </CardContent>
      </Card>
    </div>
  );
}