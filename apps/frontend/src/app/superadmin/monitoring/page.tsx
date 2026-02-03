'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Organization } from '../hooks/useAdminData';
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
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { usePerformanceStats } from '../hooks/usePerformanceStats';

export default function MonitoringPage() {
  const { toast } = useToast();
  const { isMetricEnabled } = useMonitoringConfig();
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
  } = useDatabaseStats({
    enabled: isMetricEnabled('database_size'),
  });

  const {
    data: storageStats,
    refresh: refreshStorage,
    cached: storageCached,
  } = useStorageStats({
    enabled: isMetricEnabled('storage_basic'),
  });
  
  const {
    stats: perfStats,
    refresh: refreshPerf,
    lastFetch: perfLastFetch,
  } = usePerformanceStats({
    enabled: isMetricEnabled('slow_queries'),
    limit: 10,
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleUpdateLimits = async (id: string, limits: Record<string, number>) => {
    const org = organizations.find((o: Organization) => o.id === id);
    const currentSettings = (org?.settings || {}) as Record<string, unknown> & { limits?: Record<string, number> };
    const currentLimits = currentSettings.limits || {};

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
        description: (result as { error?: string }).error || "No se pudieron actualizar los límites.",
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
        refreshPerf(),
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
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
            {!perfStats?.hasStatStatements ? (
              <div className="p-12 text-center border rounded-xl border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/10">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-amber-900 dark:text-amber-400">pg_stat_statements no habilitado</h3>
                <p className="text-sm text-amber-800 dark:text-amber-500 max-w-md mx-auto">
                  La extensión <strong>pg_stat_statements</strong> es necesaria para monitorizar el rendimiento de las consultas.
                  Contacta con tu administrador de base de datos para habilitarla.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 border rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                       <Zap className="h-4 w-4 text-amber-500" />
                       Queries Analizadas
                    </h3>
                    <div className="text-3xl font-bold">{perfStats.queriesAnalyzed}</div>
                  </div>
                  <div className="p-6 border rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Máximo Tiempo Promedio</h3>
                    <div className="text-3xl font-bold text-rose-500">
                      {perfStats.slowQueries[0]?.meanTime || 0} <span className="text-sm font-normal text-slate-500">ms</span>
                    </div>
                  </div>
                  <div className="p-6 border rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                     <h3 className="text-sm font-medium text-slate-500 mb-2">Estado del Colector</h3>
                     <Badge className="bg-emerald-500 text-white border-0">ACTIVO</Badge>
                  </div>
                </div>

                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Consultas más Lentas</CardTitle>
                        <CardDescription>Top 10 consultas por tiempo de ejecución promedio</CardDescription>
                      </div>
                      <p className="text-xs text-slate-500">
                         Última actualización: {formatLastUpdate(perfLastFetch)}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b dark:border-slate-800">
                            <th className="py-3 font-semibold text-slate-400">Consulta (SQL)</th>
                            <th className="py-3 font-semibold text-slate-400 text-right">Llamadas</th>
                            <th className="py-3 font-semibold text-slate-400 text-right">Tiempo Prom.</th>
                            <th className="py-3 font-semibold text-slate-400 text-right">Tiempo Total</th>
                            <th className="py-3 font-semibold text-slate-400 text-right">Máximo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                          {perfStats.slowQueries.map((q, i) => (
                            <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                              <td className="py-4 pr-4">
                                <code className="block p-3 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-300 font-mono text-xs line-clamp-2 group-hover:line-clamp-none transition-all cursor-help" title={q.query}>
                                  {q.query}
                                </code>
                              </td>
                              <td className="py-4 text-right font-mono font-medium">{q.calls.toLocaleString()}</td>
                              <td className="py-4 text-right">
                                <Badge variant="outline" className={`${q.meanTime > 500 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'} font-mono`}>
                                  {q.meanTime} ms
                                </Badge>
                              </td>
                              <td className="py-4 text-right text-slate-500 font-mono">{Math.round(q.totalTime / 1000).toLocaleString()} s</td>
                              <td className="py-4 text-right font-medium text-rose-600 dark:text-rose-400 font-mono">{q.maxTime} ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
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
