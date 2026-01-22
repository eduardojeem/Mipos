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
import { SettingsLoadingSkeleton } from './SettingsLoadingSkeleton';
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

  const { data: userSettings, isLoading: isLoadingUser } = useUserSettings();
  const { data: systemSettings, isLoading: isLoadingSystem } = useSystemSettings();
  const { data: securitySettings, isLoading: isLoadingSecurity } = useSecuritySettings();
  const updateUserSettings = useUpdateUserSettings();

  if (isLoadingUser || isLoadingSystem || isLoadingSecurity) {
    return <SettingsLoadingSkeleton />;
  }

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header with improved aesthetics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-300 bg-clip-text text-transparent">
            Configuración
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Personaliza tu experiencia y gestiona los parámetros del sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="animate-pulse bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 px-3 py-1">
              <AlertCircle className="h-4 w-4 mr-1.5" />
              Cambios pendientes
            </Badge>
          )}

          <div className="flex bg-muted/30 p-1 rounded-xl backdrop-blur-sm border border-border/50">
            <PermissionGuard permission="settings.edit">
              <Button
                variant="ghost"
                onClick={exportSettings}
                className="hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 rounded-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </PermissionGuard>

            <PermissionGuard permission="settings.edit">
              <Button
                variant="ghost"
                onClick={resetToDefaults}
                className="hover:bg-red-500/10 hover:text-red-500 transition-all duration-300 rounded-lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restaurar
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* Settings Tabs with improved design */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="relative">
          <TabsList className="flex w-full overflow-x-auto justify-start h-auto p-1.5 bg-muted/40 backdrop-blur-md rounded-2xl border border-border/50 custom-scrollbar">
            <TabsTrigger
              value="profile"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/10 group-data-[state=active]:bg-blue-600 group-data-[state=active]:text-white transition-colors duration-300">
                <User className="h-4 w-4" />
              </div>
              <span className="font-semibold">Perfil</span>
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-indigo-500/10 group-data-[state=active]:bg-indigo-600 group-data-[state=active]:text-white transition-colors duration-300">
                <RefreshCw className="h-4 w-4" />
              </div>
              <span className="font-semibold">Sistema</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-purple-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-purple-500/10 group-data-[state=active]:bg-purple-600 group-data-[state=active]:text-white transition-colors duration-300">
                <Mail className="h-4 w-4" />
              </div>
              <span className="font-semibold">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/10 group-data-[state=active]:bg-emerald-600 group-data-[state=active]:text-white transition-colors duration-300">
                <HelpCircle className="h-4 w-4" />
              </div>
              <span className="font-semibold">Seguridad</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <ProfileTab />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <SystemTab />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <NotificationsTab />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <SecurityTab />
        </TabsContent>
      </Tabs>

      {/* Help Section with premium feel */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all duration-700"></div>
        <CardContent className="relative flex flex-col md:flex-row items-center justify-between p-8 gap-6 backdrop-blur-sm border border-blue-500/10 rounded-xl">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">¿Necesitas asistencia?</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                Nuestro centro de ayuda y equipo de soporte están disponibles para optimizar tu flujo de trabajo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="bg-white/50 dark:bg-white/5 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300 rounded-xl px-6">
              <FileText className="h-4 w-4 mr-2" />
              Ver Guías
            </Button>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/20 transition-all duration-300 rounded-xl px-6">
              <Mail className="h-4 w-4 mr-2" />
              Soporte VIP
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}