'use client';

import { useEffect, useState, useMemo, memo } from 'react';
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

export const SystemOverview = memo(function SystemOverview() {
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
          <Card key={i} className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 shadow-sm">
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-50" />
          <p className="text-red-700 dark:text-red-400 font-medium">Error al cargar las estadísticas</p>
          <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Organizations */}
        <Card className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-slate-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              Organizaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {stats.totalOrganizations}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800">
                  {stats.activeSubscriptions} activas
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {stats.totalUsers.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                  Total en el sistema
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MRR (Monthly Recurring Revenue) */}
        <Card className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/20">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              MRR Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Ingreso recurrente mensual
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/20">
                <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {stats.activeSubscriptions}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                  {stats.totalOrganizations > 0 
                    ? `${Math.round((stats.activeSubscriptions / stats.totalOrganizations) * 100)}% del total` 
                    : '0%'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">Distribución por Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map((plan) => {
                const count = getPlanCount(plan);
                const percentage = stats.totalOrganizations > 0 ? (count / stats.totalOrganizations) * 100 : 0;
                
                return (
                  <div key={plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`
                          ${plan === 'FREE' ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300' : ''}
                          ${plan === 'STARTER' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300' : ''}
                          ${plan === 'PRO' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300' : ''}
                          ${plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300' : ''}
                        `}
                      >
                        {plan}
                      </Badge>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{count} organizaciones</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/superadmin/organizations">
                  <Building2 className="h-4 w-4 mr-2" />
                  Ver Todas las Organizaciones
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/superadmin/users">
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Usuarios
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/superadmin/billing">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Ver Facturación
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Plan de Suscripción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan</label>
              <Select value={assignPlan} onValueChange={setAssignPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ciclo de Facturación</label>
              <Select value={assignCycle} onValueChange={setAssignCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAssign}>
              Asignar Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});