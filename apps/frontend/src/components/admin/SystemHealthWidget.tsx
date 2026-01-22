'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Server, 
  Cpu, 
  Database, 
  HardDrive, 
  Wifi, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';

interface SystemMetrics {
  cpu: {
    usage: number;
    temperature: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    status: 'connected' | 'disconnected' | 'slow';
    latency: number;
    bandwidth: number;
  };
  uptime: number;
  lastUpdate: Date;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

export function SystemHealthWidget() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: { usage: 45, temperature: 65, cores: 8 },
    memory: { used: 8.2, total: 16, percentage: 51 },
    disk: { used: 256, total: 512, percentage: 50 },
    network: { status: 'connected', latency: 12, bandwidth: 100 },
    uptime: 86400, // 1 day in seconds
    lastUpdate: new Date()
  });

  const [alerts, setAlerts] = useState<SystemAlert[]>([
    {
      id: '1',
      type: 'warning',
      message: 'Uso de CPU elevado detectado',
      timestamp: new Date(Date.now() - 300000) // 5 minutes ago
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    
    // Simular llamada a API para obtener métricas del sistema
    setTimeout(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          usage: Math.max(20, Math.min(90, prev.cpu.usage + (Math.random() - 0.5) * 10))
        },
        memory: {
          ...prev.memory,
          percentage: Math.max(30, Math.min(85, prev.memory.percentage + (Math.random() - 0.5) * 5))
        },
        disk: {
          ...prev.disk,
          percentage: Math.max(20, Math.min(80, prev.disk.percentage + (Math.random() - 0.5) * 2))
        },
        lastUpdate: new Date()
      }));
      setIsRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = () => {
    const avgUsage = (metrics.cpu.usage + metrics.memory.percentage + metrics.disk.percentage) / 3;
    
    if (avgUsage < 50) return { status: 'excellent', color: 'text-green-500', label: 'Excelente' };
    if (avgUsage < 70) return { status: 'good', color: 'text-blue-500', label: 'Bueno' };
    if (avgUsage < 85) return { status: 'warning', color: 'text-yellow-500', label: 'Advertencia' };
    return { status: 'critical', color: 'text-red-500', label: 'Crítico' };
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-4">
      {/* Header with overall health */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${healthStatus.color}`} />
                Salud del Sistema
              </CardTitle>
              <CardDescription>
                Monitoreo en tiempo real • Actualizado {metrics.lastUpdate.toLocaleTimeString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={healthStatus.status === 'excellent' ? 'default' : 
                             healthStatus.status === 'good' ? 'secondary' :
                             healthStatus.status === 'warning' ? 'outline' : 'destructive'}>
                {healthStatus.label}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshMetrics}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <span className="text-sm font-mono">{metrics.cpu.usage.toFixed(1)}%</span>
              </div>
              <Progress 
                value={metrics.cpu.usage} 
                className="h-2"
                // @ts-ignore
                indicatorClassName={metrics.cpu.usage > 80 ? 'bg-red-500' : 
                                 metrics.cpu.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'}
              />
              <div className="text-xs text-muted-foreground">
                {metrics.cpu.cores} núcleos • {metrics.cpu.temperature}°C
              </div>
            </div>

            {/* Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">RAM</span>
                </div>
                <span className="text-sm font-mono">{metrics.memory.percentage.toFixed(1)}%</span>
              </div>
              <Progress 
                value={metrics.memory.percentage} 
                className="h-2"
                // @ts-ignore
                indicatorClassName={metrics.memory.percentage > 80 ? 'bg-red-500' : 
                                 metrics.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'}
              />
              <div className="text-xs text-muted-foreground">
                {metrics.memory.used.toFixed(1)} GB / {metrics.memory.total} GB
              </div>
            </div>

            {/* Disk */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Disco</span>
                </div>
                <span className="text-sm font-mono">{metrics.disk.percentage.toFixed(1)}%</span>
              </div>
              <Progress 
                value={metrics.disk.percentage} 
                className="h-2"
                // @ts-ignore
                indicatorClassName={metrics.disk.percentage > 80 ? 'bg-red-500' : 
                                 metrics.disk.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'}
              />
              <div className="text-xs text-muted-foreground">
                {metrics.disk.used} GB / {metrics.disk.total} GB
              </div>
            </div>

            {/* Network */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Red</span>
                </div>
                <div className="flex items-center gap-1">
                  {metrics.network.status === 'connected' ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs">
                    {metrics.network.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Latencia: {metrics.network.latency}ms</div>
                <div>Ancho de banda: {metrics.network.bandwidth} Mbps</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" />
              Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tiempo de actividad</span>
              <span className="text-sm font-mono">{formatUptime(metrics.uptime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Última actualización</span>
              <span className="text-sm font-mono">{metrics.lastUpdate.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estado general</span>
              <Badge variant="outline" className={healthStatus.color}>
                {healthStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                No hay alertas activas
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}