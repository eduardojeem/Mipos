'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, HardDrive, Users, Package, ShoppingCart, 
  TrendingUp, AlertTriangle, CheckCircle, Crown,
  Building2, Zap, Shield, Activity, RefreshCw,
  Trash2, Settings, BarChart3
} from 'lucide-react'

interface PlanInfo {
  name: string
  slug: string
  limits: {
    maxUsers: number
    maxProducts: number
    maxStorage: number
    maxTransactions: number
  }
  features: string[]
}

interface OrganizationStats {
  users: number
  products: number
  sales: number
  customers: number
  storage: number
  auditLogs: number
}

interface DatabaseStats {
  tables: Array<{ table: string; size: string; rows: number }>
  totalSize: string
  connections: number
}

export function MaintenanceDashboard() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [orgStats, setOrgStats] = useState<OrganizationStats | null>(null)
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null)
  const [organizationName, setOrganizationName] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPlanInfo(),
        loadOrganizationStats(),
        loadDatabaseStats()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPlanInfo = async () => {
    try {
      const response = await fetch('/api/auth/profile')
      const data = await response.json()
      if (data.success && data.data) {
        const orgId = data.data.organization_id
        if (orgId) {
          const orgResponse = await fetch(`/api/organizations/${orgId}`)
          const orgData = await orgResponse.json()
          if (orgData.success && orgData.organization) {
            setPlanInfo(orgData.organization.plan)
            setOrganizationName(orgData.organization.name)
          }
        }
      }
    } catch (error) {
      console.error('Error loading plan info:', error)
    }
  }

  const loadOrganizationStats = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/org-stats')
      const data = await response.json()
      if (data.success) {
        setOrgStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading organization stats:', error)
    }
  }

  const loadDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/db-stats')
      const data = await response.json()
      if (data.success) {
        setDbStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading database stats:', error)
    }
  }

  const cleanupExpiredSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions/cleanup', { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Éxito', description: `${data.deleted || 0} sesiones eliminadas` })
        await loadOrganizationStats()
      } else {
        toast({ title: 'Error', description: data.error || 'Error al limpiar sesiones', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al limpiar sesiones', variant: 'destructive' })
    }
  }

  const purgeOldAuditLogs = async (days: number) => {
    try {
      const response = await fetch('/api/admin/maintenance/purge-audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Éxito', description: `${data.deleted || 0} logs eliminados` })
        await loadOrganizationStats()
      } else {
        toast({ title: 'Error', description: data.error || 'Error al purgar logs', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al purgar logs', variant: 'destructive' })
    }
  }

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0 // Unlimited
    return Math.min(100, (current / max) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getPlanBadgeColor = (slug: string) => {
    switch (slug) {
      case 'free': return 'bg-gray-100 text-gray-800'
      case 'starter': return 'bg-blue-100 text-blue-800'
      case 'pro': return 'bg-purple-100 text-purple-800'
      case 'enterprise': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
            Mantenimiento y Uso
          </h1>
          <p className="text-muted-foreground mt-1">
            {organizationName && `${organizationName} · `}
            Monitoreo de recursos y herramientas de mantenimiento
          </p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {/* Plan Info Card */}
      {planInfo && (
        <Card className="glass-dark-card border-slate-700/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg shadow-purple-500/25">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Plan Actual</CardTitle>
                  <CardDescription>Información de tu suscripción</CardDescription>
                </div>
              </div>
              <Badge className={getPlanBadgeColor(planInfo.slug)}>
                {planInfo.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-muted-foreground">Usuarios</span>
                </div>
                <div className="text-2xl font-bold">
                  {planInfo.limits.maxUsers === -1 ? '∞' : planInfo.limits.maxUsers}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-muted-foreground">Productos</span>
                </div>
                <div className="text-2xl font-bold">
                  {planInfo.limits.maxProducts === -1 ? '∞' : planInfo.limits.maxProducts}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-muted-foreground">Almacenamiento</span>
                </div>
                <div className="text-2xl font-bold">
                  {planInfo.limits.maxStorage === -1 ? '∞' : `${planInfo.limits.maxStorage} GB`}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-muted-foreground">Transacciones/mes</span>
                </div>
                <div className="text-2xl font-bold">
                  {planInfo.limits.maxTransactions === -1 ? '∞' : planInfo.limits.maxTransactions}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Stats */}
      {orgStats && planInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Users Usage */}
          <Card className="glass-dark-card border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <CardTitle className="text-sm">Usuarios</CardTitle>
                </div>
                <Badge variant="outline" className={getUsageColor(getUsagePercentage(orgStats.users, planInfo.limits.maxUsers))}>
                  {orgStats.users} / {planInfo.limits.maxUsers === -1 ? '∞' : planInfo.limits.maxUsers}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress 
                value={getUsagePercentage(orgStats.users, planInfo.limits.maxUsers)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {planInfo.limits.maxUsers === -1 ? 'Usuarios ilimitados' : 
                  `${planInfo.limits.maxUsers - orgStats.users} usuarios disponibles`}
              </p>
            </CardContent>
          </Card>

          {/* Products Usage */}
          <Card className="glass-dark-card border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-green-400" />
                  <CardTitle className="text-sm">Productos</CardTitle>
                </div>
                <Badge variant="outline" className={getUsageColor(getUsagePercentage(orgStats.products, planInfo.limits.maxProducts))}>
                  {orgStats.products} / {planInfo.limits.maxProducts === -1 ? '∞' : planInfo.limits.maxProducts}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress 
                value={getUsagePercentage(orgStats.products, planInfo.limits.maxProducts)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {planInfo.limits.maxProducts === -1 ? 'Productos ilimitados' : 
                  `${planInfo.limits.maxProducts - orgStats.products} productos disponibles`}
              </p>
            </CardContent>
          </Card>

          {/* Storage Usage */}
          <Card className="glass-dark-card border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  <CardTitle className="text-sm">Almacenamiento</CardTitle>
                </div>
                <Badge variant="outline" className={getUsageColor(getUsagePercentage(orgStats.storage, planInfo.limits.maxStorage * 1024))}>
                  {(orgStats.storage / 1024).toFixed(2)} GB
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress 
                value={getUsagePercentage(orgStats.storage, planInfo.limits.maxStorage * 1024)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {planInfo.limits.maxStorage === -1 ? 'Almacenamiento ilimitado' : 
                  `${(planInfo.limits.maxStorage - (orgStats.storage / 1024)).toFixed(2)} GB disponibles`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="database">Base de Datos</TabsTrigger>
          <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {orgStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-dark-card border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-blue-400" />
                    Ventas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orgStats.sales.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total de transacciones</p>
                </CardContent>
              </Card>

              <Card className="glass-dark-card border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-400" />
                    Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orgStats.customers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Clientes registrados</p>
                </CardContent>
              </Card>

              <Card className="glass-dark-card border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Logs de Auditoría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orgStats.auditLogs.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Registros de actividad</p>
                </CardContent>
              </Card>

              <Card className="glass-dark-card border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-yellow-400" />
                    Base de Datos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dbStats?.totalSize || '0 MB'}</div>
                  <p className="text-xs text-muted-foreground">Tamaño total</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Health Status */}
          <Card className="glass-dark-card border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Base de Datos</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Operacional</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Almacenamiento</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Disponible</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Conexiones</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">{dbStats?.connections || 0} activas</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          {dbStats && (
            <Card className="glass-dark-card border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Tablas de la Base de Datos
                </CardTitle>
                <CardDescription>
                  Información detallada de las tablas de tu organización
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dbStats.tables.map((table, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="font-medium">{table.table}</div>
                          <div className="text-xs text-muted-foreground">{table.rows.toLocaleString()} registros</div>
                        </div>
                      </div>
                      <Badge variant="outline">{table.size}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card className="glass-dark-card border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Herramientas de Mantenimiento
              </CardTitle>
              <CardDescription>
                Limpieza y optimización de datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clean Expired Sessions */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Trash2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">Limpiar Sesiones Expiradas</div>
                    <div className="text-sm text-muted-foreground">
                      Eliminar sesiones de caja cerradas hace más de 30 días
                    </div>
                  </div>
                </div>
                <Button onClick={cleanupExpiredSessions} variant="outline" size="sm">
                  Ejecutar
                </Button>
              </div>

              {/* Purge Old Audit Logs */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Activity className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">Purgar Logs de Auditoría</div>
                    <div className="text-sm text-muted-foreground">
                      Eliminar logs antiguos (30, 60 o 90 días)
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => purgeOldAuditLogs(30)} variant="outline" size="sm">
                    30 días
                  </Button>
                  <Button onClick={() => purgeOldAuditLogs(60)} variant="outline" size="sm">
                    60 días
                  </Button>
                  <Button onClick={() => purgeOldAuditLogs(90)} variant="outline" size="sm">
                    90 días
                  </Button>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-yellow-600 dark:text-yellow-400">
                    Precaución
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Las operaciones de mantenimiento son irreversibles. Asegúrate de tener respaldos antes de ejecutar limpieza de datos.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
