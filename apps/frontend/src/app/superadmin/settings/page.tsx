'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Lock,
  Globe,
  Bell,
  Database,
  Mail,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Save,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';

interface SystemSettings {
  system_name: string;
  system_email: string;
  maintenance_mode: boolean;
  allow_registrations: boolean;
  require_email_verification: boolean;
  enable_two_factor: boolean;
  session_timeout: number;
  max_login_attempts: number;
  enable_notifications: boolean;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  backup_enabled: boolean;
  backup_frequency: string;
  data_retention_days: number;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SystemSettings>({
    system_name: 'MiPOS SaaS',
    system_email: 'admin@mipos.com',
    maintenance_mode: false,
    allow_registrations: true,
    require_email_verification: true,
    enable_two_factor: true,
    session_timeout: 30,
    max_login_attempts: 5,
    enable_notifications: true,
    enable_email_notifications: true,
    enable_sms_notifications: false,
    backup_enabled: true,
    backup_frequency: 'daily',
    data_retention_days: 90
  });

  // Fetch settings
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await fetch('/api/superadmin/settings');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar configuraciones');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: SystemSettings) => {
      const response = await fetch('/api/superadmin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar configuraciones');
      }

      return response.json();
    },
    onSuccess: (responseData) => {
      toast.success('Configuraciones guardadas', {
        description: `${responseData.updated?.length || 0} ajustes actualizados correctamente`,
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error: Error) => {
      toast.error('Error al guardar', {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    if (settings.maintenance_mode) {
      const confirmed = confirm(
        '⚠️ Estás activando el modo de mantenimiento. Esto desactivará el acceso al sistema para todos los usuarios. ¿Continuar?'
      );
      if (!confirmed) return;
    }

    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
          <p className="text-slate-500 font-medium">Cargando configuraciones del sistema...</p>
        </div>
      </SuperAdminGuard>
    );
  }

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Error al cargar</h2>
            <p className="text-slate-500 mt-2">{error instanceof Error ? error.message : 'Error desconocido'}</p>
          </div>
          <Button onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Settings className="h-8 w-8 text-slate-600" />
              Configuración Global
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Configuraciones del sistema y parámetros globales
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </div>

        {/* System Status */}
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Sistema Operativo
                  </h3>
                  <p className="text-sm text-slate-500">
                    Todos los servicios funcionando correctamente
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                Saludable
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Configuración General
            </CardTitle>
            <CardDescription>
              Configuraciones básicas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="systemName">Nombre del Sistema</Label>
                <Input
                  id="systemName"
                  value={settings.system_name}
                  onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="systemEmail">Email del Sistema</Label>
                <Input
                  id="systemEmail"
                  type="email"
                  value={settings.system_email}
                  onChange={(e) => setSettings({ ...settings, system_email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Modo Mantenimiento</p>
                  <p className="text-sm text-slate-500">
                    Desactiva el acceso al sistema para todos los usuarios
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Permitir Registros</p>
                  <p className="text-sm text-slate-500">
                    Permite que nuevas organizaciones se registren
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.allow_registrations}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_registrations: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Configuraciones de seguridad y autenticación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Verificación de Email</p>
                  <p className="text-sm text-slate-500">
                    Requiere verificación de email para nuevos usuarios
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.require_email_verification}
                onCheckedChange={(checked) => setSettings({ ...settings, require_email_verification: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Autenticación de Dos Factores</p>
                  <p className="text-sm text-slate-500">
                    Habilita 2FA para todos los usuarios
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enable_two_factor}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_two_factor: checked })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Tiempo de Sesión (minutos)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.session_timeout}
                  onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Intentos Máximos de Login</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={settings.max_login_attempts}
                  onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-600" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configuración de notificaciones del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Notificaciones del Sistema</p>
                  <p className="text-sm text-slate-500">
                    Habilita notificaciones generales del sistema
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enable_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Notificaciones por Email</p>
                  <p className="text-sm text-slate-500">
                    Envía notificaciones importantes por email
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enable_email_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_email_notifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Respaldos y Datos
            </CardTitle>
            <CardDescription>
              Configuración de respaldos y retención de datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Respaldos Automáticos</p>
                  <p className="text-sm text-slate-500">
                    Habilita respaldos automáticos de la base de datos
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.backup_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, backup_enabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataRetention">Retención de Datos (días)</Label>
              <Input
                id="dataRetention"
                type="number"
                value={settings.data_retention_days}
                onChange={(e) => setSettings({ ...settings, data_retention_days: parseInt(e.target.value) })}
              />
              <p className="text-sm text-slate-500">
                Los datos se eliminarán automáticamente después de este período
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" className="gap-2">
            <CheckCircle className="h-5 w-5" />
            Guardar Todos los Cambios
          </Button>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
