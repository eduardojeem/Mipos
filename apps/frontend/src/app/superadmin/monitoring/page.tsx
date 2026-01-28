'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Server, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Users
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeUsers: number;
  responseTime: number;
  uptime: number;
  errors: number;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 67,
    disk: 23,
    network: 89,
    activeUsers: 1247,
    responseTime: 145,
    uptime: 99.97,
    errors: 3
  });

  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(0, Math.min(100, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, prev.memory + (Math.random() - 0.5) * 5)),
        disk: Math.max(0, Math.min(100, prev.disk + (Math.random() - 0.5) * 2)),
        network: Math.max(0, Math.min(100, prev.network + (Math.random() - 0.5) * 15)),
        activeUsers: Math.max(0, prev.activeUsers + Math.floor((Math.random() - 0.5) * 20)),
        responseTime: Math.max(50, prev.responseTime + (Math.random() - 0.5) * 30),
        uptime: prev.uptime,
        errors: Math.max(0, prev.errors + (Math.random() > 0.9 ? 1 : 0))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600 bg-red-50 border-red-200';
    if (value >= thresholds.warning) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };



  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-600" />
              Monitoreo del Sistema
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Monitoreo en tiempo real del estado del sistema
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${isLive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
              {isLive ? 'En Vivo' : 'Pausado'}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? 'Pausar' : 'Reanudar'}
            </Button>
          </div>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CPU Usage */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Uso de CPU
                </CardTitle>
                <Cpu className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {metrics.cpu.toFixed(1)}%
              </div>
              <Progress 
                value={metrics.cpu} 
                className="h-2 mb-2"
                style={{ 
                  backgroundColor: '#e2e8f0',
                }}
              />
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusColor(metrics.cpu, { warning: 70, critical: 90 })}`}
              >
                {metrics.cpu >= 90 ? 'Crítico' : metrics.cpu >= 70 ? 'Alto' : 'Normal'}
              </Badge>
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Memoria RAM
                </CardTitle>
                <Server className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {metrics.memory.toFixed(1)}%
              </div>
              <Progress 
                value={metrics.memory} 
                className="h-2 mb-2"
              />
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusColor(metrics.memory, { warning: 80, critical: 95 })}`}
              >
                {metrics.memory >= 95 ? 'Crítico' : metrics.memory >= 80 ? 'Alto' : 'Normal'}
              </Badge>
            </CardContent>
          </Card>

          {/* Disk Usage */}
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Almacenamiento
                </CardTitle>
                <HardDrive className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {metrics.disk.toFixed(1)}%
              </div>
              <Progress 
                value={metrics.disk} 
                className="h-2 mb-2"
              />
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusColor(metrics.disk, { warning: 85, critical: 95 })}`}
              >
                {metrics.disk >= 95 ? 'Crítico' : metrics.disk >= 85 ? 'Alto' : 'Normal'}
              </Badge>
            </CardContent>
          </Card>

          {/* Network */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Red
                </CardTitle>
                <Wifi className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {metrics.network.toFixed(1)}%
              </div>
              <Progress 
                value={metrics.network} 
                className="h-2 mb-2"
              />
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusColor(metrics.network, { warning: 90, critical: 98 })}`}
              >
                {metrics.network >= 98 ? 'Crítico' : metrics.network >= 90 ? 'Alto' : 'Normal'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Usuarios Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {metrics.activeUsers.toLocaleString()}
              </div>
              <p className="text-sm text-slate-500">Usuarios conectados actualmente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Tiempo de Respuesta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {metrics.responseTime.toFixed(0)}ms
              </div>
              <p className="text-sm text-slate-500">Tiempo promedio de respuesta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {metrics.uptime}%
              </div>
              <p className="text-sm text-slate-500">Disponibilidad del sistema</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {metrics.errors > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Alertas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: Math.min(metrics.errors, 5) }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Error en el servidor de aplicaciones</p>
                      <p className="text-xs text-slate-500">Hace {Math.floor(Math.random() * 60)} minutos</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      Crítico
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminGuard>
  );
}