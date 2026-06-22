'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CreditCard,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useUserOrganizations } from '@/hooks/use-user-organizations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BranchFormDialog } from './components/BranchFormDialog'
import { StockTransferDialog } from './components/StockTransferDialog'
import { type Branch, type BranchInput, useBranches } from './hooks/useBranches'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

function statusTone(isActive: boolean) {
  return isActive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
}

export default function SucursalPage() {
  const { user } = useAuth()
  const { selectedOrganization } = useUserOrganizations(user?.id)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [memberToAssign, setMemberToAssign] = useState('')

  const {
    organizationId,
    branches,
    meta,
    stats,
    teamMembers,
    branchUsers,
    isLoading,
    isLoadingBranchUsers,
    isError,
    error,
    refresh,
    createBranch,
    updateBranch,
    deleteBranch,
    assignMember,
    removeMember,
    isSavingBranch,
    isDeletingBranch,
    isAssigningMember,
  } = useBranches(selectedBranchId)

  const statsByBranch = useMemo(
    () =>
      Object.fromEntries(
        stats.map((entry) => [entry.branch_id, entry]),
      ),
    [stats],
  )

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase()

    return branches.filter((branch) => {
      if (statusFilter === 'active' && !branch.is_active) return false
      if (statusFilter === 'inactive' && branch.is_active) return false

      if (!query) return true

      return (
        branch.name.toLowerCase().includes(query) ||
        branch.slug.toLowerCase().includes(query) ||
        (branch.address || '').toLowerCase().includes(query) ||
        (branch.phone || '').toLowerCase().includes(query)
      )
    })
  }, [branches, search, statusFilter])

  useEffect(() => {
    if (!branches.length) {
      setSelectedBranchId(null)
      return
    }

    const selectedStillExists = selectedBranchId && branches.some((branch) => branch.id === selectedBranchId)
    if (!selectedStillExists) {
      setSelectedBranchId(branches[0].id)
    }
  }, [branches, selectedBranchId])

  useEffect(() => {
    setMemberToAssign('')
  }, [selectedBranchId])

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  )

  const selectedStats = selectedBranch ? statsByBranch[selectedBranch.id] : null
  const selectedAssignedIds = useMemo(
    () => new Set(branchUsers.map((userItem) => userItem.user_id)),
    [branchUsers],
  )

  const assignableMembers = useMemo(
    () =>
      teamMembers.filter((member) => {
        if (!member.user_id || selectedAssignedIds.has(member.user_id)) return false
        return member.status !== 'SUSPENDED'
      }),
    [selectedAssignedIds, teamMembers],
  )

  const kpis = useMemo(() => {
    const activeBranches = branches.filter((branch) => branch.is_active).length

    return {
      totalBranches: branches.length,
      activeBranches,
      assignedUsers: stats.reduce((acc, item) => acc + item.users_assigned, 0),
      openCashSessions: stats.reduce((acc, item) => acc + item.active_cash_sessions, 0),
      monthlySales: stats.reduce((acc, item) => acc + item.sales_month, 0),
    }
  }, [branches, stats])

  const planLimit = meta?.maxLocations ?? null
  const planUsage = planLimit == null ? null : `${meta?.currentLocations ?? branches.length}/${planLimit}`
  const planReached = Boolean(meta?.limitReached)
  const planNearLimit = planLimit != null && (meta?.currentLocations ?? branches.length) >= Math.max(1, planLimit - 1)

  const handleCreate = () => {
    setEditingBranch(null)
    setFormOpen(true)
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setFormOpen(true)
  }

  const handleSubmitBranch = async (input: BranchInput) => {
    const branch = editingBranch
      ? await updateBranch({ branchId: editingBranch.id, input })
      : await createBranch(input)

    setSelectedBranchId(branch.id)
    setEditingBranch(null)
  }

  const handleDelete = async () => {
    if (!branchToDelete) return
    await deleteBranch(branchToDelete.id)
    if (selectedBranchId === branchToDelete.id) {
      setSelectedBranchId(null)
    }
    setBranchToDelete(null)
  }

  const handleAssignMember = async () => {
    if (!selectedBranch || !memberToAssign) return
    await assignMember({ branchId: selectedBranch.id, userId: memberToAssign })
    setMemberToAssign('')
  }

  const hasOrganization = Boolean(organizationId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sucursales</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Operá varias sedes desde un solo panel: altas, estado, responsables y métricas por local.
            </p>
            {selectedOrganization ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{selectedOrganization.name}</Badge>
                <span>Plan {selectedOrganization.subscription_plan}</span>
                {planUsage ? <span>Uso: {planUsage}</span> : <span>Sucursales sin límite fijo</span>}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
          <Button onClick={handleCreate} size="sm" className="gap-2" disabled={!hasOrganization}>
            <Plus className="h-3.5 w-3.5" />
            Nueva sucursal
          </Button>
          <Button
            onClick={() => setTransferOpen(true)}
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={!hasOrganization || branches.filter((branch) => branch.is_active).length < 2}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Transferir stock
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/admin">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Link>
          </Button>
        </div>
      </div>

      {!hasOrganization ? (
        <EmptyState
          icon={Building2}
          title="Seleccioná una organización"
          description="Necesitás una organización activa para administrar sucursales, responsables y operación multi-sede."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sucursales</p>
                  <p className="text-2xl font-semibold">{kpis.totalBranches}</p>
                  <p className="text-xs text-muted-foreground">{kpis.activeBranches} activas</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Equipo asignado</p>
                  <p className="text-2xl font-semibold">{kpis.assignedUsers}</p>
                  <p className="text-xs text-muted-foreground">Responsables vinculados a sedes</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cajas abiertas</p>
                  <p className="text-2xl font-semibold">{kpis.openCashSessions}</p>
                  <p className="text-xs text-muted-foreground">Sesiones activas en este momento</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ventas del mes</p>
                  <p className="text-2xl font-semibold">{formatCurrency(kpis.monthlySales)}</p>
                  <p className="text-xs text-muted-foreground">Suma de todas las sucursales</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {(planReached || planNearLimit) && (
            <Alert className={cn(planReached ? 'border-amber-300/80' : 'border-slate-200')}>
              {planReached ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{planReached ? 'Límite de sucursales alcanzado' : 'Capacidad casi completa'}</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {planReached
                    ? `Tu plan ${selectedOrganization?.subscription_plan || 'actual'} ya llegó al máximo permitido.`
                    : `Ya usaste ${planUsage} sucursales del plan ${selectedOrganization?.subscription_plan || 'actual'}.`}
                </span>
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link href="/admin/subscriptions">Ver planes</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="min-h-[520px]">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Panel operativo</CardTitle>
                    <CardDescription>
                      Filtrá locales, revisá su estado y abrí una ficha de gestión sin salir de esta vista.
                    </CardDescription>
                  </div>
                  <div className="relative w-full lg:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar por nombre, slug, dirección o teléfono"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                  >
                    Todas
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                  >
                    Activas
                  </Button>
                  <Button
                    variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('inactive')}
                  >
                    Inactivas
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-28 rounded-xl" />
                    ))}
                  </div>
                ) : isError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No se pudo cargar la sección</AlertTitle>
                    <AlertDescription>{error?.message || 'Probá actualizar la vista.'}</AlertDescription>
                  </Alert>
                ) : !branches.length ? (
                  <EmptyState
                    icon={MapPin}
                    title="Todavía no hay sucursales"
                    description="Creá la primera sede para separar operación, responsables y métricas por local."
                    action={{
                      label: 'Crear sucursal',
                      onClick: handleCreate,
                      icon: Plus,
                    }}
                    size="sm"
                  />
                ) : !filteredBranches.length ? (
                  <EmptyState
                    icon={Search}
                    title="No hay coincidencias"
                    description="Ajustá la búsqueda o limpiá los filtros para ver otras sucursales."
                    action={{
                      label: 'Limpiar filtros',
                      onClick: () => {
                        setSearch('')
                        setStatusFilter('all')
                      },
                    }}
                    size="sm"
                  />
                ) : (
                  filteredBranches.map((branch) => {
                    const branchStats = statsByBranch[branch.id]
                    const isSelected = branch.id === selectedBranchId

                    return (
                      <div
                        key={branch.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedBranchId(branch.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedBranchId(branch.id)
                          }
                        }}
                        className={cn(
                          'w-full cursor-pointer rounded-2xl border p-4 text-left transition hover:border-slate-400/50 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-950/60',
                          isSelected && 'border-slate-950 ring-1 ring-slate-950 dark:border-white dark:ring-white',
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold">{branch.name}</p>
                              <Badge variant="outline" className={statusTone(branch.is_active)}>
                                {branch.is_active ? 'Activa' : 'Inactiva'}
                              </Badge>
                              <Badge variant="outline">{branch.slug}</Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>{branch.address || 'Sin dirección cargada'}</p>
                              <p>{branch.phone || 'Sin teléfono cargado'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleEdit(branch)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={(event) => {
                                event.stopPropagation()
                                setBranchToDelete(branch)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Quitar
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide">Equipo</p>
                            <p className="font-medium text-foreground">{branchStats?.users_assigned ?? 0} asignados</p>
                          </div>
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide">Cajas abiertas</p>
                            <p className="font-medium text-foreground">{branchStats?.active_cash_sessions ?? 0}</p>
                          </div>
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide">Ventas hoy</p>
                            <p className="font-medium text-foreground">{formatCurrency(branchStats?.sales_today ?? 0)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[520px]">
              <CardHeader>
                <CardTitle>Detalle de sucursal</CardTitle>
                <CardDescription>
                  Administrá datos básicos, revisá desempeño y asigná miembros desde una sola ficha.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {!selectedBranch ? (
                  <EmptyState
                    icon={MapPin}
                    title="Elegí una sucursal"
                    description="Seleccioná una sede del panel operativo para ver su detalle, métricas y responsables."
                    size="sm"
                  />
                ) : (
                  <>
                    <div className="space-y-3 rounded-2xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">{selectedBranch.name}</h2>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={statusTone(selectedBranch.is_active)}>
                              {selectedBranch.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                            <Badge variant="outline">/{selectedBranch.slug}</Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleEdit(selectedBranch)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Editar ficha
                        </Button>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{selectedBranch.address || 'Sin dirección configurada'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{selectedBranch.phone || 'Sin teléfono configurado'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          <span>Creada el {formatDate(selectedBranch.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ventas hoy</p>
                        <p className="mt-2 text-2xl font-semibold">{formatCurrency(selectedStats?.sales_today ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ventas del mes</p>
                        <p className="mt-2 text-2xl font-semibold">{formatCurrency(selectedStats?.sales_month ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Miembros asignados</p>
                        <p className="mt-2 text-2xl font-semibold">{selectedStats?.users_assigned ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cajas abiertas</p>
                        <p className="mt-2 text-2xl font-semibold">{selectedStats?.active_cash_sessions ?? 0}</p>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border p-4">
                      <div>
                        <h3 className="text-sm font-semibold">Asignación de equipo</h3>
                        <p className="text-sm text-muted-foreground">
                          Vinculá personas de la organización para ordenar operación y permisos por sede.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select value={memberToAssign} onValueChange={setMemberToAssign}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccioná un miembro para asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableMembers.length ? (
                              assignableMembers.map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.full_name || member.email || 'Miembro sin nombre'}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none" disabled>
                                No hay miembros disponibles
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>

                        <Button
                          onClick={() => void handleAssignMember()}
                          disabled={!memberToAssign || isAssigningMember || memberToAssign === '__none'}
                          className="gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Asignar
                        </Button>
                      </div>

                      {isLoadingBranchUsers ? (
                        <div className="space-y-2">
                          <Skeleton className="h-14 rounded-xl" />
                          <Skeleton className="h-14 rounded-xl" />
                        </div>
                      ) : branchUsers.length ? (
                        <div className="space-y-2">
                          {branchUsers.map((member) => (
                            <div
                              key={member.user_id}
                              className="flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-medium">{member.full_name || member.email || 'Miembro sin nombre'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {member.email || 'Sin email'} {member.role ? `• ${member.role}` : ''}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start text-destructive hover:text-destructive sm:justify-center"
                                onClick={() =>
                                  void removeMember({
                                    branchId: selectedBranch.id,
                                    userId: member.user_id,
                                  })
                                }
                                disabled={isAssigningMember}
                              >
                                Quitar
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <Users className="h-4 w-4" />
                          <AlertTitle>Acceso abierto por defecto</AlertTitle>
                          <AlertDescription>
                            No hay miembros asignados a esta sucursal. Segun el contrato actual, los usuarios sin asignacion
                            especifica pueden operar en todas las sucursales de la organizacion.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Eliminación protegida</AlertTitle>
                      <AlertDescription>
                        Si la sucursal ya tiene ventas, cajas o movimientos, el sistema la desactiva en lugar de borrarla definitivamente.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <BranchFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingBranch(null)
        }}
        branch={editingBranch}
        isSaving={isSavingBranch}
        onSubmit={handleSubmitBranch}
      />

      <StockTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        organizationId={organizationId}
        branches={branches}
        defaultFromBranchId={selectedBranch?.id ?? null}
        onTransferred={refresh}
      />

      <AlertDialog open={Boolean(branchToDelete)} onOpenChange={(open) => !open && setBranchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar sucursal</AlertDialogTitle>
            <AlertDialogDescription>
              {branchToDelete
                ? `Vas a quitar ${branchToDelete.name}. Si tiene historial operativo se desactivará en lugar de eliminarse.`
                : 'Esta acción puede desactivar o eliminar la sucursal.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBranch}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              disabled={isDeletingBranch}
            >
              {isDeletingBranch ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
