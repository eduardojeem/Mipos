'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Crown,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCog,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth, useResolvedRole } from '@/hooks/use-auth'
import { useCompanyAccess } from '@/hooks/use-company-access'
import { useCompanyUsers } from '@/hooks/use-company-users'
import { useDebounce } from '@/hooks/useDebounce'
import { useUserOrganizations } from '@/hooks/use-user-organizations'
import type { User as CompanyUser } from '@/lib/services/admin-api'

type CompanyRole = 'OWNER' | 'ADMIN' | 'SELLER' | 'WAREHOUSE'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

type UserFormState = {
  name: string
  email: string
  role: CompanyRole
  status: UserStatus
  password: string
}

const INITIAL_FORM: UserFormState = {
  name: '',
  email: '',
  role: 'SELLER',
  status: 'ACTIVE',
  password: '',
}

const ROLE_OPTIONS: Array<{ value: CompanyRole; label: string; description: string }> = [
  { value: 'OWNER', label: 'Owner', description: 'Control total de empresa y facturacion' },
  { value: 'ADMIN', label: 'Admin', description: 'Gestiona equipo, catalogo y reportes habilitados' },
  { value: 'SELLER', label: 'Vendedor', description: 'Opera ventas y consulta clientes y productos' },
  { value: 'WAREHOUSE', label: 'Deposito', description: 'Controla stock y compras' },
]

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'SUSPENDED', label: 'Suspendido' },
]

const ROLE_STYLES: Record<CompanyRole, string> = {
  OWNER: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  ADMIN: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  SELLER: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  WAREHOUSE: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
}

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  INACTIVE: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  SUSPENDED: 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
}

function normalizeStatus(status?: string): UserStatus {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'INACTIVE') return 'INACTIVE'
  if (normalized === 'SUSPENDED') return 'SUSPENDED'
  return 'ACTIVE'
}

function normalizeRole(role?: string): CompanyRole {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'OWNER') return 'OWNER'
  if (normalized === 'ADMIN') return 'ADMIN'
  if (normalized === 'WAREHOUSE') return 'WAREHOUSE'
  return 'SELLER'
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin registro'
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: string
      response?: { data?: { error?: string } }
    }

    return candidate.response?.data?.error || candidate.message || 'Error desconocido'
  }

  return 'Error desconocido'
}

function TeamStatCard({
  title,
  value,
  helper,
}: {
  title: string
  value: string | number
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{helper}</div>
    </div>
  )
}

export default function UserManagement() {
  const { user } = useAuth()
  const resolvedRole = useResolvedRole()
  const { toast } = useToast()
  const isSuperAdmin = resolvedRole === 'SUPER_ADMIN'
  const { organizations, selectedOrganization, selectOrganization, loading: organizationsLoading } = useUserOrganizations(user?.id)
  const selectedOrganizationId = selectedOrganization?.id

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null)
  const [form, setForm] = useState<UserFormState>(INITIAL_FORM)
  const [rowActionId, setRowActionId] = useState<string | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  const companyAccess = useCompanyAccess({
    permission: 'manage_users',
    feature: 'team_management',
    companyId: selectedOrganizationId || undefined,
    enabled: Boolean(user) && (!isSuperAdmin || Boolean(selectedOrganizationId)),
  })

  const canManageUsers = isSuperAdmin || Boolean(companyAccess.data?.allowed)
  const accessContext = companyAccess.data?.context || null
  const hasUnlimitedUsers = Boolean(accessContext?.features?.includes('unlimited_users'))

  const {
    users,
    totalCount,
    totalTeamCount,
    loading,
    isFetching,
    isRealtimeConnected,
    error,
    refresh,
    createUser,
    updateUser,
    deleteUser,
    creating,
    updating,
    deleting,
  } = useCompanyUsers({
    organizationId: selectedOrganizationId,
    search: debouncedSearch,
    role: roleFilter,
    status: statusFilter,
    enabled: canManageUsers || isSuperAdmin,
    pageSize: 200,
  })

  const availableRoles = useMemo(() => {
    if (isSuperAdmin) return ROLE_OPTIONS
    return ROLE_OPTIONS.filter((role) => role.value !== 'OWNER')
  }, [isSuperAdmin])

  const stats = useMemo(() => {
    const active = users.filter((item) => normalizeStatus(item.status) === 'ACTIVE').length
    const admins = users.filter((item) => ['OWNER', 'ADMIN'].includes(String(item.role).toUpperCase())).length
    const sellers = users.filter((item) => normalizeRole(item.role) === 'SELLER').length
    const warehouse = users.filter((item) => normalizeRole(item.role) === 'WAREHOUSE').length

    return {
      active,
      admins,
      sellers,
      warehouse,
    }
  }, [users])

  const seatLimit = hasUnlimitedUsers ? null : 10
  const seatUsage = seatLimit ? Math.min(100, Math.round((totalTeamCount / seatLimit) * 100)) : 0
  const hasFiltersApplied = Boolean(debouncedSearch || roleFilter !== 'ALL' || statusFilter !== 'ALL')
  const isMutating = creating || updating || deleting
  const filteredCountLabel = hasFiltersApplied ? `${totalCount} resultados` : `${totalTeamCount} miembros`

  const openCreateDialog = () => {
    setEditingUser(null)
    setForm(INITIAL_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (targetUser: CompanyUser) => {
    setEditingUser(targetUser)
    setForm({
      name: targetUser.name,
      email: targetUser.email,
      role: normalizeRole(targetUser.role),
      status: normalizeStatus(targetUser.status),
      password: '',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingUser(null)
    setForm(INITIAL_FORM)
  }

  const handleRefresh = async () => {
    try {
      await refresh()
      toast({ title: 'Equipo actualizado', description: 'Se sincronizaron los usuarios de la organizacion.' })
    } catch (refreshError: unknown) {
      toast({
        title: 'No se pudo actualizar el equipo',
        description: getErrorMessage(refreshError),
        variant: 'destructive',
      })
    }
  }

  const submitUser = async () => {
    try {
      if (!selectedOrganizationId) {
        toast({ title: 'Selecciona una organizacion', variant: 'destructive' })
        return
      }

      if (!form.name.trim() || !form.email.trim()) {
        toast({ title: 'Completa nombre y email', variant: 'destructive' })
        return
      }

      if (!editingUser && form.password.trim().length < 8) {
        toast({
          title: 'Contrasena invalida',
          description: 'La contrasena inicial debe tener al menos 8 caracteres.',
          variant: 'destructive',
        })
        return
      }

      if (editingUser) {
        await updateUser({
          userId: editingUser.id,
          data: {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            status: form.status,
            password: form.password.trim() || undefined,
            organizationId: selectedOrganizationId,
          },
        })
        toast({ title: 'Usuario actualizado', description: 'Los cambios ya quedaron sincronizados.' })
      } else {
        await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          role: form.role,
          status: form.status,
          organizationId: selectedOrganizationId,
        })
        toast({ title: 'Usuario creado', description: 'El miembro fue agregado a la organizacion.' })
      }

      closeDialog()
    } catch (submitError: unknown) {
      toast({
        title: 'No se pudo guardar el usuario',
        description: getErrorMessage(submitError),
        variant: 'destructive',
      })
    }
  }

  const updateStatus = async (targetUser: CompanyUser, nextStatus: UserStatus) => {
    setRowActionId(targetUser.id)
    try {
      await updateUser({
        userId: targetUser.id,
        data: {
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          status: nextStatus,
          organizationId: selectedOrganizationId,
        },
      })
      toast({ title: 'Estado actualizado', description: `El usuario ahora esta ${nextStatus.toLowerCase()}.` })
    } catch (statusError: unknown) {
      toast({
        title: 'No se pudo actualizar el estado',
        description: getErrorMessage(statusError),
        variant: 'destructive',
      })
    } finally {
      setRowActionId(null)
    }
  }

  const removeUser = async (targetUser: CompanyUser) => {
    setRowActionId(targetUser.id)
    try {
      await deleteUser(targetUser.id)
      toast({ title: 'Usuario removido', description: 'La membresia fue quitada de esta organizacion.' })
    } catch (deleteError: unknown) {
      toast({
        title: 'No se pudo remover el usuario',
        description: getErrorMessage(deleteError),
        variant: 'destructive',
      })
    } finally {
      setRowActionId(null)
      setDeleteUserId(null)
    }
  }

  if (companyAccess.isLoading || organizationsLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isSuperAdmin && !selectedOrganizationId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Usuarios por organizacion</CardTitle>
            <CardDescription>Selecciona una empresa para administrar su equipo y sus roles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedOrganizationId || ''} onValueChange={(value) => {
              const nextOrganization = organizations.find((org) => org.id === value)
              if (nextOrganization) selectOrganization(nextOrganization)
            }}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Selecciona una organizacion" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertTitle>Falta contexto de empresa</AlertTitle>
              <AlertDescription>
                El panel de usuarios trabaja por organizacion y por plan. Selecciona una empresa antes de editar miembros.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!canManageUsers) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
        <AlertTitle>Acceso no disponible</AlertTitle>
        <AlertDescription>
          Tu rol o el plan actual de la empresa no habilitan la gestion de usuarios. Esta seccion requiere `manage_users` y la feature `team_management`.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="space-y-4 rounded-2xl border border-border bg-background p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {accessContext?.role || resolvedRole}
              </Badge>
              <Badge variant="secondary">
                {selectedOrganization?.name || accessContext?.companyId || 'Organizacion actual'}
              </Badge>
              <Badge variant="outline" className={cn(
                'gap-1.5',
                isRealtimeConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              )}>
                {isRealtimeConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {isRealtimeConnected ? 'Sincronizado' : 'Sin live sync'}
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Equipo y roles</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Gestiona miembros, permisos operativos y estados de acceso con datos reales de Supabase por organizacion.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleRefresh()} disabled={isFetching || isMutating}>
              <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
              Actualizar
            </Button>
            <Button onClick={openCreateDialog} disabled={!selectedOrganizationId || isMutating}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo usuario
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30">
            <AlertTriangle className="h-4 w-4 text-rose-700 dark:text-rose-300" />
            <AlertTitle>No se pudo cargar el equipo</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TeamStatCard title="Miembros" value={totalTeamCount} helper={`${filteredCountLabel} en esta vista`} />
          <TeamStatCard title="Activos" value={stats.active} helper="Acceso operativo vigente" />
          <TeamStatCard title="Administracion" value={stats.admins} helper="Owner y admin visibles" />
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Capacidad del plan</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {hasUnlimitedUsers ? 'Ilimitado' : `${totalTeamCount}/${seatLimit}`}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {hasUnlimitedUsers ? 'Sin tope operativo de usuarios' : 'Límite aplicado por plan actual'}
            </div>
            {!hasUnlimitedUsers && (
              <div className="mt-3 space-y-2">
                <Progress value={seatUsage} className="h-2.5" />
                <div className={cn('text-xs font-medium', seatUsage >= 90 ? 'text-rose-600' : seatUsage >= 70 ? 'text-amber-600' : 'text-muted-foreground')}>
                  {seatUsage}% del límite utilizado
                </div>
              </div>
            )}
          </div>
        </div>

        {!hasUnlimitedUsers && totalTeamCount >= 8 && (
          <Alert className={cn(
            totalTeamCount >= 10
              ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
          )}>
            <AlertTriangle className={cn('h-4 w-4', totalTeamCount >= 10 ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300')} />
            <AlertTitle>{totalTeamCount >= 10 ? 'Límite alcanzado' : 'Capacidad en observación'}</AlertTitle>
            <AlertDescription>
              {totalTeamCount >= 10
                ? 'El plan actual ya no permite agregar más miembros desde este panel.'
                : 'La empresa está cerca del límite operativo de usuarios para su plan actual.'}
            </AlertDescription>
          </Alert>
        )}
      </section>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Miembros de la empresa</CardTitle>
              <CardDescription>Filtra, edita estados y administra el equipo con sincronización por organización.</CardDescription>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:min-w-[760px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o email" className="pl-9" />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los roles</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los estados</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isSuperAdmin && organizations.length > 0 && (
            <div className="max-w-sm">
              <Label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Organizacion</Label>
              <Select value={selectedOrganizationId} onValueChange={(value) => {
                const nextOrganization = organizations.find((organization) => organization.id === value)
                if (nextOrganization) selectOrganization(nextOrganization)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una organizacion" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
              <p className="text-sm font-medium text-foreground">No hay miembros para mostrar</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajusta filtros o agrega el primer usuario operativo de esta organizacion.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Ultimo acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((item) => {
                      const itemRole = normalizeRole(item.role)
                      const itemStatus = normalizeStatus(item.status)
                      const isBusy = rowActionId === item.id

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted font-medium text-foreground">
                                {getInitials(item.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                                  {itemRole === 'OWNER' && <Crown className="h-3.5 w-3.5 text-slate-500" />}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={ROLE_STYLES[itemRole]}>{itemRole}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_STYLES[itemStatus]}>{itemStatus}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(item.lastLogin)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(item)} disabled={isBusy}>
                                <UserCog className="mr-2 h-4 w-4" />
                                Editar
                              </Button>

                              <Select value={itemStatus} onValueChange={(value) => void updateStatus(item, value as UserStatus)} disabled={isBusy}>
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteUserId(item.id)}
                                disabled={isBusy}
                              >
                                {isBusy && deleteUserId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {users.map((item) => {
                  const itemRole = normalizeRole(item.role)
                  const itemStatus = normalizeStatus(item.status)
                  const isBusy = rowActionId === item.id

                  return (
                    <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted font-medium text-foreground">
                              {getInitials(item.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                                {itemRole === 'OWNER' && <Crown className="h-3.5 w-3.5 text-slate-500" />}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={ROLE_STYLES[itemRole]}>{itemRole}</Badge>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Estado</span>
                          <Badge variant="outline" className={STATUS_STYLES[itemStatus]}>{itemStatus}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">Ultimo acceso</span>
                          <span className="text-sm text-foreground">{formatDateTime(item.lastLogin)}</span>
                        </div>
                        <Select value={itemStatus} onValueChange={(value) => void updateStatus(item, value as UserStatus)} disabled={isBusy}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" onClick={() => openEditDialog(item)} disabled={isBusy}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteUserId(item.id)} disabled={isBusy}>
                            {isBusy && deleteUserId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalCount > users.length && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Vista truncada por límite operativo</AlertTitle>
                  <AlertDescription>
                    Se cargaron {users.length} miembros de {totalCount}. Refina filtros si necesitas una vista más acotada.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setDialogOpen(true))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Actualiza identidad, rol y estado dentro de la organizacion actual.'
                : 'Crea un miembro nuevo usando los roles reales del sistema de empresa.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Ana Perez" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="usuario@empresa.com" />
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as CompanyRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {availableRoles.find((role) => role.value === form.role)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as UserStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="password">{editingUser ? 'Nueva contrasena opcional' : 'Contrasena inicial'}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingUser ? 'Solo si quieres reemplazarla' : 'Minimo 8 caracteres'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => void submitUser()} disabled={creating || updating}>
              {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteUserId)} onOpenChange={(open) => (!open ? setDeleteUserId(null) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover usuario</DialogTitle>
            <DialogDescription>
              Esta accion quita la membresia de la organizacion actual. El acceso puede seguir existiendo en otras empresas si el usuario tiene otras vinculaciones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const target = users.find((item) => item.id === deleteUserId)
                if (target) {
                  void removeUser(target)
                }
              }}
              disabled={!deleteUserId || deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
