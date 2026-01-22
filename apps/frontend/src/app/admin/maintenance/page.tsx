'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wrench, 
  Trash2, 
  Database, 
  HardDrive,
  Cpu,
  MemoryStick,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Activity,
  FileText,
  Shield,
  Gauge,
  Scan,
  Brush,
  RefreshCw,
  TrendingUp,
  Server,
  Network,
  Eye
} from 'lucide-react'

export default function SystemMaintenance() {
  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false)
  const [maintenanceProgress, setMaintenanceProgress] = useState(0)
  const [maintenanceTask, setMaintenanceTask] = useState('')
  const [autoMaintenance, setAutoMaintenance] = useState(true)
  const [lastMaintenance, setLastMaintenance] = useState('2024-01-14 02:00:00')
  const { toast } = useToast()

  const [dbStats, setDbStats] = useState<{ tables: any[]; counts: Record<string, number> } | null>(null)
  const [purgeDays, setPurgeDays] = useState(90)

  const [systemHealth, setSystemHealth] = useState({
    overall: 85,
    database: 92,
    storage: 78,
    memory: 88,
    performance: 82,
    security: 95
  })

  const [maintenanceTasks] = useState([
    {
      id: 1,
      name: 'Limpieza de archivos temporales',
      description: 'Eliminar archivos temporales y caché',
      category: 'storage',
      impact: 'medium',
      duration: '2-5 min',
      lastRun: '2024-01-14 02:00:00',
      status: 'completed'
    },
    {
      id: 2,
      name: 'Optimización de base de datos',
      description: 'Reindexar y optimizar tablas de la base de datos',
      category: 'database',
      impact: 'high',
      duration: '10-15 min',
      lastRun: '2024-01-13 02:00:00',
      status: 'pending'
    },
    {
      id: 3,
      name: 'Análisis de seguridad',
      description: 'Escanear vulnerabilidades y amenazas',
      category: 'security',
      impact: 'low',
      duration: '5-8 min',
      lastRun: '2024-01-14 02:00:00',
      status: 'completed'
    },
    {
      id: 4,
      name: 'Limpieza de logs antiguos',
      description: 'Archivar y eliminar logs antiguos',
      category: 'storage',
      impact: 'low',
      duration: '1-3 min',
      lastRun: '2024-01-14 02:00:00',
      status: 'completed'
    },
    {
      id: 5,
      name: 'Verificación de integridad',
      description: 'Verificar integridad de archivos del sistema',
      category: 'system',
      impact: 'medium',
      duration: '8-12 min',
      lastRun: '2024-01-12 02:00:00',
      status: 'warning'
    },
    {
      id: 6,
      name: 'Optimización de memoria',
      description: 'Liberar memoria no utilizada y optimizar caché',
      category: 'performance',
      impact: 'medium',
      duration: '3-5 min',
      lastRun: '2024-01-14 02:00:00',
      status: 'completed'
    }
  ])

  const [diagnostics] = useState([
    {
      category: 'Sistema',
      items: [
        { name: 'Tiempo de actividad', value: '15 días, 8 horas', status: 'good' },
        { name: 'Carga del sistema', value: '0.45', status: 'good' },
        { name: 'Procesos activos', value: '127', status: 'good' },
        { name: 'Temperatura CPU', value: '42°C', status: 'good' }
      ]
    },
    {
      category: 'Almacenamiento',
      items: [
        { name: 'Espacio libre', value: '45.2 GB', status: 'warning' },
        { name: 'Inodos libres', value: '89%', status: 'good' },
        { name: 'Fragmentación', value: '12%', status: 'good' },
        { name: 'Velocidad I/O', value: '156 MB/s', status: 'good' }
      ]
    },
    {
      category: 'Base de Datos',
      items: [
        { name: 'Conexiones activas', value: '23/100', status: 'good' },
        { name: 'Consultas lentas', value: '2', status: 'warning' },
        { name: 'Tamaño BD', value: '2.8 GB', status: 'good' },
        { name: 'Índices fragmentados', value: '5', status: 'warning' }
      ]
    },
    {
      category: 'Red',
      items: [
        { name: 'Latencia', value: '12ms', status: 'good' },
        { name: 'Ancho de banda', value: '85%', status: 'good' },
        { name: 'Paquetes perdidos', value: '0.01%', status: 'good' },
        { name: 'Conexiones TCP', value: '156', status: 'good' }
      ]
    }
  ])

  const runMaintenance = async (taskIds?: number[]) => {
    setIsRunningMaintenance(true)
    setMaintenanceProgress(0)
    
    const tasks = taskIds ? 
      maintenanceTasks.filter(task => taskIds.includes(task.id)) : 
      maintenanceTasks.filter(task => task.status === 'pending' || task.status === 'warning')

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      setMaintenanceTask(`Ejecutando: ${task.name}`)
      
      // Simular progreso de la tarea
      for (let progress = 0; progress <= 100; progress += 10) {
        setMaintenanceProgress((i / tasks.length) * 100 + (progress / tasks.length))
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    setMaintenanceTask('Mantenimiento completado')
    setMaintenanceProgress(100)
    
    setTimeout(() => {
      setIsRunningMaintenance(false)
      setMaintenanceProgress(0)
      setMaintenanceTask('')
      setLastMaintenance(new Date().toISOString().slice(0, 19).replace('T', ' '))
    }, 1000)
  }

  const fetchDbStats = async () => {
    try {
      const res = await fetch('/api/admin/maintenance/db-stats')
      const data = await res.json()
      if (res.ok && data?.success) {
        setDbStats({ tables: data.tables || [], counts: data.counts || {} })
        toast({ title: 'Estadísticas de BD', description: 'Datos actualizados' })
      } else {
        toast({ title: 'Error', description: data?.error || 'No se pudo obtener estadísticas', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Fallo al obtener estadísticas', variant: 'destructive' })
    }
  }

  const cleanupExpiredSessions = async () => {
    try {
      const res = await fetch('/api/admin/sessions/cleanup', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast({ title: 'Sesiones limpiadas', description: 'Se eliminaron sesiones expiradas' })
      } else {
        toast({ title: 'Error al limpiar sesiones', description: data?.error || 'Intenta nuevamente', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Fallo al limpiar sesiones', variant: 'destructive' })
    }
  }

  const purgeOldAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/maintenance/purge-audit-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: purgeDays }) })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        toast({ title: 'Logs purgados', description: `Eliminados ${data.deleted} registros anteriores a ${data.cutoff} (${data.days} días)` })
      } else {
        toast({ title: 'Error al purgar logs', description: data?.error || 'Intenta nuevamente', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Fallo al purgar logs', variant: 'destructive' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'warning': return 'bg-orange-100 text-orange-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'error': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database': return <Database className="w-4 h-4" />
      case 'storage': return <HardDrive className="w-4 h-4" />
      case 'security': return <Shield className="w-4 h-4" />
      case 'performance': return <Zap className="w-4 h-4" />
      case 'system': return <Server className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getDiagnosticStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Mantenimiento del Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Herramientas de optimización y diagnóstico del sistema
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => runMaintenance()}
            disabled={isRunningMaintenance}
            className="btn-gradient"
          >
            {isRunningMaintenance ? (
              <>
                <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Ejecutando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Ejecutar Mantenimiento
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">General</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(systemHealth.overall)}`}>
              {systemHealth.overall}%
            </div>
            <Progress value={systemHealth.overall} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base de Datos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(systemHealth.database)}`}>
              {systemHealth.database}%
            </div>
            <Progress value={systemHealth.database} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(systemHealth.storage)}`}>
              {systemHealth.storage}%
            </div>
            <Progress value={systemHealth.storage} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memoria</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(systemHealth.memory)}`}>
              {systemHealth.memory}%
            </div>
            <Progress value={systemHealth.memory} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendimiento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(systemHealth.performance)}`}>
              {systemHealth.performance}%
            </div>
            <Progress value={systemHealth.performance} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seguridad</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(systemHealth.security)}`}>
              {systemHealth.security}%
            </div>
            <Progress value={systemHealth.security} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Progress */}
      {isRunningMaintenance && (
        <Card className="card-hover border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Activity className="h-5 w-5 animate-pulse" />
              Mantenimiento en Progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">{maintenanceTask}</span>
                <span className="text-sm font-medium text-blue-800">{Math.round(maintenanceProgress)}%</span>
              </div>
              <Progress value={maintenanceProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Tabs */}
      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Tareas de Mantenimiento</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnósticos</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        {/* Maintenance Tasks */}
        <TabsContent value="tasks">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Tareas de Mantenimiento
              </CardTitle>
              <CardDescription>
                Último mantenimiento: {lastMaintenance}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Button variant="outline" onClick={fetchDbStats}>
                    <Database className="w-4 h-4 mr-2" /> Ver uso de BD
                  </Button>
                  <Button variant="outline" onClick={cleanupExpiredSessions}>
                    <Trash2 className="w-4 h-4 mr-2" /> Limpiar sesiones expiradas
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="purgeDays" className="text-sm">Días</Label>
                    <Input
                      id="purgeDays"
                      type="number"
                      min={1}
                      max={3650}
                      value={purgeDays}
                      onChange={(e) => {
                        const v = parseInt(e.target.value || '0', 10)
                        const clamped = Math.max(1, Math.min(3650, isNaN(v) ? 1 : v))
                        setPurgeDays(clamped)
                      }}
                      className="w-24"
                    />
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPurgeDays(30)}>30</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setPurgeDays(60)}>60</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setPurgeDays(90)}>90</Button>
                    </div>
                  </div>
                  <Button variant="outline" onClick={purgeOldAuditLogs}>
                    <Trash2 className="w-4 h-4 mr-2" /> Purgar logs antiguos
                  </Button>
                </div>
                {dbStats && (
                  <div className="mt-4 p-4 rounded-lg border">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Tablas más pesadas</h4>
                        <div className="space-y-2">
                          {(dbStats.tables || []).slice(0, 6).map((t: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>{String(t.table || t.relname || '')}</span>
                              <span className="text-muted-foreground">{String(t.pretty || '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Conteos clave</h4>
                        <div className="space-y-2 text-sm">
                          {Object.entries(dbStats.counts || {}).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between">
                              <span>{k}</span>
                              <span className="text-muted-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {maintenanceTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-4">
                      {getCategoryIcon(task.category)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{task.name}</h4>
                          <Badge className={getStatusColor(task.status)}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1">
                              {task.status === 'completed' ? 'Completado' :
                               task.status === 'pending' ? 'Pendiente' :
                               task.status === 'warning' ? 'Atención' : 'Error'}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Duración: {task.duration}</span>
                          <span className={`font-medium ${getImpactColor(task.impact)}`}>
                            Impacto: {task.impact === 'high' ? 'Alto' : task.impact === 'medium' ? 'Medio' : 'Bajo'}
                          </span>
                          <span>Última ejecución: {task.lastRun}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runMaintenance([task.id])}
                      disabled={isRunningMaintenance}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Ejecutar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Diagnostics */}
        <TabsContent value="diagnostics">
          <div className="grid gap-6 md:grid-cols-2">
            {diagnostics.map((category, index) => (
              <Card key={index} className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scan className="h-5 w-5" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center justify-between">
                        <span className="text-sm">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getDiagnosticStatusColor(item.status)}`}>
                            {item.value}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            item.status === 'good' ? 'bg-green-500' :
                            item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Maintenance Settings */}
        <TabsContent value="settings">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración Automática
                </CardTitle>
                <CardDescription>
                  Configurar mantenimiento automático del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mantenimiento Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Ejecutar tareas de mantenimiento automáticamente
                    </p>
                  </div>
                  <Switch
                    checked={autoMaintenance}
                    onCheckedChange={setAutoMaintenance}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Horario de Ejecución</Label>
                  <p className="text-sm text-muted-foreground">
                    Diariamente a las 02:00 AM
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Notificaciones</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="notify-start" defaultChecked />
                      <Label htmlFor="notify-start" className="text-sm">
                        Notificar al iniciar mantenimiento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="notify-complete" defaultChecked />
                      <Label htmlFor="notify-complete" className="text-sm">
                        Notificar al completar mantenimiento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="notify-errors" defaultChecked />
                      <Label htmlFor="notify-errors" className="text-sm">
                        Notificar errores
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brush className="h-5 w-5" />
                  Herramientas de Limpieza
                </CardTitle>
                <CardDescription>
                  Herramientas adicionales de limpieza y optimización
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Brush className="w-4 h-4 mr-2" />
                  Limpiar Archivos Temporales
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Optimizar Base de Datos
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Archivar Logs Antiguos
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reiniciar Servicios
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  Análisis Completo del Sistema
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
