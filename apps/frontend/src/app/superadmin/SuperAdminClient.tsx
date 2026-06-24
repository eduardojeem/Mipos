'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Crown,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useAdminData, Organization, AdminStats as IAdminStats } from '@/app/superadmin/hooks/useAdminData';
import { AdminStats } from '@/app/superadmin/components/AdminStats';
import { ErrorDisplay } from '@/app/superadmin/components/ErrorDisplay';
import { OrganizationsTable } from '@/app/superadmin/components/OrganizationsTable';
import { PartialFailureWarning } from '@/app/superadmin/components/PartialFailureWarning';
import { SystemOverview } from '@/app/superadmin/components/SystemOverview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { SuperAdminGuard } from './components/SuperAdminGuard';

interface SuperAdminClientProps {
  initialOrganizations?: Organization[];
  initialStats?: IAdminStats;
}

export function SuperAdminClient({ initialOrganizations, initialStats }: SuperAdminClientProps) {
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(false);

  const {
    organizations,
    stats,
    loading,
    refreshing,
    error,
    partialFailures,
    lastFetch,
    cachedData,
    refresh,
    clearError,
  } = useAdminData({
    autoRefresh,
    refreshInterval: 5 * 60 * 1000,
    onError: (message) => {
      toast({
        title: 'Error al cargar datos',
        description: message,
        variant: 'destructive',
      });
    },
    initialOrganizations,
    initialStats,
  });

  const handleRefresh = async () => {
    toast({ title: 'Sincronizando…', description: 'Actualizando todos los datos.' });
    await refresh();
    toast({ title: 'Sincronización completa', description: 'Datos actualizados correctamente.' });
  };

  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefresh(checked);
    toast({
      title: checked ? 'Auto-actualización activada' : 'Auto-actualización desactivada',
      description: checked ? 'Los datos se actualizarán cada 5 minutos.' : 'La actualización automática está desactivada.',
    });
  };

  const formatLastUpdated = () => {
    if (!lastFetch) return null;
    const diff = Date.now() - lastFetch.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'hace un momento';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
    return `hace ${Math.floor(seconds / 3600)} h`;
  };

  const lastUpdatedLabel = formatLastUpdated();

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="space-y-6 p-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Panel de Administración SaaS</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona organizaciones, usuarios y métricas de tu plataforma
            </p>
          </div>
          <ErrorDisplay
            error={error}
            onRetry={refresh}
            onDismiss={clearError}
            showCachedDataWarning={cachedData?.isStale === true}
            cachedDataTimestamp={cachedData?.timestamp}
          />
          {cachedData && cachedData.isStale && (
            <div className="space-y-6">
              <AdminStats stats={cachedData.stats} />
              <Card>
                <CardHeader>
                  <CardTitle>Organizaciones (datos en caché)</CardTitle>
                  <CardDescription>Mostrando datos guardados localmente</CardDescription>
                </CardHeader>
                <CardContent>
                  {cachedData.organizations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                      <h3 className="mb-2 text-lg font-semibold">No hay organizaciones</h3>
                      <p className="text-sm text-muted-foreground">No hay datos de organizaciones en caché.</p>
                    </div>
                  ) : (
                    <OrganizationsTable organizations={cachedData.organizations.slice(0, 8)} compact />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="flex-1 space-y-6">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8">
          {/* Ambient blobs */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            {/* Brand + title */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10">
                <Crown className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight text-slate-50 md:text-3xl">
                    Super Admin
                  </h2>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    Panel SaaS
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-400">
                  Centro de control — organizaciones, facturación y sistema
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {/* Last updated */}
              {lastUpdatedLabel && (
                <div className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs text-slate-400">Actualizado {lastUpdatedLabel}</span>
                </div>
              )}

              {/* Auto-refresh inline */}
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5">
                <Zap className={`h-3 w-3 ${autoRefresh ? 'text-amber-400' : 'text-slate-600'}`} />
                <Label htmlFor="auto-refresh" className="cursor-pointer text-xs text-slate-400">
                  Auto
                </Label>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={handleAutoRefreshToggle}
                  className="scale-75"
                />
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <Link href="/superadmin/analytics">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Analíticas</span>
                </Link>
              </Button>

              <Button
                size="sm"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="h-9 gap-2 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Partial failures ── */}
        {(partialFailures.statsFailure || partialFailures.organizationsFailure) && (
          <PartialFailureWarning
            statsFailure={partialFailures.statsFailure}
            organizationsFailure={partialFailures.organizationsFailure}
            onRetry={refresh}
          />
        )}

        {/* ── Main content ── */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-32 rounded-xl bg-slate-800/60" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl bg-slate-800/60" />
            <Skeleton className="h-96 rounded-xl bg-slate-800/60" />
          </div>
        ) : (
          <div className="space-y-5">

            {/* KPIs */}
            <AdminStats stats={stats} />

            {/* System overview: plan distribution + quick actions */}
            <SystemOverview stats={stats} organizations={organizations} />

            {/* ── Recent Organizations ── */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">TENANTS</p>
                  <h3 className="mt-0.5 text-base font-bold text-slate-100">Organizaciones recientes</h3>
                  <p className="text-xs text-slate-500">
                    Vista rápida de las últimas organizaciones registradas
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  <Link href="/superadmin/organizations">
                    <Building2 className="h-3.5 w-3.5" />
                    Ver todas
                  </Link>
                </Button>
              </div>

              <div className="p-1">
                {organizations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
                      <Building2 className="h-8 w-8 text-slate-600" />
                    </div>
                    <h3 className="mb-1 text-base font-semibold text-slate-300">
                      No hay organizaciones
                    </h3>
                    <p className="mb-5 text-sm text-slate-500">
                      Aún no se han registrado organizaciones en la plataforma.
                    </p>
                    <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Link href="/superadmin/organizations/create">
                        <Building2 className="mr-2 h-4 w-4" />
                        Crear primera organización
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <OrganizationsTable organizations={organizations.slice(0, 8)} compact />
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </SuperAdminGuard>
  );
}
