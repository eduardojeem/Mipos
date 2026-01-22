'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Zap,
  Shield,
  RefreshCw,
  Download,
  Upload,
  Monitor,
  MemoryStick,
  Thermometer,
  Battery,
  Globe
} from 'lucide-react'

export default function SystemMonitoring() {
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: { usage: 45, temperature: 62, cores: 8 },
    memory: { used: 6.2, total: 16, percentage: 38.75 },
    disk: { used: 245, total: 500, percentage: 49 },
    network: { download: 125.5, upload: 45.2, latency: 12 },
    uptime: '15d 8h 32m',
    activeUsers: 23,
    totalSessions: 156,
    errorRate: 0.02,
    responseTime: 245
  })

  const [services, setServices] = useState([
    { name: 'API Server', status: 'running', port: 3000, uptime: '15d 8h 32m' },
    { name: 'Database', status: 'running', port: 5432, uptime: '15d 8h 32m' },
    { name: 'Redis Cache', status: 'running', port: 6379, uptime: '15d 8h 32m' },
    { name: 'File Storage', status: 'running', port: 9000, uptime: '15d 8h 32m' },
    { name: 'Email Service', status: 'warning', port: 587, uptime: '2d 4h 15m' },
    { name: 'Backup Service', status: 'running', port: 8080, uptime: '15d 8h 32m' }
  ])

  const [logs, setLogs] = useState([
    { time: '14:32:15', level: 'INFO', message: 'Usuario admin@empresa.com inició sesión', source: 'AUTH' },
    { time: '14:31:45', level: 'INFO', message: 'Backup automático completado exitosamente', source: 'BACKUP' },
    { time: '14:30:22', level: 'WARN', message: 'Conexión lenta detectada desde IP 192.168.1.45', source: 'NETWORK' },
    { time: '14:29:18', level: 'INFO', message: 'Producto ID:1234 actualizado en inventario', source: 'INVENTORY' },
    { time: '14:28:55', level: 'ERROR', message: 'Fallo temporal en servicio de email', source: 'EMAIL' },
    { time: '14:27:33', level: 'INFO', message: 'Nueva venta procesada: $125.50', source: 'POS' }
  ])

  const [isRefreshing, setIsRefreshing] = useState(false)

  // Simular actualización de métricas en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          usage: Math.max(20, Math.min(80, prev.cpu.usage + (Math.random() - 0.5) * 10))
        },
        memory: {
          ...prev.memory,
          percentage: Math.max(30, Math.min(70, prev.memory.percentage + (Math.random() - 0.5) * 5))
        },
        network: {
          ...prev.network,
          download: Math.max(50, Math.min(200, prev.network.download + (Math.random() - 0.5) * 20)),
          upload: Math.max(20, Math.min(100, prev.network.upload + (Math.random() - 0.5) * 10))
        },
        responseTime: Math.max(150, Math.min(400, prev.responseTime + (Math.random() - 0.5) * 50))
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const refreshMetrics = async () => {
    setIsRefreshing(true)
    // Simular carga de datos
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'error': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600'
      case 'WARN': return 'text-yellow-600'
      case 'INFO': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Monitoreo del Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Estado en tiempo real del sistema y servicios
          </p>
        </div>
        
        <Button 
          onClick={refreshMetrics} 
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* System Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.cpu.usage.toFixed(1)}%</div>
            <Progress value={systemMetrics.cpu.usage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {systemMetrics.cpu.cores} núcleos • {systemMetrics.cpu.temperature}°C
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memoria RAM</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.memory.percentage.toFixed(1)}%</div>
            <Progress value={systemMetrics.memory.percentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {systemMetrics.memory.used}GB / {systemMetrics.memory.total}GB
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.disk.percentage}%</div>
            <Progress value={systemMetrics.disk.percentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {systemMetrics.disk.used}GB / {systemMetrics.disk.total}GB
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Red</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.network.latency}ms</div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>↓ {systemMetrics.network.download.toFixed(1)} MB/s</span>
              <span>↑ {systemMetrics.network.upload.toFixed(1)} MB/s</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        {/* Services Status */}
        <TabsContent value="services">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Estado de Servicios
                </CardTitle>
                <CardDescription>
                  Monitoreo en tiempo real de todos los servicios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status)}
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Puerto: {service.port}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(service.status)}>
                          {service.status === 'running' ? 'Activo' : 
                           service.status === 'warning' ? 'Advertencia' : 'Error'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.uptime}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Métricas Generales
                </CardTitle>
                <CardDescription>
                  Estadísticas generales del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tiempo de Actividad</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {systemMetrics.uptime}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Usuarios Activos</span>
                    <span className="text-lg font-bold">{systemMetrics.activeUsers}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sesiones Totales</span>
                    <span className="text-lg font-bold">{systemMetrics.totalSessions}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tasa de Error</span>
                    <Badge variant="outline" className="border-green-200 text-green-600">
                      {systemMetrics.errorRate}%
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tiempo de Respuesta</span>
                    <span className="text-lg font-bold">{systemMetrics.responseTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Metrics */}
        <TabsContent value="performance">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Rendimiento de CPU
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Uso Actual</span>
                    <span className="font-bold">{systemMetrics.cpu.usage.toFixed(1)}%</span>
                  </div>
                  <Progress value={systemMetrics.cpu.usage} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Temperatura</span>
                    <span className="font-bold">{systemMetrics.cpu.temperature}°C</span>
                  </div>
                  <Progress value={(systemMetrics.cpu.temperature / 100) * 100} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Núcleos</span>
                    <span className="font-bold">{systemMetrics.cpu.cores}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Base de Datos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Conexiones Activas</span>
                    <span className="font-bold">45/100</span>
                  </div>
                  <Progress value={45} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Consultas/seg</span>
                    <span className="font-bold">1,247</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Tiempo Promedio</span>
                    <span className="font-bold">12ms</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Cache Hit Rate</span>
                    <span className="font-bold">94.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Tráfico de Red
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Descarga</span>
                    <span className="font-bold">{systemMetrics.network.download.toFixed(1)} MB/s</span>
                  </div>
                  <Progress value={(systemMetrics.network.download / 200) * 100} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Subida</span>
                    <span className="font-bold">{systemMetrics.network.upload.toFixed(1)} MB/s</span>
                  </div>
                  <Progress value={(systemMetrics.network.upload / 100) * 100} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Latencia</span>
                    <span className="font-bold">{systemMetrics.network.latency}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Logs */}
        <TabsContent value="logs">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Logs del Sistema
              </CardTitle>
              <CardDescription>
                Registro de eventos y actividades recientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="text-muted-foreground font-mono">{log.time}</span>
                    <Badge variant="outline" className={`text-xs ${getLevelColor(log.level)}`}>
                      {log.level}
                    </Badge>
                    <span className="flex-1">{log.message}</span>
                    <Badge variant="secondary" className="text-xs">
                      {log.source}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Logs
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Monitoring */}
        <TabsContent value="security">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Estado de Seguridad
                </CardTitle>
                <CardDescription>
                  Monitoreo de eventos de seguridad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Intentos de Login Fallidos</span>
                    <Badge variant="outline" className="border-green-200 text-green-600">
                      2 (últimas 24h)
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sesiones Activas</span>
                    <span className="text-lg font-bold">{systemMetrics.activeUsers}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Certificado SSL</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Válido (89 días)
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Firewall</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Activo
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Último Backup</span>
                    <span className="text-sm text-muted-foreground">Hace 2 horas</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas de Seguridad
                </CardTitle>
                <CardDescription>
                  Eventos de seguridad recientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Múltiples intentos de login desde IP desconocida
                      </p>
                      <p className="text-xs text-yellow-600">
                        IP: 192.168.1.45 • Hace 15 minutos
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Backup automático completado exitosamente
                      </p>
                      <p className="text-xs text-green-600">
                        Tamaño: 2.4GB • Hace 2 horas
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Nuevo usuario registrado en el sistema
                      </p>
                      <p className="text-xs text-blue-600">
                        Usuario: nuevo@empresa.com • Hace 3 horas
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}