'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
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
  Palette,
  Image as ImageIcon,
  Zap,
  Copy,
  Link2,
  Trash2,
  LayoutDashboard,
  Crown,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useDeferredValue } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { BrandTab } from './BrandTab';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SystemSettings {
  system_name: string;
  system_email: string;
  platform_logo: string;
  platform_tagline: string;
  platform_primary_color: string;
  platform_support_email: string;
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
  system_email: 'admin@mitienda.com',
  platform_logo: '',
  platform_tagline: 'Sistema de gestión para tu negocio',
  platform_primary_color: '#059669',
  platform_support_email: 'soporte@mitienda.com',
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

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  accent = 'text-indigo-400',
  accentBg = 'bg-indigo-500/10',
  accentBorder = 'border-indigo-500/20',
  title,
  description,
  action,
}: {
  icon: typeof Settings;
  accent?: string;
  accentBg?: string;
  accentBorder?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${accentBg} ${accentBorder}`}>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100">{title}</p>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function SettingToggle({
  icon: Icon,
  iconColor,
  label,
  description,
  checked,
  onCheckedChange,
  danger = false,
}: {
  icon: typeof Settings;
  iconColor: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-lg border p-3.5 transition-colors ${
      danger && checked
        ? 'border-rose-500/30 bg-rose-500/5'
        : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
    }`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
        <div>
          <p className="text-sm font-medium text-slate-200">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
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
    <div className="flex items-start justify-between gap-4 rounded-lg border border-dashed border-slate-700/60 p-3.5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="text-xs text-slate-600">{description}</p>
        </div>
      </div>
      <Badge variant="outline" className="shrink-0 border-slate-700 text-[10px] text-slate-500">
        Supabase
      </Badge>
    </div>
  );
}

function EnvRow({ env }: { env: EnvVar }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {env.present ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : env.required ? (
          <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-slate-700" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <code className="truncate text-xs font-medium text-slate-300">{env.key}</code>
            {env.secret && <EyeOff className="h-3 w-3 shrink-0 text-slate-600" aria-label="Secreto" />}
            {env.required && (
              <span className="shrink-0 rounded bg-slate-800 px-1 text-[9px] font-semibold uppercase text-slate-500">
                req
              </span>
            )}
          </div>
          {env.present && env.preview ? (
            <code className="block truncate text-[11px] text-slate-600">{env.preview}</code>
          ) : (
            <span className="text-[11px] text-slate-600">
              {env.secret ? (env.present ? 'definido (oculto)' : 'no definido') : env.present ? '' : 'no definido'}
            </span>
          )}
        </div>
      </div>
      <Badge
        variant="outline"
        className={
          env.present
            ? 'shrink-0 border-emerald-800/50 bg-emerald-900/30 text-[10px] text-emerald-400'
            : env.required
            ? 'shrink-0 border-rose-800/50 bg-rose-900/30 text-[10px] text-rose-400'
            : 'shrink-0 border-slate-700 text-[10px] text-slate-500'
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
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`mt-1.5 truncate text-sm font-bold tabular-nums ${
        tone === 'ok' ? 'text-emerald-400'
        : tone === 'bad' ? 'text-rose-400'
        : 'text-slate-200'
      }`}>
        {value}
      </p>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{children}</Label>;
}

function StyledInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`border-slate-700 bg-slate-950/60 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 ${props.className ?? ''}`}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
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
    if (!baseDomain.trim()) { toast.error('El dominio base es requerido'); return; }
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(baseDomain)) { toast.error('Formato de dominio inválido. Ejemplo: miapp.vercel.app'); return; }
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
      toast.error('Tiempo de sesión debe ser entre 5 y 1440 minutos'); return;
    }
    if (settings.max_login_attempts < 1 || settings.max_login_attempts > 20) {
      toast.error('Intentos de login debe ser entre 1 y 20'); return;
    }
    if (settings.data_retention_days < 7 || settings.data_retention_days > 3650) {
      toast.error('Retención de datos debe ser entre 7 y 3650 días'); return;
    }
    if (settings.maintenance_mode && !data?.settings?.maintenance_mode) {
      if (!confirm('⚠️ Vas a ACTIVAR el modo mantenimiento. Esto bloqueará el acceso a TODOS los usuarios (excepto super admins). ¿Continuar?')) return;
    }
    saveMutation.mutate(settings);
  };

  // ── Export / Import ──
  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: systemInfo?.app.version || '0.1.0',
      settings, baseDomain,
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

  // ── Loading ──
  if (isLoading) {
    return (
      <SuperAdminGuard>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
          </div>
          <p className="text-sm text-slate-500">Cargando configuraciones…</p>
        </div>
      </SuperAdminGuard>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <SuperAdminGuard>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
            <AlertTriangle className="h-7 w-7 text-rose-400" />
          </div>
          <p className="text-sm text-slate-500">{error instanceof Error ? error.message : 'Error'}</p>
          <Button onClick={() => refetch()} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  const dbOk = systemInfo?.database.status === 'connected';
  const enabledFlagsCount = flags.filter((f) => f.enabled).length;

  return (
    <SuperAdminGuard>
      <div className="mx-auto max-w-4xl space-y-5">

        {/* ── Warning banner ── */}
        {data?.loadWarning && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300">{data.loadWarning}</p>
          </div>
        )}

        {/* ── Maintenance banner ── */}
        {settings.maintenance_mode && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3">
            <Power className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-xs font-medium text-rose-300">
              Modo mantenimiento ACTIVO — los usuarios no-superadmin están viendo la página de mantenimiento.
              {!data?.settings?.maintenance_mode && ' (sin guardar todavía)'}
            </p>
          </div>
        )}

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10">
                <Settings className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-50 md:text-3xl">
                    Configuración Global
                  </h1>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    Sistema
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-400">
                  Parámetros del sistema, accesos, features y herramientas del SaaS
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-9 gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Recargar</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-9 gap-2 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700"
              >
                {saveMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Save className="h-3.5 w-3.5" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1 sm:grid-cols-6">
            {[
              { value: 'general', icon: Settings, label: 'General' },
              { value: 'brand', icon: Palette, label: 'Marca' },
              { value: 'security', icon: Lock, label: 'Acceso' },
              { value: 'notifications', icon: Bell, label: 'Avisos' },
              { value: 'flags', icon: Flag, label: 'Features' },
              { value: 'system', icon: ServerCog, label: 'Sistema' },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 rounded-lg text-xs font-semibold text-slate-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ════════ GENERAL ════════ */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <SectionCard>
              <SectionHeader icon={Settings} title="Identidad del sistema" description="Nombre y email principal del SaaS" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <FieldGroup>
                  <FieldLabel>Nombre del Sistema</FieldLabel>
                  <StyledInput
                    id="systemName"
                    value={settings.system_name}
                    onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Email del Sistema</FieldLabel>
                  <StyledInput
                    id="systemEmail"
                    type="email"
                    value={settings.system_email}
                    onChange={(e) => setSettings({ ...settings, system_email: e.target.value })}
                  />
                </FieldGroup>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={Globe} accent="text-violet-400" accentBg="bg-violet-500/10" accentBorder="border-violet-500/20"
                title="Dominio Base (Multitenancy)"
                description="Dominio principal para construir subdominios de cada organización"
              />
              <div className="space-y-3 p-5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                    <StyledInput
                      value={baseDomain}
                      onChange={(e) => setBaseDomain(e.target.value.toLowerCase())}
                      placeholder="miapp.vercel.app"
                      className="pl-10 font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleSaveDomain}
                    disabled={savingDomain}
                    size="sm"
                    className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {savingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                {baseDomain && (
                  <p className="text-xs text-slate-500">
                    Subdominios:{' '}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">tienda.{baseDomain}</code>
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard className={settings.maintenance_mode ? 'border-rose-500/30' : ''}>
              <SectionHeader icon={Power} accent="text-rose-400" accentBg="bg-rose-500/10" accentBorder="border-rose-500/20"
                title="Disponibilidad del servicio"
              />
              <div className="space-y-2 p-5">
                <SettingToggle
                  icon={Power} iconColor="text-rose-400"
                  label="Modo Mantenimiento"
                  description="Bloquea el acceso a todos los usuarios excepto super admins. Aplicado por middleware en todo el sistema."
                  checked={settings.maintenance_mode}
                  onCheckedChange={(v) => setSettings({ ...settings, maintenance_mode: v })}
                  danger
                />
                <SettingToggle
                  icon={Globe} iconColor="text-indigo-400"
                  label="Permitir Registros"
                  description="Permite que nuevas organizaciones se registren. Enforced en el endpoint de signup."
                  checked={settings.allow_registrations}
                  onCheckedChange={(v) => setSettings({ ...settings, allow_registrations: v })}
                />
              </div>
            </SectionCard>
          </TabsContent>

          {/* ════════ MARCA ════════ */}
          <TabsContent value="brand" className="mt-4">
            <BrandTab settings={settings} setSettings={setSettings} />
          </TabsContent>

          {/* ════════ ACCESO / SEGURIDAD ════════ */}
          <TabsContent value="security" className="mt-4 space-y-4">
            <SectionCard>
              <SectionHeader icon={Lock} accent="text-rose-400" accentBg="bg-rose-500/10" accentBorder="border-rose-500/20"
                title="Sesiones y acceso"
              />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <FieldGroup>
                  <FieldLabel>Tiempo de sesión (minutos)</FieldLabel>
                  <StyledInput
                    type="number" min={5} max={1440}
                    value={settings.session_timeout}
                    onChange={(e) => setSettings({ ...settings, session_timeout: Math.max(5, parseInt(e.target.value) || 5) })}
                  />
                  <p className="text-[10px] text-slate-600">5–1440 min</p>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Intentos de login</FieldLabel>
                  <StyledInput
                    type="number" min={1} max={20}
                    value={settings.max_login_attempts}
                    onChange={(e) => setSettings({ ...settings, max_login_attempts: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <p className="text-[10px] text-slate-600">1–20 intentos</p>
                </FieldGroup>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={ShieldCheck} accent="text-emerald-400" accentBg="bg-emerald-500/10" accentBorder="border-emerald-500/20"
                title="Gestionado en Supabase Auth"
                description="Estas políticas se controlan directamente en el proveedor de autenticación."
              />
              <div className="space-y-2 p-5">
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
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  Abrir configuración de Auth en Supabase <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ════════ NOTIFICACIONES ════════ */}
          <TabsContent value="notifications" className="mt-4 space-y-4">
            <SectionCard>
              <SectionHeader icon={Bell} accent="text-amber-400" accentBg="bg-amber-500/10" accentBorder="border-amber-500/20"
                title="Notificaciones del sistema"
                description="Preferencias globales de envío de avisos del SaaS."
              />
              <div className="space-y-2 p-5">
                <SettingToggle icon={Bell} iconColor="text-indigo-400" label="Notificaciones del Sistema"
                  description="Habilita notificaciones generales en la plataforma"
                  checked={settings.enable_notifications}
                  onCheckedChange={(v) => setSettings({ ...settings, enable_notifications: v })} />
                <SettingToggle icon={Mail} iconColor="text-violet-400" label="Notificaciones por Email"
                  description="Envía avisos importantes por email"
                  checked={settings.enable_email_notifications}
                  onCheckedChange={(v) => setSettings({ ...settings, enable_email_notifications: v })} />
                <SettingToggle icon={Bell} iconColor="text-emerald-400" label="Notificaciones SMS"
                  description="Envía avisos críticos por SMS (requiere proveedor configurado)"
                  checked={settings.enable_sms_notifications}
                  onCheckedChange={(v) => setSettings({ ...settings, enable_sms_notifications: v })} />
              </div>
            </SectionCard>
          </TabsContent>

          {/* ════════ FEATURE FLAGS ════════ */}
          <TabsContent value="flags" className="mt-4 space-y-4">
            <SectionCard>
              <SectionHeader
                icon={Flag} accent="text-violet-400" accentBg="bg-violet-500/10" accentBorder="border-violet-500/20"
                title="Feature Flags"
                description={`Activá o desactivá features de forma centralizada. El código consulta estos flags vía isFeatureEnabled().`}
                action={
                  <div className="flex items-center gap-2">
                    {enabledFlagsCount > 0 && (
                      <Badge variant="outline" className="border-violet-500/20 bg-violet-500/10 text-[10px] text-violet-400">
                        {enabledFlagsCount} activos
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      onClick={() => saveFlagsMutation.mutate(flags)}
                      disabled={saveFlagsMutation.isPending}
                      className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {saveFlagsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                  </div>
                }
              />
              <div className="space-y-2 p-5">
                {flags.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Zap className="mb-2 h-8 w-8 text-slate-700" />
                    <p className="text-sm text-slate-500">No hay feature flags definidos.</p>
                  </div>
                ) : (
                  flags.map((flag) => (
                    <div key={flag.key} className={`flex items-start justify-between gap-4 rounded-lg border p-3.5 transition-colors ${
                      flag.enabled
                        ? 'border-violet-500/20 bg-violet-500/5'
                        : 'border-slate-800 bg-slate-950/30'
                    }`}>
                      <div className="flex items-start gap-3">
                        <Flag className={`mt-0.5 h-4 w-4 shrink-0 ${flag.enabled ? 'text-violet-400' : 'text-slate-700'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-200">{flag.label}</p>
                            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">{flag.key}</code>
                          </div>
                          <p className="text-xs text-slate-500">{flag.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(v) => setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: v } : f)))}
                      />
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ════════ SISTEMA ════════ */}
          <TabsContent value="system" className="mt-4 space-y-4">

            {/* System info */}
            <SectionCard>
              <SectionHeader
                icon={ServerCog}
                title="Información del sistema"
                action={
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-300 hover:bg-slate-800" onClick={() => refetchInfo()}>
                    <RefreshCw className={`h-4 w-4 ${infoLoading ? 'animate-spin' : ''}`} />
                  </Button>
                }
              />
              <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
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
              </div>
            </SectionCard>

            {/* Variables de entorno */}
            <SectionCard>
              <SectionHeader
                icon={KeyRound} accent="text-amber-400" accentBg="bg-amber-500/10" accentBorder="border-amber-500/20"
                title="Variables de entorno"
                description="Estado de configuración. Los secretos solo muestran si están definidos, nunca su valor."
                action={
                  systemInfo?.envSummary && (
                    <Badge
                      variant="outline"
                      className={
                        systemInfo.envSummary.missingRequired.length === 0
                          ? 'border-emerald-800/50 bg-emerald-900/30 text-[10px] text-emerald-400'
                          : 'border-rose-800/50 bg-rose-900/30 text-[10px] text-rose-400'
                      }
                    >
                      {systemInfo.envSummary.present}/{systemInfo.envSummary.total} configuradas
                    </Badge>
                  )
                }
              />
              <div className="space-y-4 p-5">
                {systemInfo?.envSummary && systemInfo.envSummary.missingRequired.length > 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <p className="text-xs text-rose-300">
                      Faltan variables requeridas:{' '}
                      <strong>{systemInfo.envSummary.missingRequired.join(', ')}</strong>
                    </p>
                  </div>
                )}
                {!systemInfo?.env ? (
                  <p className="py-4 text-center text-sm text-slate-500">Cargando estado de variables…</p>
                ) : (
                  (['core', 'app', 'optional'] as const).map((group) => {
                    const vars = systemInfo.env!.filter((v) => v.group === group);
                    if (vars.length === 0) return null;
                    return (
                      <div key={group} className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          {ENV_GROUP_LABELS[group]}
                        </p>
                        {vars.map((v) => <EnvRow key={v.key} env={v} />)}
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>

            {/* Export / Import */}
            <SectionCard>
              <SectionHeader
                icon={Download} accent="text-emerald-400" accentBg="bg-emerald-500/10" accentBorder="border-emerald-500/20"
                title="Respaldo de configuración"
                description="Exportá o importá toda la configuración (settings, dominio y feature flags) como JSON."
              />
              <div className="flex flex-wrap items-center gap-2 p-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="h-9 gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  <Download className="h-4 w-4" /> Exportar JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  <Upload className="h-4 w-4" /> Importar JSON
                </Button>
                <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
                <p className="w-full text-[11px] text-slate-500">
                  Al importar se cargan los valores en el formulario; presioná <strong className="text-slate-400">Guardar cambios</strong> para aplicarlos.
                </p>
              </div>
            </SectionCard>

            {/* Change history */}
            <SectionCard>
              <SectionHeader
                icon={History}
                title="Historial de cambios"
                description="Últimas modificaciones de configuración registradas en auditoría."
              />
              <div className="p-5">
                {!history || history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Clock className="mb-2 h-8 w-8 text-slate-700" />
                    <p className="text-sm text-slate-500">Sin cambios registrados todavía.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-300">
                            {(entry.metadata?.updated_keys?.length ?? 0) > 0
                              ? `Actualizó ${entry.metadata!.updated_keys!.length} parámetro(s): `
                              : 'Cambio de configuración '}
                            <span className="text-xs text-slate-500">
                              {entry.metadata?.updated_keys?.slice(0, 6).join(', ')}
                              {(entry.metadata?.updated_keys?.length ?? 0) > 6 ? '…' : ''}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-600">{formatDate(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>

        {/* ── Footer info ── */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
          <p className="text-xs text-slate-600">
            Modo mantenimiento y permitir-registros se aplican de verdad (middleware + signup). 2FA y verificación de email se gestionan en Supabase Auth.
            Caché, sesiones y purga de logs viven en <strong className="text-slate-500">Mantenimiento</strong>.
          </p>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
