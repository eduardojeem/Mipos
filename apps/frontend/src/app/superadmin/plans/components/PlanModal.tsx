'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Infinity,
  Loader2,
  Lock,
  Save,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  CANONICAL_PLAN_FEATURES,
  getCanonicalFeatureLabel,
  normalizePlanFeatureKey,
  normalizePlanSlug,
  PLAN_FEATURE_DEFINITIONS,
  sanitizePlanFeatures,
  type PlanFeatureDefinition,
  type PlanFeatureKey,
} from '@/lib/plan-catalog';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  trial_days: number;
  features: (string | { name: string; included: boolean })[];
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxTransactionsPerMonth: number;
    maxLocations: number;
    maxServices: number;
    maxAppointmentsPerMonth: number;
    maxStaff: number;
  };
  is_active: boolean;
  organization_count?: number;
  active_subscription_count?: number;
  mrr?: number;
}

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  plan?: Plan | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PLAN: Plan = {
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  currency: 'PYG',
  trial_days: 0,
  is_active: true,
  features: [],
  limits: {
    maxUsers: 5,
    maxProducts: 100,
    maxTransactionsPerMonth: 1000,
    maxLocations: 1,
    maxServices: 5,
    maxAppointmentsPerMonth: 0,
    maxStaff: 1,
  },
};

const LIMIT_FIELDS: Array<{ key: keyof Plan['limits']; label: string; helper: string; icon: ReactNode }> = [
  { key: 'maxUsers', label: 'Usuarios', helper: 'Usuarios activos permitidos', icon: <Users className="h-4 w-4" /> },
  { key: 'maxProducts', label: 'Productos', helper: 'Catálogo e inventario', icon: <Zap className="h-4 w-4" /> },
  { key: 'maxTransactionsPerMonth', label: 'Ventas / mes', helper: 'Transacciones mensuales', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'maxLocations', label: 'Sucursales', helper: 'Locales o puntos de venta', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'maxServices', label: 'Servicios', helper: 'Servicios activos en el catálogo', icon: <Settings2 className="h-4 w-4" /> },
  { key: 'maxAppointmentsPerMonth', label: 'Turnos / mes', helper: 'Reservas y turnos mensuales', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'maxStaff', label: 'Profesionales', helper: 'Profesionales con agenda', icon: <Users className="h-4 w-4" /> },
];

const FEATURE_GROUP_LABELS: Record<PlanFeatureDefinition['group'], string> = {
  core: 'Core',
  commerce: 'Ecommerce y marketplace',
  services: 'Servicios y agenda',
  operations: 'Operaciones',
  team: 'Equipo y seguridad',
  reports: 'Reportes',
  growth: 'Crecimiento',
  enterprise: 'Enterprise',
};

const FEATURE_GROUP_ICONS: Record<PlanFeatureDefinition['group'], ReactNode> = {
  core: <Zap className="h-3.5 w-3.5" />,
  commerce: <Sparkles className="h-3.5 w-3.5" />,
  services: <Settings2 className="h-3.5 w-3.5" />,
  operations: <Settings2 className="h-3.5 w-3.5" />,
  team: <Users className="h-3.5 w-3.5" />,
  reports: <BarChart3 className="h-3.5 w-3.5" />,
  growth: <TrendingUp className="h-3.5 w-3.5" />,
  enterprise: <Sparkles className="h-3.5 w-3.5" />,
};

const FEATURE_GROUP_ORDER: PlanFeatureDefinition['group'][] = [
  'core',
  'commerce',
  'services',
  'operations',
  'team',
  'reports',
  'growth',
  'enterprise',
];

// ─── Plan color tones ─────────────────────────────────────────────────────────

const PLAN_TONES: Record<string, {
  badge: string;
  bar: string;
  accentBg: string;
  accentText: string;
  statusActive: string;
}> = {
  free: {
    badge: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    bar: 'bg-slate-400',
    accentBg: 'bg-slate-50 dark:bg-slate-900/40',
    accentText: 'text-slate-600 dark:text-slate-400',
    statusActive: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  starter: {
    badge: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
    bar: 'bg-blue-500',
    accentBg: 'bg-blue-50 dark:bg-blue-950/40',
    accentText: 'text-blue-600 dark:text-blue-400',
    statusActive: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  },
  professional: {
    badge: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    statusActive: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  enterprise: {
    badge: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
    bar: 'bg-violet-500',
    accentBg: 'bg-violet-50 dark:bg-violet-950/40',
    accentText: 'text-violet-600 dark:text-violet-400',
    statusActive: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  },
};

function getPlanTone(slug: string) {
  const normalized = normalizePlanSlug(slug);
  return PLAN_TONES[normalized] ?? PLAN_TONES.free;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSafeInteger(value: string | number, fallback = 0, allowUnlimited = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const integer = Math.trunc(parsed);
  if (allowUnlimited && integer === -1) return -1;
  return Math.max(0, integer);
}

function featureLabel(feature: Plan['features'][number]) {
  const value = typeof feature === 'string' ? feature : feature.name;
  return getCanonicalFeatureLabel(value);
}

function featureKey(feature: Plan['features'][number]) {
  return normalizePlanFeatureKey(feature);
}

function formatMoney(amount: number | undefined, currency: string) {
  const safe = Number(amount || 0);
  const upper = String(currency || 'PYG').toUpperCase();
  try {
    const isPy = upper === 'PYG';
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: upper,
      minimumFractionDigits: isPy ? 0 : 2,
      maximumFractionDigits: isPy ? 0 : 2,
    }).format(safe);
  } catch {
    return `${upper} ${safe.toLocaleString('es-PY')}`;
  }
}

function formatLimit(value?: number) {
  if (value === -1) return '∞';
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString('es-PY');
}

function yearlySavingsPercent(plan: Plan) {
  const monthly = Number(plan.price_monthly || 0);
  const yearly = Number(plan.price_yearly || 0);
  if (monthly <= 0 || yearly <= 0) return 0;
  return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
}

function calculateAnnualPrice(monthlyPrice: number, discountPercent: number) {
  const monthly = Math.max(0, Number(monthlyPrice) || 0);
  const discount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  return Math.round(monthly * 12 * (1 - discount / 100) * 100) / 100;
}

function deriveAnnualDiscount(monthlyPrice: number, yearlyPrice: number) {
  const monthly = Number(monthlyPrice) || 0;
  const yearly = Number(yearlyPrice) || 0;
  if (monthly <= 0 || yearly <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100)));
}

function selectedFeatureKeys(features: Plan['features']) {
  return Array.from(new Set(features.map(featureKey).filter(Boolean))) as PlanFeatureKey[];
}

function normalizeFeatureKeys(keys: string[]) {
  return keys.map(normalizePlanFeatureKey).filter(Boolean) as PlanFeatureKey[];
}

function groupFeatures() {
  return PLAN_FEATURE_DEFINITIONS.reduce<Record<PlanFeatureDefinition['group'], PlanFeatureDefinition[]>>(
    (groups, feature) => {
      groups[feature.group] = [...(groups[feature.group] || []), feature];
      return groups;
    },
    { core: [], commerce: [], services: [], operations: [], team: [], reports: [], growth: [], enterprise: [] },
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-rose-500">
      <AlertTriangle className="h-3 w-3" />
      {message}
    </p>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-slate-50/70 p-4 dark:bg-slate-900/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-800">
        <span className="text-slate-600 dark:text-slate-400">{icon}</span>
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function LiveMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-900">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={cn(
        'mt-1 text-lg font-bold',
        accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-950 dark:text-slate-50'
      )}>
        {value}
      </span>
    </div>
  );
}

function SidebarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-slate-950 dark:text-slate-50">{value}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanModal({ isOpen, onClose, onSave, plan }: PlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<Plan>(DEFAULT_PLAN);
  const [annualDiscountPercent, setAnnualDiscountPercent] = useState(0);

  // ── Sync with incoming plan prop ────────────────────────────────────────────
  useEffect(() => {
    const current = plan
      ? {
          ...DEFAULT_PLAN,
          ...plan,
          // Normalize feature keys without silently falling back to canonical defaults.
          // sanitizePlanFeatures falls back when the array is empty — we bypass that by
          // normalizing each key individually and keeping the result (even if empty).
          features: Array.isArray(plan.features)
            ? (plan.features
                .map((f) => normalizePlanFeatureKey(f))
                .filter(Boolean) as string[])
            : sanitizePlanFeatures(plan.features, plan.slug),
          limits: { ...DEFAULT_PLAN.limits, ...(plan.limits || {}) },
        }
      : DEFAULT_PLAN;

    setFormData(current);
    setAnnualDiscountPercent(deriveAnnualDiscount(current.price_monthly, current.price_yearly));
    setActiveTab('general');
    setErrors({});
  }, [plan, isOpen]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const currencyUpper = useMemo(() => String(formData.currency || 'PYG').toUpperCase(), [formData.currency]);
  const featureGroups = useMemo(() => groupFeatures(), []);
  const savings = yearlySavingsPercent(formData);
  const tone = getPlanTone(formData.slug);

  const activeFeatureKeys = useMemo(
    () => new Set(formData.features.map(featureKey).filter(Boolean)),
    [formData.features],
  );
  const recommendedFeatureKeys = useMemo(
    () => CANONICAL_PLAN_FEATURES[normalizePlanSlug(formData.slug)],
    [formData.slug],
  );
  const recommendedMissingCount = recommendedFeatureKeys.filter((key) => !activeFeatureKeys.has(key)).length;
  const activeFeatures = formData.features.filter((f) => featureKey(f));
  const totalFeatures = PLAN_FEATURE_DEFINITIONS.length;
  const selectedCount = activeFeatureKeys.size;
  const featureCompletionPct = Math.round((selectedCount / totalFeatures) * 100);

  const title = plan ? 'Editar plan' : 'Crear plan';
  const subtitle = plan?.id
    ? 'Ajustá precios, límites y capacidades sin romper el catálogo canónico.'
    : 'Creá un plan base usando los campos que consume el sistema SaaS.';

  // ── Handlers ────────────────────────────────────────────────────────────────
  const setLimit = (key: keyof Plan['limits'], value: string) => {
    setFormData((cur) => ({
      ...cur,
      limits: { ...cur.limits, [key]: toSafeInteger(value, cur.limits[key], true) },
    }));
  };

  const setMonthlyPrice = (value: string) => {
    const nextMonthly = Number(value || 0);
    setFormData((cur) => ({
      ...cur,
      price_monthly: nextMonthly,
      price_yearly: calculateAnnualPrice(nextMonthly, annualDiscountPercent),
    }));
  };

  const setAnnualDiscount = (value: string) => {
    const nextDiscount = Math.min(100, Math.max(0, Number(value || 0)));
    setAnnualDiscountPercent(nextDiscount);
    setFormData((cur) => ({
      ...cur,
      price_yearly: calculateAnnualPrice(cur.price_monthly, nextDiscount),
    }));
  };

  const setYearlyPrice = (value: string) => {
    const nextYearly = Number(value || 0);
    setAnnualDiscountPercent(deriveAnnualDiscount(formData.price_monthly, nextYearly));
    setFormData((cur) => ({ ...cur, price_yearly: nextYearly }));
  };

  const toggleFeature = (key: string, checked: boolean) => {
    const normalized = normalizePlanFeatureKey(key);
    if (!normalized) return;
    setFormData((cur) => ({
      ...cur,
      features: checked
        ? Array.from(new Set([...selectedFeatureKeys(cur.features), normalized]))
        : selectedFeatureKeys(cur.features).filter((f) => f !== normalized),
    }));
  };

  const addFeatures = (keys: string[]) => {
    const normalized = normalizeFeatureKeys(keys);
    if (normalized.length === 0) return;
    setFormData((cur) => ({
      ...cur,
      features: Array.from(new Set([...selectedFeatureKeys(cur.features), ...normalized])),
    }));
  };

  const removeFeatures = (keys: string[]) => {
    const normalized = new Set(normalizeFeatureKeys(keys));
    if (normalized.size === 0) return;
    setFormData((cur) => ({
      ...cur,
      features: selectedFeatureKeys(cur.features).filter((f) => !normalized.has(f)),
    }));
  };

  const removeFeature = (key: string) => {
    const normalized = normalizePlanFeatureKey(key);
    if (!normalized) return;
    setFormData((cur) => ({
      ...cur,
      features: selectedFeatureKeys(cur.features).filter((f) => f !== normalized),
    }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const name = String(formData.name || '').trim();
    const slug = String(formData.slug || '').trim();
    const priceMonthly = Number(formData.price_monthly);
    const priceYearly = Number(formData.price_yearly);
    const trialDays = Number(formData.trial_days);

    if (!name) nextErrors.name = 'El nombre es requerido.';
    if (!plan?.id) {
      if (!slug) nextErrors.slug = 'El slug es requerido.';
      if (slug && !/^[A-Za-z0-9_-]+$/.test(slug))
        nextErrors.slug = 'Usa solo letras, números, guiones y _.';
    }
    if (!Number.isFinite(priceMonthly) || priceMonthly < 0)
      nextErrors.price_monthly = 'Precio mensual inválido.';
    if (!Number.isFinite(priceYearly) || priceYearly < 0)
      nextErrors.price_yearly = 'Precio anual inválido.';
    if (Number.isFinite(priceMonthly) && Number.isFinite(priceYearly) && priceYearly > priceMonthly * 12)
      nextErrors.price_yearly = 'El anual no puede superar 12 meses del mensual.';
    if (!Number.isFinite(trialDays) || trialDays < 0)
      nextErrors.trial_days = 'Días de prueba inválidos.';
    if (activeFeatures.length === 0)
      nextErrors.features = 'Seleccioná al menos una capacidad.';

    Object.entries(formData.limits).forEach(([key, value]) => {
      if (!Number.isFinite(value)) nextErrors[key] = 'Límite inválido.';
      if (value < -1) nextErrors[key] = 'Usá -1 para ilimitado o un número positivo.';
    });

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error('Revisá el formulario', { description: 'Hay campos inválidos o incompletos.' });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await fetch('/api/superadmin/plans', {
        method: plan?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan?.id ? { ...formData, id: plan.id } : formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el plan');
      }

      toast.success(plan?.id ? 'Plan actualizado' : 'Plan creado');
      onSave();
      onClose();
    } catch (error) {
      toast.error('No se pudo guardar', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Tab indicators (error dots) ─────────────────────────────────────────────
  const tabHasError = {
    general: Boolean(errors.name || errors.slug),
    pricing: Boolean(errors.price_monthly || errors.price_yearly || errors.trial_days),
    limits: Boolean(
      errors.maxUsers
      || errors.maxProducts
      || errors.maxTransactionsPerMonth
      || errors.maxLocations
      || errors.maxServices
      || errors.maxAppointmentsPerMonth
      || errors.maxStaff
    ),
    features: Boolean(errors.features),
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl">

        {/* ── Modal header ────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b bg-white pr-12 dark:bg-slate-950">
          {/* Color bar by tier */}
          <div className={cn('h-1.5 w-full', tone.bar)} />

          <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: identity */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', tone.badge)}
                >
                  {formData.slug || 'nuevo'}
                </Badge>
                <Badge
                  className={cn(
                    'rounded-lg px-2.5 py-0.5 text-[11px] font-semibold',
                    formData.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  )}
                >
                  {formData.is_active ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Activo
                    </>
                  ) : (
                    'Inactivo'
                  )}
                </Badge>
              </div>
              <DialogTitle className="mt-2.5 text-xl font-extrabold tracking-tight">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">{subtitle}</DialogDescription>
            </div>

            {/* Right: KPIs */}
            <div className="flex shrink-0 items-stretch gap-3">
              <div className="flex flex-col justify-between rounded-xl border bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <SidebarMetric
                  label="Tenants"
                  value={Number(plan?.organization_count || 0).toLocaleString('es-PY')}
                />
              </div>
              <div className="flex flex-col justify-between rounded-xl border bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <SidebarMetric
                  label="Suscripciones"
                  value={Number(plan?.active_subscription_count || 0).toLocaleString('es-PY')}
                />
              </div>
              <div className="flex flex-col justify-between rounded-xl border bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <SidebarMetric
                  label="MRR"
                  value={formatMoney(plan?.mrr || 0, currencyUpper)}
                />
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── Form ────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">

            {/* ── Sidebar preview ─────────────────────────────────── */}
            <aside className="hidden shrink-0 flex-col gap-5 border-r bg-slate-50/80 p-5 dark:bg-slate-950/40 lg:flex overflow-y-auto">

              {/* Live price display */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Vista previa
                </div>
                <div className={cn('mt-3 rounded-xl p-4', tone.accentBg)}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Mensual
                  </div>
                  <div className={cn('mt-1 text-3xl font-extrabold tracking-tight', tone.accentText)}>
                    {formatMoney(formData.price_monthly, currencyUpper)}
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-current/10 pt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Anual</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(formData.price_yearly, currencyUpper)}
                      </span>
                    </div>
                    {savings > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Ahorro</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {savings}%
                        </span>
                      </div>
                    )}
                    {formData.trial_days > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Trial</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formData.trial_days}d
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Limits preview */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Límites
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {LIMIT_FIELDS.map((field) => {
                    const val = formData.limits[field.key];
                    const isUnlimited = val === -1;
                    return (
                      <div
                        key={field.key}
                        className="flex flex-col rounded-lg border bg-white p-2.5 dark:bg-slate-900"
                      >
                        <span className="text-[10px] font-semibold uppercase text-slate-400">
                          {field.label}
                        </span>
                        <span
                           className={cn(
                            'mt-0.5 text-sm font-bold',
                            isUnlimited
                              ? 'text-violet-600 dark:text-violet-400'
                              : tone.accentText,
                          )}
                        >
                          {formatLimit(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Features preview */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Features
                  </div>
                  <span className={cn('text-[11px] font-bold', tone.accentText)}>
                    {selectedCount}/{totalFeatures}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', tone.bar)}
                    style={{ width: `${featureCompletionPct}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeFeatures.slice(0, 7).map((feature, idx) => (
                    <span
                      key={`${featureLabel(feature)}-${idx}`}
                      className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                    >
                      <Check className={cn('h-2.5 w-2.5', tone.accentText)} />
                      {featureLabel(feature)}
                    </span>
                  ))}
                  {activeFeatures.length > 7 && (
                    <span className="rounded-md border bg-slate-100 px-2 py-0.5 text-[11px] text-slate-400 dark:bg-slate-800">
                      +{activeFeatures.length - 7}
                    </span>
                  )}
                  {activeFeatures.length === 0 && (
                    <span className="text-xs text-slate-400">Sin features seleccionadas</span>
                  )}
                </div>
              </div>

              {/* Status toggle */}
              <div className={cn('flex items-center justify-between rounded-xl border p-3 mt-auto shrink-0', tone.accentBg)}>
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {formData.is_active ? 'Plan activo' : 'Plan inactivo'}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {formData.is_active ? 'Disponible para altas' : 'No disponible para altas'}
                  </div>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((cur) => ({ ...cur, is_active: checked }))
                  }
                />
              </div>
            </aside>

            {/* ── Tab content ─────────────────────────────────────── */}
            <div className="min-h-0 overflow-y-auto bg-white p-6 dark:bg-slate-950">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">

                <TabsList className="grid w-full grid-cols-4 rounded-xl">
                  {(['general', 'pricing', 'limits', 'features'] as const).map((tab) => {
                    const labels: Record<string, string> = {
                      general: 'General',
                      pricing: 'Precios',
                      limits: 'Límites',
                      features: 'Features',
                    };
                    return (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="relative rounded-lg text-sm"
                      >
                        {labels[tab]}
                        {tabHasError[tab] && (
                          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* ── General tab ─────────────────────────────────── */}
                <TabsContent value="general" className="space-y-5">
                  <SectionHeader
                    icon={<Settings2 className="h-4 w-4" />}
                    title="Identidad del plan"
                    description="Nombre público, slug canónico, descripción y disponibilidad para nuevas altas."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-name" className="text-sm font-semibold">
                        Nombre del plan
                      </Label>
                      <Input
                        id="plan-name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((cur) => ({ ...cur, name: e.target.value }))
                        }
                        placeholder="Professional"
                        className={cn('rounded-lg', errors.name && 'border-rose-400 focus-visible:ring-rose-400')}
                      />
                      <FieldError message={errors.name} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-slug" className="text-sm font-semibold">
                        Slug canónico
                      </Label>
                      <div className="relative">
                        <Input
                          id="plan-slug"
                          value={formData.slug}
                          onChange={(e) =>
                            setFormData((cur) => ({ ...cur, slug: e.target.value.toLowerCase() }))
                          }
                          placeholder="professional"
                          disabled={Boolean(plan?.id)}
                          className={cn(
                            'rounded-lg',
                            plan?.id && 'bg-slate-50 pr-9 dark:bg-slate-900',
                            errors.slug && 'border-rose-400 focus-visible:ring-rose-400',
                          )}
                        />
                        {plan?.id && (
                          <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {plan?.id
                          ? 'Slug bloqueado para no romper asignaciones existentes.'
                          : 'Usá: free · starter · professional · enterprise'}
                      </p>
                      <FieldError message={errors.slug} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-description" className="text-sm font-semibold">
                      Descripción
                    </Label>
                    <Textarea
                      id="plan-description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((cur) => ({ ...cur, description: e.target.value }))
                      }
                      rows={4}
                      placeholder="Describí para qué tipo de cliente sirve este plan."
                      className="rounded-lg resize-none"
                    />
                    <p className="text-[11px] text-slate-400">
                      {String(formData.description || '').length} caracteres
                    </p>
                  </div>

                  {/* Status toggle (mobile visible) */}
                  <div className="flex items-center justify-between rounded-xl border p-4 lg:hidden">
                    <div>
                      <Label className="text-sm font-semibold">Estado del plan</Label>
                      <p className="mt-1 text-xs text-slate-500">
                        Un plan inactivo no se usa para nuevas altas ni promociones.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formData.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          setFormData((cur) => ({ ...cur, is_active: checked }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ── Pricing tab ─────────────────────────────────── */}
                <TabsContent value="pricing" className="space-y-5">
                  <SectionHeader
                    icon={<DollarSign className="h-4 w-4" />}
                    title="Precios y ciclo comercial"
                    description="Definí valores mensuales/anuales y días de prueba usados por el catálogo SaaS."
                  />

                  {/* Price inputs */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="price-monthly" className="text-sm font-semibold">
                        Precio mensual
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          {currencyUpper}
                        </span>
                        <Input
                          id="price-monthly"
                          type="number"
                          min="0"
                          value={formData.price_monthly}
                          onChange={(e) => setMonthlyPrice(e.target.value)}
                          className={cn(
                            'rounded-lg pl-12',
                            errors.price_monthly && 'border-rose-400 focus-visible:ring-rose-400',
                          )}
                        />
                      </div>
                      <FieldError message={errors.price_monthly} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="annual-discount" className="text-sm font-semibold">
                        Descuento anual
                      </Label>
                      <div className="relative">
                        <Input
                          id="annual-discount"
                          type="number"
                          min="0"
                          max="100"
                          value={annualDiscountPercent}
                          onChange={(e) => setAnnualDiscount(e.target.value)}
                          className="rounded-lg pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Mensual × 12 menos el descuento</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price-yearly" className="text-sm font-semibold">
                        Precio anual
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          {currencyUpper}
                        </span>
                        <Input
                          id="price-yearly"
                          type="number"
                          min="0"
                          value={formData.price_yearly}
                          onChange={(e) => setYearlyPrice(e.target.value)}
                          className={cn(
                            'rounded-lg pl-12',
                            errors.price_yearly && 'border-rose-400 focus-visible:ring-rose-400',
                          )}
                        />
                      </div>
                      <FieldError message={errors.price_yearly} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Moneda</Label>
                      <Select
                        value={currencyUpper}
                        onValueChange={(v) =>
                          setFormData((cur) => ({ ...cur, currency: v }))
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Moneda" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PYG">🇵🇾 PYG — Guaraní</SelectItem>
                          <SelectItem value="USD">🇺🇸 USD — Dólar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trial-days" className="text-sm font-semibold">
                        Período de prueba
                      </Label>
                      <div className="relative">
                        <Input
                          id="trial-days"
                          type="number"
                          min="0"
                          value={formData.trial_days}
                          onChange={(e) =>
                            setFormData((cur) => ({
                              ...cur,
                              trial_days: toSafeInteger(e.target.value, cur.trial_days),
                            }))
                          }
                          className={cn(
                            'rounded-lg pr-12',
                            errors.trial_days && 'border-rose-400 focus-visible:ring-rose-400',
                          )}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          días
                        </span>
                      </div>
                      <FieldError message={errors.trial_days} />
                    </div>
                  </div>

                  {/* Live price summary */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <LiveMetric
                      label="Mensual"
                      value={formatMoney(formData.price_monthly, currencyUpper)}
                    />
                    <LiveMetric
                      label="Anual total"
                      value={formatMoney(formData.price_yearly, currencyUpper)}
                    />
                    <LiveMetric
                      label="Ahorro anual"
                      value={savings > 0 ? `${savings}%` : '0%'}
                      accent={savings > 0}
                    />
                  </div>
                </TabsContent>

                {/* ── Limits tab ──────────────────────────────────── */}
                <TabsContent value="limits" className="space-y-5">
                  <SectionHeader
                    icon={<BarChart3 className="h-4 w-4" />}
                    title="Límites operativos"
                    description="Estos valores alimentan restricciones de usuarios, inventario, ventas y sucursales."
                  />

                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Usá <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-amber-900">-1</span> para ilimitado.
                      Cualquier otro valor debe ser cero o positivo.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {LIMIT_FIELDS.map((field) => {
                      const value = formData.limits[field.key];
                      const isUnlimited = value === -1;
                      return (
                        <div
                          key={field.key}
                          className={cn(
                            'rounded-xl border p-4 transition-colors',
                            isUnlimited
                              ? 'border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20'
                              : 'bg-white dark:bg-slate-900',
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={cn('text-slate-500', isUnlimited && 'text-violet-500')}>
                                {field.icon}
                              </span>
                              <div>
                                <Label htmlFor={`limit-${field.key}`} className="text-sm font-semibold">
                                  {field.label}
                                </Label>
                                <p className="text-[11px] text-slate-400">{field.helper}</p>
                              </div>
                            </div>
                            {isUnlimited && (
                              <Badge className="rounded-lg bg-violet-100 px-2 text-[11px] text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                                <Infinity className="mr-1 h-3 w-3" />
                                Ilimitado
                              </Badge>
                            )}
                          </div>
                          <Input
                            id={`limit-${field.key}`}
                            type="number"
                            value={value}
                            onChange={(e) => setLimit(field.key, e.target.value)}
                            className={cn(
                              'rounded-lg font-mono',
                              isUnlimited && 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300',
                              errors[field.key] && 'border-rose-400 focus-visible:ring-rose-400',
                            )}
                          />
                          <FieldError message={errors[field.key]} />
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* ── Features tab ────────────────────────────────── */}
                <TabsContent value="features" className="space-y-5">
                  <SectionHeader
                    icon={<Sparkles className="h-4 w-4" />}
                    title="Capacidades incluidas"
                    description="Seleccioná capacidades válidas del sistema. Se guardan como claves técnicas usadas por la API."
                  />

                  <div className="flex items-start gap-3 rounded-xl border bg-slate-50 p-4 dark:bg-slate-900">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Las etiquetas son descriptivas; la base guarda claves como{' '}
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] shadow-sm dark:bg-slate-800">
                        multi_branch
                      </code>{' '}
                      o{' '}
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] shadow-sm dark:bg-slate-800">
                        admin_panel
                      </code>
                      . Esto evita que una feature escrita como texto rompa permisos.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                        Matriz recomendada para {formData.slug || 'este plan'}
                      </div>
                      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                        Agrega las capacidades canónicas del plan, incluyendo Servicios y agenda cuando corresponde.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={recommendedMissingCount === 0}
                      onClick={() => addFeatures(recommendedFeatureKeys)}
                    >
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      {recommendedMissingCount > 0
                        ? `Aplicar ${recommendedMissingCount} faltantes`
                        : 'Recomendadas aplicadas'}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {FEATURE_GROUP_ORDER.map((groupKey) => {
                      const features = featureGroups[groupKey];
                      const selectedInGroup = features.filter((f) => activeFeatureKeys.has(f.key)).length;
                      const isWholeGroupSelected = selectedInGroup === features.length;

                      return (
                        <div key={groupKey} className="overflow-hidden rounded-xl border">
                          {/* Group header */}
                          <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50/80 px-4 py-2.5 dark:bg-slate-900/40">
                            <span className="text-slate-500">
                              {FEATURE_GROUP_ICONS[groupKey]}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                              {FEATURE_GROUP_LABELS[groupKey]}
                            </span>
                            <span className="ml-auto rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">
                              {selectedInGroup}/{features.length}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-md px-2 text-[11px]"
                              disabled={isWholeGroupSelected}
                              onClick={() => addFeatures(features.map((feature) => feature.key))}
                            >
                              Activar grupo
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 rounded-md px-2 text-[11px] text-slate-500"
                              disabled={selectedInGroup === 0}
                              onClick={() => removeFeatures(features.map((feature) => feature.key))}
                            >
                              Quitar
                            </Button>
                          </div>

                           {/* Feature items */}
                          <div className="grid divide-y divide-slate-100 dark:divide-slate-800 md:grid-cols-2 md:divide-y-0">
                            {features.map((feature, idx) => {
                              const checked = activeFeatureKeys.has(feature.key);
                              return (
                                <div
                                  key={feature.key}
                                  role="checkbox"
                                  aria-checked={checked}
                                  tabIndex={0}
                                  onClick={() => toggleFeature(feature.key, !checked)}
                                  onKeyDown={(e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                      e.preventDefault();
                                      toggleFeature(feature.key, !checked);
                                    }
                                  }}
                                  className={cn(
                                    'flex cursor-pointer items-start gap-3 p-4 transition-colors select-none',
                                    idx % 2 === 0 ? 'md:border-r' : '',
                                    checked
                                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                                      : 'bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900',
                                  )}
                                >

                                  {/* Custom checkbox */}
                                  <div className="mt-0.5 shrink-0">
                                    <div
                                      aria-hidden="true"
                                      className={cn(
                                        'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all',
                                        checked
                                          ? 'border-emerald-500 bg-emerald-500'
                                          : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900',
                                      )}
                                    >
                                      {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                    </div>
                                  </div>

                                  {/* Text */}
                                  <div className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">
                                      {feature.label}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-500">
                                      {feature.description}
                                    </span>
                                    <code className="mt-1.5 block font-mono text-[10px] text-slate-400">
                                      {feature.key}
                                    </code>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected features summary */}
                  <div className={cn(
                    'rounded-xl border p-4',
                    errors.features ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20' : 'bg-slate-50 dark:bg-slate-900',
                  )}>
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Seleccionadas ({selectedCount})
                      </div>
                      <FieldError message={errors.features} />
                    </div>

                    {activeFeatures.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        Seleccioná al menos una capacidad antes de guardar.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {activeFeatures.map((feature) => {
                          const key = featureKey(feature);
                          if (!key) return null;
                          return (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300"
                            >
                              <Check className="h-3 w-3 text-emerald-500" />
                              {featureLabel(feature)}
                              <button
                                type="button"
                                aria-label={`Quitar ${featureLabel(feature)}`}
                                className="ml-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                                onClick={() => removeFeature(key)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <DialogFooter className="shrink-0 items-center gap-3 border-t bg-slate-50/80 px-6 py-4 dark:bg-slate-950/80 sm:justify-between">
            <div className="hidden text-xs text-slate-400 sm:block">
              {Object.keys(errors).length > 0 ? (
                <span className="flex items-center gap-1.5 text-rose-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {Object.keys(errors).length} campo{Object.keys(errors).length > 1 ? 's' : ''} con error
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sin errores de validación
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-lg" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="min-w-40 rounded-lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
