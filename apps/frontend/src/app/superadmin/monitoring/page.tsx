'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  RefreshCw,
  Database,
  HardDrive,
  Zap,
  Building2,
} from 'lucide-react';
import { useState } from 'react';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationUsageTable } from '../components/OrganizationUsageTable';
import { useOrganizationUsage } from '../hooks/useOrganizationUsageNew';
import { useToast } from '@/components/ui/use-toast';
import { MonitoringConfigPanel } from './components/MonitoringConfigPanel';
import { MonitoringStats } from './components/MonitoringStats';
import { useDatabaseStats } from '../hooks/useDatabaseStats';
import { useStorageStats } from '../hooks/useStorageStats';
import { useMonitoringConfig } from '../hooks/useMonitoringConfig';

export default function MonitoringPage() {
  const { toast } = useToast();
  const { config, isMetricEnabled } = useMonitoringConfig();
  const {
    organizations,
    loading: orgsLoading,
    refresh: refreshOrgs,
    updateOrganization
  } = useOrganizations({
    pageSize: 1000 // Load all for monitoring
  });

  const {
    usageByOrg,
    loading: usageLoading,
    refresh: refreshUsage,
    cached: usageCached,
    lastFetch: usageLastFetch,
  } = useOrganizationUsage({
    enabled: true,
    includeActivity: isMetricEnabled('connections'),
  });

  const {
    data: dbStats,
    refresh: refreshDbStats,
    cached: dbCached,
    lastFetch: dbLastFetch,
  } = useDatabaseStats({
    enabled: isMetricEnabled('database_size'),
  });

  const {
    data: storageStats,
    refresh: refreshStorage,
    cached: storageCached,
    lastFetch: storageLastFetch,
  } = useStorageStats({
    enabled: isMetricEnabled('storage_basic'),
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleUpdateLimits = async (id: string, limits: Record<string, number>) => {
    const org = organizations.find((o: any) => o.id === id);
    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const currentLimits = (currentSettings.limits as Record<string, number>) || {};

    const newSettings = {
      ...currentSettings,
      limits: {
        ...currentLimits,
        ...limits,
      },
    };

    const result = await updateOrganization(id, { settings: newSettings } as any);
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

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshOrgs(),
        refreshUsage(),
        refreshDbStats(),
        refreshStorage(),
      ]);
      toast({
        title: "Datos actualizados",
        description: "Todas las métricas han sido refrescadas.",
      });
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "Hubo un problema al refrescar los datos.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (orgsLoading && organizations.length === 0) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Cargando métricas de monitorización...</p>
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Activity className="h-8 w-8 text-purple-600" />
              Monitorización de Sistema
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Control de recursos, rendimiento y límites con Supabase
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar Todo
          </Button>
        </div>

        {/* Configuration Panel */}
        <MonitoringConfigPanel />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="database"
              className="flex items-center gap-2"
              disabled={!isMetricEnabled('database_size')}
            >
              <Database className="h-4 w-4" />
              Database
              {dbCached && (
                <Badge variant="outline" className="ml-1 text-xs">
                  Cached
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="storage"
              className="flex items-center gap-2"
              disabled={!isMetricEnabled('storage_basic')}
            >
              <HardDrive className="h-4 w-4" />
              Storage
              {storageCached && (
                <Badge variant="outline" className="ml-1 text-xs">
                  Cached
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="flex items-center gap-2"
              disabled={!isMetricEnabled('slow_queries') && !isMetricEnabled('connections')}
            >
              <Zap className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizations
              {usageCached && (
                <Badge variant="outline" className="ml-1 text-xs">
                  Cached
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <MonitoringStats />

            {/* Organization Overview (Top 10) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Top Organizations by Usage
                </h2>
                <p className="text-sm text-slate-500 dark text-slate-400">
                  Last update: {formatLastUpdate(usageLastFetch)}
                </p>
              </div>
              <OrganizationUsageTable
                organizations={organizations.slice(0, 10)}
                onUpdateLimits={handleUpdateLimits}
                usageByOrg={usageByOrg}
              />
            </div>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-6">
            {dbStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 border rounded-lg border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold mb-4">Performance Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Cache Hit Ratio</span>
                        <span className="font-mono font-semibold">{dbStats.performance.cacheHitRatio.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Active Connections</span>
                        <span className="font-mono font-semibold">{dbStats.performance.activeConnections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Idle Connections</span>
                        <span className="font-mono font-semibold">{dbStats.performance.idleConnections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Transactions Committed</span>
                        <span className="font-mono font-semibold">{dbStats.performance.transactionsCommitted.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border rounded-lg border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold mb-4">Database Size</h3>
                    <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                      {dbStats.totalSize.pretty}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Total database size across all tables
                    </p>
                  </div>
                </div>

                {/* Largest Tables */}
                {dbStats.largestTables && dbStats.largestTables.length > 0 && (
                  <div className="p-6 border rounded-lg border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold mb-4">Largest Tables</h3>
                    <div className="space-y-2">
                      {dbStats.largestTables.slice(0, 10).map((table, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-900">
                          <span className="text-sm font-mono">{table.tableName}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500">{table.rowCount.toLocaleString()} rows</span>
                            <span className="text-sm font-semibold">{table.sizePretty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage" className="space-y-6">
            {storageStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 border rounded-lg border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total Files</h3>
                    <div className="text-3xl font-bold">{storageStats.totalFiles.toLocaleString()}</div>
                  </div>
                  <div className="p-6 border rounded-lg border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total Size</h3>
                    <div className="text-3xl font-bold text-orange-600">{storageStats.totalSizePretty}</div>
                  </div>
                  <div className="p-6 border rounded-lg border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Buckets</h3>
                    <div className="text-3xl font-bold">{storageStats.byBucket.length}</div>
                  </div>
                </div>

                {storageStats.byBucket.length > 0 && (
                  <div className="p-6 border rounded-lg border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold mb-4">Storage by Bucket</h3>
                    <div className="space-y-2">
                      {storageStats.byBucket.map((bucket, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-900">
                          <span className="text-sm font-medium">{bucket.bucketName}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500">{bucket.fileCount} files</span>
                            <span className="text-sm font-semibold">{bucket.sizePretty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="p-8 text-center border rounded-lg border-slate-200 dark:border-slate-800">
              <Zap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Performance Analysis</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Advanced performance metrics will be displayed here when enabled.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                Requires pg_stat_statements extension
              </p>
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Detalle por Organización
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Last update: {formatLastUpdate(usageLastFetch)}
              </p>
            </div>
            <OrganizationUsageTable
              organizations={organizations}
              onUpdateLimits={handleUpdateLimits}
              usageByOrg={usageByOrg}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminGuard>
  );
}
