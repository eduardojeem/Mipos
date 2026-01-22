import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Settings,
  BarChart3,
  Filter,
  Download
} from 'lucide-react'

const supabase = createClient()

interface SyncEvent {
  id: string
  entity_type: string
  entity_id: string
  operation: string
  source_system: string
  target_system: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'CONFLICT'
  error_code?: string
  error_message?: string
  branch_id?: string
  pos_id?: string
  created_at: string
  latency_ms?: number
  retry_count: number
  max_retries?: number
}

interface Heartbeat {
  branch_id: string
  pos_id?: string
  system_type: string
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE'
  last_ping_at: string
  last_sync_at?: string
  pending_count: number
  error_count: number
  latency_ms?: number
  last_ping_minutes_ago: number
}

interface ModuleStatus {
  [key: string]: {
    total_operations: number
    successful: number
    failed: number
    pending: number
    conflicts: number
    avg_latency_ms: number
    last_activity: string
  }
}

interface DashboardData {
  recent_errors: SyncEvent[]
  module_status: ModuleStatus
  heartbeats: Heartbeat[]
  pending_syncs: SyncEvent[]
  system_health: any[]
  metrics_summary: {
    total_operations: number
    successful_operations: number
    failed_operations: number
    pending_operations: number
    avg_latency_ms: number
    max_latency_ms: number
    conflict_resolutions: number
  }
  alert_summary: {
    offline_systems: number
    degraded_systems: number
    high_latency_systems: number
    systems_with_errors: number
    old_pending_syncs: number
  }
}

export default function SyncMonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [hoursBack, setHoursBack] = useState(24)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .rpc('dashboard_sync_summary', {
          p_branch_id: selectedBranch || null,
          p_hours_back: hoursBack
        })

      if (error) throw error

      setDashboardData(data)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Error al cargar los datos del dashboard')
    } finally {
      setLoading(false)
    }
  }, [selectedBranch, hoursBack])

  useEffect(() => {
    fetchDashboardData()
  }, [selectedBranch, hoursBack, fetchDashboardData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, selectedBranch, hoursBack, fetchDashboardData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
      case 'SUCCESS':
        return 'bg-green-100 text-green-800'
      case 'OFFLINE':
      case 'ERROR':
        return 'bg-red-100 text-red-800'
      case 'DEGRADED':
      case 'CONFLICT':
        return 'bg-yellow-100 text-yellow-800'
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'TIMEOUT':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE':
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4" />
      case 'OFFLINE':
      case 'ERROR':
        return <WifiOff className="h-4 w-4" />
      case 'DEGRADED':
      case 'CONFLICT':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sincronización Omnicanal</h1>
          <p className="text-gray-600">Monitoreo de estado y salud del sistema</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={hoursBack}
            onChange={(e) => setHoursBack(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Última hora</option>
            <option value={6}>Últimas 6 horas</option>
            <option value={24}>Últimas 24 horas</option>
            <option value={72}>Últimas 72 horas</option>
          </select>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      {dashboardData?.alert_summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Sistemas Offline</p>
                  <p className="text-2xl font-bold text-red-900">{dashboardData.alert_summary.offline_systems}</p>
                </div>
                <WifiOff className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Sistemas Degradados</p>
                  <p className="text-2xl font-bold text-yellow-900">{dashboardData.alert_summary.degraded_systems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Alta Latencia</p>
                  <p className="text-2xl font-bold text-orange-900">{dashboardData.alert_summary.high_latency_systems}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Con Errores</p>
                  <p className="text-2xl font-bold text-purple-900">{dashboardData.alert_summary.systems_with_errors}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Pendientes Antiguos</p>
                  <p className="text-2xl font-bold text-blue-900">{dashboardData.alert_summary.old_pending_syncs}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Estado de Sistemas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.heartbeats?.map((heartbeat, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getStatusColor(heartbeat.status)}`}>
                      {getStatusIcon(heartbeat.status)}
                    </div>
                    <div>
                      <p className="font-medium">{heartbeat.branch_id} - {heartbeat.system_type}</p>
                      {heartbeat.pos_id && <p className="text-sm text-gray-600">POS: {heartbeat.pos_id}</p>}
                      <p className="text-xs text-gray-500">
                        Último ping: {heartbeat.last_ping_minutes_ago} minutos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(heartbeat.status)}>
                      {heartbeat.status}
                    </Badge>
                    {heartbeat.latency_ms && (
                      <p className="text-xs text-gray-500 mt-1">
                        {heartbeat.latency_ms}ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Module Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Estado por Módulo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.module_status && Object.entries(dashboardData.module_status).map(([module, stats]) => (
                <div key={module} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">{module.replace('_', ' ')}</h4>
                    <Badge className="bg-blue-100 text-blue-800">
                      {stats.total_operations} ops
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-green-600 font-medium">{stats.successful}</p>
                      <p className="text-xs text-gray-500">Éxito</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-600 font-medium">{stats.failed}</p>
                      <p className="text-xs text-gray-500">Fallos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-600 font-medium">{stats.pending}</p>
                      <p className="text-xs text-gray-500">Pendientes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-600 font-medium">{stats.conflicts}</p>
                      <p className="text-xs text-gray-500">Conflictos</p>
                    </div>
                  </div>
                  {stats.avg_latency_ms > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Latencia promedio: {stats.avg_latency_ms}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Errores Recientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData?.recent_errors?.map((error) => (
              <div key={error.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className="bg-red-100 text-red-800">{error.status}</Badge>
                      <span className="text-sm text-gray-600">
                        {error.source_system} → {error.target_system}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">
                      {error.entity_type} - {error.operation}
                    </p>
                    {error.error_code && (
                      <p className="text-sm text-red-600 font-mono">{error.error_code}</p>
                    )}
                    {error.error_message && (
                      <p className="text-sm text-gray-700 mt-1">{error.error_message}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>{new Date(error.created_at).toLocaleString()}</span>
                      {error.branch_id && <span>Sucursal: {error.branch_id}</span>}
                      {error.pos_id && <span>POS: {error.pos_id}</span>}
                      {error.retry_count > 0 && <span>Reintentos: {error.retry_count}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {dashboardData?.recent_errors?.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay errores recientes</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Syncs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span>Sincronizaciones Pendientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData?.pending_syncs?.map((sync) => (
              <div key={sync.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-800">{sync.status}</Badge>
                      <span className="text-sm text-gray-600">
                        {sync.source_system} → {sync.target_system}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">
                      {sync.entity_type} - {sync.operation}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>{new Date(sync.created_at).toLocaleString()}</span>
                      {sync.branch_id && <span>Sucursal: {sync.branch_id}</span>}
                      {sync.pos_id && <span>POS: {sync.pos_id}</span>}
                      <span>Reintentos: {sync.retry_count}/{sync.max_retries}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {dashboardData?.pending_syncs?.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay sincronizaciones pendientes</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
