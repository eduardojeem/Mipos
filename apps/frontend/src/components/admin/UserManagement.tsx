'use client'

import { useQuery } from '@tanstack/react-query'
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
  UserCog,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import planService from '@/lib/services/plan-service'
import type { User as CompanyUser } from '@/lib/services/admin-api'
import { UserTableSkeleton, UserMobileListSkeleton } from '@/components/admin/users/UserSkeletons'
import { UserTableRow } from '@/components/admin/users/UserTableRow'
import { UserMobileCard } from '@/components/admin/users/UserMobileCard'
import { UserFormDialog, DeleteUserDialog, type UserFormState } from '@/components/admin/users/UserDialogs'

type CompanyRole = 'OWNER' | 'ADMIN' | 'SELLER' | 'WAREHOUSE'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

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
  const [rowActionId, setRowActionId] = useState<string | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  const companyAccess = useCompanyAccess({
    permission: 'manage_users',
    companyId: selectedOrganizationId || undefined,
    enabled: Boolean(user) && (!isSuperAdmin || Boolean(selectedOrganizationId)),
  })

  const canManageUsers = isSuperAdmin || Boolean(companyAccess.data?.allowed)
  const accessContext = companyAccess.data?.context || null
  const { data: planData } = useQuery({
    queryKey: ['company-user-plan-limits', selectedOrganizationId || ''],
    enabled: Boolean(selectedOrganizationId) && (canManageUsers || isSuperAdmin),
    staleTime: 60_000,
    queryFn: async () => planService.getPlanLimits(selectedOrganizationId),
  })

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

  const userSeatLimitEntry = useMemo(
    () => planData?.limits?.find((limit) => limit.feature_type === 'users') || null,
    [planData]
  )
  const hasUnlimitedUsers = Boolean(userSeatLimitEntry?.is_unlimited) || Boolean(accessContext?.features?.includes('unlimited_users'))
  const seatLimit = hasUnlimitedUsers
    ? null
    : (typeof userSeatLimitEntry?.limit_value === 'number' && userSeatLimitEntry.limit_value > 0
      ? userSeatLimitEntry.limit_value
      : null)
  const seatUsage = seatLimit ? Math.min(100, Math.round((totalTeamCount / seatLimit) * 100)) : 0
  const isSeatLimitReached = seatLimit !== null && totalTeamCount >= seatLimit
  const isSeatLimitNear = seatLimit !== null && totalTeamCount >= Math.max(seatLimit - 1, Math.ceil(seatLimit * 0.8))
  const hasFiltersApplied = Boolean(debouncedSearch || roleFilter !== 'ALL' || statusFilter !== 'ALL')
  const isMutating = creating || updating || deleting
  const filteredCountLabel = hasFiltersApplied ? `${totalCount} resultados` : `${totalTeamCount} miembros`

  const openCreateDialog = () => {
    setEditingUser(null)
    setDialogOpen(true)
  }

  const openEditDialog = (targetUser: CompanyUser) => {
    setEditingUser(targetUser)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingUser(null)
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

  const submitUser = async (formData: UserFormState) => {
    try {
      if (!selectedOrganizationId) {
        toast({ title: 'Selecciona una organizacion', variant: 'destructive' })
        return
      }

      if (!formData.name.trim() || !formData.email.trim()) {
        toast({ title: 'Completa nombre y email', variant: 'destructive' })
        return
      }

      if (!editingUser && formData.password.trim().length < 8) {
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
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role,
            status: formData.status,
            password: formData.password.trim() || undefined,
            organizationId: selectedOrganizationId,
          },
        })
        toast({ title: 'Usuario actualizado', description: 'Los cambios ya quedaron sincronizados.' })
      } else {
        await createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          role: formData.role,
          status: formData.status,
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
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Shield className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <CardTitle className="text-lg text-amber-900 dark:text-amber-100">Gestión de equipo no disponible</CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  Tu plan actual no incluye la administración de usuarios y roles.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">¿Qué incluye esta sección?</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-slate-400" />
                  Crear y gestionar usuarios del equipo
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-slate-400" />
                  Asignar roles (Admin, Vendedor, Depósito)
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  Controlar permisos y accesos por rol
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="default"
                className="gap-2"
                onClick={() => window.location.href = '/dashboard/settings?tab=subscription'}
              >
                <Wifi className="h-4 w-4" />
                Mejorar plan
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.location.href = '/inicio/planes'}
              >
                Ver planes disponibles
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Los planes Pro y Enterprise incluyen gestión de equipo con usuarios ilimitados.
            </p>
          </CardContent>
        </Card>
      </div>
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
            <Button onClick={openCreateDialog} disabled={!selectedOrganizationId || isMutating || isSeatLimitReached}>
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
              {hasUnlimitedUsers ? 'Ilimitado' : seatLimit !== null ? `${totalTeamCount}/${seatLimit}` : 'No definido'}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {hasUnlimitedUsers ? 'Sin tope operativo de usuarios' : seatLimit !== null ? 'Limite aplicado por plan actual' : 'No se pudo resolver el limite de usuarios desde el plan'}
            </div>
            {!hasUnlimitedUsers && seatLimit !== null && (
              <div className="mt-3 space-y-2">
                <Progress value={seatUsage} className="h-2.5" />
                <div className={cn('text-xs font-medium', seatUsage >= 90 ? 'text-rose-600' : seatUsage >= 70 ? 'text-amber-600' : 'text-muted-foreground')}>
                  {seatUsage}% del limite utilizado
                </div>
              </div>
            )}
          </div>
        </div>

        {!hasUnlimitedUsers && seatLimit !== null && isSeatLimitNear && (
          <Alert className={cn(
            isSeatLimitReached
              ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
          )}>
            <AlertTriangle className={cn('h-4 w-4', isSeatLimitReached ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300')} />
            <AlertTitle>{isSeatLimitReached ? 'Límite alcanzado' : 'Capacidad en observación'}</AlertTitle>
            <AlertDescription>
              {isSeatLimitReached
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
            <>
              <UserTableSkeleton />
              <UserMobileListSkeleton />
            </>
          ) : error && users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/70 px-6 py-16 text-center dark:border-rose-900 dark:bg-rose-950/20">
              <p className="text-sm font-medium text-foreground">No se pudo cargar el equipo</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {error}
              </p>
              <div className="mt-5">
                <Button variant="outline" onClick={() => void handleRefresh()} disabled={isFetching}>
                  <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
                  Reintentar
                </Button>
              </div>
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
                    {users.map((item) => (
                      <UserTableRow
                        key={item.id}
                        item={item}
                        isBusy={rowActionId === item.id}
                        isDeleting={rowActionId === item.id && deleteUserId === item.id}
                        onEdit={openEditDialog}
                        onUpdateStatus={(user, status) => void updateStatus(user, status as UserStatus)}
                        onDelete={setDeleteUserId}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {users.map((item) => (
                  <UserMobileCard
                    key={item.id}
                    item={item}
                    isBusy={rowActionId === item.id}
                    isDeleting={rowActionId === item.id && deleteUserId === item.id}
                    onEdit={openEditDialog}
                    onUpdateStatus={(user, status) => void updateStatus(user, status as UserStatus)}
                    onDelete={setDeleteUserId}
                  />
                ))}
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

      <UserFormDialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        editingUser={editingUser}
        availableRoles={availableRoles}
        isMutating={creating || updating}
        onSubmit={(data) => void submitUser(data)}
      />

      <DeleteUserDialog
        userId={deleteUserId}
        users={users}
        isDeleting={deleting}
        onClose={() => setDeleteUserId(null)}
        onConfirm={(target) => void removeUser(target)}
      />
    </div>
  )
}



