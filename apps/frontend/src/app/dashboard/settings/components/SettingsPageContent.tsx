import { useState } from 'react';
import { Download, RefreshCw, AlertCircle, HelpCircle, FileText, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { ProfileTab } from './ProfileTab';
import { SystemTab } from './SystemTab';
import { NotificationsTab } from './NotificationsTab';
import { SecurityTab } from './SecurityTab';
import { 
  useUserSettings, 
  useSystemSettings, 
  useSecuritySettings,
  useUpdateUserSettings 
} from '../hooks/useOptimizedSettings';

export default function SettingsPageContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Check for unsaved changes (this is a simplified version)
  const [hasUnsavedChanges] = useState(false);

  const { data: userSettings } = useUserSettings();
  const { data: systemSettings } = useSystemSettings();
  const { data: securitySettings } = useSecuritySettings();
  const updateUserSettings = useUpdateUserSettings();

  const exportSettings = async () => {
    try {
      const settings = {
        userSettings,
        systemSettings,
        securitySettings,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `configuracion-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Éxito',
        description: 'Configuración exportada correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar la configuración',
        variant: 'destructive'
      });
    }
  };

  const resetToDefaults = () => {
    if (confirm('¿Estás seguro de que quieres restaurar la configuración por defecto? Esta acción no se puede deshacer.')) {
      const defaultUserSettings = {
        theme: 'system' as const,
        language: 'es',
        dashboard_layout: 'comfortable' as const,
        sidebar_collapsed: false,
        show_tooltips: true,
        enable_animations: true,
        auto_save: true
      };

      updateUserSettings.mutate(defaultUserSettings, {
        onSuccess: () => {
          toast({
            title: 'Configuración restaurada',
            description: 'Se han restaurado los valores por defecto',
          });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Configuración</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las configuraciones del sistema, tu perfil y preferencias de seguridad
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="animate-pulse">
              <AlertCircle className="h-3 w-3 mr-1" />
              Cambios sin guardar
            </Badge>
          )}

          <PermissionGuard permission="settings.edit">
            <Button variant="outline" onClick={exportSettings}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </PermissionGuard>

          <PermissionGuard permission="settings.edit">
            <Button variant="outline" onClick={resetToDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            Perfil
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            Sistema
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            Seguridad
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileTab />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <SystemTab />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationsTab />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <SecurityTab />
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">¿Necesitas ayuda?</h3>
              <p className="text-sm text-muted-foreground">
                Consulta nuestra documentación o contacta soporte técnico
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Documentación
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Soporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}