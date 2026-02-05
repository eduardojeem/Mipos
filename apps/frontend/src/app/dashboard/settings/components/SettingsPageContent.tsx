import { useState, useEffect } from 'react';
import { AlertCircle, HelpCircle, FileText, Mail, User, Palette, Settings, Shield, ShoppingCart, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
 
import { PermissionGuard } from '@/components/ui/permission-guard';
 
import dynamic from 'next/dynamic';
const ProfileTab = dynamic(() => import('./ProfileTab').then(m => m.ProfileTab), { ssr: false });
const SystemSettingsTab = dynamic(() => import('./SystemSettingsTab').then(m => m.SystemSettingsTab), { ssr: false });
const NotificationsTab = dynamic(() => import('./NotificationsTab').then(m => m.NotificationsTab), { ssr: false });
const SecuritySettingsTab = dynamic(() => import('./SecuritySettingsTab').then(m => m.SecuritySettingsTab), { ssr: false });
const POSTab = dynamic(() => import('./POSTab').then(m => m.POSTab), { ssr: false });
const AppearanceTab = dynamic(() => import('./AppearanceTab').then(m => m.AppearanceTab), { ssr: false });
const BillingTab = dynamic(() => import('./BillingTab').then(m => m.BillingTab), { ssr: false });
import { SettingsLoadingSkeleton } from './SettingsLoadingSkeleton';
import {
  useUserSettings,
  useSystemSettings,
  useSecuritySettings
} from '../hooks/useOptimizedSettings';

type SupabaseStatus = {
  configured?: boolean;
  connected?: boolean;
  error?: { message: string } | null;
  timestamp?: string;
};
type HealthState = { ok: boolean; supabase?: { ok: boolean; storage?: boolean; admin?: boolean; configured?: boolean; connected?: boolean } };

export default function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState('profile');
  

  // Check for unsaved changes (this is a simplified version)
  const [hasUnsavedChanges] = useState(false);

  const { isLoading: isLoadingUser } = useUserSettings();
  const { isLoading: isLoadingSystem } = useSystemSettings();
  const { isLoading: isLoadingSecurity } = useSecuritySettings();
  const [health, setHealth] = useState<HealthState | null>(null);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const base = await res.json();
        let supa: SupabaseStatus | null = null;
        try {
          const sres = await fetch('/api/supabase/status');
          supa = await sres.json();
        } catch {}
        const supaOk = Boolean(supa?.configured) && Boolean(supa?.connected);
        const overallOk = Boolean(base?.ok ?? false);
        setHealth({ ok: overallOk, supabase: { ok: supaOk, configured: Boolean(supa?.configured), connected: Boolean(supa?.connected) } });
      } catch {
        setHealth({ ok: false });
      }
    };
    loadHealth();
  }, []);

  

  

  if (isLoadingUser || isLoadingSystem || isLoadingSecurity) {
    return <SettingsLoadingSkeleton />;
  }

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
            {health && (
              <Badge variant="outline" className={health.ok ? 'text-emerald-600' : 'text-red-600'}>
                {health.ok ? 'SaaS OK' : 'SaaS fallando'}
              </Badge>
            )}
            {health?.supabase && !(health.supabase.configured && health.supabase.connected) && (
              <Badge
                variant="outline"
                className={
                  health.supabase.configured
                    ? (health.supabase.connected ? 'text-emerald-600' : 'text-amber-600')
                    : 'text-muted-foreground'
                }
              >
                {health.supabase.configured
                  ? (health.supabase.connected ? '' : 'Supabase sin conexión')
                  : 'Supabase no configurado'}
              </Badge>
            )}
            

            
          </div>
        </div>
      </div>

      {/* Settings Tabs with improved design */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="relative">
          <TabsList className="flex w-full overflow-x-auto justify-start h-auto p-1.5 bg-muted/40 backdrop-blur-md rounded-2xl border border-border/50 custom-scrollbar">
            {/* Always visible - Preferencias */}
            <TabsTrigger
              value="profile"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/10 group-data-[state=active]:bg-blue-600 group-data-[state=active]:text-white transition-colors duration-300">
                <User className="h-4 w-4" />
              </div>
              <span className="font-semibold">Preferencias</span>
            </TabsTrigger>

            {/* Always visible - Sistema */}
            <TabsTrigger
              value="system"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-indigo-500/10 group-data-[state=active]:bg-indigo-600 group-data-[state=active]:text-white transition-colors duration-300">
                <Settings className="h-4 w-4" />
              </div>
              <span className="font-semibold">Sistema</span>
            </TabsTrigger>

            {/* Always visible - Seguridad */}
            <TabsTrigger
              value="security"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/10 group-data-[state=active]:bg-emerald-600 group-data-[state=active]:text-white transition-colors duration-300">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-semibold">Seguridad</span>
            </TabsTrigger>

            {/* Always visible - POS */}
            <TabsTrigger
              value="pos"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-green-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-green-500/10 group-data-[state=active]:bg-green-600 group-data-[state=active]:text-white transition-colors duration-300">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className="font-semibold">POS</span>
            </TabsTrigger>

            {/* Always visible - Notificaciones */}
            <TabsTrigger
              value="notifications"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-purple-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-purple-500/10 group-data-[state=active]:bg-purple-600 group-data-[state=active]:text-white transition-colors duration-300">
                <Mail className="h-4 w-4" />
              </div>
              <span className="font-semibold">Notificaciones</span>
            </TabsTrigger>

            {/* Always visible - Apariencia */}
            <TabsTrigger
              value="appearance"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-pink-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-pink-500/10 group-data-[state=active]:bg-pink-600 group-data-[state=active]:text-white transition-colors duration-300">
                <Palette className="h-4 w-4" />
              </div>
              <span className="font-semibold">Apariencia</span>
            </TabsTrigger>

            {/* Always visible - Plan y Facturación */}
            <TabsTrigger
              value="billing"
              className="flex-1 items-center gap-2.5 py-3 px-6 rounded-xl data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-lg transition-all duration-300 group"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/10 group-data-[state=active]:bg-amber-600 group-data-[state=active]:text-white transition-colors duration-300">
                <CreditCard className="h-4 w-4" />
              </div>
              <span className="font-semibold">Plan</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Preferencias de Usuario</h2>
            <p className="text-muted-foreground mt-1">
              Personaliza tu experiencia en el sistema
            </p>
          </div>
          <ProfileTab />
        </TabsContent>

        {/* System Tab - Ahora visible para todos */}
        <TabsContent value="system" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Configuración del Sistema</h2>
            <p className="text-muted-foreground mt-1">
              Gestiona la información de la empresa y configuración regional
            </p>
          </div>
          <PermissionGuard permission="settings.view" showError>
            <SystemSettingsTab />
          </PermissionGuard>
        </TabsContent>

        {/* Security Tab - Ahora visible para todos */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Seguridad del Sistema</h2>
            <p className="text-muted-foreground mt-1">
              Políticas de contraseñas, autenticación y control de acceso
            </p>
          </div>
          <PermissionGuard permission="settings.view" showError>
            <SecuritySettingsTab />
          </PermissionGuard>
        </TabsContent>

        {/* POS Tab - Ahora visible para todos */}
        <TabsContent value="pos" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Configuración del Punto de Venta</h2>
            <p className="text-muted-foreground mt-1">
              Impuestos, inventario, hardware y programa de fidelización
            </p>
          </div>
          <POSTab />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Notificaciones</h2>
            <p className="text-muted-foreground mt-1">
              Configura cómo y cuándo recibir alertas del sistema
            </p>
          </div>
          <NotificationsTab />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Apariencia</h2>
            <p className="text-muted-foreground mt-1">
              Personaliza el aspecto visual de tu interfaz
            </p>
          </div>
          <AppearanceTab />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Plan y Facturación</h2>
            <p className="text-muted-foreground mt-1">
              Gestiona tu suscripción y cambia de plan
            </p>
          </div>
          <BillingTab />
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
