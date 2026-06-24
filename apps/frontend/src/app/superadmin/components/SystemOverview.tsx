'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Mail,
  Settings,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getCanonicalPlanDisplayName, normalizePlanSlug, type CanonicalPlanSlug } from '@/lib/plan-catalog';
import type { AdminStats, Organization } from '../hooks/useAdminData';

interface SystemOverviewProps {
  stats: AdminStats;
  organizations: Organization[];
}

const PLAN_STYLES: Record<string, { bar: string; badge: string; label: string }> = {
  free:         { bar: 'bg-slate-500',   badge: 'border-slate-700 bg-slate-800/60 text-slate-300',   label: 'Free'         },
  starter:      { bar: 'bg-sky-500',     badge: 'border-sky-800/50 bg-sky-900/30 text-sky-300',     label: 'Starter'      },
  professional: { bar: 'bg-indigo-500',  badge: 'border-indigo-800/50 bg-indigo-900/30 text-indigo-300', label: 'Pro'     },
  enterprise:   { bar: 'bg-violet-500',  badge: 'border-violet-800/50 bg-violet-900/30 text-violet-300', label: 'Enterprise' },
};

const QUICK_ACTIONS = [
  {
    title: 'Organizaciones',
    description: 'Gestionar tenants',
    href: '/superadmin/organizations',
    icon: Building2,
    accent: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    title: 'Usuarios',
    description: 'Lista global',
    href: '/superadmin/users',
    icon: Users,
    accent: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  {
    title: 'Planes SaaS',
    description: 'Precios y límites',
    href: '/superadmin/plans',
    icon: Sparkles,
    accent: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    title: 'Analíticas',
    description: 'Crecimiento y MRR',
    href: '/superadmin/analytics',
    icon: BarChart3,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    title: 'Suscripciones',
    description: 'Contratos activos',
    href: '/superadmin/subscriptions',
    icon: CreditCard,
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    title: 'Audit Logs',
    description: 'Trazabilidad',
    href: '/superadmin/audit-logs',
    icon: Shield,
    accent: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    title: 'Emails',
    description: 'Estado Resend',
    href: '/superadmin/emails',
    icon: Mail,
    accent: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
  },
  {
    title: 'Facturas',
    description: 'Historial de cobros',
    href: '/superadmin/invoices',
    icon: FileText,
    accent: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  {
    title: 'Configuración',
    description: 'Parámetros globales',
    href: '/superadmin/settings',
    icon: Settings,
    accent: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
  },
];

export const SystemOverview = memo(function SystemOverview({ stats, organizations }: SystemOverviewProps) {
  const planDistribution = useMemo(() => {
    const counts = new Map<CanonicalPlanSlug, number>([
      ['free', 0],
      ['starter', 0],
      ['professional', 0],
      ['enterprise', 0],
    ]);

    organizations.forEach((organization) => {
      const slug = normalizePlanSlug(organization.subscription_plan);
      counts.set(slug, (counts.get(slug) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([slug, count]) => ({
      slug,
      label: getCanonicalPlanDisplayName(slug),
      count,
      percentage: stats.totalOrganizations > 0 ? (count / stats.totalOrganizations) * 100 : 0,
    }));
  }, [organizations, stats.totalOrganizations]);

  const activeRate = stats.totalOrganizations > 0
    ? Math.round((Number(stats.activeOrganizations || 0) / stats.totalOrganizations) * 100)
    : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* ── Distribución por plan (2 columnas) ── */}
      <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">DISTRIBUCIÓN</p>
            <h3 className="mt-0.5 text-base font-bold text-slate-100">Planes activos</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-400">{activeRate}% activo</span>
          </div>
        </div>

        <div className="space-y-4">
          {planDistribution.map((plan) => {
            const style = PLAN_STYLES[plan.slug] || PLAN_STYLES.free;
            return (
              <div key={plan.slug} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}
                  >
                    {style.label}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-slate-400">
                      {plan.count}
                    </span>
                    <span className="w-10 text-right text-xs font-bold tabular-nums text-slate-200">
                      {plan.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
                    style={{ width: `${Math.min(plan.percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Health indicator */}
        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">Salud del sistema</span>
            </div>
            <span className="text-xs font-bold text-emerald-400">Óptimo</span>
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 flex-1 rounded-sm ${
                  i < 11 ? 'bg-emerald-500/70' : 'bg-emerald-500'
                }`}
                style={{ opacity: 0.4 + (i / 11) * 0.6 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Accesos rápidos (3 columnas) ── */}
      <div className="lg:col-span-3">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">ACCESOS RÁPIDOS</p>
          <h3 className="mt-0.5 text-base font-bold text-slate-100">Centro de control</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${action.border} bg-slate-900/60 hover:bg-slate-900`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${action.bg} border ${action.border}`}>
                  <Icon className={`h-3.5 w-3.5 ${action.accent}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-200">{action.title}</p>
                  <p className="truncate text-[10px] text-slate-500">{action.description}</p>
                </div>
                <ArrowRight className="h-3 w-3 shrink-0 text-slate-700 transition-colors group-hover:text-slate-400" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
});
