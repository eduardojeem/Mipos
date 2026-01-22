import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Clock, 
  User,
  RefreshCw,
  Filter,
  Bell,
  BellOff
} from 'lucide-react'
import { useSyncNotifications } from '@/lib/sync-notifications'

const supabase = createClient()

interface SyncAlert {
  id: string
  alert_type: 'SYSTEM_OFFLINE' | 'HIGH_LATENCY' | 'SYNC_ERRORS' | 'PENDING_BACKLOG' | 'CONFLICT_RESOLUTION' | 'BATTERY_LOW' | 'STORAGE_FULL'
  branch_id?: string
  pos_id?: string
  system_type?: string
  entity_type?: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  details: any
  created_at: string
  is_resolved: boolean
  resolved_at?: string
  resolved_by?: string
  acknowledged_by?: string
  acknowledged_at?: string
  age_minutes: number
}

export default function SyncAlertsManager() {
  const [alerts, setAlerts] = useState<SyncAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info' | 'resolved'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  const { resolveAlert, runHealthChecks } = useSyncNotifications()

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .rpc('get_active_alerts')

      if (error) throw error

      setAlerts(data || [])
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setError('Error al cargar las alertas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchAlerts, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleResolveAlert = async (alertId: string) => {
    try {
      const success = await resolveAlert(alertId, 'admin-user') // Replace with actual user
      if (success) {
        fetchAlerts() // Refresh the list
      }
    } catch (err) {
      console.error('Error resolving alert:', err)
    }
  }

  const handleRunHealthChecks = async () => {
    try {
      setLoading(true)
      const result = await runHealthChecks()
      if (result) {
        // Show success message
        alert(`Health checks completed: ${result.total_alerts} alerts generated`)
      }
    } catch (err) {
      console.error('Error running health checks:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAlertIcon = (alertType: string, severity: string) => {
    const iconClass = severity === 'CRITICAL' ? 'text-red-500' : 
                     severity === 'WARNING' ? 'text-yellow-500' : 'text-blue-500'
    
    switch (alertType) {
      case 'SYSTEM_OFFLINE':
        return <div className={`h-5 w-5 ${iconClass}`}>🔴</div>
      case 'HIGH_LATENCY':
        return <div className={`h-5 w-5 ${iconClass}`}>⚡</div>
      case 'SYNC_ERRORS':
        return <div className={`h-5 w-5 ${iconClass}`}>❌</div>
      case 'PENDING_BACKLOG':
        return <div className={`h-5 w-5 ${iconClass}`}>📊</div>
      case 'CONFLICT_RESOLUTION':
        return <div className={`h-5 w-5 ${iconClass}`}>⚔️</div>
      case 'BATTERY_LOW':
        return <div className={`h-5 w-5 ${iconClass}`}>🔋</div>
      case 'STORAGE_FULL':
        return <div className={`h-5 w-5 ${iconClass}`}>💾</div>
      default:
        return <AlertTriangle className={`h-5 w-5 ${iconClass}`} />
    }
  }

  const getAlertTypeLabel = (alertType: string) => {
    const labels = {
      'SYSTEM_OFFLINE': 'Sistema Offline',
      'HIGH_LATENCY': 'Alta Latencia',
      'SYNC_ERRORS': 'Errores de Sync',
      'PENDING_BACKLOG': 'Backlog Pendientes',
      'CONFLICT_RESOLUTION': 'Resolución de Conflictos',
      'BATTERY_LOW': 'Batería Baja',
      'STORAGE_FULL': 'Almacenamiento Lleno'
    }
    return labels[alertType as keyof typeof labels] || alertType
  }

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'critical':
        return alert.severity === 'CRITICAL' && !alert.is_resolved
      case 'warning':
        return alert.severity === 'WARNING' && !alert.is_resolved
      case 'info':
        return alert.severity === 'INFO' && !alert.is_resolved
      case 'resolved':
        return alert.is_resolved
      case 'all':
      default:
        return !alert.is_resolved
    }
  })

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.is_resolved).length
  const warningCount = alerts.filter(a => a.severity === 'WARNING' && !a.is_resolved).length
  const infoCount = alerts.filter(a => a.severity === 'INFO' && !a.is_resolved).length

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Alertas</h1>
          <p className="text-gray-600">Monitoreo y gestión de alertas del sistema de sincronización</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleRunHealthChecks}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Ejecutar Health Checks</span>
          </Button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-md ${autoRefresh ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            {autoRefresh ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Críticas</p>
                <p className="text-2xl font-bold text-red-900">{criticalCount}</p>
              </div>
              <div className="text-2xl">🚨</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Advertencias</p>
                <p className="text-2xl font-bold text-yellow-900">{warningCount}</p>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Informativas</p>
                <p className="text-2xl font-bold text-blue-900">{infoCount}</p>
              </div>
              <div className="text-2xl">ℹ️</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Activa</p>
                <p className="text-2xl font-bold text-green-900">{alerts.filter(a => !a.is_resolved).length}</p>
              </div>
              <div className="text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <Filter className="h-5 w-5 text-gray-500" />
        <div className="flex space-x-2">
          {['all', 'critical', 'warning', 'info', 'resolved'].map((filterType) => (
            <Button
              key={filterType}
              onClick={() => setFilter(filterType as any)}
              variant={filter === filterType ? 'default' : 'outline'}
              size="sm"
            >
              {filterType === 'all' ? 'Todas' :
               filterType === 'critical' ? 'Críticas' :
               filterType === 'warning' ? 'Advertencias' :
               filterType === 'info' ? 'Informativas' :
               'Resueltas'}
            </Button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas {filter === 'all' ? 'Activas' : filter === 'resolved' ? 'Resueltas' : filter === 'critical' ? 'Críticas' : filter === 'warning' ? 'de Advertencia' : 'Informativas'}</CardTitle>
          <CardDescription>
            {filteredAlerts.length} alerta{filteredAlerts.length !== 1 ? 's' : ''} encontrada{filteredAlerts.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 border rounded-lg ${alert.is_resolved ? 'bg-gray-50 border-gray-200' : getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {getAlertIcon(alert.alert_type, alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">
                          {getAlertTypeLabel(alert.alert_type)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Hace {alert.age_minutes} minutos
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{alert.title}</h4>
                      <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                      
                      {alert.details && Object.keys(alert.details).length > 0 && (
                        <div className="bg-white bg-opacity-50 rounded p-2 text-xs">
                          <details>
                            <summary className="cursor-pointer text-gray-600">Detalles técnicos</summary>
                            <pre className="mt-2 text-xs overflow-auto max-h-32">
                              {JSON.stringify(alert.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {alert.branch_id && <span>Sucursal: {alert.branch_id}</span>}
                        {alert.pos_id && <span>POS: {alert.pos_id}</span>}
                        {alert.system_type && <span>Sistema: {alert.system_type}</span>}
                        {alert.entity_type && <span>Módulo: {alert.entity_type}</span>}
                      </div>

                      {alert.is_resolved && (
                        <div className="mt-2 text-xs text-green-600 flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3" />
                          <span>
                            Resuelta por {alert.resolved_by || 'sistema'} el {new Date(alert.resolved_at!).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!alert.is_resolved && (
                    <Button
                      onClick={() => handleResolveAlert(alert.id)}
                      size="sm"
                      variant="outline"
                      className="ml-4"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolver
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredAlerts.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-gray-500">
                  {filter === 'all' ? 'No hay alertas activas' : 
                   filter === 'resolved' ? 'No hay alertas resueltas' :
                   `No hay alertas ${filter === 'critical' ? 'críticas' : 
                                    filter === 'warning' ? 'de advertencia' : 'informativas'}`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}