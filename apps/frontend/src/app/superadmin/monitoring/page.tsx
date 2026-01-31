'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Database,
  HardDrive,
  Globe,
  Users,
  RefreshCw
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationUsageTable } from '../components/OrganizationUsageTable';
import { useOrganizationUsage } from '../hooks/useOrganizationUsage';
import { useToast } from '@/components/ui/use-toast';

export default function MonitoringPage() {
  const { toast } = useToast();
  const { 
    organizations, 
    loading, 
    refresh,
    updateOrganization
  } = useOrganizations({
    pageSize: 1000 // Load all for monitoring
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { usageByOrg } = useOrganizationUsage({ organizations });

  // Eliminado: no usar datos mock

  const aggregates = useMemo(() => {
    return organizations.reduce((acc, org) => {
      const settings = (org.settings as Record<string, unknown>) || {};
      const usage = (settings.usage as Record<string, number>) || {};
      const computed = usageByOrg[org.id];

      return {
        totalDbSize: acc.totalDbSize + (computed?.db_size_mb ?? usage.db_size_mb ?? 0),
        totalStorage: acc.totalStorage + (computed?.storage_size_mb ?? usage.storage_size_mb ?? 0),
        totalBandwidth: acc.totalBandwidth + (computed?.bandwidth_mb ?? usage.bandwidth_mb ?? 0),
        activeOrgs: acc.activeOrgs + (org.subscription_status === 'ACTIVE' ? 1 : 0),
      };
    }, {
      totalDbSize: 0,
      totalStorage: 0,
      totalBandwidth: 0,
      activeOrgs: 0
    });
  }, [organizations, usageByOrg]);

  const handleUpdateLimits = async (id: string, limits: Record<string, number>) => {
    const org = organizations.find(o => o.id === id);
    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const currentLimits = (currentSettings.limits as Record<string, number>) || {};
    
    const newSettings = {
      ...currentSettings,
      limits: {
        ...currentLimits,
        ...limits,
      },
    };

    const result = await updateOrganization(id, { settings: newSettings });
    if (result.success) {
      toast({
        title: "Límites actualizados",
        description: "Los límites de la organización han sido actualizados correctamente.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudieron actualizar los límites.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formatSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
  };

  if (loading && organizations.length === 0) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Cargando métricas de uso...</p>
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-600" />
              Monitorización de Datos
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Control de uso de recursos y límites por organización
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Aggregated Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Base de Datos
                </CardTitle>
                <Database className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatSize(aggregates.totalDbSize)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Uso total en todas las organizaciones</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Almacenamiento
                </CardTitle>
                <HardDrive className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatSize(aggregates.totalStorage)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Archivos y assets almacenados</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Ancho de Banda
                </CardTitle>
                <Globe className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatSize(aggregates.totalBandwidth)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Transferencia estimada (mes actual)</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Organizaciones Activas
                </CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {aggregates.activeOrgs} / {organizations.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Organizaciones con suscripción activa</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Detalle por Organización
          </h2>
          <OrganizationUsageTable 
            organizations={organizations} 
            onUpdateLimits={handleUpdateLimits}
            usageByOrg={usageByOrg}
          />
        </div>
      </div>
    </SuperAdminGuard>
  );
}
