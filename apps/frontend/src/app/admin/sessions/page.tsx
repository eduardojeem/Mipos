'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Eye, Filter, LogOut, RefreshCw, Search, Shield } from 'lucide-react'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { useCompanyAccess } from '@/hooks/use-company-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

interface UserSession {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  ipAddress: string
  browser: string
  os: string
  isActive: boolean
  isCurrent: boolean
  lastActivityAt: string
  riskLevel: 'low' | 'medium' | 'high'
}

interface SessionPayload {
  items: UserSession[]
  total: number
  pageCount: number
}

function ensureCsrfToken() {
  const token = crypto.randomUUID()
  document.cookie = `csrf-token=${token}; path=/; SameSite=Lax`
  return token
}

function buildHeaders(csrfToken?: string, organizationId?: string) {
  const headers: Record<string, string> = {}
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  if (organizationId && organizationId !== 'all') headers['x-organization-id'] = organizationId
  return headers
}

export default function SessionsPage() {
  const { toast } = useToast()
  const access = useCompanyAccess({
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
  })

  const [sessions, setSessions] = useState<UserSession[]>([])
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    riskLevel: 'all',
    organizationId: 'all',
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const canSelectOrganization = Boolean(access.data?.context?.isSuperAdmin)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [filters.search])

  const loadOrganizations = useCallback(async () => {
    if (!canSelectOrganization) return
    const response = await fetch('/api/admin/organizations', { cache: 'no-store' }).catch(() => null)
    if (!response?.ok) return
    const payload = await response.json()
    setOrganizations(payload.organizations || [])
  }, [canSelectOrganization])

  const loadSessions = useCallback(async () => {
    if (!access.data?.allowed) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        search: debouncedSearch,
        status: filters.status,
        riskLevel: filters.riskLevel,
      })
      if (canSelectOrganization && filters.organizationId !== 'all') {
        params.set('organizationId', filters.organizationId)
      }

      const response = await fetch(`/api/admin/sessions?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json()) as SessionPayload & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las sesiones')

      setSessions(payload.items || [])
      setTotal(payload.total || 0)
      setPageCount(payload.pageCount || 1)
    } catch (error: any) {
      setSessions([])
      setTotal(0)
      setPageCount(1)
      toast({ title: 'Error', description: error?.message || 'No se pudieron cargar las sesiones', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [access.data?.allowed, canSelectOrganization, debouncedSearch, filters.organizationId, filters.riskLevel, filters.status, page, toast])

  useEffect(() => { loadOrganizations() }, [loadOrganizations])
  useEffect(() => { loadSessions() }, [loadSessions])

  const visibleStats = useMemo(() => ({
    active: sessions.filter((session) => session.isActive).length,
    risk: sessions.filter((session) => session.riskLevel === 'high').length,
    current: sessions.filter((session) => session.isCurrent).length,
  }), [sessions])

  const runSessionAction = useCallback(async (path: string, successMessage: string) => {
    try {
      const csrf = ensureCsrfToken()
      const response = await fetch(path, {
        method: 'POST',
        headers: buildHeaders(csrf, filters.organizationId),
      })
      if (!response.ok) throw new Error('No se pudo completar la accion')
      toast({ title: 'Actualizado', description: successMessage })
      await loadSessions()
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo completar la accion', variant: 'destructive' })
    }
  }, [filters.organizationId, loadSessions, toast])

  const exportSessions = useCallback(async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({ format })
      if (canSelectOrganization && filters.organizationId !== 'all') params.set('organizationId', filters.organizationId)
      const response = await fetch(`/api/admin/sessions/export?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('No se pudo exportar')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sessions-${Date.now()}.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo exportar', variant: 'destructive' })
    }
  }, [canSelectOrganization, filters.organizationId, toast])

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
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Esta seccion requiere permisos administrativos y un plan compatible.</p>
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
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Supervisa accesos, detecta riesgo y corta sesiones dentro del alcance permitido por empresa.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => loadSessions()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button>
            <Button variant="outline" onClick={() => exportSessions('json')}><Download className="mr-2 h-4 w-4" />JSON</Button>
            <Button variant="outline" onClick={() => exportSessions('csv')}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => runSessionAction('/api/admin/sessions/cleanup', 'Las sesiones expiradas fueron limpiadas.')}>Limpiar expiradas</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-700/70 dark:bg-slate-900/85"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600 dark:text-slate-200">Sesiones activas</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold text-slate-950 dark:text-slate-50">{visibleStats.active}</div><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Sobre {total} visibles</p></CardContent></Card>
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-700/70 dark:bg-slate-900/85"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600 dark:text-slate-200">Sesiones actuales</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold text-slate-950 dark:text-slate-50">{visibleStats.current}</div><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">En esta pagina</p></CardContent></Card>
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-700/70 dark:bg-slate-900/85"><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600 dark:text-slate-200">Riesgo alto</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold text-slate-950 dark:text-slate-50">{visibleStats.risk}</div><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Requieren revision</p></CardContent></Card>
      </div>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50"><Filter className="h-4 w-4" />Filtros</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">Refina la vista por estado, riesgo y empresa.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-10" placeholder="Usuario, email o IP" value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })) }} /></div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={filters.status} onValueChange={(value) => { setPage(1); setFilters((current) => ({ ...current, status: value })) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Activas</SelectItem><SelectItem value="expired">Expiradas</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Riesgo</Label>
            <Select value={filters.riskLevel} onValueChange={(value) => { setPage(1); setFilters((current) => ({ ...current, riskLevel: value })) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="low">Bajo</SelectItem><SelectItem value="medium">Medio</SelectItem><SelectItem value="high">Alto</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-50">Sesiones de usuario</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">Vista operativa de accesos recientes y controles inmediatos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/70">
            <Table>
              <TableHeader><TableRow className="bg-slate-50/80 dark:bg-slate-800/50"><TableHead>Usuario</TableHead><TableHead>Estado</TableHead><TableHead>IP</TableHead><TableHead>Ultima actividad</TableHead><TableHead>Riesgo</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center"><div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><RefreshCw className="h-4 w-4 animate-spin" />Cargando sesiones...</div></TableCell></TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500 dark:text-slate-300">No se encontraron sesiones.</TableCell></TableRow>
                ) : sessions.map((session) => (
                  <TableRow key={session.id} className="dark:hover:bg-slate-800/30">
                    <TableCell><div><p className="font-medium text-slate-900 dark:text-slate-100">{session.userName}</p><p className="text-sm text-slate-500 dark:text-slate-300">{session.userEmail}</p><p className="text-xs text-slate-500 dark:text-slate-400">{session.userRole} · {session.browser} / {session.os}</p></div></TableCell>
                    <TableCell>{session.isCurrent ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">Actual</Badge> : session.isActive ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">Activa</Badge> : <Badge variant="secondary">Expirada</Badge>}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-200">{session.ipAddress}</TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-200">{formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true, locale: es })}</TableCell>
                    <TableCell>{session.riskLevel === 'high' ? <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200">Alto</Badge> : session.riskLevel === 'medium' ? <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">Medio</Badge> : <Badge variant="outline">Bajo</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" title={`Usuario: ${session.userName}\nEmail: ${session.userEmail}\nRol: ${session.userRole}`}><Eye className="h-4 w-4" /></Button>
                        {session.isActive && !session.isCurrent && <Button variant="ghost" size="icon" onClick={() => runSessionAction(`/api/admin/sessions/${session.id}/terminate`, 'La sesion fue terminada.')}><LogOut className="h-4 w-4" /></Button>}
                        <Button variant="ghost" size="icon" onClick={() => runSessionAction(`/api/admin/sessions/user/${session.userId}/terminate`, 'Se cerraron las sesiones del usuario.')}><Shield className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-300">Mostrando {sessions.length} de {total} sesiones</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
              <span className="text-sm text-slate-600 dark:text-slate-200">Pagina {page} de {pageCount}</span>
              <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Siguiente</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
