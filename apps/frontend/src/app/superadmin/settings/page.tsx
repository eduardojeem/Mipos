'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  RefreshCw,
  Info,
  Activity,
  CircleSlash,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

const DEFAULT_SETTINGS: SystemSettings = {
  system_name: 'MiPOS SaaS',
  system_email: 'admin@mipos.com',
  maintenance_mode: false,
  allow_registrations: true,
  require_email_verification: true,
  enable_two_factor: false,
  session_timeout: 30,
  max_login_attempts: 5,
  enable_notifications: true,
  enable_email_notifications: true,
  enable_sms_notifications: false,
  backup_enabled: true,
  backup_frequency: 'daily',
  data_retention_days: 90,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [baseDomain, setBaseDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');

  const readErrorMessage = async (response: Response) => {
    try {
      const body = await response.json();
      return body?.details || body?.error || body?.message || response.statusText;
    } catch {
      return response.statusText;
    }
  };

  // ── Fetch settings ──
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await fetch('/api/superadmin/settings');
      if (!response.ok) {
        const message = await readErrorMessage(response);
        if (response.status === 401 || response.status === 403) {
          throw new Error(message || 'No autorizado');
        }
        return {
          success: false,
          settings: DEFAULT_SETTINGS,
          loadWarning: message || 'No se pudieron cargar configuraciones guardadas. Mostrando valores por defecto.',
        };
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch domain ──
  const { data: domainData } = useQuery({
    queryKey: ['system-domain'],
    queryFn: async () => {
      const response = await fetch('/api/superadmin/system-settings');
      if (!response.ok) return { baseDomain: '' };
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Health check ──
  useEffect(() => {
    if (isLoading) {
      setHealthStatus('checking');
    } else if (error || data?.loadWarning) {
      setHealthStatus('unhealthy');
    } else {
      setHealthStatus('healthy');
    }
  }, [data, error, isLoading]);

  useEffect(() => {
    if (data?.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  }, [data]);

  useEffect(() => {
    if (domainData?.baseDomain) setBaseDomain(domainData.baseDomain);
  }, [domainData]);

  // ── Save settings ──
  const saveMutation = useMutation({
    mutationFn: async (newSettings: SystemSettings) => {
      const response = await fetch('/api/superadmin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });
      if (!response.ok) throw new Error(await readErrorMessage(response));
      return response.json();
    },
    onSuccess: (res) => {
      toast.success(`${res.updated?.length || 0} configuraciones guardadas`);
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Save domain ──
  const handleSaveDomain = useCallback(async () => {
    if (!baseDomain.trim()) {
      toast.error('El dominio base es requerido');
      return;
    }
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(baseDomain)) {
      toast.error('Formato de dominio inválido. Ejemplo: miapp.vercel.app');
      return;
    }
    setSavingDomain(true);
    try {
      const res = await fetch('/api/superadmin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseDomain: baseDomain.toLowerCase().trim() }),
      });
      if (!res.ok) throw new Error('Error al guardar dominio');
      toast.success('Dominio base actualizado');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingDomain(false);
    }
  }, [baseDomain]);

  const handleSave = () => {
    // Validaciones
    if (settings.session_timeout < 5 || settings.session_timeout > 1440) {
      toast.error('Tiempo de sesión debe ser entre 5 y 1440 minutos');
      return;
    }
    if (settings.max_login_attempts < 1 || settings.max_login_attempts > 20) {
      toast.error('Intentos de login debe ser entre 1 y 20');
      return;
    }
    if (settings.data_retention_days < 7 || settings.data_retention_days > 3650) {
      toast.error('Retención de datos debe ser entre 7 y 3650 días');
      return;
    }
    if (settings.maintenance_mode) {
      if (!confirm('⚠️ Modo mantenimiento activado. Esto puede bloquear el acceso. ¿Continuar?')) return;
    }
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <SuperAdminGuard>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Cargando configuraciones...</p>
        </div>
      </SuperAdminGuard>
    );
  }

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-10 w-10 text-rose-500" />
          <p className="text-slate-500">{error instanceof Error ? error.message : 'Error'}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {data?.loadWarning ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{data.loadWarning}</AlertDescription>
          </Alert>
        ) : null}

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <Settings className="h-6 w-6 text-slate-600" />
              Configuración Global
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Parámetros del sistema SaaS
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </div>

        {/* ── Health Status ── */}
        <Card className={healthStatus === 'healthy' ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {healthStatus === 'checking' ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : healthStatus === 'healthy' ? (
                <Activity className="h-5 w-5 text-emerald-600" />
              ) : (
                <CircleSlash className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {healthStatus === 'checking' ? 'Verificando...' : healthStatus === 'healthy' ? 'Sistema operativo' : 'Problemas detectados'}
                </p>
                <p className="text-xs text-slate-500">
                  {healthStatus === 'healthy' ? 'Conexión a base de datos activa' : 'Verificá la conexión a Supabase'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={healthStatus === 'healthy' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
              {healthStatus === 'healthy' ? 'Saludable' : 'Revisar'}
            </Badge>
          </CardContent>
        </Card>

        {/* ── Dominio Base (SaaS) ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-purple-600" />
              Dominio Base (Multitenancy)
            </CardTitle>
            <CardDescription>
              Dominio principal para construir subdominios de cada organización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={baseDomain}
                  onChange={(e) => setBaseDomain(e.target.value.toLowerCase())}
                  placeholder="miapp.vercel.app"
                  className="pl-10 font-mono text-sm"
                />
              </div>
              <Button onClick={handleSaveDomain} disabled={savingDomain} size="sm">
                {savingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
            {baseDomain ? (
              <p className="text-xs text-slate-400">
                Subdominios: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">tienda.{baseDomain}</code>
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* ── General ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5 text-blue-600" />
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="systemName" className="text-xs">Nombre del Sistema</Label>
                <Input
                  id="systemName"
                  value={settings.system_name}
                  onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="systemEmail" className="text-xs">Email del Sistema</Label>
                <Input
                  id="systemEmail"
                  type="email"
                  value={settings.system_email}
                  onChange={(e) => setSettings({ ...settings, system_email: e.target.value })}
                />
              </div>
            </div>

            <SettingToggle
              icon={AlertTriangle}
              iconColor="text-amber-600"
              label="Modo Mantenimiento"
              description="Bloquea acceso al sistema para usuarios normales"
              note="⚠️ Requiere implementar middleware — actualmente solo se guarda la preferencia."
              checked={settings.maintenance_mode}
              onCheckedChange={(v) => setSettings({ ...settings, maintenance_mode: v })}
            />
            <SettingToggle
              icon={Globe}
              iconColor="text-blue-600"
              label="Permitir Registros"
              description="Permite que nuevas organizaciones se registren"
              note="Planificado — el endpoint de registro aún no valida este flag."
              checked={settings.allow_registrations}
              onCheckedChange={(v) => setSettings({ ...settings, allow_registrations: v })}
            />
          </CardContent>
        </Card>

        {/* ── Seguridad ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-5 w-5 text-red-600" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingToggle
              icon={Mail}
              iconColor="text-purple-600"
              label="Verificación de Email"
              description="Requiere verificación para nuevos usuarios"
              note="Configurado directamente en Supabase Auth."
              checked={settings.require_email_verification}
              onCheckedChange={(v) => setSettings({ ...settings, require_email_verification: v })}
            />
            <SettingToggle
              icon={Shield}
              iconColor="text-emerald-600"
              label="Dos Factores (2FA)"
              description="Habilita autenticación de dos factores"
              note="Planificado — requiere configuración en Supabase Auth."
              checked={settings.enable_two_factor}
              onCheckedChange={(v) => setSettings({ ...settings, enable_two_factor: v })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sessionTimeout" className="text-xs">Sesión (minutos)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min={5}
                  max={1440}
                  value={settings.session_timeout}
                  onChange={(e) => setSettings({ ...settings, session_timeout: Math.max(5, parseInt(e.target.value) || 5) })}
                />
                <p className="text-[10px] text-slate-400">5–1440 min</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxLogin" className="text-xs">Intentos de login</Label>
                <Input
                  id="maxLogin"
                  type="number"
                  min={1}
                  max={20}
                  value={settings.max_login_attempts}
                  onChange={(e) => setSettings({ ...settings, max_login_attempts: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                <p className="text-[10px] text-slate-400">1–20 intentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Notificaciones ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-amber-600" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingToggle
              icon={Bell}
              iconColor="text-blue-600"
              label="Notificaciones del Sistema"
              description="Habilita notificaciones generales"
              checked={settings.enable_notifications}
              onCheckedChange={(v) => setSettings({ ...settings, enable_notifications: v })}
            />
            <SettingToggle
              icon={Mail}
              iconColor="text-purple-600"
              label="Notificaciones por Email"
              description="Envía notificaciones importantes por email"
              checked={settings.enable_email_notifications}
              onCheckedChange={(v) => setSettings({ ...settings, enable_email_notifications: v })}
            />
          </CardContent>
        </Card>

        {/* ── Respaldos ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-emerald-600" />
              Respaldos y Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingToggle
              icon={Database}
              iconColor="text-emerald-600"
              label="Respaldos Automáticos"
              description="Respaldos automáticos de la base de datos"
              note="Supabase gestiona backups automáticos en el plan Pro."
              checked={settings.backup_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, backup_enabled: v })}
            />
            <div className="space-y-1.5">
              <Label htmlFor="retention" className="text-xs">Retención de datos (días)</Label>
              <Input
                id="retention"
                type="number"
                min={7}
                max={3650}
                value={settings.data_retention_days}
                onChange={(e) => setSettings({ ...settings, data_retention_days: Math.max(7, parseInt(e.target.value) || 7) })}
              />
              <p className="text-[10px] text-slate-400">7–3650 días. Logs y auditoría se purgan después de este período.</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Info ── */}
        <Alert className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <Info className="h-4 w-4 text-slate-500" />
          <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
            Algunos settings (2FA, verificación de email, mantenimiento) son declarativos — se guardan como preferencia del sistema
            pero requieren implementación adicional en middleware/auth para tener efecto real. Los campos marcados con nota lo indican.
          </AlertDescription>
        </Alert>
      </div>
    </SuperAdminGuard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SettingToggle({
  icon: Icon,
  iconColor,
  label,
  description,
  note,
  checked,
  onCheckedChange,
}: {
  icon: typeof Shield;
  iconColor: string;
  label: string;
  description: string;
  note?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          {note ? (
            <p className="mt-1 text-[10px] italic text-slate-400 dark:text-slate-500">{note}</p>
          ) : null}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
