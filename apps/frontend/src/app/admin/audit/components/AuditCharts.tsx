'use client'

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Activity,
  Users,
  Database,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface AuditChartsProps {
  stats: any;
  theme: 'light' | 'dark';
  detailed?: boolean;
}

export function AuditCharts({ stats, theme, detailed = false }: AuditChartsProps) {
  const chartData = useMemo(() => {
    if (!stats) return null;

    const maxCount = Math.max(
      ...(stats.byAction || []).map((item: any) => item.count),
      ...(stats.byResource || []).map((item: any) => item.count)
    );

    return {
      maxCount,
      actions: stats.byAction || [],
      resources: stats.byResource || [],
      recentActivity: stats.recentActivity || []
    };
  }, [stats]);

  const getActionColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'bg-green-500';
    if (action.startsWith('UPDATE')) return 'bg-blue-500';
    if (action.startsWith('DELETE')) return 'bg-red-500';
    if (action.startsWith('VIEW')) return 'bg-gray-500';
    return 'bg-purple-500';
  };

  const formatActionLabel = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  };

  if (!chartData) {
    return (
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay datos disponibles para mostrar gráficos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Distribución por Acción */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Distribución por Acción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.actions.slice(0, detailed ? 15 : 8).map((item: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full ${getActionColor(item.action)}`}></div>
                    <Badge 
                      variant="outline" 
                      className="text-xs truncate max-w-[150px]"
                      title={formatActionLabel(item.action)}
                    >
                      {formatActionLabel(item.action)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-medium w-12 text-right">
                      {item.count}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {((item.count / (stats?.total || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getActionColor(item.action)}`}
                    style={{ width: `${(item.count / chartData.maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            
            {chartData.actions.length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay datos de acciones disponibles</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Distribución por Recurso */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            Distribución por Recurso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.resources.slice(0, detailed ? 15 : 8).map((item: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <Badge 
                      variant="outline" 
                      className="text-xs truncate max-w-[150px]"
                      title={item.resource}
                    >
                      {item.resource}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-medium w-12 text-right">
                      {item.count}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {((item.count / (stats?.total || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${(item.count / chartData.maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            
            {chartData.resources.length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay datos de recursos disponibles</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actividad Reciente */}
      {detailed && (
        <Card className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''} lg:col-span-2`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              Actividad Reciente Detallada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartData.recentActivity.slice(0, 20).map((activity: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                  } transition-colors`}
                >
                  <div className={`w-2 h-2 rounded-full ${getActionColor(activity.action)}`}></div>
                  
                  <Badge className={`${getActionColor(activity.action).replace('bg-', 'bg-opacity-20 text-')} border-0`}>
                    {formatActionLabel(activity.action)}
                  </Badge>
                  
                  <Badge variant="secondary" className="text-xs">
                    {activity.entityType || activity.resource}
                  </Badge>
                  
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 flex-1 min-w-0">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{activity.userEmail}</span>
                  </div>
                  
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(activity.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
              
              {chartData.recentActivity.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de Tendencias */}
      {detailed && (
        <Card className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''} lg:col-span-2`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Análisis de Tendencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Acciones */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Acciones Más Frecuentes
                </h4>
                <div className="space-y-2">
                  {chartData.actions.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 mr-2">
                        {formatActionLabel(item.action)}
                      </span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Recursos */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Recursos Más Accedidos
                </h4>
                <div className="space-y-2">
                  {chartData.resources.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 mr-2">{item.resource}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estadísticas Generales */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Estadísticas Generales
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total de eventos:</span>
                    <span className="font-medium">{stats?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipos de acción:</span>
                    <span className="font-medium">{chartData.actions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recursos únicos:</span>
                    <span className="font-medium">{chartData.resources.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actividad reciente:</span>
                    <span className="font-medium">{chartData.recentActivity.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}