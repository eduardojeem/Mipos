'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Calendar, Download, Filter, RefreshCw, Search, Shield } from 'lucide-react'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { useCompanyAccess } from '@/hooks/use-company-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface AuditLogEntry {
  id: string
  action: string
  resource: string
  userEmail: string
  userRole: string
  ipAddress: string
  details?: Record<string, unknown>
  createdAt: string
}

interface AuditStats {
  total: number
  byAction: { action: string; count: number }[]
  byResource: { resource: string; count: number }[]
  recentActivity: Array<{ action: string; entityType: string; userEmail: string; timestamp: string }>
}

export function AuditDashboard({ className }: { className?: string }) {
  const access = useCompanyAccess({
    permission: COMPANY_PERMISSIONS.VIEW_REPORTS,
    feature: COMPANY_FEATURE_KEYS.AUDIT_LOGS,
  })
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    action: 'all',
    startDate: '',
    endDate: '',
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [filters.search])

  const loadAudit = useCallback(async () => {
    if (!access.data?.allowed) return
    setLoading(true)

    try {
      const params = new URLSearchParams({ page: '1', limit: '20' })
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (filters.action !== 'all') params.set('actionEq', filters.action)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const [logsResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/audit?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/admin/audit/stats?${params.toString()}`, { cache: 'no-store' }),
      ])

      const logsPayload = await logsResponse.json()
      const statsPayload = await statsResponse.json()

      if (!logsResponse.ok) throw new Error(logsPayload?.error || 'No se pudo cargar auditoria')
      if (!statsResponse.ok) throw new Error(statsPayload?.error || 'No se pudo cargar metricas')

      setLogs((logsPayload.data || []).map((row: any) => ({
        id: String(row.id),
        action: String(row.action || ''),
        resource: String(row.resource || row.entity_type || ''),
        userEmail: String(row.user_email || row.details?.userEmail || ''),
        userRole: String(row.user_role || row.details?.userRole || ''),
        ipAddress: String(row.ip_address || row.details?.ipAddress || ''),
        details: row.details || {},
        createdAt: String(row.created_at || row.timestamp || new Date().toISOString()),
      })))
      setStats({
        total: Number(statsPayload.total) || 0,
        byAction: Array.isArray(statsPayload.byAction) ? statsPayload.byAction : [],
        byResource: Array.isArray(statsPayload.byResource) ? statsPayload.byResource : [],
        recentActivity: Array.isArray(statsPayload.recentActivity) ? statsPayload.recentActivity : [],
      })
    } catch {
      setLogs([])
      setStats({ total: 0, byAction: [], byResource: [], recentActivity: [] })
    } finally {
      setLoading(false)
    }
  }, [access.data?.allowed, debouncedSearch, filters.action, filters.endDate, filters.startDate])

  useEffect(() => { loadAudit() }, [loadAudit])

  const topActions = useMemo(() => (stats?.byAction || []).slice(0, 4), [stats?.byAction])
  const topResources = useMemo(() => (stats?.byResource || []).slice(0, 4), [stats?.byResource])

  const exportCsv = useCallback(async () => {
    const params = new URLSearchParams({ format: 'csv', limit: '200' })
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (filters.action !== 'all') params.set('actionEq', filters.action)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)

    const response = await fetch(`/api/admin/audit?${params.toString()}`, { cache: 'no-store' })
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [debouncedSearch, filters.action, filters.endDate, filters.startDate])

  if (access.isLoading) {
    return <Skeleton className="h-[560px] rounded-3xl" />
  }

  if (!access.data?.allowed) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
        <CardContent className="flex gap-3 p-6">
          <Shield className="h-5 w-5 text-amber-700 dark:text-amber-200" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">Acceso restringido</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Esta seccion requiere permisos de reportes y la feature de auditoria.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <section className="rounded-[28px] border border-border bg-background/90 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
              <Shield className="h-3.5 w-3.5" />
              Trazabilidad administrativa
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Auditoria</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Resumen claro de actividad, recursos afectados y eventos recientes por empresa.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadAudit()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats?.total || 0}</div>
            <p className="mt-2 text-xs text-muted-foreground">Total de registros</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acciones top</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topActions.length ? topActions.map((item) => (
                <div key={item.action} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.action}</span>
                  <span className="font-semibold text-foreground">{item.count}</span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recursos top</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topResources.length ? topResources.map((item) => (
                <div key={item.resource} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.resource}</span>
                  <span className="font-semibold text-foreground">{item.count}</span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
          <CardDescription className="text-muted-foreground">Filtra por accion, texto libre y rango de fechas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input className="pl-10" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Accion, recurso o usuario" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Accion</Label>
            <Select value={filters.action} onValueChange={(value) => setFilters((current) => ({ ...current, action: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Desde</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input className="pl-10" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hasta</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input className="pl-10" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Eventos recientes</CardTitle>
          <CardDescription className="text-muted-foreground">Últimos registros relevantes dentro del alcance accesible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando auditoria...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground justify-center">
              <AlertTriangle className="h-4 w-4" />
              No hay registros para los filtros actuales.
            </div>
          ) : logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-border/50 p-4 hover:bg-muted/30 transition-colors">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-semibold">{log.action}</Badge>
                    <Badge variant="secondary" className="font-normal">{log.resource}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                  </div>
                  <div className="grid gap-1 text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{log.userEmail || 'Sin usuario'} {log.userRole ? `· ${log.userRole}` : ''}</span>
                    <span className="font-mono text-xs opacity-70">{log.ipAddress || 'Sin IP'}</span>
                  </div>
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <details className="max-w-xl rounded-xl bg-muted/20 p-3 text-xs text-muted-foreground border border-border/20">
                    <summary className="cursor-pointer font-medium hover:text-foreground">Ver detalles</summary>
                    <pre className="mt-2 whitespace-pre-wrap font-mono">{JSON.stringify(log.details, null, 2)}</pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
