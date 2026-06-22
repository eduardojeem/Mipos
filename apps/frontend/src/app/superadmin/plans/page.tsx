'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  Edit,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Store,
  Table2,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { PlanModal } from './components/PlanModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  dedupeCanonicalPlans,
  getCanonicalFeatureLabel,
  getCanonicalPlanDisplayName,
  isPublicPlanFeature,
  normalizePlanFeatureKey,
  normalizePlanSlug,
  PLAN_FEATURE_DEFINITIONS,
  type PlanFeatureKey,
} from '@/lib/plan-catalog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
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
  created_at?: string;
  updated_at?: string;
}

type SortValue =
  | 'price_monthly_asc'
  | 'price_monthly_desc'
  | 'slug_asc'
  | 'slug_desc'
  | 'updated_at_desc';

type ViewMode = 'cards' | 'table' | 'comparison';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number, currency: string) {
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

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function yearlySavingsPercent(plan: Plan) {
  const monthly = Number(plan.price_monthly || 0);
  const yearly = Number(plan.price_yearly || 0);
  if (monthly <= 0 || yearly <= 0) return 0;
  return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
}

// ─── Plan Tones ───────────────────────────────────────────────────────────────

const PLAN_TONES: Record<string, {
  badge: string;
  accent: string;
  accentBg: string;
  accentText: string;
  ring: string;
  gradient: string;
  bar: string;
  glow: string;
}> = {
  free: {
    badge: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    accent: 'bg-slate-500',
    accentBg: 'bg-slate-50 dark:bg-slate-900/40',
    accentText: 'text-slate-600 dark:text-slate-400',
    ring: 'border-slate-200 dark:border-slate-800',
    gradient: 'from-slate-50 to-white dark:from-slate-900/30 dark:to-transparent',
    bar: 'bg-slate-400',
    glow: '',
  },
  starter: {
    badge: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
    accent: 'bg-blue-500',
    accentBg: 'bg-blue-50 dark:bg-blue-950/40',
    accentText: 'text-blue-600 dark:text-blue-400',
    ring: 'border-blue-200 dark:border-blue-900',
    gradient: 'from-blue-50/60 to-white dark:from-blue-950/20 dark:to-transparent',
    bar: 'bg-blue-500',
    glow: 'shadow-blue-100 dark:shadow-blue-950/30',
  },
  professional: {
    badge: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    accent: 'bg-emerald-500',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    ring: 'border-emerald-200 dark:border-emerald-900',
    gradient: 'from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-transparent',
    bar: 'bg-emerald-500',
    glow: 'shadow-emerald-100 dark:shadow-emerald-950/30',
  },
  enterprise: {
    badge: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
    accent: 'bg-violet-500',
    accentBg: 'bg-violet-50 dark:bg-violet-950/40',
    accentText: 'text-violet-600 dark:text-violet-400',
    ring: 'border-violet-200 dark:border-violet-900',
    gradient: 'from-violet-50/60 to-white dark:from-violet-950/20 dark:to-transparent',
    bar: 'bg-violet-500',
    glow: 'shadow-violet-100 dark:shadow-violet-950/30',
  },
};

function getPlanTone(slug: string) {
  const normalized = normalizePlanSlug(slug);
  return PLAN_TONES[normalized] ?? PLAN_TONES.free;
}

function getPlanFeatureKeys(plan: Plan): Set<PlanFeatureKey> {
  const actual = new Set<PlanFeatureKey>();
  for (const f of plan.features ?? []) {
    const key = normalizePlanFeatureKey(f);
    if (key) actual.add(key);
  }
  return actual;
}

// ─── Feature groups label ────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  core: 'Core',
  commerce: 'Ecommerce y marketplace',
  services: 'Servicios y agenda',
  operations: 'Operaciones',
  team: 'Equipo',
  reports: 'Reportes',
  growth: 'Crecimiento',
  enterprise: 'Enterprise',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  helper,
  icon,
  accentClass,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  accentClass?: string;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-400">{helper}</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-transform group-hover:scale-110', accentClass ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Limit pill ───────────────────────────────────────────────────────────────

function LimitPill({ label, value }: { label: string; value?: number }) {
  const isUnlimited = value === -1;
  return (
    <div className="flex flex-col rounded-lg border bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className={cn('mt-0.5 text-sm font-bold', isUnlimited ? 'text-violet-600 dark:text-violet-400' : 'text-slate-950 dark:text-slate-50')}>
        {formatLimit(value)}
      </span>
    </div>
  );
}

// ─── Plan Card (Cards view) ───────────────────────────────────────────────────

function PlanCard({
  plan,
  onEdit,
  isPopular,
  mrrMax,
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  isPopular: boolean;
  mrrMax: number;
}) {
  const tone = getPlanTone(plan.slug);
  const savings = yearlySavingsPercent(plan);
  const featureKeys = getPlanFeatureKeys(plan);
  const mrrPct = mrrMax > 0 ? Math.round((Number(plan.mrr || 0) / mrrMax) * 100) : 0;

  return (
    <Card
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:shadow-lg',
        tone.ring,
        tone.glow && 'hover:' + tone.glow,
      )}
    >
      {/* Top accent bar */}
      <div className={cn('h-1.5 w-full', tone.accent)} />

      {/* Header gradient */}
      <div className={cn('bg-gradient-to-b p-5 pb-4', tone.gradient)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', tone.badge)}>
              {plan.slug}
            </Badge>
            {isPopular && (
              <Badge className="rounded-lg bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                <Star className="mr-1 h-2.5 w-2.5 fill-amber-900" />
                Popular
              </Badge>
            )}
            {!plan.is_active && (
              <Badge variant="outline" className="rounded-lg border-slate-300 text-[11px] text-slate-400">
                Inactivo
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onEdit(plan)}
            aria-label={`Editar ${plan.display_name || plan.name}`}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </div>

        <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
          {plan.display_name || plan.name}
        </h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
          {plan.description || 'Sin descripción cargada para este plan.'}
        </p>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0">
        {/* Pricing */}
        <div className="flex items-end gap-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mensual</div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">
              {formatMoney(plan.price_monthly, plan.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Anual</div>
            <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">
              {formatMoney(plan.price_yearly, plan.currency)}
            </div>
            {savings > 0 && (
              <div className="mt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {savings}% ahorro
              </div>
            )}
          </div>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-2 gap-2">
          <LimitPill label="Usuarios" value={plan.limits?.maxUsers} />
          <LimitPill label="Productos" value={plan.limits?.maxProducts} />
          <LimitPill label="Ventas/mes" value={plan.limits?.maxTransactionsPerMonth} />
          <LimitPill label="Sucursales" value={plan.limits?.maxLocations} />
          <LimitPill label="Servicios" value={plan.limits?.maxServices} />
          <LimitPill label="Turnos/mes" value={plan.limits?.maxAppointmentsPerMonth} />
        </div>

        {/* Features preview */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from(featureKeys).slice(0, 5).map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-400"
            >
              <Check className="h-2.5 w-2.5 text-emerald-500" />
              {getCanonicalFeatureLabel(key)}
            </span>
          ))}
          {featureKeys.size > 5 && (
            <span className="inline-flex items-center rounded-md border bg-slate-50 px-2 py-0.5 text-[11px] text-slate-400 dark:bg-slate-900">
              +{featureKeys.size - 5} más
            </span>
          )}
        </div>

        {/* MRR bar */}
        <div className="mt-auto space-y-1.5 border-t pt-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">MRR</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {formatMoney(plan.mrr || 0, plan.currency)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn('h-full rounded-full transition-all duration-700', tone.bar)}
              style={{ width: `${mrrPct}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <Link
            href={`/superadmin/organizations?plan=${encodeURIComponent(plan.slug)}`}
            className={cn('inline-flex items-center gap-1.5 font-semibold hover:underline', tone.accentText)}
          >
            <Building2 className="h-3.5 w-3.5" />
            {Number(plan.organization_count || 0).toLocaleString('es-PY')} tenants
          </Link>
          <span>{formatDate(plan.updated_at || plan.created_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature Comparison Table ─────────────────────────────────────────────────

const LIMIT_ROWS: Array<{ label: string; key: keyof Plan['limits'] }> = [
  { label: 'Usuarios', key: 'maxUsers' },
  { label: 'Productos', key: 'maxProducts' },
  { label: 'Ventas / mes', key: 'maxTransactionsPerMonth' },
  { label: 'Sucursales', key: 'maxLocations' },
  { label: 'Servicios', key: 'maxServices' },
  { label: 'Turnos / mes', key: 'maxAppointmentsPerMonth' },
  { label: 'Profesionales', key: 'maxStaff' },
];

function FeatureComparisonView({
  plans,
  onEdit,
}: {
  plans: Plan[];
  onEdit: (plan: Plan) => void;
}) {
  // Group features by category
  const groups = useMemo(() => {
    const groupOrder = ['core', 'commerce', 'services', 'operations', 'team', 'reports', 'growth', 'enterprise'];
    return groupOrder.map((group) => ({
      group,
      label: GROUP_LABELS[group] ?? group,
      features: PLAN_FEATURE_DEFINITIONS.filter((f) => f.group === group),
    }));
  }, []);

  // Build a map of plan slug → feature keys
  const planFeatureSets = useMemo(() => {
    return plans.map((p) => ({
      plan: p,
      keys: getPlanFeatureKeys(p),
    }));
  }, [plans]);

  const colWidth = `${100 / (plans.length + 1)}%`;

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="border-b bg-slate-50 px-6 py-4 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" />
          <CardTitle className="text-base">Comparativa de Features</CardTitle>
        </div>
        <CardDescription>
          Vista completa de features y límites por plan. ✓ incluido · ✗ no incluido.
        </CardDescription>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          {/* Plan header row */}
          <thead>
            <tr className="border-b">
              <th className="py-4 pl-6 pr-4 text-left font-semibold text-slate-500" style={{ width: colWidth }}>
                Feature
              </th>
              {plans.map((plan) => {
                const tone = getPlanTone(plan.slug);
                return (
                  <th key={plan.id} className="px-4 py-4 text-center" style={{ width: colWidth }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={cn('h-1.5 w-8 rounded-full', tone.bar)} />
                      <Badge
                        variant="outline"
                        className={cn('rounded-lg px-3 py-0.5 text-[11px] font-bold uppercase', tone.badge)}
                      >
                        {plan.slug}
                      </Badge>
                      <span className="text-xs font-bold text-slate-950 dark:text-slate-50">
                        {plan.display_name || plan.name}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {formatMoney(plan.price_monthly, plan.currency)}/mes
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => onEdit(plan)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* Feature groups */}
            {groups.map(({ group, label, features }) => (
              <React.Fragment key={group}>
                {/* Group header */}
                <tr className="border-b bg-slate-50/80 dark:bg-slate-900/20">
                  <td
                    colSpan={plans.length + 1}
                    className="px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    {label}
                  </td>
                </tr>

                {/* Feature rows */}
                {features.map((featureDef, idx) => (
                  <tr
                    key={featureDef.key}
                    className={cn(
                      'border-b transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/20',
                      idx % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-900/10',
                    )}
                  >
                    <td className="py-3 pl-6 pr-4">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {featureDef.label}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-slate-400">{featureDef.description}</span>
                        {!isPublicPlanFeature(featureDef.key) && (
                          <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700">
                            No publico
                          </Badge>
                        )}
                      </div>
                    </td>
                    {planFeatureSets.map(({ plan, keys }) => {
                      const included = keys.has(featureDef.key);
                      const tone = getPlanTone(plan.slug);
                      return (
                        <td key={plan.id} className="px-4 py-3 text-center">
                          {included ? (
                            <span className="inline-flex items-center justify-center">
                              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', tone.accentBg)}>
                                <Check className={cn('h-3.5 w-3.5 font-bold', tone.accentText)} />
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <X className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                              </span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}

            {/* Limits section */}
            <tr className="border-b bg-slate-50/80 dark:bg-slate-900/20">
              <td
                colSpan={plans.length + 1}
                className="px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400"
              >
                Límites operativos
              </td>
            </tr>
            {LIMIT_ROWS.map(({ label, key }, idx) => (
              <tr
                key={key}
                className={cn(
                  'border-b transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/20',
                  idx % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-900/10',
                )}
              >
                <td className="py-3 pl-6 pr-4 font-medium text-slate-700 dark:text-slate-300">
                  {label}
                </td>
                {planFeatureSets.map(({ plan }) => {
                  const val = plan.limits?.[key];
                  const isUnlimited = val === -1;
                  const tone = getPlanTone(plan.slug);
                  return (
                    <td key={plan.id} className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'inline-block rounded-lg px-2.5 py-0.5 text-sm font-bold',
                          isUnlimited
                            ? cn('bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400')
                            : cn(tone.accentBg, tone.accentText),
                        )}
                      >
                        {formatLimit(val)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Pricing row */}
            <tr className="border-b bg-slate-50/80 dark:bg-slate-900/20">
              <td
                colSpan={plans.length + 1}
                className="px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400"
              >
                Precios
              </td>
            </tr>
            {[
              { label: 'Precio mensual', key: 'price_monthly' as const },
              { label: 'Precio anual', key: 'price_yearly' as const },
              { label: 'Trial (días)', key: 'trial_days' as const },
            ].map(({ label, key }, idx) => (
              <tr
                key={key}
                className={cn(
                  'border-b transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/20',
                  idx % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-900/10',
                )}
              >
                <td className="py-3 pl-6 pr-4 font-medium text-slate-700 dark:text-slate-300">
                  {label}
                </td>
                {planFeatureSets.map(({ plan }) => {
                  const tone = getPlanTone(plan.slug);
                  const raw = plan[key];
                  const display =
                    key === 'trial_days'
                      ? `${raw ?? 0} días`
                      : formatMoney(Number(raw ?? 0), plan.currency);
                  return (
                    <td key={plan.id} className="px-4 py-3 text-center">
                      <span className={cn('text-sm font-bold', tone.accentText)}>{display}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  plans,
  onEdit,
  isFetching,
  total,
  page,
  totalPages,
  canPrev,
  canNext,
  onPageChange,
}: {
  plans: Plan[];
  onEdit: (plan: Plan) => void;
  isFetching: boolean;
  total: number;
  page: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="border-b bg-slate-50 px-6 py-4 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-slate-500" />
          <CardTitle className="text-base">Matriz operativa</CardTitle>
        </div>
        <CardDescription>
          Comparación compacta de precios, límites y adopción sin abrir cada plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 dark:bg-slate-900/20">
                <TableHead className="min-w-[220px] font-semibold">Plan</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="text-right font-semibold">Mensual</TableHead>
                <TableHead className="text-right font-semibold">Anual</TableHead>
                <TableHead className="text-right font-semibold">Usuarios</TableHead>
                <TableHead className="text-right font-semibold">Productos</TableHead>
                <TableHead className="text-right font-semibold">Ventas/mes</TableHead>
                <TableHead className="text-right font-semibold">Sucursales</TableHead>
                <TableHead className="text-right font-semibold">Servicios</TableHead>
                <TableHead className="text-right font-semibold">Turnos/mes</TableHead>
                <TableHead className="text-right font-semibold">Staff</TableHead>
                <TableHead className="text-right font-semibold">Tenants</TableHead>
                <TableHead className="text-right font-semibold">Activas</TableHead>
                <TableHead className="text-right font-semibold">MRR</TableHead>
                <TableHead className="font-semibold">Actualizado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => {
                const tenantCount = Number(plan.organization_count || 0);
                const tone = getPlanTone(plan.slug);
                return (
                  <TableRow key={plan.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn('h-8 w-1 rounded-full', tone.bar)} />
                        <div>
                          <Badge
                            variant="outline"
                            className={cn('mb-1 rounded-lg text-[11px] font-bold uppercase', tone.badge)}
                          >
                            {plan.slug}
                          </Badge>
                          <div className="font-semibold text-slate-950 dark:text-slate-50">
                            {plan.display_name || plan.name}
                          </div>
                          <div className="max-w-[280px] truncate text-xs text-slate-400">
                            {plan.description || 'Sin descripción'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.is_active ? (
                        <Badge
                          variant="outline"
                          className="rounded-lg border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-lg text-slate-400">
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatMoney(plan.price_monthly, plan.currency)}
                    </TableCell>
                    <TableCell className="text-right text-slate-600 dark:text-slate-400">
                      {formatMoney(plan.price_yearly, plan.currency)}
                    </TableCell>
                    <TableCell className="text-right">{formatLimit(plan.limits?.maxUsers)}</TableCell>
                    <TableCell className="text-right">{formatLimit(plan.limits?.maxProducts)}</TableCell>
                    <TableCell className="text-right">
                      {formatLimit(plan.limits?.maxTransactionsPerMonth)}
                    </TableCell>
                    <TableCell className="text-right">{formatLimit(plan.limits?.maxLocations)}</TableCell>
                    <TableCell className="text-right">{formatLimit(plan.limits?.maxServices)}</TableCell>
                    <TableCell className="text-right">{formatLimit(plan.limits?.maxAppointmentsPerMonth)}</TableCell>
                    <TableCell className="text-right">{formatLimit(plan.limits?.maxStaff)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/superadmin/organizations?plan=${encodeURIComponent(plan.slug)}`}
                        className={cn(
                          'inline-flex items-center gap-1 text-sm font-semibold hover:underline',
                          tone.accentText,
                        )}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        {tenantCount}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(plan.active_subscription_count || 0).toLocaleString('es-PY')}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(plan.mrr || 0, plan.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {formatDate(plan.updated_at || plan.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label={`Acciones para ${plan.display_name || plan.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEdit(plan)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar plan
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/superadmin/organizations?plan=${encodeURIComponent(plan.slug)}`}
                            >
                              <Building2 className="mr-2 h-4 w-4" />
                              Ver organizaciones
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              {total} planes · Página {page} de {totalPages}
              {isFetching && <span className="ml-2 text-slate-300">Actualizando…</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={!canPrev || isFetching}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={!canNext || isFetching}
              >
                Siguiente
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function PlansLoadingState() {
  return (
    <SuperAdminGuard>
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-10 w-56 rounded-lg" />
          <Skeleton className="h-4 w-[480px] max-w-full rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[520px] rounded-xl" />
          ))}
        </div>
      </div>
    </SuperAdminGuard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [sort, setSort] = useState<SortValue>('price_monthly_asc');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearchQuery(value);
    setPage(1);
  }, 300);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['saas-plans', debouncedSearchQuery, statusFilter, sort, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: debouncedSearchQuery,
        status: statusFilter,
        sort,
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`/api/superadmin/plans?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Error al cargar planes');
      return json as { plans: Plan[]; total: number; page: number; pageSize: number };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  const processedPlans = useMemo(() => {
    if (!data?.plans) return [];
    return dedupeCanonicalPlans(
      data.plans.map((plan) => {
        const slug = normalizePlanSlug(plan.slug);
        return {
          ...plan,
          slug,
          display_name: getCanonicalPlanDisplayName(slug),
          name: String(plan.name || '').trim() || getCanonicalPlanDisplayName(slug),
        };
      }),
      (current, candidate) => {
        if (!current) return candidate;
        return Number(candidate.organization_count || 0) > Number(current.organization_count || 0)
          ? candidate
          : current;
      },
    );
  }, [data?.plans]);

  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const summary = useMemo(() => {
    const activePlans = processedPlans.filter((p) => p.is_active).length;
    const tenants = processedPlans.reduce((s, p) => s + Number(p.organization_count || 0), 0);
    const activeSubscriptions = processedPlans.reduce(
      (s, p) => s + Number(p.active_subscription_count || 0),
      0,
    );
    const mrr = processedPlans.reduce((s, p) => s + Number(p.mrr || 0), 0);
    const topPlan = processedPlans.reduce<Plan | null>((cur, p) => {
      if (!cur) return p;
      return Number(p.mrr || 0) > Number(cur.mrr || 0) ? p : cur;
    }, null);
    const popularPlan = processedPlans.reduce<Plan | null>((cur, p) => {
      if (!cur) return p;
      return Number(p.organization_count || 0) > Number(cur.organization_count || 0) ? p : cur;
    }, null);
    const mrrMax = Math.max(...processedPlans.map((p) => Number(p.mrr || 0)), 1);
    return { activePlans, tenants, activeSubscriptions, mrr, topPlan, popularPlan, mrrMax };
  }, [processedPlans]);

  const openEditModal = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  }, []);

  if (isLoading) return <PlansLoadingState />;

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">No se pudo cargar planes</h1>
            <p className="mt-2 text-sm text-slate-500">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
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
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-blue-500">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Catálogo SaaS
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">
              Planes
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              Vista operativa de precios, límites, features y adopción por tenant.
              Editá el plan sin salir del panel.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-lg"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Actualizar
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Planes activos"
            value={String(summary.activePlans)}
            helper={`${processedPlans.length} planes canónicos`}
            icon={<Zap className="h-5 w-5" />}
            accentClass="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          />
          <KpiCard
            label="Tenants asignados"
            value={summary.tenants.toLocaleString('es-PY')}
            helper="Organizaciones activas"
            icon={<Building2 className="h-5 w-5" />}
            accentClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          />
          <KpiCard
            label="Suscripciones activas"
            value={summary.activeSubscriptions.toLocaleString('es-PY')}
            helper="Activas o en período de prueba"
            icon={<Users className="h-5 w-5" />}
            accentClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          />
          <KpiCard
            label="MRR estimado"
            value={formatMoney(summary.mrr, processedPlans[0]?.currency || 'PYG')}
            helper={
              summary.topPlan
                ? `Mayor: ${summary.topPlan.display_name || summary.topPlan.name}`
                : 'Sin datos'
            }
            icon={<TrendingUp className="h-5 w-5" />}
            accentClass="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          />
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-950 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: status tabs + view toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(
                  (v === 'inactive' || v === 'all' ? v : 'active') as 'active' | 'inactive' | 'all',
                );
                setPage(1);
              }}
            >
              <TabsList className="rounded-lg">
                <TabsTrigger value="active">Activos</TabsTrigger>
                <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center rounded-lg border bg-slate-50 p-1 dark:bg-slate-900">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 rounded-md px-3 text-xs"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 rounded-md px-3 text-xs"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="h-3.5 w-3.5" />
                Tabla
              </Button>
              <Button
                variant={viewMode === 'comparison' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 rounded-md px-3 text-xs"
                onClick={() => setViewMode('comparison')}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Comparativa
              </Button>
            </div>
          </div>

          {/* Right: search + sort */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                placeholder="Buscar plan…"
                className="rounded-lg pl-9 pr-9"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
              )}
            </div>
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort((v || 'price_monthly_asc') as SortValue);
                setPage(1);
              }}
            >
              <SelectTrigger className="rounded-lg sm:w-[200px]">
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_monthly_asc">Precio mensual ↑</SelectItem>
                <SelectItem value="price_monthly_desc">Precio mensual ↓</SelectItem>
                <SelectItem value="slug_asc">Plan A → Z</SelectItem>
                <SelectItem value="slug_desc">Plan Z → A</SelectItem>
                <SelectItem value="updated_at_desc">Más reciente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Info banner ─────────────────────────────────────────── */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <Store className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div className="text-blue-800 dark:text-blue-200">
            <span className="font-semibold">Planes base sincronizados con el sistema. </span>
            Esta sección mantiene Free, Starter, Professional y Enterprise. Los cambios guardados
            viajan por la API de superadmin y alimentan nuevas asignaciones, límites y promociones SaaS.
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        {processedPlans.length === 0 ? (
          <Card className="rounded-xl border shadow-sm">
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Sparkles className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">No hay planes para estos filtros</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ajustá la búsqueda o cambiá el estado seleccionado.
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-lg"
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearchQuery('');
                  setStatusFilter('active');
                  setSort('price_monthly_asc');
                  setPage(1);
                }}
              >
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cards view */}
            {viewMode === 'cards' && (
              <div className="grid gap-5 xl:grid-cols-4 lg:grid-cols-2">
                {processedPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={openEditModal}
                    isPopular={summary.popularPlan?.id === plan.id}
                    mrrMax={summary.mrrMax}
                  />
                ))}
              </div>
            )}

            {/* Table view */}
            {viewMode === 'table' && (
              <TableView
                plans={processedPlans}
                onEdit={openEditModal}
                isFetching={isFetching}
                total={total}
                page={page}
                totalPages={totalPages}
                canPrev={canPrev}
                canNext={canNext}
                onPageChange={setPage}
              />
            )}

            {/* Comparison view */}
            {viewMode === 'comparison' && (
              <FeatureComparisonView plans={processedPlans} onEdit={openEditModal} />
            )}
          </>
        )}
      </div>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['saas-plans'] })}
        plan={selectedPlan}
      />
    </SuperAdminGuard>
  );
}
