'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileJson,
  Globe2,
  HardDrive,
  Info,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Monitor,
  PackageSearch,
  Phone,
  PlugZap,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  Store,
  UsersRound,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import { CompanySettings } from './CompanySettings';
import { SecuritySettingsTab } from './SecuritySettingsTab';
import {
  useChangePassword,
  useSystemSettings,
  useUpdateSystemSettings,
  useUpdateUserSettings,
  useUserSettings,
  type SystemSettings,
  type UserSettings,
} from '../hooks/useOptimizedSettings';

interface SectionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

interface SettingLineProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  children: ReactNode;
}

type TeamUser = {
  id: string;
  email?: string;
  name?: string;
  full_name?: string;
  role?: string;
  status?: string;
  isActive?: boolean;
  created_at?: string;
};

type RoleSummary = {
  id: string;
  name?: string;
  displayName?: string;
  description?: string;
  userCount?: number;
  isActive?: boolean;
  permissions?: unknown[];
};

type BranchSummary = {
  id: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type SessionPreview = {
  id: string;
  userEmail?: string;
  deviceType?: string;
  isActive?: boolean;
  riskLevel?: string;
  lastActivity?: string;
};

type AuditPreview = {
  id: string;
  action?: string;
  resource?: string;
  entity_type?: string;
  created_at?: string;
  user_id?: string;
};

function SectionCard({ title, description, icon: Icon, children, className, action }: SectionCardProps) {
  return (
    <Card className={cn('rounded-lg border-border/70 bg-card shadow-sm', className)}>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SettingLine({ title, description, icon: Icon, children }: SettingLineProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0 sm:min-w-[180px]">{children}</div>
    </div>
  );
}

function InfoTooltip({ label }: { label: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SettingsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  );
}

function SaveRow({
  hasChanges,
  isSaving,
  onSave,
  label,
}: {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  label: string;
}) {
  if (!hasChanges) return null;

  return (
    <div className="flex justify-end">
      <PermissionGuard permission="settings.edit">
        <Button onClick={onSave} disabled={isSaving} className="min-w-[180px]">
          {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {label}
        </Button>
      </PermissionGuard>
    </div>
  );
}

function asNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha';
  try {
    return new Intl.DateTimeFormat('es-PY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function selectedOrganizationHeaders(organizationId: string | null): HeadersInit {
  return organizationId ? { 'x-organization-id': organizationId } : {};
}

function SettingsIcon(props: React.ComponentProps<typeof Settings2>) {
  return <Settings2 {...props} />;
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ActionLinkCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>
            Abrir
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function GeneralSettings() {
  const { data: userSettings, isLoading: userLoading } = useUserSettings();
  const { data: systemSettings, isLoading: systemLoading } = useSystemSettings();
  const organizationId = useCurrentOrganizationId();
  const updateUserSettings = useUpdateUserSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const [localUser, setLocalUser] = useState<Partial<UserSettings>>({});
  const [localSystem, setLocalSystem] = useState<Partial<SystemSettings>>({});
  const [pyApplied, setPyApplied] = useState(false);

  const currentUser = { ...userSettings, ...localUser };
  const currentSystem = { ...systemSettings, ...localSystem };
  const hasUserChanges = Object.keys(localUser).length > 0;
  const hasSystemChanges = Object.keys(localSystem).length > 0;
  const hasChanges = hasUserChanges || hasSystemChanges;
  const isSaving = updateUserSettings.isPending || updateSystemSettings.isPending;

  const updateUser = (key: keyof UserSettings, value: unknown) => {
    setLocalUser((prev) => ({ ...prev, [key]: value }));
  };

  const updateSystem = (key: keyof SystemSettings, value: unknown) => {
    setLocalSystem((prev) => ({ ...prev, [key]: value }));
  };

  // Live preview: format current date using the selected date_format and time_format
  const previewDate = useMemo(() => {
    const now = new Date();
    const fmt = currentSystem.date_format || 'DD/MM/YYYY';
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear());
    let datePart = fmt
      .replace('DD', d)
      .replace('MM', m)
      .replace('YYYY', y);

    const is12 = (currentSystem.time_format || '24h') === '12h';
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    if (is12) hours = hours % 12 || 12;
    const timePart = `${String(hours).padStart(2, '0')}:${minutes}${is12 ? ` ${ampm}` : ''}`;

    return `${datePart} · ${timePart}`;
  }, [currentSystem.date_format, currentSystem.time_format]);

  const applyParaguayDefaults = () => {
    setLocalSystem((prev) => ({
      ...prev,
      timezone: 'America/Asuncion',
      currency: 'PYG',
      date_format: 'DD/MM/YYYY',
      time_format: '24h',
      decimal_places: 0,
      language: 'es-PY',
    }));
    setPyApplied(true);
    setTimeout(() => setPyApplied(false), 2000);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    if (hasUserChanges) {
      await updateUserSettings.mutateAsync(localUser);
      setLocalUser({});
    }
    if (hasSystemChanges) {
      await updateSystemSettings.mutateAsync(localSystem);
      setLocalSystem({});
    }
  };

  if (userLoading || systemLoading) {
    return <SettingsSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* USER PREFERENCES */}
        <SectionCard
          title="Preferencias personales"
          description="Opciones de tu cuenta. No afectan al resto del equipo."
          icon={SettingsIcon}
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Idioma de interfaz</Label>
                <Select
                  value={currentUser.language || 'es'}
                  onValueChange={(value) => updateUser('language', value)}
                >
                  <SelectTrigger className="focus-visible:ring-primary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Densidad del dashboard</Label>
                <Select
                  value={currentUser.dashboard_layout || 'comfortable'}
                  onValueChange={(value) => updateUser('dashboard_layout', value)}
                >
                  <SelectTrigger className="focus-visible:ring-primary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compacta</SelectItem>
                    <SelectItem value="comfortable">Normal</SelectItem>
                    <SelectItem value="spacious">Amplia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SettingLine
              title="Mostrar tooltips"
              description="Ayuda contextual para acciones sensibles y controles complejos."
              icon={Info}
            >
              <Switch
                checked={currentUser.show_tooltips ?? true}
                onCheckedChange={(checked) => updateUser('show_tooltips', checked)}
              />
            </SettingLine>
            <SettingLine
              title="Autoguardado de preferencias"
              description="Mantiene preferencias de pantalla sin esperar un guardado manual."
              icon={CheckCircle2}
            >
              <Switch
                checked={currentUser.auto_save ?? true}
                onCheckedChange={(checked) => updateUser('auto_save', checked)}
              />
            </SettingLine>
            <SettingLine
              title="Notificaciones personales"
              description="Activa o pausa alertas de cuenta y actividad."
              icon={Bell}
            >
              <Switch
                checked={currentUser.notifications_enabled ?? true}
                onCheckedChange={(checked) => updateUser('notifications_enabled', checked)}
              />
            </SettingLine>

            {hasUserChanges && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Tienes cambios personales sin guardar
              </div>
            )}
          </div>
        </SectionCard>

        {/* SYSTEM REGIONAL — only shown if org is selected */}
        {organizationId ? (
          <SectionCard
            title="Región y moneda"
            description="Afecta a todo el sistema: precios, fechas y reportes de la organización."
            icon={Globe2}
            action={
              <Button
                variant={pyApplied ? 'default' : 'outline'}
                size="sm"
                onClick={applyParaguayDefaults}
                className="shrink-0 transition-all"
              >
                {pyApplied ? (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Aplicado
                  </>
                ) : (
                  'Aplicar 🇵🇾 PY'
                )}
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Zona horaria</Label>
                  <Select
                    value={currentSystem.timezone || 'America/Asuncion'}
                    onValueChange={(value) => updateSystem('timezone', value)}
                  >
                    <SelectTrigger className="focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Asuncion">América/Asunción (PY)</SelectItem>
                      <SelectItem value="America/Argentina/Buenos_Aires">América/Buenos Aires (AR)</SelectItem>
                      <SelectItem value="America/Sao_Paulo">América/São Paulo (BR)</SelectItem>
                      <SelectItem value="America/Lima">América/Lima (PE)</SelectItem>
                      <SelectItem value="America/Bogota">América/Bogotá (CO)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Moneda</Label>
                    <InfoTooltip label="Cambia cómo se muestran los precios en el POS y reportes. No convierte valores existentes." />
                  </div>
                  <Select
                    value={currentSystem.currency || 'PYG'}
                    onValueChange={(value) => {
                      updateSystem('currency', value);
                      // Auto-ajustar decimales según moneda
                      if (value === 'PYG') updateSystem('decimal_places', 0);
                      else if (!localSystem.decimal_places) updateSystem('decimal_places', 2);
                    }}
                  >
                    <SelectTrigger className="focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PYG">₲ Guaraní (PYG)</SelectItem>
                      <SelectItem value="USD">$ Dólar (USD)</SelectItem>
                      <SelectItem value="BRL">R$ Real (BRL)</SelectItem>
                      <SelectItem value="ARS">$ Peso Arg. (ARS)</SelectItem>
                      <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Formato de fecha</Label>
                  <Select
                    value={currentSystem.date_format || 'DD/MM/YYYY'}
                    onValueChange={(value) => updateSystem('date_format', value)}
                  >
                    <SelectTrigger className="focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Formato de hora</Label>
                  <Select
                    value={currentSystem.time_format || '24h'}
                    onValueChange={(value) => updateSystem('time_format', value as '12h' | '24h')}
                  >
                    <SelectTrigger className="focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 horas (14:30)</SelectItem>
                      <SelectItem value="12h">12 horas (02:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Decimales</Label>
                    <InfoTooltip label="Cantidad de decimales al mostrar precios. PYG normalmente usa 0." />
                  </div>
                  <Select
                    value={String(currentSystem.decimal_places ?? 0)}
                    onValueChange={(value) => updateSystem('decimal_places', Number(value))}
                  >
                    <SelectTrigger className="focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 — sin decimales (ej: 150.000)</SelectItem>
                      <SelectItem value="2">2 — estándar (ej: 150.00)</SelectItem>
                      <SelectItem value="3">3 — alta precisión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Idioma del sistema</Label>
                  <Select
                    value={currentSystem.language || 'es-PY'}
                    onValueChange={(value) => updateSystem('language', value)}
                  >
                    <SelectTrigger className="focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es-PY">Español (Paraguay)</SelectItem>
                      <SelectItem value="es">Español (genérico)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Live preview */}
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Vista previa de fecha y hora</p>
                  <p className="text-sm font-semibold tabular-nums">{previewDate}</p>
                </div>
              </div>

              {hasSystemChanges && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Los cambios regionales afectan precios y reportes del sistema al guardar.
                </div>
              )}
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            title="Región y moneda"
            description="Selecciona una organización activa para configurar parámetros regionales."
            icon={Globe2}
          >
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Globe2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Selecciona una organización para editar la configuración regional del sistema.
              </p>
            </div>
          </SectionCard>
        )}
      </div>

      <SaveRow hasChanges={hasChanges} isSaving={isSaving} onSave={() => void handleSave()} label="Guardar configuración general" />
    </div>
  );
}


export function CompanyProfileSettings() {
  return <CompanySettings />;
}


function CompanyContactSettings() {
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});

  const currentSettings = { ...systemSettings, ...localSettings };
  const hasChanges = Object.keys(localSettings).length > 0;

  const updateSetting = (key: keyof SystemSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSystemSettings.mutate(localSettings, {
      onSuccess: () => setLocalSettings({}),
    });
  };

  if (isLoading) {
    return <SettingsSkeleton rows={2} />;
  }

  return (
    <SectionCard
      title="Contacto publico"
      description="Datos que alimentan recibos, sitio publico y comunicaciones."
      icon={Building2}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="business-email">Email comercial</Label>
          <Input
            id="business-email"
            type="email"
            value={currentSettings.email || ''}
            onChange={(event) => updateSetting('email', event.target.value)}
            placeholder="ventas@empresa.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-phone">Telefono</Label>
          <Input
            id="business-phone"
            value={currentSettings.phone || ''}
            onChange={(event) => updateSetting('phone', event.target.value)}
            placeholder="+595 ..."
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="business-address">Direccion</Label>
          <Input
            id="business-address"
            value={currentSettings.address || ''}
            onChange={(event) => updateSetting('address', event.target.value)}
            placeholder="Direccion principal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-website">Sitio web</Label>
          <Input
            id="business-website"
            value={currentSettings.website || ''}
            onChange={(event) => updateSetting('website', event.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-logo">Logo URL</Label>
          <Input
            id="business-logo"
            value={currentSettings.logo_url || ''}
            onChange={(event) => updateSetting('logo_url', event.target.value)}
            placeholder="https://cdn..."
          />
        </div>
      </div>

      <div className="mt-6">
        <SaveRow
          hasChanges={hasChanges}
          isSaving={updateSystemSettings.isPending}
          onSave={handleSave}
          label="Guardar contacto"
        />
      </div>
    </SectionCard>
  );
}

export function UsersRolesSettings() {
  const organizationId = useCurrentOrganizationId();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeamData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = selectedOrganizationHeaders(organizationId);
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/users?limit=8', { cache: 'no-store', headers }),
        fetch('/api/roles?includeInactive=false', { cache: 'no-store', headers }),
      ]);

      const errors: string[] = [];
      let nextUsers: TeamUser[] = [];
      let nextRoles: RoleSummary[] = [];
      let nextTotal = 0;

      if (usersRes.ok) {
        const p = await usersRes.json();
        nextUsers = Array.isArray(p?.data) ? p.data : Array.isArray(p?.users) ? p.users : [];
        nextTotal = Number(p?.total ?? nextUsers.length);
      } else errors.push('usuarios');

      if (rolesRes.ok) {
        const p = await rolesRes.json();
        nextRoles = Array.isArray(p) ? p : Array.isArray(p?.data) ? p.data : [];
      } else errors.push('roles');

      setUsers(nextUsers);
      setRoles(nextRoles);
      setTotalUsers(nextTotal);
      if (errors.length > 0) setError(`No se pudieron cargar: ${errors.join(' y ')}`);
    } catch {
      setError('No se pudo cargar el equipo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const activeUsers = users.filter((u) => u.isActive !== false && u.status !== 'INACTIVE').length;
  const activeRoles = roles.filter((r) => r.isActive !== false).length;

  const getInitials = (user: TeamUser) => {
    const name = user.full_name || user.name || user.email || '';
    return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || '?';
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={UsersRound} label="Usuarios totales" value={totalUsers || users.length} />
        <MetricCard icon={BadgeCheck} label="Activos ahora" value={activeUsers} />
        <MetricCard icon={ShieldCheck} label="Roles configurados" value={activeRoles || roles.length} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Users list */}
        <SectionCard
          title="Equipo"
          description="Últimos usuarios registrados en la organización."
          icon={UsersRound}
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/users">
                Gestionar <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {isLoading ? (
            <SettingsSkeleton rows={4} />
          ) : users.length === 0 ? (
            <EmptyPanel title="Sin usuarios registrados" description="Crea usuarios desde el módulo de usuarios." />
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(user)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.full_name || user.name || user.email || 'Usuario'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email || 'Sin email'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-xs">{user.role || 'USER'}</Badge>
                    <Badge
                      variant={user.isActive === false || user.status === 'INACTIVE' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {user.isActive === false || user.status === 'INACTIVE' ? 'Inactivo' : 'Activo'}
                    </Badge>
                  </div>
                </div>
              ))}
              {totalUsers > users.length && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  Mostrando {users.length} de {totalUsers} usuarios
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* Roles */}
        <SectionCard
          title="Roles"
          description="Roles activos en la organización."
          icon={ShieldCheck}
        >
          {isLoading ? (
            <SettingsSkeleton rows={3} />
          ) : roles.length === 0 ? (
            <EmptyPanel title="Sin roles configurados" description="Los roles se crean desde seguridad." />
          ) : (
            <div className="space-y-2">
              {roles.slice(0, 6).map((role) => (
                <div key={role.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {role.displayName || role.name || 'Rol'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {role.description || `${role.permissions?.length ?? 0} permisos`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {role.userCount ?? 0} usuarios
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}



export function SalesBillingSettings() {
  const organizationId = useCurrentOrganizationId();
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});
  const currentSettings = { ...systemSettings, ...localSettings };
  const hasChanges = Object.keys(localSettings).length > 0;

  const updateSetting = (key: keyof SystemSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSystemSettings.mutate(localSettings, {
      onSuccess: () => setLocalSettings({}),
    });
  };

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Selecciona una organización activa para configurar las reglas de venta.</AlertDescription>
        </Alert>
        <SettingsSkeleton rows={3} />
      </div>
    );
  }

  if (isLoading) {
    return <SettingsSkeleton rows={4} />;
  }

  const taxRate = Number(currentSettings.tax_rate ?? 10);
  const maxDiscount = Number(currentSettings.max_discount_percentage ?? 50);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Reglas de Ventas y Facturación"
        description="Parámetros fiscales y operativos que aplican en el Punto de Venta (POS) y facturación general."
        icon={Receipt}
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-5">
            <div className="space-y-4 rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all hover:border-primary/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">IVA por defecto</Label>
                  <InfoTooltip label="Se usará como el impuesto base al registrar nuevos productos y ventas." />
                </div>
                <div className="flex items-center justify-center rounded-md bg-primary/10 px-3 py-1">
                  <span className="text-xl font-bold text-primary">{taxRate}%</span>
                </div>
              </div>
              <Slider 
                value={[taxRate]} 
                min={0} 
                max={30} 
                step={0.5} 
                onValueChange={([value]) => updateSetting('tax_rate', value)} 
                className="py-2"
              />
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>0%</span>
                <span>10%</span>
                <span>30%</span>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all hover:border-primary/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Descuento máximo</Label>
                  <InfoTooltip label="Límite máximo de descuento permitido en una sola venta." />
                </div>
                <div className="flex items-center justify-center rounded-md bg-primary/10 px-3 py-1">
                  <span className="text-xl font-bold text-primary">{maxDiscount}%</span>
                </div>
              </div>
              <Slider
                value={[maxDiscount]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => updateSetting('max_discount_percentage', value)}
                className="py-2"
              />
            </div>
          </div>

          <div className="space-y-4">
            <SettingLine
              title="Requerir datos del cliente"
              description="Exige identificar a un cliente registrado antes de completar una venta."
              icon={UsersRound}
            >
              <Switch
                checked={currentSettings.require_customer_info ?? false}
                onCheckedChange={(checked) => updateSetting('require_customer_info', checked)}
              />
            </SettingLine>
            <SettingLine
              title="Notificaciones de venta"
              description="Envía avisos operativos por email cuando ocurren eventos de venta."
              icon={Bell}
            >
              <Switch
                checked={currentSettings.email_notifications ?? true}
                onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
              />
            </SettingLine>
            
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 transition-all hover:bg-primary/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-primary">Módulo de Facturación</p>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Accede al módulo dedicado para emitir, anular y gestionar todas tus facturas y comprobantes.
                  </p>
                </div>
                <Button asChild variant="default" size="sm" className="shrink-0 shadow-sm">
                  <Link href="/dashboard/invoicing">
                    Abrir Módulo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SaveRow
        hasChanges={hasChanges}
        isSaving={updateSystemSettings.isPending}
        onSave={handleSave}
        label="Guardar configuración de ventas"
      />
    </div>
  );
}

export function InventorySettings() {
  const organizationId = useCurrentOrganizationId();
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});
  const [stats, setStats] = useState<{ total: number; lowStock: number; outOfStock: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const currentSettings = { ...systemSettings, ...localSettings };
  const hasChanges = Object.keys(localSettings).length > 0;
  const threshold = Number(currentSettings.low_stock_threshold ?? 10);

  const updateSetting = (key: keyof SystemSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSystemSettings.mutate(localSettings, {
      onSuccess: () => {
        setLocalSettings({});
        toast({ title: 'Inventario guardado', description: 'Configuración sincronizada con Supabase.' });
      },
      onError: () => {
        toast({ title: 'Error al guardar', description: 'No se pudo sincronizar con el servidor.', variant: 'destructive' });
      },
    });
  };

  // Fetch real stock statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!organizationId) { setStatsLoading(false); return; }
      setStatsLoading(true);
      try {
        const headers = selectedOrganizationHeaders(organizationId);
        const [productsRes, alertsRes] = await Promise.all([
          fetch('/api/products?limit=1&countOnly=true', { cache: 'no-store', headers }),
          fetch(`/api/stock-alerts?threshold=${threshold}`, { cache: 'no-store', headers }),
        ]);

        let total = 0;
        let lowStock = 0;
        let outOfStock = 0;

        if (productsRes.ok) {
          const p = await productsRes.json();
          total = Number(p?.total ?? p?.count ?? p?.data?.length ?? 0);
        }
        if (alertsRes.ok) {
          const a = await alertsRes.json();
          const alerts = Array.isArray(a?.data) ? a.data : Array.isArray(a) ? a : [];
          outOfStock = alerts.filter((item: Record<string, unknown>) => Number(item.stock ?? item.quantity ?? 0) === 0).length;
          lowStock = alerts.length - outOfStock;
        }

        setStats({ total, lowStock, outOfStock });
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  if (isLoading) return <SettingsSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      {/* Live stats from Supabase */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsLoading ? (
          <>
            <SettingsSkeleton rows={1} />
            <SettingsSkeleton rows={1} />
            <SettingsSkeleton rows={1} />
          </>
        ) : (
          <>
            <MetricCard icon={PackageSearch} label="Productos registrados" value={stats?.total ?? '—'} />
            <MetricCard icon={AlertTriangle} label="Bajo umbral de stock" value={stats?.lowStock ?? '—'} />
            <MetricCard icon={AlertTriangle} label="Sin stock" value={stats?.outOfStock ?? '—'} />
          </>
        )}
      </div>

      <SectionCard
        title="Control de inventario"
        description="Reglas globales de stock sincronizadas con Supabase."
        icon={PackageSearch}
      >
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Tracking toggle */}
          <SettingLine
            title="Seguimiento automático"
            description="Descuenta stock con cada venta, devolución y ajuste de inventario."
            icon={PackageSearch}
          >
            <Switch
              checked={currentSettings.enable_inventory_tracking ?? true}
              onCheckedChange={(checked) => updateSetting('enable_inventory_tracking', checked)}
            />
          </SettingLine>

          {/* Threshold with live preview */}
          <div className="space-y-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="low-stock" className="text-sm font-medium">Umbral de stock bajo</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Alerta cuando el stock cae por debajo de este valor.
                </p>
              </div>
              <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-xl font-bold text-primary">{threshold}</span>
              </div>
            </div>
            <Slider
              id="low-stock"
              value={[threshold]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => updateSetting('low_stock_threshold', value)}
              className="py-1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 unidades</span>
              <span>50</span>
              <span>100 unidades</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Quick access links */}
      <div className="grid gap-4 md:grid-cols-2">
        <ActionLinkCard
          icon={PackageSearch}
          title="Catálogo de productos"
          description="Gestiona productos, variantes, precios y códigos SKU."
          href="/dashboard/products"
        />
        <ActionLinkCard
          icon={AlertTriangle}
          title="Alertas de stock"
          description="Revisa en tiempo real los productos por debajo del umbral."
          href="/dashboard/stock-alerts"
        />
      </div>

      <SaveRow
        hasChanges={hasChanges}
        isSaving={updateSystemSettings.isPending}
        onSave={handleSave}
        label="Guardar inventario"
      />
    </div>
  );
}


export function BranchesSettings() {
  const organizationId = useCurrentOrganizationId();
  const { toast } = useToast();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planBlocked, setPlanBlocked] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });

  const loadBranches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!organizationId) {
        setBranches([]);
        setError('Selecciona una organización para ver sus sucursales.');
        return;
      }

      const response = await fetch('/api/branches', {
        cache: 'no-store',
        headers: selectedOrganizationHeaders(organizationId),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron cargar sucursales');
      }

      setBranches(Array.isArray(payload?.data) ? payload.data : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar sucursales');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const createBranch = async (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: 'Nombre requerido', description: 'Ingresa el nombre de la sucursal.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    setPlanBlocked(false);
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...selectedOrganizationHeaders(organizationId) },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();

      if (response.status === 403) {
        setPlanBlocked(true);
        setIsDialogOpen(false);
        toast({
          title: 'Plan no permite múltiples sucursales',
          description: 'Actualiza tu plan para gestionar más de una sede.',
          variant: 'destructive',
        });
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo crear la sucursal');
      }

      toast({ title: 'Sucursal creada', description: `"${formData.name}" fue agregada correctamente.` });
      setFormData({ name: '', address: '', phone: '' });
      setIsDialogOpen(false);
      await loadBranches();
    } catch (createError) {
      toast({
        title: 'Error al crear sucursal',
        description: createError instanceof Error ? createError.message : 'No se pudo crear la sucursal',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const activeBranches = branches.filter((b) => b.is_active !== false).length;
  const sortedBranches = useMemo(
    () => [...branches].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [branches]
  );
  const lastBranchDate = sortedBranches[0]?.created_at
    ? formatDateTime(sortedBranches[0].created_at).split(',')[0]
    : '—';

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={MapPin} label="Sucursales registradas" value={branches.length} />
        <MetricCard icon={Store} label="Sucursales activas" value={activeBranches} />
        <MetricCard icon={Clock3} label="Última alta" value={lastBranchDate} />
      </div>

      {/* Plan warning */}
      {planBlocked && (
        <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tu plan actual solo permite <strong>una sucursal</strong>. Actualiza tu suscripción para habilitar múltiples sedes.
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SectionCard
        title="Locales operativos"
        description="Sedes físicas de tu negocio — caja, inventario y ventas por ubicación."
        icon={Building2}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => void loadBranches()}
              disabled={isLoading}
              title="Actualizar sucursales"
            >
              <Loader2 className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormData({ name: '', address: '', phone: '' }); }}>
              <DialogTrigger asChild>
                <Button className="shadow-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva sucursal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Nueva sucursal
                  </DialogTitle>
                  <DialogDescription>
                    Registra una nueva sede física en Supabase.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => void createBranch(e)} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="branch-name">
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="branch-name"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ej. Sede Central, Sucursal Norte..."
                      className="focus-visible:ring-primary/50"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-address">Dirección</Label>
                    <Input
                      id="branch-address"
                      value={formData.address}
                      onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Av. Principal 123..."
                      className="focus-visible:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-phone">Teléfono</Label>
                    <Input
                      id="branch-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+595 9XX XXX XXX"
                      className="focus-visible:ring-primary/50"
                    />
                  </div>
                  <DialogFooter className="gap-2 border-t pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreating} className="min-w-[110px]">
                      {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Guardar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsSkeleton rows={1} />
            <SettingsSkeleton rows={1} />
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/10 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Sin sucursales configuradas</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Crea tu primera sede para empezar a gestionar inventario y ventas por ubicación.
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Crear primera sucursal
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedBranches.map((branch) => (
              <div
                key={branch.id}
                className="group flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                      branch.is_active !== false ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold leading-tight group-hover:text-primary transition-colors">
                        {branch.name}
                      </p>
                      {branch.slug && (
                        <Badge variant="secondary" className="mt-0.5 text-[10px] uppercase tracking-wider px-1.5 py-0">
                          {branch.slug}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      'shrink-0 text-xs',
                      branch.is_active !== false
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {branch.is_active !== false ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-1.5 border-t border-border/50 pt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{branch.address || 'Sin dirección registrada'}</span>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{branch.phone}</span>
                    </div>
                  )}
                  {branch.created_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDateTime(branch.created_at).split(',')[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}



export function IntegrationsSettings() {
  const { data: systemSettings, isLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const currentSettings = { ...systemSettings, ...localSettings };
  const hasChanges = Object.keys(localSettings).length > 0;

  const updateSetting = (key: keyof SystemSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSystemSettings.mutate(localSettings, {
      onSuccess: () => setLocalSettings({}),
    });
  };

  const testSmtp = async () => {
    if (!currentSettings.smtp_host || !currentSettings.smtp_port || !currentSettings.smtp_user || !currentSettings.smtp_password) {
      toast({
        title: 'Datos SMTP incompletos',
        description: 'Completa host, puerto, usuario y password para probar.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingSmtp(true);
    try {
      const response = await fetch('/api/system/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: currentSettings.smtp_host,
          smtp_port: currentSettings.smtp_port,
          smtp_user: currentSettings.smtp_user,
          smtp_password: currentSettings.smtp_password,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo conectar al SMTP');
      }

      toast({ title: 'SMTP conectado', description: payload?.message || 'La conexion fue exitosa.' });
    } catch (smtpError) {
      toast({
        title: 'Error SMTP',
        description: smtpError instanceof Error ? smtpError.message : 'No se pudo conectar al SMTP',
        variant: 'destructive',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  if (isLoading) {
    return <SettingsSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Hardware POS"
          description="Conectores fisicos disponibles en el punto de venta."
          icon={Monitor}
        >
          <div className="space-y-4">
            <SettingLine title="Lector de codigos" description="Habilita escaneo rapido de productos." icon={PlugZap}>
              <Switch
                checked={currentSettings.enable_barcode_scanner ?? true}
                onCheckedChange={(checked) => updateSetting('enable_barcode_scanner', checked)}
              />
            </SettingLine>
            <SettingLine title="Impresora de tickets" description="Permite impresion automatica de comprobantes." icon={Receipt}>
              <Switch
                checked={currentSettings.enable_receipt_printer ?? true}
                onCheckedChange={(checked) => updateSetting('enable_receipt_printer', checked)}
              />
            </SettingLine>
            <SettingLine title="Cajon de dinero" description="Controla apertura desde el flujo de cobro." icon={Store}>
              <Switch
                checked={currentSettings.enable_cash_drawer ?? true}
                onCheckedChange={(checked) => updateSetting('enable_cash_drawer', checked)}
              />
            </SettingLine>
          </div>
        </SectionCard>

        <SectionCard
          title="Correo saliente"
          description="SMTP para avisos del sistema, reportes y seguridad."
          icon={Server}
          action={
            currentSettings.smtp_password_configured ? (
              <Badge variant="outline">Password guardado</Badge>
            ) : (
              <Badge variant="secondary">Pendiente</Badge>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-host">Servidor SMTP</Label>
              <Input
                id="smtp-host"
                value={currentSettings.smtp_host || ''}
                onChange={(event) => updateSetting('smtp_host', event.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Puerto</Label>
              <Input
                id="smtp-port"
                type="number"
                value={currentSettings.smtp_port || 587}
                onChange={(event) => updateSetting('smtp_port', asNumber(event.target.value, 587))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-secure">TLS</Label>
              <Select
                value={(currentSettings.smtp_secure ?? true) ? 'true' : 'false'}
                onValueChange={(value) => updateSetting('smtp_secure', value === 'true')}
              >
                <SelectTrigger id="smtp-secure">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-user">Usuario</Label>
              <Input
                id="smtp-user"
                value={currentSettings.smtp_user || ''}
                onChange={(event) => updateSetting('smtp_user', event.target.value)}
                placeholder="notificaciones@empresa.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-password">Password / App password</Label>
              <Input
                id="smtp-password"
                type="password"
                value={currentSettings.smtp_password || ''}
                onChange={(event) => updateSetting('smtp_password', event.target.value)}
                placeholder={currentSettings.smtp_password_configured ? 'Password ya configurado' : 'Password SMTP'}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => void testSmtp()} disabled={isTestingSmtp}>
              {isTestingSmtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Probar SMTP
            </Button>
          </div>
        </SectionCard>
      </div>

      <SaveRow
        hasChanges={hasChanges}
        isSaving={updateSystemSettings.isPending}
        onSave={handleSave}
        label="Guardar integraciones"
      />
    </div>
  );
}

export function SecurityWorkspaceSettings() {
  return (
    <div className="space-y-6">
      <PasswordChangeCard />
      <SecurityActivityPreview />
      <SecuritySettingsTab />
    </div>
  );
}

function PasswordChangeCard() {
  const changePassword = useChangePassword();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const updateField = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (formData.new_password.length < 8) {
      toast({
        title: 'Password debil',
        description: 'La nueva contrasena debe tener al menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast({
        title: 'No coincide',
        description: 'La confirmacion debe coincidir con la nueva contrasena.',
        variant: 'destructive',
      });
      return;
    }

    await changePassword.mutateAsync({
      current_password: formData.current_password,
      new_password: formData.new_password,
    });
    setFormData({ current_password: '', new_password: '', confirm_password: '' });
  };

  return (
    <SectionCard
      title="Cambiar contrasena"
      description="Actualizacion segura para la cuenta activa."
      icon={KeyRound}
    >
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="current-password">Contrasena actual</Label>
          <Input
            id="current-password"
            type="password"
            value={formData.current_password}
            onChange={(event) => updateField('current_password', event.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">Nueva contrasena</Label>
          <Input
            id="new-password"
            type="password"
            value={formData.new_password}
            onChange={(event) => updateField('new_password', event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar</Label>
          <Input
            id="confirm-password"
            type="password"
            value={formData.confirm_password}
            onChange={(event) => updateField('confirm_password', event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="md:col-span-3 md:flex md:justify-end">
          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
            Cambiar contrasena
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function SecurityActivityPreview() {
  const [sessions, setSessions] = useState<SessionPreview[]>([]);
  const [audits, setAudits] = useState<AuditPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSecurityData = async () => {
      setIsLoading(true);
      try {
        const [sessionsResponse, auditResponse] = await Promise.allSettled([
          fetch('/api/admin/sessions?limit=4&status=all', { cache: 'no-store' }),
          fetch('/api/admin/audit?limit=4', { cache: 'no-store' }),
        ]);

        if (sessionsResponse.status === 'fulfilled' && sessionsResponse.value.ok) {
          const payload = await sessionsResponse.value.json();
          setSessions(Array.isArray(payload?.items) ? payload.items : []);
        }

        if (auditResponse.status === 'fulfilled' && auditResponse.value.ok) {
          const payload = await auditResponse.value.json();
          setAudits(Array.isArray(payload?.data) ? payload.data : []);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadSecurityData();
  }, []);

  const activeSessionCount = sessions.filter((session) => session.isActive !== false).length;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Sesiones activas"
        description="Vista rapida de accesos recientes."
        icon={Activity}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/profile/sessions">
              Ver sesiones
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      >
        {isLoading ? (
          <SettingsSkeleton rows={2} />
        ) : sessions.length === 0 ? (
          <EmptyPanel title="Sin sesiones visibles" description="No hay sesiones para mostrar o faltan permisos." />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Activas en vista</span>
              <Badge>{activeSessionCount}</Badge>
            </div>
            {sessions.map((session) => (
              <div key={session.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{session.userEmail || 'Sesion'}</p>
                  <Badge variant={session.riskLevel === 'high' ? 'destructive' : 'outline'}>{session.riskLevel || 'low'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.deviceType || 'dispositivo'} - {formatDateTime(session.lastActivity)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Logs de actividad"
        description="Ultimos eventos registrados para auditoria."
        icon={FileJson}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/audit">
              Auditoria
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      >
        {isLoading ? (
          <SettingsSkeleton rows={2} />
        ) : audits.length === 0 ? (
          <EmptyPanel title="Sin logs visibles" description="No hay eventos o faltan permisos de auditoria." />
        ) : (
          <div className="space-y-3">
            {audits.map((audit) => (
              <div key={audit.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{audit.action || 'Evento'}</p>
                  <Badge variant="outline">{audit.resource || audit.entity_type || 'system'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(audit.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
