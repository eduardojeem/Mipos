'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Lock,
  Globe,
  Bell,
  AlertTriangle,
  Loader2,
  Save,
  RefreshCw,
  Info,
  ServerCog,
  Flag,
  Download,
  Upload,
  History,
  ShieldCheck,
  ExternalLink,
  Mail,
  Power,
  Database,
  Clock,
  KeyRound,
  CheckCircle2,
  XCircle,
  EyeOff,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  system_name: 'MITIENDA SaaS',
  system_email: 'admin@MITIENDA.com',
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

// Solo persistimos estas keys (excluye feature_flags, que tiene su propia key).
const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SystemSettings)[];

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  defaultValue: boolean;
  enabled: boolean;
}

interface EnvVar {
  key: string;
  label: string;
  group: 'core' | 'app' | 'optional';
  required: boolean;
  secret: boolean;
  present: boolean;
  preview: string | null;
}

interface SystemInfo {
  app: { name: string; version: string; environment: string; nodeVersion: string; region: string };
  database: { provider: string; status: 'connected' | 'error'; latencyMs: number | null };
  domain: { baseDomain: string };
  totals: { organizations: number; users: number };
  env?: EnvVar[];
  envSummary?: { total: number; present: number; missingRequired: string[] };
  generatedAt: string;
  responseTimeMs: number;
}

const ENV_GROUP_LABELS: Record<EnvVar['group'], string> = {
  core: 'Núcleo',
  app: 'Aplicación',
  optional: 'Opcionales / integraciones',
};

interface AuditEntry {
  id: string;
  action: string;
  user_id: string | null;
  created_at: string;
  metadata: { updated_keys?: string[]; total_updates?: number } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [baseDomain, setBaseDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        return { success: false, settings: DEFAULT_SETTINGS, loadWarning: message };
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

  // ── Fetch feature flags ──
  const { data: flagsData } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const response = await fetch('/api/superadmin/feature-flags');
      if (!response.ok) return { flags: [] as FeatureFlag[] };
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch system info ──
  const { data: systemInfo, isFetching: infoLoading, refetch: refetchInfo } = useQuery<SystemInfo>({
    queryKey: ['system-info'],
    queryFn: async () => {
      const response = await fetch('/api/superadmin/system-info');
      if (!response.ok) throw new Error(await readErrorMessage(response));
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  // ── Fetch change history ──
  const { data: history } = useQuery<AuditEntry[]>({
    queryKey: ['settings-history'],
    queryFn: async () => {
      const response = await fetch('/api/superadmin/audit-logs?entityType=system_settings&limit=15');
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json) ? json : [];
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (data?.settings) setSettings({ ...DEFAULT_SETTINGS, ...filterSettings(data.settings) });
  }, [data]);

  useEffect(() => {
    if (domainData?.baseDomain) setBaseDomain(domainData.baseDomain);
  }, [domainData]);

  useEffect(() => {
    if (flagsData?.flags) setFlags(flagsData.flags);
  }, [flagsData]);

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
      queryClient.invalidateQueries({ queryKey: ['settings-history'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Save feature flags ──
  const saveFlagsMutation = useMutation({
    mutationFn: async (nextFlags: FeatureFlag[]) => {
      const featureFlags = Object.fromEntries(nextFlags.map((f) => [f.key, f.enabled]));
      const response = await fetch('/api/superadmin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { feature_flags: featureFlags } }),
      });
      if (!response.ok) throw new Error(await readErrorMessage(response));
      return response.json();
    },
    onSuccess: () => {
      toast.success('Feature flags guardados');
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['settings-history'] });
    },
    onError: (err: Error) => toast.error(err.message),
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
      queryClient.invalidateQueries({ queryKey: ['system-domain'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingDomain(false);
    }
  }, [baseDomain, queryClient]);

  const handleSave = () => {
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
    if (settings.maintenance_mode && !data?.settings?.maintenance_mode) {
      if (!confirm('⚠️ Vas a ACTIVAR el modo mantenimiento. Esto bloqueará el acceso a TODOS los usuarios (excepto super admins). ¿Continuar?')) {
        return;
      }
    }
    saveMutation.mutate(settings);
  };

  // ── Export / Import ──
  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: systemInfo?.app.version || '0.1.0',
      settings,
      baseDomain,
      featureFlags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MITIENDA-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Configuración exportada');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.settings && typeof parsed.settings === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...filterSettings(parsed.settings) });
      }
      if (typeof parsed.baseDomain === 'string') setBaseDomain(parsed.baseDomain);
      if (parsed.featureFlags && typeof parsed.featureFlags === 'object') {
        setFlags((prev) => prev.map((f) => ({ ...f, enabled: parsed.featureFlags[f.key] ?? f.enabled })));
      }
      toast.success('Configuración cargada. Revisá y presioná Guardar para aplicar.');
    } catch {
      toast.error('Archivo inválido. Esperaba un JSON exportado por este panel.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Loading / error ──
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

  const dbOk = systemInfo?.database.status === 'connected';

  return (
    <SuperAdminGuard>
      <div className="mx-auto max-w-4xl space-y-6">
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
              Parámetros del sistema, accesos, features y herramientas del SaaS
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Recargar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar cambios
            </Button>
          </div>
        </div>

        {/* ── Maintenance banner (cuando está activo) ── */}
        {settings.maintenance_mode && (
          <Alert className="border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            <Power className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">
              Modo mantenimiento ACTIVO — los usuarios no-superadmin están viendo la página de mantenimiento.
              {!data?.settings?.maintenance_mode && ' (sin guardar todavía)'}
            </AlertDescription>
          </Alert>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="general" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> General</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Lock className="h-3.5 w-3.5" /> Acceso</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Avisos</TabsTrigger>
            <TabsTrigger value="flags" className="gap-1.5"><Flag className="h-3.5 w-3.5" /> Features</TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5"><ServerCog className="h-3.5 w-3.5" /> Sistema</TabsTrigger>
          </TabsList>

          {/* ════════ GENERAL ════════ */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-5 w-5 text-blue-600" /> Identidad del sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="systemName" className="text-xs">Nombre del Sistema</Label>
                  <Input id="systemName" value={settings.system_name} onChange={(e) => setSettings({ ...settings, system_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="systemEmail" className="text-xs">Email del Sistema</Label>
                  <Input id="systemEmail" type="email" value={settings.system_email} onChange={(e) => setSettings({ ...settings, system_email: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5 text-purple-600" /> Dominio Base (Multitenancy)
                </CardTitle>
                <CardDescription>Dominio principal para construir subdominios de cada organización</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={baseDomain} onChange={(e) => setBaseDomain(e.target.value.toLowerCase())} placeholder="miapp.vercel.app" className="pl-10 font-mono text-sm" />
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

            <Card className={settings.maintenance_mode ? 'border-rose-300 dark:border-rose-800' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Power className="h-5 w-5 text-rose-600" /> Disponibilidad del servicio
                  <Badge variant="outline" className="ml-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">Activo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SettingToggle
                  icon={Power}
                  iconColor="text-rose-600"
                  label="Modo Mantenimiento"
                  description="Bloquea el acceso a todos los usuarios excepto super admins. Aplicado por middleware en todo el sistema."
                  checked={settings.maintenance_mode}
                  onCheckedChange={(v) => setSettings({ ...settings, maintenance_mode: v })}
                />
                <SettingToggle
                  icon={Globe}
                  iconColor="text-blue-600"
                  label="Permitir Registros"
                  description="Permite que nuevas organizaciones se registren. Enforced en el endpoint de signup."
                  checked={settings.allow_registrations}
                  onCheckedChange={(v) => setSettings({ ...settings, allow_registrations: v })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ ACCESO / SEGURIDAD ════════ */}
          <TabsContent value="security" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-5 w-5 text-red-600" /> Sesiones y acceso
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sessionTimeout" className="text-xs">Sesión (minutos)</Label>
                  <Input id="sessionTimeout" type="number" min={5} max={1440} value={settings.session_timeout}
                    onChange={(e) => setSettings({ ...settings, session_timeout: Math.max(5, parseInt(e.target.value) || 5) })} />
                  <p className="text-[10px] text-slate-400">5–1440 min</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxLogin" className="text-xs">Intentos de login</Label>
                  <Input id="maxLogin" type="number" min={1} max={20} value={settings.max_login_attempts}
                    onChange={(e) => setSettings({ ...settings, max_login_attempts: Math.max(1, parseInt(e.target.value) || 1) })} />
                  <p className="text-[10px] text-slate-400">1–20 intentos</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" /> Gestionado en Supabase Auth
                </CardTitle>
                <CardDescription>
                  Estas políticas se controlan directamente en el proveedor de autenticación, no desde acá.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ManagedExternally
                  icon={Mail}
                  label="Verificación de Email"
                  description="Requerir confirmación de email para nuevos usuarios."
                />
                <ManagedExternally
                  icon={ShieldCheck}
                  label="Autenticación de dos factores (2FA)"
                  description="MFA/TOTP para las cuentas. Se habilita por proyecto en Supabase."
                />
                <a
                  href="https://supabase.com/dashboard/project/_/auth/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Abrir configuración de Auth en Supabase <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ NOTIFICACIONES ════════ */}
          <TabsContent value="notifications" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-5 w-5 text-amber-600" /> Notificaciones del sistema
                </CardTitle>
                <CardDescription>Preferencias globales de envío de avisos del SaaS.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <SettingToggle icon={Bell} iconColor="text-blue-600" label="Notificaciones del Sistema"
                  description="Habilita notificaciones generales en la plataforma"
                  checked={settings.enable_notifications} onCheckedChange={(v) => setSettings({ ...settings, enable_notifications: v })} />
                <SettingToggle icon={Mail} iconColor="text-purple-600" label="Notificaciones por Email"
                  description="Envía avisos importantes por email"
                  checked={settings.enable_email_notifications} onCheckedChange={(v) => setSettings({ ...settings, enable_email_notifications: v })} />
                <SettingToggle icon={Bell} iconColor="text-emerald-600" label="Notificaciones SMS"
                  description="Envía avisos críticos por SMS (requiere proveedor configurado)"
                  checked={settings.enable_sms_notifications} onCheckedChange={(v) => setSettings({ ...settings, enable_sms_notifications: v })} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ FEATURE FLAGS ════════ */}
          <TabsContent value="flags" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Flag className="h-5 w-5 text-indigo-600" /> Feature Flags
                  </CardTitle>
                  <CardDescription>
                    Activá o desactivá features del SaaS de forma centralizada. El código consulta estos flags vía <code className="rounded bg-slate-100 px-1 text-[11px] dark:bg-slate-800">isFeatureEnabled()</code>.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => saveFlagsMutation.mutate(flags)} disabled={saveFlagsMutation.isPending}>
                  {saveFlagsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar flags
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {flags.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">No hay feature flags definidos.</p>
                ) : (
                  flags.map((flag) => (
                    <div key={flag.key} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-start gap-3">
                        <Flag className={`mt-0.5 h-4 w-4 shrink-0 ${flag.enabled ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{flag.label}</p>
                            <code className="rounded bg-slate-100 px-1 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{flag.key}</code>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{flag.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(v) => setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: v } : f)))}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ SISTEMA ════════ */}
          <TabsContent value="system" className="mt-4 space-y-4">
            {/* System info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ServerCog className="h-5 w-5 text-slate-600" /> Información del sistema
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchInfo()}>
                  <RefreshCw className={`h-4 w-4 ${infoLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoStat label="Versión" value={systemInfo?.app.version ?? '—'} icon={Info} />
                <InfoStat label="Entorno" value={systemInfo?.app.environment ?? '—'} icon={ServerCog} />
                <InfoStat label="Runtime" value={systemInfo?.app.nodeVersion ?? '—'} icon={ServerCog} />
                <InfoStat
                  label="Base de datos"
                  value={dbOk ? `OK · ${systemInfo?.database.latencyMs ?? '?'}ms` : 'Error'}
                  icon={Database}
                  tone={dbOk ? 'ok' : 'bad'}
                />
                <InfoStat label="Organizaciones" value={String(systemInfo?.totals.organizations ?? '—')} icon={Globe} />
                <InfoStat label="Usuarios" value={String(systemInfo?.totals.users ?? '—')} icon={Globe} />
              </CardContent>
            </Card>

            {/* Variables de entorno */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <KeyRound className="h-5 w-5 text-amber-600" /> Variables de entorno
                  </CardTitle>
                  <CardDescription>
                    Estado de configuración. Los secretos solo muestran si están definidos, nunca su valor.
                  </CardDescription>
                </div>
                {systemInfo?.envSummary && (
                  <Badge
                    variant="outline"
                    className={
                      systemInfo.envSummary.missingRequired.length === 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                    }
                  >
                    {systemInfo.envSummary.present}/{systemInfo.envSummary.total} configuradas
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {systemInfo?.envSummary && systemInfo.envSummary.missingRequired.length > 0 && (
                  <Alert className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Faltan variables requeridas: <strong>{systemInfo.envSummary.missingRequired.join(', ')}</strong>
                    </AlertDescription>
                  </Alert>
                )}
                {!systemInfo?.env ? (
                  <p className="py-4 text-center text-sm text-slate-400">Cargando estado de variables...</p>
                ) : (
                  (['core', 'app', 'optional'] as const).map((group) => {
                    const vars = systemInfo.env!.filter((v) => v.group === group);
                    if (vars.length === 0) return null;
                    return (
                      <div key={group} className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          {ENV_GROUP_LABELS[group]}
                        </p>
                        {vars.map((v) => (
                          <EnvRow key={v.key} env={v} />
                        ))}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Export / Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-5 w-5 text-emerald-600" /> Respaldo de configuración
                </CardTitle>
                <CardDescription>Exportá o importá toda la configuración (settings, dominio y feature flags) como JSON.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Exportar JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Importar JSON
                </Button>
                <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
                <p className="w-full text-[11px] text-slate-400">
                  Al importar se cargan los valores en el formulario; presioná <strong>Guardar cambios</strong> para aplicarlos.
                </p>
              </CardContent>
            </Card>

            {/* Change history */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5 text-slate-600" /> Historial de cambios
                </CardTitle>
                <CardDescription>Últimas modificaciones de configuración registradas en auditoría.</CardDescription>
              </CardHeader>
              <CardContent>
                {!history || history.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Sin cambios registrados todavía.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-2.5 text-sm dark:border-slate-800">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-700 dark:text-slate-300">
                            {(entry.metadata?.updated_keys?.length ?? 0) > 0
                              ? `Actualizó ${entry.metadata!.updated_keys!.length} parámetro(s): `
                              : 'Cambio de configuración '}
                            <span className="text-xs text-slate-400">
                              {entry.metadata?.updated_keys?.slice(0, 6).join(', ')}
                              {(entry.metadata?.updated_keys?.length ?? 0) > 6 ? '…' : ''}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400">{formatDate(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Footer info ── */}
        <Alert className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <Info className="h-4 w-4 text-slate-500" />
          <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
            Modo mantenimiento y permitir-registros se aplican de verdad (middleware + signup). 2FA y verificación de email se gestionan en Supabase Auth.
            Caché, sesiones y purga de logs viven en <strong>Mantenimiento</strong>.
          </AlertDescription>
        </Alert>
      </div>
    </SuperAdminGuard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function filterSettings(raw: Record<string, unknown>): Partial<SystemSettings> {
  const out: Record<string, unknown> = {};
  for (const key of SETTINGS_KEYS) {
    if (key in raw) out[key] = raw[key];
  }
  return out as Partial<SystemSettings>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-PY', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SettingToggle({
  icon: Icon,
  iconColor,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: typeof Settings;
  iconColor: string;
  label: string;
  description: string;
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
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ManagedExternally({
  icon: Icon,
  label,
  description,
}: {
  icon: typeof Settings;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <Badge variant="outline" className="shrink-0 border-slate-200 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Supabase
      </Badge>
    </div>
  );
}

function EnvRow({ env }: { env: EnvVar }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-2.5">
        {env.present ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : env.required ? (
          <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <code className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{env.key}</code>
            {env.secret && <EyeOff className="h-3 w-3 shrink-0 text-slate-400" aria-label="Secreto" />}
            {env.required && (
              <span className="shrink-0 rounded bg-slate-100 px-1 text-[9px] font-medium uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                req
              </span>
            )}
          </div>
          {env.present && env.preview ? (
            <code className="block truncate text-[11px] text-slate-400">{env.preview}</code>
          ) : (
            <span className="text-[11px] text-slate-400">{env.secret ? (env.present ? 'definido (oculto)' : 'no definido') : env.present ? '' : 'no definido'}</span>
          )}
        </div>
      </div>
      <Badge
        variant="outline"
        className={
          env.present
            ? 'shrink-0 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
            : env.required
              ? 'shrink-0 border-rose-200 bg-rose-50 text-[10px] text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
              : 'shrink-0 border-slate-200 text-[10px] text-slate-400 dark:border-slate-700'
        }
      >
        {env.present ? 'OK' : env.required ? 'Falta' : 'Opcional'}
      </Badge>
    </div>
  );
}

function InfoStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Settings;
  tone?: 'ok' | 'bad';
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`mt-1 truncate text-sm font-semibold ${
        tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400'
        : tone === 'bad' ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-900 dark:text-white'
      }`}>
        {value}
      </p>
    </div>
  );
}
