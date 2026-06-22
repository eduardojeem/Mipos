'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Building2, RefreshCw, Crown } from 'lucide-react';
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
    toast({
      title: 'Actualizando datos',
      description: 'Por favor espera un momento.',
    });

    await refresh();

    toast({
      title: 'Actualización completa',
      description: 'Los datos se actualizaron correctamente.',
    });
  };

  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefresh(checked);
    toast({
      title: checked ? 'Auto-actualización activada' : 'Auto-actualización desactivada',
      description: checked
        ? 'Los datos se actualizarán cada 5 minutos.'
        : 'La actualización automática está desactivada.',
    });
  };

  const formatLastUpdated = () => {
    if (!lastFetch) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - lastFetch.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    return `Hace ${Math.floor(seconds / 3600)} h`;
  };

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="space-y-6 p-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
              Panel de Administración SaaS
            </h2>
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
                  <CardTitle>Organizaciones registradas (datos en caché)</CardTitle>
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
        
        {/* Premium Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-6 md:p-8 backdrop-blur-2xl glass-card">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Crown className="h-3.5 w-3.5" />
                <span className="tracking-wide">Centro de Control</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Panel de Administración SaaS
              </h2>
              <p className="max-w-2xl text-base text-muted-foreground">
                Gestiona organizaciones, usuarios, planes y la salud comercial global de tu plataforma en tiempo real.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-medium text-muted-foreground/80">
                  Estado
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatLastUpdated()}
                </span>
              </div>

              <div className="h-8 w-[1px] bg-border/50" />

              <Button asChild variant="outline" size="sm" className="h-10 gap-2 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors shadow-sm">
                <Link href="/superadmin/analytics">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Analíticas</span>
                </Link>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="h-10 gap-2 shadow-sm shadow-primary/20 hover-glow"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 glass-card shadow-sm">
          <div className="space-y-0.5">
            <Label htmlFor="auto-refresh" className="text-base font-semibold">
              Actualización automática
            </Label>
            <p className="text-sm text-muted-foreground">
              Actualiza los datos cada 5 minutos de forma automática.
            </p>
          </div>
          <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={handleAutoRefreshToggle} />
        </div>

        {(partialFailures.statsFailure || partialFailures.organizationsFailure) && (
          <PartialFailureWarning
            statsFailure={partialFailures.statsFailure}
            organizationsFailure={partialFailures.organizationsFailure}
            onRetry={refresh}
          />
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-40 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-[400px] rounded-md" />
          </div>
        ) : (
          <div className="space-y-6">
            <AdminStats stats={stats} />
            <SystemOverview stats={stats} organizations={organizations} />

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Organizaciones recientes</CardTitle>
                    <CardDescription>
                      Vista rápida de las últimas organizaciones registradas
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href="/superadmin/organizations">
                      <Building2 className="h-4 w-4" />
                      Ver todas
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {organizations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No hay organizaciones</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Aún no se han registrado organizaciones en la plataforma.
                    </p>
                    <Button asChild>
                      <Link href="/superadmin/organizations/create">
                        <Building2 className="mr-2 h-4 w-4" />
                        Crear primera organización
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <OrganizationsTable organizations={organizations.slice(0, 8)} compact />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SuperAdminGuard>
  );
}
