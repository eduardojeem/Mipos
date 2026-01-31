'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useAdminData } from '../hooks/useAdminData';

export function SystemOverview() {
  const { stats, organizations, loading, error } = useAdminData();
  const [planSummary, setPlanSummary] = useState<{ totalAuthUsers: number; plans: { name: string; organizations: number; users: number }[]; organizationsWithoutSubscription?: string[] } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOrg, setAssignOrg] = useState<string | null>(null);
  const [assignPlan, setAssignPlan] = useState<string>('pro');
  const [assignCycle, setAssignCycle] = useState<string>('monthly');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPlanCount = (plan: string) => {
    return organizations.filter(org => org.subscription_plan === plan).length;
  };

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setSummaryLoading(true);
        const resp = await fetch('/api/superadmin/users/plan-summary', { cache: 'no-store' });
        const data = await resp.json();
        if (resp.ok && data?.success) {
          setPlanSummary({ totalAuthUsers: data.totalAuthUsers || 0, plans: Array.isArray(data.plans) ? data.plans : [], organizationsWithoutSubscription: Array.isArray(data.organizationsWithoutSubscription) ? data.organizationsWithoutSubscription : [] });
        }
      } catch {}
      finally { setSummaryLoading(false); }
    };
    loadSummary();
  }, []);

  const openAssign = (id: string) => {
    setAssignOrg(id);
    setAssignPlan('pro');
    setAssignOpen(true);
  };

  const confirmAssign = async () => {
    if (!assignOrg) return;
    try {
      const resp = await fetch('/api/superadmin/subscriptions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: assignOrg, planSlug: assignPlan, billingCycle: assignCycle })
      });
      const data = await resp.json();
      if (resp.ok && data?.success) {
        const reload = await fetch('/api/superadmin/users/plan-summary', { cache: 'no-store' });
        const js = await reload.json();
        if (reload.ok && js?.success) {
          setPlanSummary({ totalAuthUsers: js.totalAuthUsers || 0, plans: Array.isArray(js.plans) ? js.plans : [], organizationsWithoutSubscription: Array.isArray(js.organizationsWithoutSubscription) ? js.organizationsWithoutSubscription : [] });
        }
        setAssignOpen(false);
      } else {
        // Minimal feedback: keep modal open; could integrate toast if global provider is present
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card border-border shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-destructive opacity-50" />
          <p className="text-destructive font-medium">Error al cargar las estadísticas</p>
          <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Organizations */}
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <div className="p-2 rounded-xl bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              Organizaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
                {stats.totalOrganizations}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">
                  {stats.activeSubscriptions} activas
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
                {stats.totalUsers.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  Total en el sistema
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MRR (Monthly Recurring Revenue) */}
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <div className="p-2 rounded-xl bg-green-500/10">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              MRR Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Ingreso recurrente mensual
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <div className="p-2 rounded-xl bg-orange-500/10">
                <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
                {stats.activeSubscriptions}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400">
                  {stats.totalOrganizations > 0 
                    ? `${Math.round((stats.activeSubscriptions / stats.totalOrganizations) * 100)}% del total` 
                    : '0%'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Plan */}
      {stats.totalOrganizations > 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              Distribución por Planes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <div className="text-sm text-muted-foreground mb-1">FREE</div>
                <div className="text-2xl font-bold text-foreground">
                  {getPlanCount('FREE')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(0)}/mes
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-200/50 dark:border-blue-800/50">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">PRO</div>
                <div className="text-2xl font-bold text-foreground">
                  {getPlanCount('PRO') + getPlanCount('PROFESSIONAL')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  $29/mes
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-200/50 dark:border-purple-800/50">
                <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">ENTERPRISE</div>
                <div className="text-2xl font-bold text-foreground">
                  {getPlanCount('ENTERPRISE')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  $99/mes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users by Plan Summary */}
      {planSummary && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Usuarios por Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-sm text-muted-foreground">Total Auth Users</div>
              <div className="text-2xl font-bold">{planSummary.totalAuthUsers.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {planSummary.plans.map(p => (
                <div key={p.name} className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-foreground">{p.name}</div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">Mensual: {p.monthly || 0}</Badge>
                      <Badge variant="outline" className="text-xs">Anual: {p.yearly || 0}</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Organizaciones</div>
                  <div className="text-lg font-bold">{p.organizations}</div>
                  <div className="mt-2 text-xs text-muted-foreground">Usuarios</div>
                  <div className="text-lg font-bold">{p.users}</div>
                </div>
              ))}
            </div>
            {summaryLoading && (
              <div className="text-xs text-muted-foreground mt-3">Actualizando...</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Organizations Without Subscription */}
      {planSummary && Array.isArray(planSummary.organizationsWithoutSubscription) && planSummary.organizationsWithoutSubscription.length > 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-xl bg-orange-500/10">
                <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Organizaciones sin suscripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{planSummary.organizationsWithoutSubscription.length}</div>
            </div>
            <div className="space-y-2">
              {planSummary.organizationsWithoutSubscription.slice(0, 5).map((id) => {
                const name = organizations.find((o) => o.id === id)?.name || id
                return (
                  <div key={id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="text-sm font-medium">{name}</div>
                    <Button size="sm" variant="outline" onClick={() => openAssign(id)}>Asignar plan</Button>
                  </div>
                )
              })}
            </div>
            {planSummary.organizationsWithoutSubscription.length > 5 && (
              <div className="mt-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/superadmin/organizations?missing=1">Ver todas</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">Organización: {organizations.find((o) => o.id === assignOrg)?.name || assignOrg}</div>
            <Select value={assignPlan} onValueChange={setAssignPlan}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">PRO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignCycle} onValueChange={setAssignCycle}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ciclo de facturación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAssign}>Asignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
