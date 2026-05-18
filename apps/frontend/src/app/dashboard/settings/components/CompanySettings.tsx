'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2, Briefcase, CheckCircle2, Globe, Mail, MapPin, Palette,
  Phone, Save, Users, Image as ImageIcon, AlertTriangle, Store,
  Laptop, Shirt, ShoppingCart, Pill, Sparkles, Home, Dumbbell,
  BookOpen, Car, Gamepad2, PawPrint, Hammer, UtensilsCrossed, Layers3,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlanSyncContext } from '@/contexts/plan-sync-context';
import { useToast } from '@/components/ui/use-toast';
import type { CompanyProfile } from '@/lib/services/plan-service';
import { useSystemSettings, useUpdateSystemSettings } from '../hooks/useOptimizedSettings';
import { usePermissions } from '@/components/ui/permission-guard';
import { useMarketplaceCategory } from '../hooks/useMarketplaceCategory';

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Laptop, Shirt, ShoppingCart, Pill, Sparkles,
  Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, Store, Layers3,
};

function CategoryIcon({ name, color }: { name: string | null; color: string }) {
  const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : Store;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: color }}>
      <Icon className="h-3.5 w-3.5 text-white" />
    </span>
  );
}

const COMPANY_SIZES = [
  { value: 'micro',  label: '1 – 5 personas' },
  { value: 'small',  label: '6 – 50 personas' },
  { value: 'medium', label: '51 – 250 personas' },
  { value: 'large',  label: '250+ personas' },
];

const PARAGUAY_DEPARTMENTS = [
  'Alto Paraguay', 'Alto Paraná', 'Amambay', 'Boquerón', 'Caaguazú',
  'Caazapá', 'Canindeyú', 'Central', 'Concepción', 'Cordillera',
  'Guairá', 'Itapúa', 'Misiones', 'Ñeembucú', 'Paraguarí',
  'Presidente Hayes', 'San Pedro', 'Asunción (Capital)',
];

const BRAND_COLORS = [
  { hex: '#2563EB', name: 'Azul' },
  { hex: '#0F766E', name: 'Verde' },
  { hex: '#DC2626', name: 'Rojo' },
  { hex: '#D97706', name: 'Ámbar' },
  { hex: '#7C3AED', name: 'Violeta' },
  { hex: '#0369A1', name: 'Celeste' },
  { hex: '#15803D', name: 'Esmeralda' },
];

export function CompanySettings() {
  const { company, updateCompany, isLoading: planLoading } = usePlanSyncContext();
  const { data: systemSettings, isLoading: sysLoading } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const { toast } = useToast();
  const { hasPermission, userRole } = usePermissions();
  const canEdit = hasPermission('settings.edit') || userRole === 'SUPER_ADMIN';
  const {
    allCategories: marketplaceCategories,
    currentCategoryId,
    updateCategory: saveMarketplaceCategory,
    isSaving: isSavingCategory,
  } = useMarketplaceCategory();

  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name:        '',
    size:        '' as CompanyProfile['size'] | '',
    primary_color: '#2563EB',
    logo_url:    '',
    description: '',
    phone:       '',
    email:       '',
    website:     '',
    department:  '',
    city:        '',
    address:     '',
    country:     'Paraguay',
    // Campo interno requerido por plan-service (no visible en UI principal)
    industry:    '',
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name:        company?.name                         || systemSettings?.business_name || prev.name,
      size:        company?.size                         || prev.size,
      primary_color: company?.primary_color             || prev.primary_color,
      logo_url:    systemSettings?.logo_url              || prev.logo_url,
      description: (systemSettings as any)?.description  || prev.description,
      phone:       systemSettings?.phone                 || prev.phone,
      email:       systemSettings?.email                 || prev.email,
      website:     systemSettings?.website               || prev.website,
      department:  systemSettings?.department            || prev.department,
      city:        systemSettings?.city                  || prev.city,
      address:     systemSettings?.address               || prev.address,
      country:     systemSettings?.country               || prev.country,
      industry:    company?.industry                     || prev.industry,
    }));
  }, [company, systemSettings]);

  const set = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const completion = useMemo(() => {
    const fields = [form.name, form.size, form.phone, form.email, form.description, form.department, form.city];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [form]);

  const completionColor =
    completion === 100 ? 'bg-emerald-500' :
    completion >= 60   ? 'bg-primary' :
                         'bg-amber-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      toast({ title: 'Sin permisos', description: 'No tienes permisos para editar esta sección.', variant: 'destructive' });
      return;
    }

    if (!form.name || !form.size) {
      toast({ title: 'Datos incompletos', description: 'Completa el nombre del negocio y tamaño del equipo.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateCompany({
        name: form.name,
        industry: form.industry || 'other',
        size: form.size,
        primary_color: form.primary_color,
      });

      if (!success) throw new Error('plan-update-failed');

      await updateSystemSettings.mutateAsync({
        business_name: form.name,
        logo_url:    form.logo_url    || undefined,
        description: form.description || undefined,
        phone:       form.phone       || undefined,
        email:       form.email       || undefined,
        website:     form.website     || undefined,
        department:  form.department  || undefined,
        city:        form.city        || undefined,
        address:     form.address     || undefined,
        country:     form.country     || undefined,
      } as any);

      toast({ title: '¡Empresa actualizada!', description: 'Los datos se sincronizaron correctamente.' });
    } catch {
      toast({ title: 'Error al guardar', description: 'No se pudieron actualizar los datos.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (planLoading || sysLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* LEFT */}
      <div className="space-y-6">

        {!canEdit && (
          <Alert className="border-amber-500/25 bg-amber-500/5">
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              Tu rol ({userRole || 'sin rol'}) no puede editar esta sección. Solicita acceso a un administrador.
            </AlertDescription>
          </Alert>
        )}

        {/* ── 1. IDENTIDAD ───────────────────────────────────────── */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Identidad del negocio</CardTitle>
                <CardDescription className="text-sm">Nombre, descripción y apariencia pública.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-name" className="text-xs font-semibold uppercase text-muted-foreground">
                  Nombre del negocio *
                </Label>
                <Input
                  id="company-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ej. Mi Tienda Central"
                  required
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-desc" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Descripción pública
                </Label>
                <Textarea
                  id="company-desc"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Describe brevemente tu negocio. Aparece en el marketplace para los clientes."
                  rows={3}
                  className="resize-none focus-visible:ring-primary/50"
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground">
                  Visible en el marketplace público. Máximo 200 caracteres recomendados.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Tamaño del equipo *</Label>
                <Select value={form.size} onValueChange={(v) => set('size', v)} disabled={!canEdit}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 2. RUBRO EN MARKETPLACE ───────────────────────────── */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Rubro en el marketplace</CardTitle>
                <CardDescription className="text-sm">
                  Los clientes te encuentran bajo esta categoría en <span className="font-medium">/home/categorias</span>.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={currentCategoryId ?? '__none__'}
              onValueChange={(v) => saveMarketplaceCategory(v === '__none__' ? null : v)}
              disabled={!canEdit || isSavingCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el rubro público…">
                  {currentCategoryId ? (
                    (() => {
                      const cat = marketplaceCategories.find((c) => c.id === currentCategoryId);
                      return cat ? (
                        <span className="flex items-center gap-2">
                          <CategoryIcon name={cat.icon ?? null} color={cat.color} />
                          {cat.name}
                        </span>
                      ) : 'Selecciona el rubro público…';
                    })()
                  ) : (
                    <span className="text-muted-foreground">Sin rubro asignado</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground italic">Sin rubro asignado</span>
                </SelectItem>
                {marketplaceCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={cat.icon ?? null} color={cat.color} />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentCategoryId ? (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Tu empresa aparece en el marketplace bajo este rubro.
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Sin rubro, tu empresa no aparecerá en el directorio del marketplace.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── 3. CONTACTO ───────────────────────────────────────── */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Datos de contacto</CardTitle>
                <CardDescription className="text-sm">Aparecen en facturas, recibos y el marketplace.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-phone" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Teléfono
                </Label>
                <Input
                  id="company-phone"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+595 21 000 0000"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <Input
                  id="company-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="contacto@mitienda.com"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-website" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> Sitio web
                </Label>
                <Input
                  id="company-website"
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder="https://mitienda.com"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 4. UBICACIÓN ─────────────────────────────────────── */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Ubicación</CardTitle>
                <CardDescription className="text-sm">
                  Permite a los clientes filtrarte por departamento y ciudad en el marketplace.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-department" className="text-xs font-semibold uppercase text-muted-foreground">
                  Departamento
                </Label>
                <Select
                  value={form.department || '__none__'}
                  onValueChange={(v) => set('department', v === '__none__' ? '' : v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="company-department">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin especificar</SelectItem>
                    {PARAGUAY_DEPARTMENTS.map((dep) => (
                      <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-city" className="text-xs font-semibold uppercase text-muted-foreground">
                  Ciudad
                </Label>
                <Input
                  id="company-city"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="Asunción, Ciudad del Este..."
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-address" className="text-xs font-semibold uppercase text-muted-foreground">
                  Dirección (calle y número)
                </Label>
                <Input
                  id="company-address"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Av. Mcal. López 1234"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 5. MARCA ─────────────────────────────────────────── */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Marca y apariencia</CardTitle>
                <CardDescription className="text-sm">Logo y color principal del negocio.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="company-logo" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" /> URL del Logo
              </Label>
              <Input
                id="company-logo"
                value={form.logo_url}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="https://ejemplo.com/logo.png"
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground">Aparecerá en facturas, recibos y el marketplace.</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Color principal</Label>
              <div className="flex flex-wrap gap-3">
                {BRAND_COLORS.map(({ hex, name }) => {
                  const selected = form.primary_color === hex;
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => set('primary_color', hex)}
                      disabled={!canEdit}
                      className={`relative h-10 w-10 rounded-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                        selected ? 'border-foreground shadow-lg scale-110' : 'border-transparent hover:border-border'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={name}
                      aria-label={`Color ${name}`}
                    >
                      {selected && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-white drop-shadow" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={!canEdit || isSaving} className="min-w-[180px] shadow-sm">
            {isSaving ? (
              <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Guardando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Guardar empresa</>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT: Summary */}
      <div className="space-y-6">
        {/* Preview */}
        <Card className="rounded-xl border-border/50 overflow-hidden shadow-sm">
          <div className="h-16 w-full" style={{ backgroundColor: form.primary_color }} />
          <CardContent className="pt-0 -mt-8 px-6 pb-6">
            <div className="h-16 w-16 rounded-xl border-4 border-background bg-muted flex items-center justify-center mb-4 shadow-md overflow-hidden">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Building2 className="h-7 w-7 text-muted-foreground" />
              )}
            </div>

            <p className="font-bold text-lg leading-tight truncate">{form.name || 'Nombre del negocio'}</p>

            {currentCategoryId ? (
              (() => {
                const cat = marketplaceCategories.find((c) => c.id === currentCategoryId);
                return cat ? (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: cat.color }}>
                    <CategoryIcon name={cat.icon ?? null} color="transparent" />
                    {cat.name}
                  </span>
                ) : null;
              })()
            ) : null}

            {form.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{form.description}</p>
            )}

            {(form.department || form.city) && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {[form.city, form.department].filter(Boolean).join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Completeness */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Completitud del perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{completion}%</span>
              {completion === 100 ? (
                <Badge className="bg-emerald-500 text-white">Completo</Badge>
              ) : completion >= 60 ? (
                <Badge variant="secondary">En progreso</Badge>
              ) : (
                <Badge variant="destructive">Incompleto</Badge>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${completionColor}`} style={{ width: `${completion}%` }} />
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Nombre',       done: !!form.name },
                { label: 'Rubro marketplace', done: !!currentCategoryId },
                { label: 'Tamaño',       done: !!form.size },
                { label: 'Descripción',  done: !!form.description },
                { label: 'Teléfono',     done: !!form.phone },
                { label: 'Email',        done: !!form.email },
                { label: 'Departamento', done: !!form.department },
                { label: 'Ciudad',       done: !!form.city },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                  )}
                  <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plan info */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Plan actual</span>
              </div>
              <Badge variant="outline" className="capitalize font-semibold">
                {company?.plan_type || 'free'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Equipo</span>
              </div>
              <span className="text-sm font-medium">
                {COMPANY_SIZES.find((s) => s.value === form.size)?.label || '—'}
              </span>
            </div>

            {completion < 60 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Completa tu perfil para aparecer mejor posicionado en el marketplace.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
