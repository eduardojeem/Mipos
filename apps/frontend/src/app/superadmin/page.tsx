'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/app/superadmin/hooks/useAdminData';
import { AdminStats } from '@/app/superadmin/components/AdminStats';
import { OrganizationsTable } from '@/app/superadmin/components/OrganizationsTable';
import { SystemOverview } from '@/app/superadmin/components/SystemOverview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ShieldAlert, 
  RefreshCw, 
  Building2, 
  BarChart3, 
  Activity,
  TrendingUp 
} from 'lucide-react';
import { UnifiedPermissionGuard } from '@/components/auth/UnifiedPermissionGuard';
import { useToast } from '@/components/ui/use-toast';

export default function SuperAdminPage() {
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { 
    organizations, 
    stats, 
    loading, 
    refreshing,
    error,
    lastFetch,
    refresh 
  } = useAdminData({
    autoRefresh,
    refreshInterval: 30000,
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

  const handleRefresh = async () => {
    toast({
      title: 'Actualizando datos...',
      description: 'Por favor espera un momento.',
    });
    
    await refresh();
    
    toast({
      title: 'Actualización completa',
      description: 'Todos los datos se actualizaron correctamente.',
    });
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
    <UnifiedPermissionGuard role="SUPER_ADMIN" allowSuperAdmin={true}>
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Panel de Administración SaaS
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestiona organizaciones, usuarios y analíticas de tu plataforma
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Última actualización: {formatLastUpdated()}
            </span>
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
        
        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <AdminStats stats={stats} />
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                <TabsTrigger value="overview" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Resumen</span>
                </TabsTrigger>
                <TabsTrigger value="organizations" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Organizaciones</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analíticas</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <SystemOverview stats={stats} />
              </TabsContent>

              {/* Organizations Tab */}
              <TabsContent value="organizations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Organizaciones Registradas</CardTitle>
                        <CardDescription>
                          Gestiona todas las organizaciones de la plataforma
                        </CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {organizations.length} organizacion{organizations.length !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {organizations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay organizaciones</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Aún no se han registrado organizaciones en la plataforma
                        </p>
                        <Button>
                          <Building2 className="h-4 w-4 mr-2" />
                          Crear Primera Organización
                        </Button>
                      </div>
                    ) : (
                      <OrganizationsTable organizations={organizations} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Analíticas Avanzadas</CardTitle>
                    <CardDescription>
                      Métricas detalladas y tendencias de la plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Activity className="h-12 w-12 mx-auto opacity-50" />
                        <p>Analíticas avanzadas próximamente</p>
                        <p className="text-sm">Esta función estará disponible en una próxima actualización</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </UnifiedPermissionGuard>
  );
}
