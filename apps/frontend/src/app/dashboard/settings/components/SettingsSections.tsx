'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileJson,
  Globe2,
  Info,
  KeyRound,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageSearch,
  Receipt,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  UsersRound,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className={cn('glass-card overflow-hidden hover-lift border-border/50 bg-card/60 backdrop-blur-xl', className)}>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between pb-4">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm ring-1 ring-primary/20">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 py-0.5">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-1.5">{description}</CardDescription>
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
    <div className="group flex flex-col gap-4 rounded-xl border border-border/50 bg-background/50 p-5 transition-all hover:border-primary/30 hover:bg-card hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-4">
        {Icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0 sm:min-w-[180px] flex sm:justify-end">{children}</div>
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
    <div className="sticky bottom-6 z-10 flex justify-end mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PermissionGuard permission="settings.edit">
        <div className="rounded-2xl bg-card/80 backdrop-blur-xl p-2 shadow-2xl ring-1 ring-border/50 border border-border/50">
          <Button onClick={onSave} disabled={isSaving} className="min-w-[200px] h-12 shadow-lg hover:shadow-primary/20 transition-all font-bold text-base">
            {isSaving ? (
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            {label}
          </Button>
        </div>
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


export function SalesBillingSettings() {
  const organizationId = useCurrentOrganizationId();
  const pathname = usePathname();
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
  const invoicingHref = pathname?.startsWith('/admin') ? '/admin/invoicing' : '/dashboard/invoicing';

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

  // Fetch real stock statistics — depends on the saved threshold so stats
  // refresh automatically after the user saves a new value.
  useEffect(() => {
    const savedThreshold = systemSettings?.low_stock_threshold ?? 10;
    const loadStats = async () => {
      if (!organizationId) { setStatsLoading(false); return; }
      setStatsLoading(true);
      try {
        const headers = selectedOrganizationHeaders(organizationId);
        const [productsRes, alertsRes] = await Promise.all([
          fetch('/api/products?limit=1&countOnly=true', { cache: 'no-store', headers }),
          fetch(`/api/stock-alerts?threshold=${savedThreshold}`, { cache: 'no-store', headers }),
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
          outOfStock = Number(a?.stats?.outOfStockAlerts ?? 0);
          lowStock = Number(a?.stats?.lowStockAlerts ?? 0);
        }

        setStats({ total, lowStock, outOfStock });
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    void loadStats();
  }, [organizationId, systemSettings?.low_stock_threshold]);

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
        <div className="space-y-4">
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

          {!(currentSettings.enable_inventory_tracking ?? true) && (
            <Alert variant="destructive" className="border-amber-500/40 bg-amber-50/60 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
              <AlertDescription>
                El seguimiento está desactivado. Las ventas y devoluciones <strong>no descontarán ni ajustarán el stock</strong> hasta que se reactive.
              </AlertDescription>
            </Alert>
          )}
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

/** Placeholder de gestión de sucursales usado en /admin/sucursal. */
export function BranchesSettings() {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Sucursales"
        description="Gestión de sedes y locales operativos."
        icon={MapPin}
      >
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            La gestión avanzada de sucursales estará disponible próximamente.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/sucursales">Ver sucursales</Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
