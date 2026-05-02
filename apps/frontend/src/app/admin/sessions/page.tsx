'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  Download,
  Eye,
  Filter,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from 'lucide-react'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { useCompanyAccess } from '@/hooks/use-company-access'
import { useDebounce } from '@/hooks/useDebounce'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'

interface UserSession {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  sessionToken: string
  ipAddress: string
  userAgent: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
  isActive: boolean
  isCurrent: boolean
  createdAt: string
  lastActivityAt: string
  expiresAt: string
  loginMethod: 'email' | 'google' | 'github' | 'sso'
  riskLevel: 'low' | 'medium' | 'high'
}

interface SessionPayload {
  items: UserSession[]
  total: number
  page: number
  limit: number
  pageCount: number
  summary: {
    active: number
    expired: number
    highRisk: number
    uniqueUsers: number
  }
}

interface OrganizationsPayload {
  organizations: Array<{ id: string; name: string }>
}

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  riskLevel: 'all',
  userRole: 'all',
  deviceType: 'all',
  dateFrom: '',
  dateTo: '',
  organizationId: 'all',
} as const

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SELLER', label: 'Vendedor' },
  { value: 'WAREHOUSE', label: 'Deposito' },
  { value: 'SUPER_ADMIN', label: 'Super admin' },
  { value: 'USER', label: 'Usuario' },
]

const DEVICE_OPTIONS = [
  { value: 'all', label: 'Todos los dispositivos' },
  { value: 'desktop', label: 'Escritorio' },
  { value: 'mobile', label: 'Movil' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'unknown', label: 'Desconocido' },
]

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function buildActionHeaders(organizationId: string) {
  let csrf = readCookie('csrf-token')
  if (!csrf && window.crypto?.randomUUID) {
    csrf = window.crypto.randomUUID()
    document.cookie = `csrf-token=${csrf}; path=/; SameSite=Lax`
  }

  const headers: Record<string, string> = {}
  if (csrf) headers['x-csrf-token'] = csrf
  if (organizationId !== 'all') headers['x-organization-id'] = organizationId
  return headers
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'include',
    ...init,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'No se pudo completar la operacion')
  }

  return payload as T
}

function formatRelativeDate(value?: string) {
  if (!value) return 'Sin actividad'
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: es })
  } catch {
    return 'Fecha invalida'
  }
}

function formatFullDate(value?: string) {
  if (!value) return 'Sin fecha'
  try {
    return new Intl.DateTimeFormat('es-PY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function StatCard({
  title,
  value,
  helper,
}: {
  title: string
  value: number | string
  helper: string
}) {
  return (
    <Card className="border-slate-200/80 bg-white/90 dark:border-slate-700/70 dark:bg-slate-900/85">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-600 dark:text-slate-200">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-slate-950 dark:text-slate-50">{value}</div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{helper}</p>
      </CardContent>
    </Card>
  )
}

export default function SessionsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const access = useCompanyAccess({
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
  })

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null)
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null)
  const [userTerminationTarget, setUserTerminationTarget] = useState<UserSession | null>(null)

  const debouncedSearch = useDebounce(filters.search.trim(), 300)
  const canSelectOrganization = Boolean(access.data?.context?.isSuperAdmin)

  const organizationsQuery = useQuery({
    queryKey: ['admin-session-organizations'],
    enabled: canSelectOrganization,
    staleTime: 60_000,
    queryFn: () => fetchJson<OrganizationsPayload>('/api/admin/organizations'),
  })

  const sessionsQuery = useQuery({
    queryKey: [
      'admin-sessions',
      page,
      debouncedSearch,
      filters.status,
      filters.riskLevel,
      filters.userRole,
      filters.deviceType,
      filters.dateFrom,
      filters.dateTo,
      filters.organizationId,
    ],
    enabled: Boolean(access.data?.allowed),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        search: debouncedSearch,
        status: filters.status,
        riskLevel: filters.riskLevel,
      })
      if (filters.userRole !== 'all') params.set('userRole', filters.userRole)
      if (filters.deviceType !== 'all') params.set('deviceType', filters.deviceType)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      if (canSelectOrganization && filters.organizationId !== 'all') {
        params.set('organizationId', filters.organizationId)
      }

      return fetchJson<SessionPayload>(`/api/admin/sessions?${params.toString()}`)
    },
  })

  const sessions = sessionsQuery.data?.items || []
  const total = sessionsQuery.data?.total || 0
  const pageCount = sessionsQuery.data?.pageCount || 1
  const summary = sessionsQuery.data?.summary || {
    active: 0,
    expired: 0,
    highRisk: 0,
    uniqueUsers: 0,
  }
  const organizations = organizationsQuery.data?.organizations || []
  const isRefreshing = sessionsQuery.isFetching && !sessionsQuery.isLoading

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

  const hasFiltersApplied = useMemo(() => (
    Boolean(
      debouncedSearch ||
      filters.status !== DEFAULT_FILTERS.status ||
      filters.riskLevel !== DEFAULT_FILTERS.riskLevel ||
      filters.userRole !== DEFAULT_FILTERS.userRole ||
      filters.deviceType !== DEFAULT_FILTERS.deviceType ||
      filters.dateFrom !== DEFAULT_FILTERS.dateFrom ||
      filters.dateTo !== DEFAULT_FILTERS.dateTo ||
      filters.organizationId !== DEFAULT_FILTERS.organizationId
    )
  ), [debouncedSearch, filters.dateFrom, filters.dateTo, filters.deviceType, filters.organizationId, filters.riskLevel, filters.status, filters.userRole])

  const rowsSummary = useMemo(() => {
    if (total === 0) return 'Sin sesiones visibles'
    const currentPage = sessionsQuery.data?.page || page
    const start = (currentPage - 1) * 10 + 1
    const end = Math.min(total, start + sessions.length - 1)
    return `Mostrando ${start}-${end} de ${total} sesiones`
  }, [page, sessions.length, sessionsQuery.data?.page, total])

  const invalidateSessions = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] })
  }

  const runSessionAction = async (key: string, path: string, successMessage: string) => {
    setPendingAction(key)
    try {
      await fetchJson(path, {
        method: 'POST',
        headers: buildActionHeaders(filters.organizationId),
      })
      toast({ title: 'Actualizado', description: successMessage })
      await invalidateSessions()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo completar la accion',
        variant: 'destructive',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const exportSessions = async (format: 'csv' | 'json') => {
    setExporting(format)
    try {
      const params = new URLSearchParams({
        format,
        search: debouncedSearch,
        status: filters.status,
        riskLevel: filters.riskLevel,
      })
      if (filters.userRole !== 'all') params.set('userRole', filters.userRole)
      if (filters.deviceType !== 'all') params.set('deviceType', filters.deviceType)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      if (canSelectOrganization && filters.organizationId !== 'all') {
        params.set('organizationId', filters.organizationId)
      }

      const response = await fetch(`/api/admin/sessions/export?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error((payload as { error?: string }).error || 'No se pudo exportar')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sessions-${Date.now()}.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo exportar',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  if (access.isLoading) {
    return <Skeleton className="h-[520px] rounded-3xl" />
  }

  if (!access.data?.allowed) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
        <CardContent className="flex gap-3 p-6">
          <Shield className="h-5 w-5 text-amber-700 dark:text-amber-200" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">Acceso restringido</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              Esta seccion requiere permisos administrativos y un plan compatible.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              <Shield className="h-3.5 w-3.5" />
              Seguridad y acceso
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-50">Gestion de sesiones</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Supervisa accesos, detecta riesgo operativo y corta sesiones dentro del alcance permitido por empresa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void sessionsQuery.refetch()} disabled={sessionsQuery.isLoading || isRefreshing}>
              {sessionsQuery.isLoading || isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualizar
            </Button>
            <Button variant="outline" onClick={() => void exportSessions('json')} disabled={exporting !== null}>
              {exporting === 'json' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              JSON
            </Button>
            <Button variant="outline" onClick={() => void exportSessions('csv')} disabled={exporting !== null}>
              {exporting === 'csv' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              CSV
            </Button>
            <Button variant="outline" onClick={() => void runSessionAction('cleanup', '/api/admin/sessions/cleanup', 'Las sesiones expiradas fueron limpiadas.')} disabled={pendingAction === 'cleanup'}>
              {pendingAction === 'cleanup' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Limpiar expiradas
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Sesiones activas" value={summary.active} helper={`${summary.uniqueUsers} usuarios con actividad visible`} />
        <StatCard title="Sesiones expiradas" value={summary.expired} helper="Dentro del filtro aplicado" />
        <StatCard title="Riesgo alto" value={summary.highRisk} helper="Requieren revision o cierre inmediato" />
      </div>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">Refina la vista por estado, riesgo y empresa.</CardDescription>
            </div>
            {hasFiltersApplied && <Button variant="ghost" size="sm" onClick={() => { setPage(1); setFilters({ ...DEFAULT_FILTERS }) }}>Limpiar filtros</Button>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {canSelectOrganization && (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={filters.organizationId} onValueChange={(value) => { setPage(1); setFilters((current) => ({ ...current, organizationId: value })) }}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {organizations.map((organization) => <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" placeholder="Usuario, email o IP" value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })) }} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={filters.status} onValueChange={(value) => { setPage(1); setFilters((current) => ({ ...current, status: value })) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Riesgo</Label>
            <Select value={filters.riskLevel} onValueChange={(value) => { setPage(1); setFilters((current) => ({ ...current, riskLevel: value })) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={filters.userRole} onValueChange={(value) => { setPage(1); setFilters((current) => ({ ...current, userRole: value })) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dispositivo</Label>
            <Select value={filters.deviceType} onValueChange={(value) => { setPage(1); setFilters((current) => ({ ...current, deviceType: value })) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEVICE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Desde</Label>
            <Input type="date" value={filters.dateFrom} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, dateFrom: event.target.value })) }} />
          </div>
          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input type="date" value={filters.dateTo} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, dateTo: event.target.value })) }} />
          </div>
        </CardContent>
      </Card>

      {organizationsQuery.error && canSelectOrganization && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <AlertTitle>No se pudieron cargar las organizaciones</AlertTitle>
          <AlertDescription>
            {organizationsQuery.error instanceof Error ? organizationsQuery.error.message : 'La lista de empresas no esta disponible ahora mismo.'}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-50">Sesiones de usuario</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">Vista operativa de accesos recientes y controles inmediatos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionsQuery.error && sessions.length === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No se pudieron cargar las sesiones</AlertTitle>
              <AlertDescription>{sessionsQuery.error instanceof Error ? sessionsQuery.error.message : 'Error desconocido'}</AlertDescription>
            </Alert>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/70">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Ultima actividad</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando sesiones...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500 dark:text-slate-300">No se encontraron sesiones con los filtros actuales.</TableCell>
                  </TableRow>
                ) : sessions.map((session) => {
                  const terminateSessionKey = `session:${session.id}`
                  const terminateUserKey = `user:${session.userId}`

                  return (
                    <TableRow key={session.id} className="dark:hover:bg-slate-800/30">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{session.userName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-300">{session.userEmail}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{session.userRole} - {session.ipAddress}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {session.isCurrent ? (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">Actual</Badge>
                        ) : session.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">Activa</Badge>
                        ) : (
                          <Badge variant="secondary">Expirada</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{session.browser}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{session.os} - {session.deviceType}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-200">{formatRelativeDate(session.lastActivityAt)}</TableCell>
                      <TableCell>
                        {session.riskLevel === 'high' ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200">Alto</Badge>
                        ) : session.riskLevel === 'medium' ? (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">Medio</Badge>
                        ) : (
                          <Badge variant="outline">Bajo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" aria-label={`Ver detalles de ${session.userName}`} onClick={() => setSelectedSession(session)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {session.isActive && !session.isCurrent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Cerrar la sesion de ${session.userName}`}
                              onClick={() => void runSessionAction(terminateSessionKey, `/api/admin/sessions/${session.id}/terminate`, 'La sesion fue terminada.')}
                              disabled={pendingAction === terminateSessionKey || pendingAction === terminateUserKey}
                            >
                              {pendingAction === terminateSessionKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Cerrar todas las sesiones de ${session.userName}`}
                            onClick={() => setUserTerminationTarget(session)}
                            disabled={pendingAction === terminateSessionKey || pendingAction === terminateUserKey}
                          >
                            {pendingAction === terminateUserKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-300">{rowsSummary}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || sessionsQuery.isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
              <span className="text-sm text-slate-600 dark:text-slate-200">Pagina {Math.min(page, pageCount)} de {pageCount}</span>
              <Button variant="outline" size="sm" disabled={page >= pageCount || sessionsQuery.isLoading} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Siguiente</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de la sesion</DialogTitle>
            <DialogDescription>Informacion operativa para revisar riesgo, actividad y dispositivo.</DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-slate-200/80 dark:border-slate-700/70">
                <CardHeader className="pb-2"><CardTitle className="text-base">Usuario</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><p className="text-slate-500 dark:text-slate-400">Nombre</p><p className="font-medium">{selectedSession.userName}</p></div>
                  <div><p className="text-slate-500 dark:text-slate-400">Email</p><p className="font-medium">{selectedSession.userEmail || 'Sin email'}</p></div>
                  <div><p className="text-slate-500 dark:text-slate-400">Rol</p><p className="font-medium">{selectedSession.userRole}</p></div>
                  <div><p className="text-slate-500 dark:text-slate-400">Metodo de acceso</p><p className="font-medium uppercase">{selectedSession.loginMethod}</p></div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-700/70">
                <CardHeader className="pb-2"><CardTitle className="text-base">Sesion</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><p className="text-slate-500 dark:text-slate-400">Estado</p><p className="font-medium">{selectedSession.isCurrent ? 'Sesion actual' : selectedSession.isActive ? 'Activa' : 'Expirada'}</p></div>
                  <div><p className="text-slate-500 dark:text-slate-400">IP</p><p className="font-mono text-xs">{selectedSession.ipAddress}</p></div>
                  <div><p className="text-slate-500 dark:text-slate-400">Creada</p><p className="font-medium">{formatFullDate(selectedSession.createdAt)}</p></div>
                  <div><p className="text-slate-500 dark:text-slate-400">Ultima actividad</p><p className="font-medium">{formatFullDate(selectedSession.lastActivityAt)}</p></div>
                  <div><p className="text-slate-500 dark:text-slate-400">Expira</p><p className="font-medium">{formatFullDate(selectedSession.expiresAt)}</p></div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-700/70 md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-base">Dispositivo</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div><p className="text-sm text-slate-500 dark:text-slate-400">Navegador</p><p className="font-medium">{selectedSession.browser}</p></div>
                  <div><p className="text-sm text-slate-500 dark:text-slate-400">Sistema operativo</p><p className="font-medium">{selectedSession.os}</p></div>
                  <div><p className="text-sm text-slate-500 dark:text-slate-400">Tipo</p><p className="font-medium capitalize">{selectedSession.deviceType}</p></div>
                  <div className="md:col-span-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">User agent</p>
                    <p className="mt-1 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{selectedSession.userAgent || 'Sin user agent'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(userTerminationTarget)} onOpenChange={(open) => !open && setUserTerminationTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar sesiones del usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerraran todas las sesiones activas de {userTerminationTarget?.userName || 'este usuario'} dentro del alcance visible de esta empresa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (!userTerminationTarget) return
                const key = `user:${userTerminationTarget.userId}`
                void runSessionAction(
                  key,
                  `/api/admin/sessions/user/${userTerminationTarget.userId}/terminate`,
                  'Se cerraron las sesiones del usuario.'
                ).finally(() => setUserTerminationTarget(null))
              }}
              disabled={pendingAction !== null}
            >
              {pendingAction === `user:${userTerminationTarget?.userId || ''}` ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Cerrar sesiones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
