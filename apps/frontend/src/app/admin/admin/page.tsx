'use client';

import React, { useState } from 'react';
import { useAdminData } from './hooks/useAdminData';
import { useOrganizations } from './hooks/useOrganizations';
import { useAdminFilters } from './hooks/useAdminFilters';
import { AdminHeader } from './components/AdminHeader';
import { AdminStats } from './components/AdminStats';
import { OrganizationsTable } from './components/OrganizationsTable';
import { OrganizationsFilters } from './components/OrganizationsFilters';
import { RevenueAnalytics } from './components/RevenueAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert, Building2, Users, BarChart3, Activity } from 'lucide-react';
import { UnifiedPermissionGuard } from '@/components/auth/UnifiedPermissionGuard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('organizations');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Admin data with auto-refresh capability
  const { 
    stats, 
    loading: statsLoading, 
    refreshing: statsRefreshing,
    error,
    lastFetch,
    refresh: refreshStats 
  } = useAdminData({
    autoRefresh,
    refreshInterval: 30000, // 30 seconds
    onError: (error) => {
      toast({
        title: 'Error al cargar datos',
        description: error,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      if (autoRefresh) {
        toast({
          title: 'Datos actualizados',
          description: 'Los datos se actualizaron automáticamente.',
          duration: 2000,
        });
      }
    },
  });

  // Organizations filters
  const {
    filters: orgFilters,
    updateFilters: updateOrgFilters,
    clearFilters: clearOrgFilters,
    hasActiveFilters: hasActiveOrgFilters,
    applyPreset: applyOrgPreset,
  } = useAdminFilters('organizations');

  // Organizations data with filters
  const {
    organizations,
    loading: orgsLoading,
    error: orgsError,
    updating,
    refresh: refreshOrgs,
    suspendOrganization,
    activateOrganization,
    deleteOrganization,
    updateOrganization,
  } = useOrganizations({
    filters: { ...orgFilters, search: searchQuery },
  });

  const handleRefresh = async () => {
    toast({
      title: 'Actualizando datos...',
      description: 'Por favor espera un momento.',
    });
    
    await Promise.all([refreshStats(), refreshOrgs()]);
    
    toast({
      title: 'Actualización completa',
      description: 'Todos los datos se actualizaron correctamente.',
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefresh(checked);
    toast({
      title: checked ? 'Auto-actualización activada' : 'Auto-actualización desactivada',
      description: checked 
        ? 'Los datos se actualizarán cada 30 segundos.' 
        : 'La actualización automática está desactivada.',
    });
  };

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error de Acceso</AlertTitle>
          <AlertDescription>
            No se pudieron cargar los datos del panel de administración. 
            Verifique que tiene permisos de Super Admin.
            <br/>
            Detalle: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <UnifiedPermissionGuard 
      role="SUPER_ADMIN" 
      allowSuperAdmin={true}
      fallback={
        <div className="p-8">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>
              Necesitas permisos de Super Administrador para ver este panel.
              <br/>
              Rol actual: {error || 'Desconocido'}
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <AdminHeader
          onSearch={handleSearch}
          onRefresh={handleRefresh}
          lastUpdated={lastFetch || undefined}
          isRefreshing={statsLoading || statsRefreshing || orgsLoading}
        />

        {/* Auto-refresh Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/50">
          <div className="space-y-0.5">
            <Label htmlFor="auto-refresh" className="text-base font-medium">
              Actualización Automática
            </Label>
            <p className="text-sm text-muted-foreground">
              Actualiza los datos cada 30 segundos automáticamente
            </p>
          </div>
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={handleAutoRefreshToggle}
          />
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <AdminStats stats={stats} />
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="organizations" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Organizaciones</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analíticas</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Actividad</span>
            </TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-4">
            {/* Filters */}
            <OrganizationsFilters
              filters={orgFilters}
              onFiltersChange={updateOrgFilters}
              onClearFilters={clearOrgFilters}
              hasActiveFilters={hasActiveOrgFilters}
              onApplyPreset={applyOrgPreset}
            />

            {/* Organizations Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Organizaciones Registradas</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {organizations.length} organizacion{organizations.length !== 1 ? 'es' : ''}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {orgsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : orgsError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Error al cargar organizaciones: {orgsError}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <OrganizationsTable
                    organizations={organizations}
                    onUpdate={updateOrganization}
                    onDelete={deleteOrganization}
                    onSuspend={suspendOrganization}
                    onActivate={activateOrganization}
                    updatingId={updating}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Users className="h-12 w-12 mx-auto opacity-50" />
                    <p>Gestión de usuarios próximamente</p>
                    <p className="text-sm">Esta función estará disponible en una próxima actualización</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <RevenueAnalytics />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feed de Actividad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Activity className="h-12 w-12 mx-auto opacity-50" />
                    <p>Registro de actividad próximamente</p>
                    <p className="text-sm">Esta función estará disponible en una próxima actualización</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UnifiedPermissionGuard>
  );
}

