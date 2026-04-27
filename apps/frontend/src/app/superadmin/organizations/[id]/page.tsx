'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  Package,
  Phone,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldAlert,
  Store,
  AlertTriangle,
  UserCheck,
  UserX,
  Users,
  Wifi,
  WifiOff,
  XCircle,
  type LucideIcon
} from 'lucide-react';
import { SuperAdminGuard } from '../../components/SuperAdminGuard';
import { useOrganization, type OrganizationDetail } from '../../hooks/useOrganization';
import { useUsers, type AdminUser } from '../../hooks/useUsers';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useOrganizationInsights } from '../../hooks/useOrganizationInsights';

type BillingCycle = 'monthly' | 'yearly';
type SubscriptionStatusValue = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';
type PlanValue = 'FREE' | 'STARTER' | 'PROFESSIONAL';
type DetailTab = 'overview' | 'team' | 'operations';
type TeamStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type HealthTone = 'critical' | 'warning' | 'good' | 'info';

type OrganizationSettingsView = {
  description: string;
  industry: string;
  contactInfo: {
    email: string;
    phone: string;
    website: string;
  };
  regional: {
    language: string;
    currency: string;
    timezone: string;
  };
  features: {
    multiBranch: boolean;
    advancedInventory: boolean;
    customReports: boolean;
    apiAccess: boolean;
  };
  limits: {
    maxUsers: number;
    maxBranches: number;
    maxProducts: number;
    storageGb: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
  };
  supportEmail: string;
  apiRateLimit: number;
  billingCycle: BillingCycle;
};

const DEFAULT_SETTINGS_VIEW: OrganizationSettingsView = {
  description: '',
  industry: '',
  contactInfo: {
    email: '',
    phone: '',
    website: '',
  },
  regional: {
    language: 'es',
    currency: 'PYG',
    timezone: 'America/Asuncion',
  },
  features: {
    multiBranch: false,
    advancedInventory: false,
    customReports: false,
    apiAccess: false,
  },
  limits: {
    maxUsers: 1,
    maxBranches: 1,
    maxProducts: 20,
    storageGb: 1,
  },
  notifications: {
    email: false,
    sms: false,
  },
  supportEmail: '',
  apiRateLimit: 60,
  billingCycle: 'monthly',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {} as Record<string, unknown>);
  }

  return value;
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortDeep(value));
}

function normalizeSettings(raw: Record<string, unknown> | null | undefined): OrganizationSettingsView {
  const settings = asRecord(raw);
  const contactInfo = asRecord(settings.contactInfo);
  const regional = asRecord(settings.regional);
  const features = asRecord(settings.features);
  const limits = asRecord(settings.limits);
  const notifications = asRecord(settings.notifications);

  return {
    description: asString(settings.description),
    industry: asString(settings.industry),
    contactInfo: {
      email: asString(contactInfo.email),
      phone: asString(contactInfo.phone),
      website: asString(contactInfo.website),
    },
    regional: {
      language: asString(regional.language, 'es'),
      currency: asString(regional.currency, 'PYG'),
      timezone: asString(regional.timezone, 'America/Asuncion'),
    },
    features: {
      multiBranch: asBoolean(features.multi_branch),
      advancedInventory: asBoolean(features.advanced_inventory),
      customReports: asBoolean(features.custom_reports),
      apiAccess: asBoolean(features.api_access),
    },
    limits: {
      maxUsers: asNumber(limits.max_users, 1),
      maxBranches: asNumber(limits.max_branches, 1),
      maxProducts: asNumber(limits.max_products, 20),
      storageGb: asNumber(limits.storage_gb, 1),
    },
    notifications: {
      email: asBoolean(notifications.email),
      sms: asBoolean(notifications.sms),
    },
    supportEmail: asString(settings.support_email),
    apiRateLimit: asNumber(settings.api_rate_limit, 60),
    billingCycle: asString(settings.billingCycle, 'monthly') === 'yearly' ? 'yearly' : 'monthly',
  };
}

function buildSettingsPayload(source: Record<string, unknown>, view: OrganizationSettingsView) {
  return {
    ...source,
    description: view.description,
    industry: view.industry,
    billingCycle: view.billingCycle,
    contactInfo: {
      ...asRecord(source.contactInfo),
      email: view.contactInfo.email,
      phone: view.contactInfo.phone,
      website: view.contactInfo.website,
    },
    regional: {
      ...asRecord(source.regional),
      language: view.regional.language,
      currency: view.regional.currency,
      timezone: view.regional.timezone,
    },
    features: {
      ...asRecord(source.features),
      multi_branch: view.features.multiBranch,
      advanced_inventory: view.features.advancedInventory,
      custom_reports: view.features.customReports,
      api_access: view.features.apiAccess,
    },
    limits: {
      ...asRecord(source.limits),
      max_users: view.limits.maxUsers,
      max_branches: view.limits.maxBranches,
      max_products: view.limits.maxProducts,
      storage_gb: view.limits.storageGb,
    },
    notifications: {
      ...asRecord(source.notifications),
      email: view.notifications.email,
      sms: view.notifications.sms,
    },
    support_email: view.supportEmail,
    api_rate_limit: view.apiRateLimit,
  };
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin registro';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getDomainLabel(organization: OrganizationDetail | null) {
  if (!organization) return 'Sin dominio';
  if (organization.custom_domain) return organization.custom_domain;
  if (organization.subdomain) return `${organization.subdomain}.mipos.app`;
  return `mipos.app/${organization.slug}`;
}

function getStatusMeta(status: string) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACTIVE') return { label: 'Activa', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' };
  if (normalized === 'TRIAL') return { label: 'Trial', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300' };
  if (normalized === 'SUSPENDED') return { label: 'Suspendida', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' };
  if (normalized === 'CANCELLED') return { label: 'Cancelada', className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300' };
  return { label: normalized || 'Sin estado', className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300' };
}

function getPlanMeta(plan: string) {
  const normalized = String(plan || '').toUpperCase();
  if (normalized === 'PROFESSIONAL' || normalized === 'PRO') return { label: 'Professional', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300' };
  if (normalized === 'STARTER') return { label: 'Starter', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' };
  return { label: 'Gratis', className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300' };
}

function subscriptionStatusToValue(organization: OrganizationDetail | null): SubscriptionStatusValue {
  const rawStatus = organization?.subscription?.status || organization?.subscription_status || 'ACTIVE';
  const normalized = String(rawStatus).toUpperCase();
  if (normalized === 'TRIALING' || normalized === 'TRIAL') return 'TRIAL';
  if (normalized === 'SUSPENDED') return 'SUSPENDED';
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'CANCELLED';
  return 'ACTIVE';
}

function subscriptionPlanToValue(organization: OrganizationDetail | null): PlanValue {
  const rawPlan = organization?.subscription?.plan?.slug || organization?.subscription_plan || 'FREE';
  const normalized = String(rawPlan).toUpperCase();
  if (normalized === 'STARTER') return 'STARTER';
  if (normalized === 'PROFESSIONAL' || normalized === 'PRO') return 'PROFESSIONAL';
  return 'FREE';
}

function SummaryMetric({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-background p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helper}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function UsageRow({
  label,
  current,
  limit,
  sourceLine,
}: {
  label: string;
  current: number;
  limit: number;
  sourceLine?: string;
}) {
  const isUnlimited = limit <= 0 || limit >= 999999;
  const percentage = isUnlimited ? 8 : Math.min(100, Math.round((current / Math.max(limit, 1)) * 100));
  const tone = percentage >= 90 ? 'bg-rose-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {current} / {isUnlimited ? 'Ilimitado' : limit}
        </div>
      </div>
      <Progress value={percentage} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
      <div className={cn('text-xs font-medium', percentage >= 90 ? 'text-rose-600' : percentage >= 70 ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400')}>
        {isUnlimited ? 'Sin tope operativo actual' : `${percentage}% del limite en uso`}
      </div>
      {sourceLine ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">{sourceLine}</div>
      ) : null}
      <div className={cn('hidden', tone)} />
    </div>
  );
}

function getHealthToneClass(tone: HealthTone) {
  if (tone === 'critical') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300';
  if (tone === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300';
  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
}

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const {
    organization,
    loading: orgLoading,
    isFetching: orgFetching,
    isRealtimeConnected: orgRealtime,
    updating: orgUpdating,
    error: orgError,
    refresh: refreshOrganization,
    updateOrganization,
  } = useOrganization(organizationId);

  const userFilters = useMemo(() => ({ organization: organizationId ? [organizationId] : [] }), [organizationId]);
  const {
    users,
    loading: usersLoading,
    isFetching: usersFetching,
    isRealtimeConnected: usersRealtime,
    totalCount: usersCount,
    error: usersError,
    refresh: refreshUsers,
    activateUser,
    deactivateUser,
  } = useUsers({
    filters: userFilters,
    pageSize: 100,
  });

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState('ALL');
  const [teamStatusFilter, setTeamStatusFilter] = useState<TeamStatusFilter>('ALL');
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    name: '',
    slug: '',
    subdomain: '',
    customDomain: '',
  });
  const [subscriptionDraft, setSubscriptionDraft] = useState<{
    plan: PlanValue;
    status: SubscriptionStatusValue;
    billingCycle: BillingCycle;
  }>({
    plan: 'FREE',
    status: 'ACTIVE',
    billingCycle: 'monthly',
  });
  const [settingsSource, setSettingsSource] = useState<Record<string, unknown>>({});
  const [settingsDraft, setSettingsDraft] = useState<OrganizationSettingsView>(DEFAULT_SETTINGS_VIEW);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);

  const syncDraftsFromOrganization = useCallback((source: OrganizationDetail) => {
    setProfileDraft({
      name: source.name || '',
      slug: source.slug || '',
      subdomain: source.subdomain || '',
      customDomain: source.custom_domain || '',
    });

    const rawSettings = asRecord(source.settings);
    setSubscriptionDraft({
      plan: subscriptionPlanToValue(source),
      status: subscriptionStatusToValue(source),
      billingCycle: source.subscription?.billingCycle || normalizeSettings(rawSettings).billingCycle,
    });
    setSettingsSource(rawSettings);
    setSettingsDraft(normalizeSettings(rawSettings));
  }, []);

  useEffect(() => {
    if (organization) {
      syncDraftsFromOrganization(organization);
    }
  }, [organization, syncDraftsFromOrganization]);

  const currentSettingsPayload = useMemo(
    () => buildSettingsPayload(settingsSource, settingsDraft),
    [settingsSource, settingsDraft]
  );

  const profileDirty = useMemo(() => {
    if (!organization) return false;
    return (
      profileDraft.name !== (organization.name || '') ||
      profileDraft.slug !== (organization.slug || '') ||
      profileDraft.subdomain !== (organization.subdomain || '') ||
      profileDraft.customDomain !== (organization.custom_domain || '')
    );
  }, [organization, profileDraft]);

  const subscriptionDirty = useMemo(() => {
    if (!organization) return false;
    return (
      subscriptionDraft.plan !== subscriptionPlanToValue(organization) ||
      subscriptionDraft.status !== subscriptionStatusToValue(organization) ||
      subscriptionDraft.billingCycle !== (organization.subscription?.billingCycle || normalizeSettings(asRecord(organization.settings)).billingCycle)
    );
  }, [organization, subscriptionDraft]);

  const settingsDirty = useMemo(
    () => stableStringify(currentSettingsPayload) !== stableStringify(settingsSource),
    [currentSettingsPayload, settingsSource]
  );

  const pendingChanges = Number(profileDirty) + Number(subscriptionDirty) + Number(settingsDirty);

  const activeUsers = useMemo(
    () => users.filter((user: AdminUser) => user.is_active).length,
    [users]
  );

  const managementUsers = useMemo(() => {
    const rank = (role: string) => {
      if (role === 'OWNER') return 0;
      if (role === 'ADMIN') return 1;
      return 2;
    };

    return [...users]
      .filter((user: AdminUser) => ['OWNER', 'ADMIN'].includes(String(user.role || '').toUpperCase()))
      .sort((left, right) => {
        const rankDiff = rank(String(left.role || '').toUpperCase()) - rank(String(right.role || '').toUpperCase());
        if (rankDiff !== 0) return rankDiff;
        return new Date(right.last_sign_in_at || 0).getTime() - new Date(left.last_sign_in_at || 0).getTime();
      });
  }, [users]);

  const roleOptions = useMemo(
    () => ['ALL', ...Array.from(new Set(users.map((user) => String(user.role || '').toUpperCase()).filter(Boolean))).sort()],
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();

    return users.filter((user: AdminUser) => {
      const matchesSearch = !query || (
        String(user.full_name || '').toLowerCase().includes(query) ||
        String(user.email || '').toLowerCase().includes(query) ||
        String(user.role || '').toLowerCase().includes(query)
      );
      const matchesRole = teamRoleFilter === 'ALL' || String(user.role || '').toUpperCase() === teamRoleFilter;
      const matchesStatus =
        teamStatusFilter === 'ALL' ||
        (teamStatusFilter === 'ACTIVE' && user.is_active) ||
        (teamStatusFilter === 'INACTIVE' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [teamRoleFilter, teamSearch, teamStatusFilter, users]);

  const statusMeta = getStatusMeta(subscriptionDraft.status);
  const planMeta = getPlanMeta(subscriptionDraft.plan);
  const domainLabel = getDomainLabel(organization || null);
  const usage = organization?.usage || { users: usersCount, products: 0, locations: 0, transactions: 0 };
  const subscription = organization?.subscription || null;
  const insights = useOrganizationInsights(organizationId);
  const operationalHealth = insights.operationalHealth.data || null;
  const currentUsage = insights.currentUsage.data || null;
  const productsCount = currentUsage?.metrics.find((m) => m.key === 'products')?.used ?? usage.products;
  const locationsCount = currentUsage?.metrics.find((m) => m.key === 'locations')?.used ?? usage.locations;
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'miposparaguay.vercel.app';
  const publicAddress = organization?.custom_domain || (organization?.subdomain ? `${organization.subdomain}.${baseDomain}` : null);
  const effectiveLimits = useMemo(() => ({
    users: subscription?.plan.limits.maxUsers ?? settingsDraft.limits.maxUsers,
    products: subscription?.plan.limits.maxProducts ?? settingsDraft.limits.maxProducts,
    locations: subscription?.plan.limits.maxLocations ?? settingsDraft.limits.maxBranches,
    transactions: subscription?.plan.limits.maxTransactionsPerMonth ?? 0,
  }), [settingsDraft.limits.maxBranches, settingsDraft.limits.maxProducts, settingsDraft.limits.maxUsers, subscription]);

  const usageItems = useMemo(() => {
    if (currentUsage) {
      return currentUsage.metrics
        .map((metric) => {
          const isUnlimited = metric.limit <= 0 || metric.limit >= 999999;
          const percentage = isUnlimited ? 0 : Math.min(100, Math.round((metric.used / Math.max(metric.limit, 1)) * 100));
          return {
            label: metric.label,
            current: metric.used,
            limit: metric.limit,
            isUnlimited,
            percentage,
            sourceLine: `${metric.source.tableOrView} · ${metric.source.aggregation}`,
          };
        })
        .sort((left, right) => right.percentage - left.percentage);
    }

    const entries = [
      { label: 'Usuarios', current: usage.users, limit: effectiveLimits.users },
      { label: 'Productos', current: usage.products, limit: effectiveLimits.products },
      { label: 'Sucursales', current: usage.locations, limit: effectiveLimits.locations },
      { label: 'Transacciones', current: usage.transactions, limit: effectiveLimits.transactions },
    ];

    return entries
      .map((entry) => {
        const isUnlimited = entry.limit <= 0 || entry.limit >= 999999;
        const percentage = isUnlimited ? 0 : Math.min(100, Math.round((entry.current / Math.max(entry.limit, 1)) * 100));
        return {
          ...entry,
          isUnlimited,
          percentage,
          sourceLine: undefined,
        };
      })
      .sort((left, right) => right.percentage - left.percentage);
  }, [currentUsage, effectiveLimits.locations, effectiveLimits.products, effectiveLimits.transactions, effectiveLimits.users, usage.locations, usage.products, usage.transactions, usage.users]);

  const healthItems = useMemo(() => {
    if (operationalHealth) {
      const toneFrom = (status: string): HealthTone => {
        if (status === 'critical') return 'critical';
        if (status === 'warn') return 'warning';
        if (status === 'ok') return 'good';
        return 'info';
      };

      const items = operationalHealth.indicators.map((indicator) => ({
        title: indicator.label,
        description: indicator.valueText,
        tone: toneFrom(indicator.status),
        sourceLine: `${indicator.source.tableOrView} · ${indicator.source.calculation}`,
      }));

      return items.length
        ? items
        : [
            {
              title: 'Sin indicadores disponibles',
              description: 'No se pudo calcular la salud operativa para esta organización.',
              tone: 'info' as const,
              sourceLine: undefined,
            },
          ];
    }

    const items: Array<{ title: string; description: string; tone: HealthTone }> = [];
    const usageCritical = usageItems.filter((item) => !item.isUnlimited && item.percentage >= 90);
    const usageWarning = usageItems.filter((item) => !item.isUnlimited && item.percentage >= 70 && item.percentage < 90);

    if (subscriptionDraft.status === 'SUSPENDED') {
      items.push({
        title: 'Suscripcion suspendida',
        description: 'La organizacion tiene acceso restringido hasta que se reactive.',
        tone: 'critical',
      });
    } else if (subscriptionDraft.status === 'CANCELLED') {
      items.push({
        title: 'Suscripcion cancelada',
        description: 'La cuenta quedo fuera del ciclo comercial actual.',
        tone: 'critical',
      });
    } else if (subscription && subscription.daysUntilRenewal <= 7) {
      items.push({
        title: 'Renovacion cercana',
        description: `Faltan ${subscription.daysUntilRenewal} dias para el cierre del periodo actual.`,
        tone: 'warning',
      });
    }

    if (!publicAddress) {
      items.push({
        title: 'Sin direccion publica',
        description: 'No tiene subdominio ni dominio propio configurado.',
        tone: 'warning',
      });
    }

    if (!settingsDraft.contactInfo.email) {
      items.push({
        title: 'Falta email comercial',
        description: 'No hay un correo principal para soporte o comunicaciones.',
        tone: 'warning',
      });
    }

    if (managementUsers.length === 0) {
      items.push({
        title: 'Sin responsables activos',
        description: 'No se detectaron usuarios OWNER o ADMIN vinculados a la organizacion.',
        tone: 'critical',
      });
    }

    if (usageCritical.length > 0) {
      items.push({
        title: 'Capacidad al limite',
        description: `Conviene revisar ${usageCritical.map((item) => item.label.toLowerCase()).join(', ')}.`,
        tone: 'critical',
      });
    } else if (usageWarning.length > 0) {
      items.push({
        title: 'Capacidad en observacion',
        description: `Hay modulos cerca del limite: ${usageWarning.map((item) => item.label.toLowerCase()).join(', ')}.`,
        tone: 'warning',
      });
    }

    if (!settingsDraft.supportEmail) {
      items.push({
        title: 'Sin canal de soporte',
        description: 'No se definio un correo de soporte para este tenant.',
        tone: 'info',
      });
    }

    if (items.length === 0) {
      items.push({
        title: 'Sin alertas relevantes',
        description: 'La organizacion tiene responsables activos, direccion publica y uso dentro del plan.',
        tone: 'good',
      });
    }

    return items;
  }, [managementUsers.length, operationalHealth, publicAddress, settingsDraft.contactInfo.email, settingsDraft.supportEmail, subscription, subscriptionDraft.status, usageItems]);

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error(`No se pudo copiar ${label.toLowerCase()}`);
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([refreshOrganization(), refreshUsers()]);
  };

  const handleSaveProfile = async () => {
    await updateOrganization({
      name: profileDraft.name,
      slug: profileDraft.slug,
      subdomain: profileDraft.subdomain,
      custom_domain: profileDraft.customDomain || null,
    });
  };

  const handleSaveSubscription = async () => {
    await updateOrganization({
      subscription_plan: subscriptionDraft.plan,
      subscription_status: subscriptionDraft.status,
      billingCycle: subscriptionDraft.billingCycle,
    });
  };

  const handleSaveSettings = async () => {
    await updateOrganization({
      settings: currentSettingsPayload,
    });
  };

  const handleSaveAll = async () => {
    if (profileDirty) await handleSaveProfile();
    if (subscriptionDirty) await handleSaveSubscription();
    if (settingsDirty) await handleSaveSettings();
  };

  const handleSuspendOrganization = async () => {
    await updateOrganization({ subscription_status: 'SUSPENDED' });
    setSuspendDialogOpen(false);
  };

  const handleReactivateOrganization = async () => {
    await updateOrganization({ subscription_status: 'ACTIVE' });
  };

  const handleToggleUserStatus = async (user: AdminUser) => {
    setMemberActionId(user.id);
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
      } else {
        await activateUser(user.id);
      }
    } finally {
      setMemberActionId(null);
    }
  };

  const resetProfileDraft = useCallback(() => {
    if (!organization) return;
    setProfileDraft({
      name: organization.name || '',
      slug: organization.slug || '',
      subdomain: organization.subdomain || '',
      customDomain: organization.custom_domain || '',
    });
  }, [organization]);

  const resetSubscriptionDraft = useCallback(() => {
    if (!organization) return;
    setSubscriptionDraft({
      plan: subscriptionPlanToValue(organization),
      status: subscriptionStatusToValue(organization),
      billingCycle: organization.subscription?.billingCycle || normalizeSettings(asRecord(organization.settings)).billingCycle,
    });
  }, [organization]);

  const resetSettingsDraft = useCallback(() => {
    if (!organization) return;
    const rawSettings = asRecord(organization.settings);
    setSettingsSource(rawSettings);
    setSettingsDraft(normalizeSettings(rawSettings));
  }, [organization]);

  const resetAllDrafts = useCallback(() => {
    if (!organization) return;
    syncDraftsFromOrganization(organization);
  }, [organization, syncDraftsFromOrganization]);

  if (orgLoading && !organization) {
    return (
      <SuperAdminGuard>
        <div className="flex min-h-[520px] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando detalle de la organizacion...</p>
        </div>
      </SuperAdminGuard>
    );
  }

  if (orgError) {
    return (
      <SuperAdminGuard>
        <div className="mx-auto flex min-h-[520px] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-full bg-rose-50 p-4 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
            <ShieldAlert className="h-9 w-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">No se pudo cargar la organizacion</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{orgError}</p>
          </div>
          <Button onClick={() => refreshOrganization()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  if (!organization) {
    return (
      <SuperAdminGuard>
        <div className="mx-auto flex min-h-[520px] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
            <Building2 className="h-9 w-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Organizacion no encontrada</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              El registro solicitado no existe o ya no esta disponible.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/superadmin/organizations')}>
            Volver a organizaciones
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-fit gap-2 px-0 text-slate-500 hover:bg-transparent hover:text-slate-900 dark:hover:text-slate-100"
              onClick={() => router.push('/superadmin/organizations')}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a organizaciones
            </Button>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  {organization.name}
                </h1>
                <Badge variant="outline" className={cn('border px-2.5 py-1 text-xs font-semibold', statusMeta.className)}>
                  {statusMeta.label}
                </Badge>
                <Badge variant="outline" className={cn('border px-2.5 py-1 text-xs font-semibold', planMeta.className)}>
                  {planMeta.label}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span>/{organization.slug}</span>
                <span>{domainLabel}</span>
                <span>ID {organization.id}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'h-10 rounded-full px-3 text-sm font-medium',
                orgRealtime || usersRealtime
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              )}
            >
              {orgRealtime || usersRealtime ? <Wifi className="mr-2 h-4 w-4" /> : <WifiOff className="mr-2 h-4 w-4" />}
              {orgRealtime || usersRealtime ? 'Sincronizado' : 'Sin live sync'}
            </Badge>

            {pendingChanges > 0 && (
              <Badge variant="outline" className="h-10 rounded-full border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                {pendingChanges} cambios sin guardar
              </Badge>
            )}

            <Button variant="outline" className="gap-2" onClick={handleRefreshAll} disabled={orgFetching || usersFetching}>
              <RefreshCcw className={cn('h-4 w-4', (orgFetching || usersFetching) && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Miembros" value={organization.member_count ?? usersCount} helper={`${activeUsers} activos`} icon={Users} />
          <SummaryMetric label="Productos" value={productsCount} helper="Catalogo operativo" icon={Package} />
          <SummaryMetric label="Sucursales" value={locationsCount} helper="Ubicaciones registradas" icon={Store} />
          <SummaryMetric
            label="Renovacion"
            value={subscription ? `${subscription.daysUntilRenewal} d` : 'N/A'}
            helper={subscription ? formatDate(subscription.currentPeriodEnd) : 'Sin suscripcion'}
            icon={Calendar}
          />
        </section>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DetailTab)} className="space-y-6">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-slate-200 bg-background p-2 dark:border-slate-800">
            <TabsTrigger value="overview" className="rounded-xl px-4 py-2">Resumen</TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl px-4 py-2">Equipo</TabsTrigger>
            <TabsTrigger value="operations" className="rounded-xl px-4 py-2">Operacion</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Identidad y acceso</CardTitle>
                    <CardDescription>Datos base del tenant y accesos publicos efectivos.</CardDescription>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => setActiveTab('operations')}>
                    <Globe className="h-4 w-4" />
                    Editar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Slug</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">/{organization.slug}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Direccion publica</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{publicAddress || 'Sin configurar'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Creada</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{formatDate(organization.created_at)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Ultima actualizacion</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{formatDateTime(organization.updated_at)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Identificador</div>
                        <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{organization.id}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy(organization.id, 'ID')}>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar ID
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy(domainLabel, 'Dominio')}>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar dominio
                        </Button>
                        {organization.custom_domain && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.open(`https://${organization.custom_domain}`, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Salud operativa</CardTitle>
                    <CardDescription>Senales utiles para soporte, billing y gobierno del tenant.</CardDescription>
                  </div>
                  <Badge variant="outline" className={cn('border px-2.5 py-1 text-xs font-semibold', getHealthToneClass(healthItems[0]?.tone || 'info'))}>
                    {healthItems.filter((item) => item.tone === 'critical').length > 0
                      ? 'Accion requerida'
                      : healthItems.filter((item) => item.tone === 'warning').length > 0
                        ? 'En observacion'
                        : 'Estable'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Suscripcion</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{statusMeta.label}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subscriptionDraft.billingCycle === 'yearly' ? 'Ciclo anual' : 'Ciclo mensual'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Plan actual</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{subscription?.plan.name || planMeta.label}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {subscription ? `Renueva ${formatDate(subscription.currentPeriodEnd)}` : 'Sin suscripcion activa'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {healthItems.map((item: any) => (
                      <div key={`${item.title}-${item.description}`} className={cn('rounded-2xl border px-4 py-3', getHealthToneClass(item.tone))}>
                        <div className="flex items-start gap-3">
                          {item.tone === 'good' ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
                          <div>
                            <div className="text-sm font-medium">{item.title}</div>
                            <div className="mt-1 text-sm opacity-90">{item.description}</div>
                            {item.sourceLine ? (
                              <div className="mt-1 text-xs opacity-80">{item.sourceLine}</div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" className="gap-2" onClick={() => setActiveTab('operations')}>
                      <Globe className="h-4 w-4" />
                      Gestionar tenant
                    </Button>
                    {subscriptionDraft.status === 'SUSPENDED' ? (
                      <Button className="gap-2" onClick={handleReactivateOrganization} disabled={orgUpdating}>
                        {orgUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Reactivar ahora
                      </Button>
                    ) : (
                      <Button variant="outline" className="gap-2 text-amber-700 hover:text-amber-700" onClick={() => setSuspendDialogOpen(true)}>
                        <XCircle className="h-4 w-4" />
                        Suspender
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Responsables y contacto</CardTitle>
                  <CardDescription>Usuarios con rol de gobierno y datos utiles para soporte.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
                        <div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Email comercial</div>
                          <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{settingsDraft.contactInfo.email || 'No registrado'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="flex items-start gap-3">
                        <Phone className="mt-0.5 h-4 w-4 text-slate-500" />
                        <div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Telefono</div>
                          <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{settingsDraft.contactInfo.phone || 'No registrado'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Industria</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{settingsDraft.industry || 'No definida'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Region</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">
                        {settingsDraft.regional.currency} / {settingsDraft.regional.timezone}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {managementUsers.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        No hay usuarios OWNER o ADMIN cargados en esta organizacion.
                      </div>
                    ) : (
                      managementUsers.slice(0, 4).map((user) => (
                        <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-slate-500" />
                              <span className="truncate text-sm font-medium text-slate-950 dark:text-slate-50">{user.full_name || 'Sin nombre'}</span>
                              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                {user.role}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ultimo acceso: {formatDateTime(user.last_sign_in_at)}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy(user.email, 'Email')}>
                              <Copy className="h-3.5 w-3.5" />
                              Copiar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Uso actual</CardTitle>
                  <CardDescription>Consumo real comparado con el plan y los overrides vigentes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usageItems.map((item) => (
                    <UsageRow key={item.label} label={item.label} current={item.current} limit={item.limit} sourceLine={(item as any).sourceLine} />
                  ))}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-sm font-medium text-slate-950 dark:text-slate-50">Capacidades publicadas</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(subscription?.plan.features || []).length > 0 ? (
                        subscription?.plan.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="border-slate-200 bg-background px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950">
                            {feature}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">No hay features registradas en el catalogo.</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Cómo se obtiene</CardTitle>
                <CardDescription>Fuentes y cálculos usados para Salud operativa y Uso actual.</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="health">
                    <AccordionTrigger>Salud operativa</AccordionTrigger>
                    <AccordionContent>
                      {insights.operationalHealth.error ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                          {(insights.operationalHealth.error as any)?.message || 'No se pudo cargar Salud operativa.'}
                        </div>
                      ) : operationalHealth ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-slate-100 dark:border-slate-800">
                                <TableHead>Indicador</TableHead>
                                <TableHead>Fuente</TableHead>
                                <TableHead>Filtros</TableHead>
                                <TableHead>Cálculo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {operationalHealth.indicators.map((i) => (
                                <TableRow key={i.key} className="border-slate-100 dark:border-slate-800">
                                  <TableCell className="font-medium">{i.label}</TableCell>
                                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{i.source.tableOrView}</TableCell>
                                  <TableCell className="text-sm text-slate-500 dark:text-slate-400">{i.source.filters.join(' · ')}</TableCell>
                                  <TableCell className="text-sm text-slate-500 dark:text-slate-400">{i.source.calculation}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No disponible.</div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="usage">
                    <AccordionTrigger>Uso actual</AccordionTrigger>
                    <AccordionContent>
                      {insights.currentUsage.error ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                          {(insights.currentUsage.error as any)?.message || 'No se pudo cargar Uso actual.'}
                        </div>
                      ) : currentUsage ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-slate-100 dark:border-slate-800">
                                <TableHead>Métrica</TableHead>
                                <TableHead>Fuente</TableHead>
                                <TableHead>Filtros</TableHead>
                                <TableHead>Agregación</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentUsage.metrics.map((m) => (
                                <TableRow key={m.key} className="border-slate-100 dark:border-slate-800">
                                  <TableCell className="font-medium">{m.label}</TableCell>
                                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{m.source.tableOrView}</TableCell>
                                  <TableCell className="text-sm text-slate-500 dark:text-slate-400">{m.source.filters.join(' · ')}</TableCell>
                                  <TableCell className="text-sm text-slate-500 dark:text-slate-400">{m.source.aggregation}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No disponible.</div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-background p-4 dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Activos</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{activeUsers}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Usuarios habilitados</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-background p-4 dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Gobierno</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{managementUsers.length}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">OWNER y ADMIN</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-background p-4 dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Inactivos</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{Math.max(0, usersCount - activeUsers)}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pendientes de revision</div>
              </div>
            </section>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Equipo vinculado</CardTitle>
                    <CardDescription>{usersCount} miembros asociados a esta organizacion.</CardDescription>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => refreshUsers()} disabled={usersFetching}>
                    <RefreshCcw className={cn('h-4 w-4', usersFetching && 'animate-spin')} />
                    Refrescar equipo
                  </Button>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                  <Input
                    value={teamSearch}
                    onChange={(event) => setTeamSearch(event.target.value)}
                    placeholder="Buscar por nombre, email o rol"
                  />
                  <Select value={teamRoleFilter} onValueChange={setTeamRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los roles" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role === 'ALL' ? 'Todos los roles' : role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={teamStatusFilter} onValueChange={(value: TeamStatusFilter) => setTeamStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los estados</SelectItem>
                      <SelectItem value="ACTIVE">Activos</SelectItem>
                      <SelectItem value="INACTIVE">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {usersError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    {usersError}
                  </div>
                ) : usersLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                    <Users className="h-10 w-10 text-slate-300" />
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">Sin usuarios para esta vista</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Ajusta los filtros o revisa la sincronizacion de miembros.</div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-100 dark:border-slate-800">
                          <TableHead>Usuario</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Alta</TableHead>
                          <TableHead>Ultima actividad</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user: AdminUser) => {
                          const isUpdatingUser = memberActionId === user.id;

                          return (
                            <TableRow key={user.id} className="border-slate-100 dark:border-slate-800">
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium text-slate-950 dark:text-slate-50">{user.full_name || 'Sin nombre'}</div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className={cn('inline-flex items-center gap-2 text-sm font-medium', user.is_active ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400')}>
                                  <span className={cn('h-2 w-2 rounded-full', user.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')} />
                                  {user.is_active ? 'Activo' : 'Inactivo'}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-500 dark:text-slate-400">{formatDate(user.created_at)}</TableCell>
                              <TableCell className="text-sm text-slate-500 dark:text-slate-400">{formatDateTime(user.last_sign_in_at)}</TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy(user.email, 'Email')}>
                                    <Copy className="h-3.5 w-3.5" />
                                    Copiar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => handleToggleUserStatus(user)}
                                    disabled={isUpdatingUser}
                                  >
                                    {isUpdatingUser ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : user.is_active ? (
                                      <UserX className="h-3.5 w-3.5" />
                                    ) : (
                                      <UserCheck className="h-3.5 w-3.5" />
                                    )}
                                    {user.is_active ? 'Desactivar' : 'Activar'}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">Operacion del tenant</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Vista compacta para editar identidad, suscripcion y configuracion sin ruido tecnico.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-2" onClick={resetAllDrafts} disabled={pendingChanges === 0 || orgUpdating}>
                  <RotateCcw className="h-4 w-4" />
                  Restaurar
                </Button>
                <Button onClick={handleSaveAll} disabled={pendingChanges === 0 || orgUpdating} className="gap-2">
                  {orgUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar cambios
                </Button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Perfil y dominio</CardTitle>
                    <CardDescription>Nombre comercial, slug y direccion publica de la organizacion.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={resetProfileDraft} disabled={!profileDirty || orgUpdating}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleSaveProfile} disabled={!profileDirty || orgUpdating}>
                      {orgUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={profileDraft.slug} onChange={(event) => setProfileDraft((current) => ({ ...current, slug: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subdominio</Label>
                    <Input value={profileDraft.subdomain} onChange={(event) => setProfileDraft((current) => ({ ...current, subdomain: event.target.value }))} placeholder="mi-negocio" />
                  </div>
                  <div className="space-y-2">
                    <Label>Dominio personalizado</Label>
                    <Input value={profileDraft.customDomain} onChange={(event) => setProfileDraft((current) => ({ ...current, customDomain: event.target.value }))} placeholder="ventas.midominio.com" />
                  </div>
                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Preview publica</div>
                        <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">
                          {profileDraft.customDomain || (profileDraft.subdomain ? `${profileDraft.subdomain}.${baseDomain}` : 'Sin direccion publica')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleCopy(profileDraft.customDomain || profileDraft.subdomain || profileDraft.slug, 'Identificador')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </Button>
                        {organization.custom_domain && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.open(`https://${organization.custom_domain}`, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Plan y facturacion</CardTitle>
                    <CardDescription>Control unificado sobre `organizations`, `saas_subscriptions` y limites efectivos.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={resetSubscriptionDraft} disabled={!subscriptionDirty || orgUpdating}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleSaveSubscription} disabled={!subscriptionDirty || orgUpdating}>
                      {orgUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Plan</Label>
                      <Select value={subscriptionDraft.plan} onValueChange={(value: PlanValue) => setSubscriptionDraft((current) => ({ ...current, plan: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FREE">Gratis</SelectItem>
                          <SelectItem value="STARTER">Starter</SelectItem>
                          <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={subscriptionDraft.status} onValueChange={(value: SubscriptionStatusValue) => setSubscriptionDraft((current) => ({ ...current, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Activa</SelectItem>
                          <SelectItem value="TRIAL">Trial</SelectItem>
                          <SelectItem value="SUSPENDED">Suspendida</SelectItem>
                          <SelectItem value="CANCELLED">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ciclo de facturacion</Label>
                      <Select value={subscriptionDraft.billingCycle} onValueChange={(value: BillingCycle) => setSubscriptionDraft((current) => ({ ...current, billingCycle: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Renovacion</Label>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium dark:bg-slate-900">
                        {subscription ? formatDate(subscription.currentPeriodEnd) : 'Sin fecha'}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Plan aplicado</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{subscription?.plan.name || planMeta.label}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Dias restantes</div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-slate-50">{subscription ? subscription.daysUntilRenewal : 0}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {subscriptionDraft.status === 'SUSPENDED' ? (
                      <Button variant="outline" className="gap-2" onClick={handleReactivateOrganization} disabled={orgUpdating}>
                        {orgUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Reactivar ahora
                      </Button>
                    ) : (
                      <Button variant="outline" className="gap-2 text-amber-700 hover:text-amber-700" onClick={() => setSuspendDialogOpen(true)}>
                        <XCircle className="h-4 w-4" />
                        Suspender
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Contacto y regionalizacion</CardTitle>
                    <CardDescription>Datos empresariales usados por ventas, soporte y capas operativas.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={resetSettingsDraft} disabled={!settingsDirty || orgUpdating}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleSaveSettings} disabled={!settingsDirty || orgUpdating}>
                      {orgUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Descripcion</Label>
                    <Textarea value={settingsDraft.description} onChange={(event) => setSettingsDraft((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Industria</Label>
                    <Input value={settingsDraft.industry} onChange={(event) => setSettingsDraft((current) => ({ ...current, industry: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email comercial</Label>
                    <Input value={settingsDraft.contactInfo.email} onChange={(event) => setSettingsDraft((current) => ({ ...current, contactInfo: { ...current.contactInfo, email: event.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input value={settingsDraft.contactInfo.phone} onChange={(event) => setSettingsDraft((current) => ({ ...current, contactInfo: { ...current.contactInfo, phone: event.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sitio web</Label>
                    <Input value={settingsDraft.contactInfo.website} onChange={(event) => setSettingsDraft((current) => ({ ...current, contactInfo: { ...current.contactInfo, website: event.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email de soporte</Label>
                    <Input value={settingsDraft.supportEmail} onChange={(event) => setSettingsDraft((current) => ({ ...current, supportEmail: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select value={settingsDraft.regional.language} onValueChange={(value) => setSettingsDraft((current) => ({ ...current, regional: { ...current.regional, language: value } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Espanol</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="pt">Portugues</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={settingsDraft.regional.currency} onValueChange={(value) => setSettingsDraft((current) => ({ ...current, regional: { ...current.regional, currency: value } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PYG">PYG</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Zona horaria</Label>
                    <Input value={settingsDraft.regional.timezone} onChange={(event) => setSettingsDraft((current) => ({ ...current, regional: { ...current.regional, timezone: event.target.value } }))} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Capacidades activas</CardTitle>
                    <CardDescription>Solo toggles de negocio que impactan el tenant actual.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={resetSettingsDraft} disabled={!settingsDirty || orgUpdating}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleSaveSettings} disabled={!settingsDirty || orgUpdating}>
                      {orgUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'multiBranch', label: 'Multi sucursal', description: 'Habilita multiples ubicaciones' },
                    { key: 'advancedInventory', label: 'Inventario avanzado', description: 'Control y alertas extendidas' },
                    { key: 'customReports', label: 'Reportes personalizados', description: 'Exportaciones y analitica ampliada' },
                    { key: 'apiAccess', label: 'Acceso API', description: 'Integraciones externas' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                      <div>
                        <div className="text-sm font-medium text-slate-950 dark:text-slate-50">{item.label}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{item.description}</div>
                      </div>
                      <Switch
                        checked={settingsDraft.features[item.key as keyof OrganizationSettingsView['features']]}
                        onCheckedChange={(checked) => setSettingsDraft((current) => ({
                          ...current,
                          features: {
                            ...current.features,
                            [item.key]: checked,
                          },
                        }))}
                      />
                    </div>
                  ))}

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                    <div>
                      <div className="text-sm font-medium text-slate-950 dark:text-slate-50">Notificaciones email</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Mensajes operativos por correo</div>
                    </div>
                    <Switch checked={settingsDraft.notifications.email} onCheckedChange={(checked) => setSettingsDraft((current) => ({ ...current, notifications: { ...current.notifications, email: checked } }))} />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                    <div>
                      <div className="text-sm font-medium text-slate-950 dark:text-slate-50">Notificaciones SMS</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Alertas por mensaje</div>
                    </div>
                    <Switch checked={settingsDraft.notifications.sms} onCheckedChange={(checked) => setSettingsDraft((current) => ({ ...current, notifications: { ...current.notifications, sms: checked } }))} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Limites locales</CardTitle>
                  <CardDescription>Overrides por tenant. El plan sigue siendo la referencia principal del sistema.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={resetSettingsDraft} disabled={!settingsDirty || orgUpdating}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restaurar
                  </Button>
                  <Button size="sm" className="gap-2" onClick={handleSaveSettings} disabled={!settingsDirty || orgUpdating}>
                    {orgUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>Usuarios maximos</Label>
                  <Input type="number" value={settingsDraft.limits.maxUsers} onChange={(event) => setSettingsDraft((current) => ({ ...current, limits: { ...current.limits, maxUsers: Number(event.target.value || 0) } }))} />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Plan: {effectiveLimits.users <= 0 ? 'Ilimitado' : effectiveLimits.users}</p>
                </div>
                <div className="space-y-2">
                  <Label>Sucursales maximas</Label>
                  <Input type="number" value={settingsDraft.limits.maxBranches} onChange={(event) => setSettingsDraft((current) => ({ ...current, limits: { ...current.limits, maxBranches: Number(event.target.value || 0) } }))} />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Plan: {effectiveLimits.locations <= 0 ? 'Ilimitado' : effectiveLimits.locations}</p>
                </div>
                <div className="space-y-2">
                  <Label>Productos maximos</Label>
                  <Input type="number" value={settingsDraft.limits.maxProducts} onChange={(event) => setSettingsDraft((current) => ({ ...current, limits: { ...current.limits, maxProducts: Number(event.target.value || 0) } }))} />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Plan: {effectiveLimits.products <= 0 ? 'Ilimitado' : effectiveLimits.products}</p>
                </div>
                <div className="space-y-2">
                  <Label>Storage GB</Label>
                  <Input type="number" value={settingsDraft.limits.storageGb} onChange={(event) => setSettingsDraft((current) => ({ ...current, limits: { ...current.limits, storageGb: Number(event.target.value || 0) } }))} />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Override local almacenado en settings.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender organizacion</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion cambia el estado operativo y sincroniza la capa de suscripcion actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={orgUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspendOrganization} disabled={orgUpdating}>
              {orgUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspendiendo
                </>
              ) : (
                'Confirmar suspension'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminGuard>
  );
}
