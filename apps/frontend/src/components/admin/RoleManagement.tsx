'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Cog,
  Copy,
  Database,
  KeyRound,
  Loader2,
  Lock,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShoppingCart,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import { useAuth, useResolvedRole } from '@/hooks/use-auth'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'
import { useUserOrganizations } from '@/hooks/use-user-organizations'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { roleService } from '@/lib/services/role-service'

interface Permission {
  id: string
  name: string
  displayName: string
  description: string
  resource: string
  action: string
  category: string
  isSystemPermission: boolean
}

interface Role {
  id: string
  name: string
  displayName: string
  description: string
  isSystemRole: boolean
  isActive: boolean
  permissions: Permission[]
  userCount: number
  createdAt: string
  updatedAt: string
  organizationId?: string | null
  organizationName?: string | null
}

interface PermissionCategory {
  id: string
  name: string
  displayName: string
  description: string
  icon: ComponentType<{ className?: string }>
  permissions: Permission[]
}

interface RoleFormData {
  name: string
  displayName: string
  description: string
  isActive: boolean
  permissions: string[]
}

const INITIAL_FORM_DATA: RoleFormData = {
  name: '',
  displayName: '',
  description: '',
  isActive: true,
  permissions: [],
}

type ScopeFilter = 'ALL' | 'SYSTEM' | 'CUSTOM'
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

function StatCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string
  value: string | number
  helper: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'No se pudo completar la operación.'
}

function iconForCategory(name: string) {
  switch (name) {
    case 'users':
      return Users
    case 'products':
      return Package
    case 'sales':
      return ShoppingCart
    case 'reports':
      return BarChart3
    case 'settings':
      return Cog
    case 'system':
      return Database
    default:
      return KeyRound
  }
}

function formatRoleCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '_')
}

export default function RoleManagement() {
  const { user } = useAuth()
  const resolvedRole = useResolvedRole()
  const { toast } = useToast()
  const isAdmin = resolvedRole === 'ADMIN' || resolvedRole === 'SUPER_ADMIN'

  const {
    organizations: rawOrganizations,
    selectedOrganization,
    loading: organizationsLoading,
  } = useUserOrganizations(user?.id)
  const contextOrgId = useCurrentOrganizationId()
  const organizations = rawOrganizations.map((item) => ({ id: item.id, name: item.name }))

  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionCategories, setPermissionCategories] = useState<PermissionCategory[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState<RoleFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mapPermission = (item: any): Permission => ({
    id: item.id,
    name: item.name,
    displayName: item.displayName,
    description: item.description || '',
    resource: item.resource,
    action: item.action,
    category: item.category,
    isSystemPermission: Boolean(item.isSystem),
  })

  const mapRole = (item: any): Role => ({
    id: item.id,
    name: item.name,
    displayName: item.displayName,
    description: item.description || '',
    isSystemRole: Boolean(item.isSystem),
    isActive: Boolean(item.isActive),
    permissions: Array.isArray(item.permissions) ? item.permissions.map(mapPermission) : [],
    userCount: item.userCount ?? 0,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    organizationId: item.organizationId || null,
    organizationName: item.organizationName || null,
  })

  const mapPermissionCategory = (item: any): PermissionCategory => ({
    id: item.id,
    name: item.name,
    displayName: item.displayName,
    description: item.description || '',
    icon: iconForCategory(item.name),
    permissions: Array.isArray(item.permissions) ? item.permissions.map(mapPermission) : [],
  })

  async function loadData(organizationId = currentOrganization) {
    if (!organizationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [apiRoles, apiCategories] = await Promise.all([
        roleService.getRoles(true, organizationId),
        roleService.getPermissionsByCategory(),
      ])

      const mappedRoles = apiRoles.map((item: any) => mapRole(item))
      const mappedCategories = apiCategories.map(mapPermissionCategory)

      setRoles(mappedRoles)
      setPermissionCategories(mappedCategories)
      setPermissions(mappedCategories.flatMap((item) => item.permissions))
    } catch (error) {
      toast({
        title: 'No se pudieron cargar los roles',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // No esperar a useUserOrganizations si ya tenemos contextOrgId del cookie/context
    const orgId = currentOrganization || contextOrgId || selectedOrganization?.id || organizations[0]?.id || null

    if (organizationsLoading && !orgId) return

    if (!orgId) {
      setLoading(false)
      return
    }

    // Actualizar el estado si cambió y cargar datos
    if (orgId !== currentOrganization) {
      setCurrentOrganization(orgId)
    }

    void loadData(orgId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization, contextOrgId, organizations.length, organizationsLoading, selectedOrganization?.id])

  const roleStats = useMemo(() => {
    const total = roles.length
    const active = roles.filter((item) => item.isActive).length
    const system = roles.filter((item) => item.isSystemRole).length
    const custom = roles.filter((item) => !item.isSystemRole).length
    const assignedUsers = roles.reduce((acc, item) => acc + item.userCount, 0)

    return { total, active, system, custom, assignedUsers }
  }, [roles])

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const search = searchTerm.trim().toLowerCase()
      const matchesSearch = !search
        || role.displayName.toLowerCase().includes(search)
        || role.description.toLowerCase().includes(search)
        || role.name.toLowerCase().includes(search)

      const matchesScope = scopeFilter === 'ALL'
        || (scopeFilter === 'SYSTEM' && role.isSystemRole)
        || (scopeFilter === 'CUSTOM' && !role.isSystemRole)

      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'ACTIVE' && role.isActive)
        || (statusFilter === 'INACTIVE' && !role.isActive)

      return matchesSearch && matchesScope && matchesStatus
    })
  }, [roles, searchTerm, scopeFilter, statusFilter])

  const criticalPermissionsCount = useMemo(
    () => permissions.filter((item) => item.isSystemPermission).length,
    [permissions],
  )

  const selectedOrganizationName = organizations.find((item) => item.id === currentOrganization)?.name

  const openCreateDialog = () => {
    setSelectedRole(null)
    setFormData(INITIAL_FORM_DATA)
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (role: Role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      permissions: role.permissions.map((permission) => permission.id),
    })
    setIsEditDialogOpen(true)
  }

  const resetDialog = () => {
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    setSelectedRole(null)
    setFormData(INITIAL_FORM_DATA)
  }

  const handleSubmit = async () => {
    if (!currentOrganization) {
      toast({
        title: 'Selecciona una organización',
        description: 'Necesitas contexto de organización para crear o editar roles.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.displayName.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'El nombre visible del rol no puede quedar vacío.',
        variant: 'destructive',
      })
      return
    }

    if (formData.permissions.length === 0) {
      toast({
        title: 'Permisos requeridos',
        description: 'Selecciona al menos un permiso antes de guardar.',
        variant: 'destructive',
      })
      return
    }

    const technicalName = formatRoleCode(formData.name || formData.displayName)

    try {
      setIsSubmitting(true)

      if (selectedRole) {
        await roleService.updateRole(
          selectedRole.id,
          {
            displayName: formData.displayName.trim(),
            description: formData.description.trim(),
            isActive: formData.isActive,
            permissions: formData.permissions,
          },
          currentOrganization,
        )
      } else {
        await roleService.createRole(
          {
            name: technicalName,
            displayName: formData.displayName.trim(),
            description: formData.description.trim(),
            isActive: formData.isActive,
            permissions: formData.permissions,
            priority: 50,
          } as any,
          currentOrganization,
        )
      }

      toast({
        title: selectedRole ? 'Rol actualizado' : 'Rol creado',
        description: selectedRole
          ? 'Los permisos y metadatos del rol ya quedaron sincronizados.'
          : 'El nuevo rol quedó disponible para esta organización.',
      })

      resetDialog()
      await loadData(currentOrganization)
    } catch (error) {
      toast({
        title: 'No se pudo guardar el rol',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (roleId: string) => {
    try {
      await roleService.deleteRole(roleId, currentOrganization)
      toast({ title: 'Rol eliminado', description: 'El rol fue removido de esta organización.' })
      await loadData(currentOrganization)
    } catch (error) {
      toast({
        title: 'No se pudo eliminar el rol',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleToggleStatus = async (role: Role) => {
    try {
      await roleService.toggleRoleStatus(role.id, !role.isActive, currentOrganization)
      toast({
        title: role.isActive ? 'Rol desactivado' : 'Rol activado',
        description: `El rol ${role.displayName} actualizó su estado correctamente.`,
      })
      await loadData(currentOrganization)
    } catch (error) {
      toast({
        title: 'No se pudo cambiar el estado',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleCloneRole = async (role: Role) => {
    try {
      await roleService.cloneRole(
        role.id,
        `${formatRoleCode(role.name)}_COPY`,
        `${role.displayName} (Copia)`,
        currentOrganization,
      )
      toast({ title: 'Rol duplicado', description: 'Se creó una copia editable del rol.' })
      await loadData(currentOrganization)
    } catch (error) {
      toast({
        title: 'No se pudo duplicar el rol',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setFormData((current) => ({
      ...current,
      permissions: checked
        ? [...current.permissions, permissionId]
        : current.permissions.filter((id) => id !== permissionId),
    }))
  }

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    const category = permissionCategories.find((item) => item.id === categoryId)
    if (!category) return

    const categoryPermissionIds = category.permissions.map((item) => item.id)

    setFormData((current) => ({
      ...current,
      permissions: checked
        ? [...new Set([...current.permissions, ...categoryPermissionIds])]
        : current.permissions.filter((id) => !categoryPermissionIds.includes(id)),
    }))
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Cargando roles y permisos...</span>
      </div>
    )
  }

  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Falta contexto de organización</CardTitle>
          <CardDescription>
            Selecciona una empresa antes de administrar roles y permisos.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="space-y-4 rounded-2xl border border-border bg-background p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Gobierno de acceso
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {selectedOrganizationName || currentOrganization}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                {resolvedRole}
              </Badge>
            </div>

            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Roles y permisos por organización</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Separa roles base del sistema de roles personalizados, con foco en seguridad operativa y claridad para un SaaS multi-tenant.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadData(currentOrganization)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo rol
            </Button>
          </div>
        </div>

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Modelo SaaS recomendado</AlertTitle>
          <AlertDescription>
            Los roles <strong>base</strong> quedan visibles como referencia y no se editan desde esta pantalla. Los roles <strong>personalizados</strong> viven dentro de la organización actual y son los que puedes crear, duplicar, activar o eliminar.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Roles visibles" value={roleStats.total} helper="Base + personalizados" icon={Shield} />
          <StatCard title="Activos" value={roleStats.active} helper="Disponibles para asignación" icon={CheckCircle2} />
          <StatCard title="Personalizados" value={roleStats.custom} helper="Editables en esta organización" icon={Settings2} />
          <StatCard title="Permisos críticos" value={criticalPermissionsCount} helper="Requieren especial cuidado" icon={AlertTriangle} />
        </div>
      </section>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Mapa de roles</CardTitle>
              <CardDescription>
                Filtra por alcance, estado y búsqueda para revisar rápidamente qué roles gobiernan a cada miembro.
              </CardDescription>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:min-w-[760px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre o descripción"
                  className="pl-9"
                />
              </div>

              <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as ScopeFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alcance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los alcances</SelectItem>
                  <SelectItem value="SYSTEM">Base del sistema</SelectItem>
                  <SelectItem value="CUSTOM">Personalizados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los estados</SelectItem>
                  <SelectItem value="ACTIVE">Activos</SelectItem>
                  <SelectItem value="INACTIVE">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isAdmin && organizations.length > 0 && (
            <div className="max-w-sm">
              <Label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Organización
              </Label>
              <Select value={currentOrganization} onValueChange={setCurrentOrganization}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una organización" />
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
        <CardContent>
          {filteredRoles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
              <p className="text-sm font-medium text-foreground">No hay roles para esta vista</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajusta filtros o crea un rol personalizado para esta organización.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
              <div className="space-y-4">
                {filteredRoles.map((role) => {
                  const permissionPreview = role.permissions.slice(0, 4)
                  const hiddenPermissions = Math.max(0, role.permissions.length - permissionPreview.length)

                  return (
                    <div key={role.id} className="rounded-2xl border border-border bg-background p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-foreground">{role.displayName}</h3>
                            <Badge variant={role.isSystemRole ? 'secondary' : 'outline'}>
                              {role.isSystemRole ? 'Base del sistema' : 'Personalizado'}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={role.isActive ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'}
                            >
                              {role.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <Badge variant="outline" className="gap-1.5">
                              <Building2 className="h-3.5 w-3.5" />
                              {role.organizationName || 'Global'}
                            </Badge>
                          </div>

                          <p className="max-w-3xl text-sm text-muted-foreground">
                            {role.description || 'Sin descripción operativa.'}
                          </p>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Usuarios</p>
                              <p className="mt-1 text-lg font-semibold text-foreground">{role.userCount}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Permisos</p>
                              <p className="mt-1 text-lg font-semibold text-foreground">{role.permissions.length}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Último cambio</p>
                              <p className="mt-1 text-sm font-medium text-foreground">
                                {new Date(role.updatedAt).toLocaleDateString('es-PY')}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {permissionPreview.map((permission) => (
                              <Badge key={permission.id} variant="outline">
                                {permission.displayName}
                              </Badge>
                            ))}
                            {hiddenPermissions > 0 && (
                              <Badge variant="secondary">+{hiddenPermissions} permisos</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
                          {!role.isSystemRole && (
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(role)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => void handleCloneRole(role)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </Button>
                          {!role.isSystemRole && (
                            <Button variant="outline" size="sm" onClick={() => void handleToggleStatus(role)}>
                              {role.isActive ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </Button>
                          )}
                          {!role.isSystemRole && role.userCount === 0 && (
                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setRoleToDelete(role)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>

                      {role.isSystemRole && (
                        <Alert className="mt-4">
                          <Lock className="h-4 w-4" />
                          <AlertTitle>Rol protegido</AlertTitle>
                          <AlertDescription>
                            Este rol forma parte de la base del sistema. Si necesitas una variante, duplica el rol y edita la copia para esta organización.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Catálogo de permisos</CardTitle>
                    <CardDescription>
                      Referencia rápida de permisos disponibles por categoría.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {permissionCategories.map((category) => {
                      const Icon = category.icon
                      const criticalInCategory = category.permissions.filter((item) => item.isSystemPermission).length

                      return (
                        <div key={category.id} className="rounded-xl border border-border/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{category.displayName}</p>
                                <Badge variant="outline">{category.permissions.length} permisos</Badge>
                                {criticalInCategory > 0 && (
                                  <Badge variant="secondary">{criticalInCategory} críticos</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {category.description || 'Sin descripción disponible.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Buenas prácticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Usa roles cortos y orientados a función, no a personas específicas.</p>
                    <p>Duplica un rol base cuando necesites personalizar permisos sin romper la referencia global.</p>
                    <p>Elimina roles sin usuarios asignados para mantener limpia la gobernanza.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(roleToDelete)} onOpenChange={(open) => { if (!open) setRoleToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el rol <strong>{roleToDelete?.displayName}</strong>.
              Solo se permite porque no tiene usuarios asignados dentro de esta organización.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (roleToDelete) {
                  await handleDelete(roleToDelete.id)
                  setRoleToDelete(null)
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => (!open ? resetDialog() : undefined)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Editar rol personalizado' : 'Crear rol personalizado'}</DialogTitle>
            <DialogDescription>
              {selectedRole
                ? 'Actualiza nombre, descripción y permisos del rol seleccionado.'
                : 'Crea un rol propio para la organización actual a partir del catálogo de permisos.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre visible</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(event) => setFormData((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="Ej. Encargado de salón"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Código interno</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: formatRoleCode(event.target.value) }))}
                  placeholder="Ej. ENCARGADO_SALON"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe el alcance operativo de este rol."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <div className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData((current) => ({ ...current, isActive: checked }))}
                  />
                  <span className="text-sm text-foreground">{formData.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Alcance</p>
                <p className="mt-2 text-sm font-medium text-foreground">{selectedOrganizationName || currentOrganization}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Este rol solo afectará a la organización actualmente seleccionada.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Permisos</h3>
                <p className="text-sm text-muted-foreground">
                  Selecciona las capacidades exactas del rol. Evita otorgar más acceso del necesario.
                </p>
              </div>

              <ScrollArea className="h-96 rounded-xl border border-border p-4">
                <div className="space-y-4">
                  {permissionCategories.map((category) => {
                    const Icon = category.icon
                    const selectedCategoryPermissions = category.permissions.filter((item) => formData.permissions.includes(item.id))
                    const isAllSelected = category.permissions.length > 0
                      && selectedCategoryPermissions.length === category.permissions.length

                    return (
                      <div key={category.id} className="rounded-xl border border-border/70 p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={(checked) => handleCategoryToggle(category.id, Boolean(checked))}
                            className="mt-1"
                          />
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">{category.displayName}</p>
                              <Badge variant="outline">
                                {selectedCategoryPermissions.length}/{category.permissions.length}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {category.description || 'Sin descripción disponible.'}
                            </p>

                            <div className="space-y-2">
                              {category.permissions.map((permission) => (
                                <label
                                  key={permission.id}
                                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3"
                                >
                                  <Checkbox
                                    checked={formData.permissions.includes(permission.id)}
                                    onCheckedChange={(checked) => handlePermissionToggle(permission.id, Boolean(checked))}
                                    className="mt-0.5"
                                  />
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">{permission.displayName}</span>
                                      {permission.isSystemPermission && (
                                        <Badge variant="secondary">Crítico</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {permission.description || permission.name}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <p className="text-sm text-muted-foreground">
                Permisos seleccionados: {formData.permissions.length} de {permissions.length}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedRole ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
