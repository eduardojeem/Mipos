'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Building2, RefreshCw } from 'lucide-react';
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
      title: 'Actualizacion completa',
      description: 'Los datos se actualizaron correctamente.',
    });
  };

  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefresh(checked);
    toast({
      title: checked ? 'Auto-actualizacion activada' : 'Auto-actualizacion desactivada',
      description: checked
        ? 'Los datos se actualizaran cada 5 minutos.'
        : 'La actualizacion automatica esta desactivada.',
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
              Panel de Administracion SaaS
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestiona organizaciones, usuarios y metricas de tu plataforma
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
                  <CardTitle>Organizaciones registradas (datos en cache)</CardTitle>
                  <CardDescription>Mostrando datos guardados localmente</CardDescription>
                </CardHeader>
                <CardContent>
                  {cachedData.organizations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                      <h3 className="mb-2 text-lg font-semibold">No hay organizaciones</h3>
                      <p className="text-sm text-muted-foreground">No hay datos de organizaciones en cache.</p>
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
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
              Panel de Administracion SaaS
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestiona organizaciones, usuarios, planes y salud comercial de tu plataforma
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Ultima actualizacion: {formatLastUpdated()}
            </span>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/superadmin/analytics">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analiticas</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border bg-muted/50 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="auto-refresh" className="text-base font-medium">
              Actualizacion automatica
            </Label>
            <p className="text-sm text-muted-foreground">
              Actualiza los datos cada 5 minutos automaticamente.
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
                      Vista rapida de las ultimas organizaciones registradas
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
                      Aun no se han registrado organizaciones en la plataforma.
                    </p>
                    <Button asChild>
                      <Link href="/superadmin/organizations/create">
                        <Building2 className="mr-2 h-4 w-4" />
                        Crear primera organizacion
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
