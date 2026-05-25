'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { Activity, BarChart3, Building2, CreditCard, DollarSign, Settings, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCanonicalPlanDisplayName, normalizePlanSlug, type CanonicalPlanSlug } from '@/lib/plan-catalog';
import type { AdminStats, Organization } from '../hooks/useAdminData';

interface SystemOverviewProps {
  stats: AdminStats;
  organizations: Organization[];
}

function formatMoney(amount: number | undefined) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-md border-l-4 border-l-slate-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Building2 className="h-4 w-4" />
              Organizaciones activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.activeOrganizations || 0}</div>
            <p className="mt-1 text-xs text-slate-500">{activeRate}% del total registrado</p>
          </CardContent>
        </Card>

        <Card className="rounded-md border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Users className="h-4 w-4" />
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.totalUsers.toLocaleString('es-PY')}</div>
            <p className="mt-1 text-xs text-slate-500">Usuarios globales del sistema</p>
          </CardContent>
        </Card>

        <Card className="rounded-md border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <DollarSign className="h-4 w-4" />
              MRR estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(stats.monthlyRevenue)}</div>
            <p className="mt-1 text-xs text-slate-500">Ingreso recurrente mensual</p>
          </CardContent>
        </Card>

        <Card className="rounded-md border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <CreditCard className="h-4 w-4" />
              ARR estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(stats.totalRevenue)}</div>
            <p className="mt-1 text-xs text-slate-500">Calculado desde {stats.activeSubscriptions} suscripciones SaaS</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Distribucion por plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {planDistribution.map((plan) => (
              <div key={plan.slug} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-md">{plan.label}</Badge>
                    <span className="text-sm text-slate-500">{plan.count} organizaciones</span>
                  </div>
                  <span className="text-sm font-medium">{plan.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-slate-900 dark:bg-slate-100" style={{ width: `${Math.min(plan.percentage, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Accesos rapidos
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/superadmin/organizations">
                <Building2 className="mr-2 h-4 w-4" />
                Organizaciones
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/superadmin/users">
                <Users className="mr-2 h-4 w-4" />
                Usuarios
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/superadmin/plans">
                <Sparkles className="mr-2 h-4 w-4" />
                Planes
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/superadmin/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analiticas
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/superadmin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configuracion
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
