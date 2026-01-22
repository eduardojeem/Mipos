'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  TrendingUp,
  Clock,
  HardDrive,
  AlertTriangle
} from 'lucide-react';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useAdvancedCache } from '../hooks/useAdvancedCache';
import { useOfflineManager } from '../hooks/useOfflineManager';

interface PerformancePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformancePanel({ isOpen, onClose }: PerformancePanelProps) {
  const { getReport, clearMetrics } = usePerformanceMonitor();
  const { getStats: getCacheStats, cleanup: cleanupCache } = useAdvancedCache();
  const { isOnline, pendingActions, getStats: getOfflineStats, forceSync } = useOfflineManager();
  
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [offlineStats, setOfflineStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStats = async () => {
    setIsRefreshing(true);
    try {
      const [perfReport, cacheData, offlineData] = await Promise.all([
        getReport?.(),
        getCacheStats?.(),
        getOfflineStats?.()
      ]);
      
      setPerformanceReport(perfReport);
      setCacheStats(cacheData);
      setOfflineStats(offlineData);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
    }
  }, [isOpen]);

  const handleClearMetrics = async () => {
    await clearMetrics?.();
    await refreshStats();
  };

  const handleCleanupCache = async () => {
    await cleanupCache?.();
    await refreshStats();
  };

  const handleForceSync = async () => {
    await forceSync?.();
    await refreshStats();
  };

  if (!isOpen) return null;

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceProgress = (value: number, max: number) => {
    return Math.min((value / max) * 100, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Panel de Performance</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStats}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 mr-2 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 mr-2 text-red-600" />
                  )}
                  Estado de Conexión
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant={isOnline ? 'default' : 'destructive'}>
                    {isOnline ? 'En línea' : 'Sin conexión'}
                  </Badge>
                  {pendingActions.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {pendingActions.length} acciones pendientes
                    </div>
                  )}
                  {!isOnline && pendingActions.length > 0 && (
                    <Button size="sm" onClick={handleForceSync} className="w-full">
                      Sincronizar cuando vuelva la conexión
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            {performanceReport && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                      Tiempo de Carga
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        <span className={getPerformanceColor(performanceReport.summary.averageLoadTime, { good: 1000, warning: 3000 })}>
                          {Math.round(performanceReport.summary.averageLoadTime)}ms
                        </span>
                      </div>
                      <Progress 
                        value={getPerformanceProgress(performanceReport.summary.averageLoadTime, 5000)} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        Objetivo: &lt;1s, Aceptable: &lt;3s
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                      Tiempo de Renderizado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        <span className={getPerformanceColor(performanceReport.summary.averageRenderTime, { good: 50, warning: 100 })}>
                          {Math.round(performanceReport.summary.averageRenderTime)}ms
                        </span>
                      </div>
                      <Progress 
                        value={getPerformanceProgress(performanceReport.summary.averageRenderTime, 200)} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        Objetivo: &lt;50ms, Aceptable: &lt;100ms
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <HardDrive className="h-4 w-4 mr-2 text-purple-600" />
                      Uso de Memoria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        <span className={getPerformanceColor(performanceReport.summary.memoryUsage, { good: 50, warning: 100 })}>
                          {Math.round(performanceReport.summary.memoryUsage)}MB
                        </span>
                      </div>
                      <Progress 
                        value={getPerformanceProgress(performanceReport.summary.memoryUsage, 200)} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        Objetivo: &lt;50MB, Aceptable: &lt;100MB
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Cache Statistics */}
            {cacheStats && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Database className="h-4 w-4 mr-2 text-green-600" />
                    Estadísticas de Cache
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Entradas en memoria:</span>
                      <span className="font-medium">{cacheStats.memoryEntries}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Entradas en DB:</span>
                      <span className="font-medium">{cacheStats.dbEntries}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tamaño total:</span>
                      <span className="font-medium">{Math.round(cacheStats.totalSize / 1024)}KB</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleCleanupCache} className="w-full">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpiar Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Offline Statistics */}
            {offlineStats && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-orange-600" />
                    Datos Offline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Acciones pendientes:</span>
                      <span className="font-medium">{offlineStats.pendingActions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Última sincronización:</span>
                      <span className="font-medium text-xs">{offlineStats.lastSync}</span>
                    </div>
                    {isOnline && offlineStats.pendingActions > 0 && (
                      <Button size="sm" onClick={handleForceSync} className="w-full">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sincronizar Ahora
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Recommendations */}
          {performanceReport?.recommendations && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                  Recomendaciones de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceReport.recommendations.map((recommendation: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClearMetrics}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Métricas
            </Button>
            <Button onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}