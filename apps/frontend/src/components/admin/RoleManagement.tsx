'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Shield, Plus, Search, Settings, Users, Key, Lock, Unlock,
  Edit, Trash2, Copy, MoreHorizontal, CheckCircle, XCircle,
  AlertTriangle, Info, Eye, EyeOff, Save, X, ChevronDown,
  ChevronRight, Database, ShoppingCart, FileText, BarChart3,
  UserCheck, Cog, Building, Package, DollarSign, Calendar,
  Building2, Filter
} from 'lucide-react'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { roleService } from '@/lib/services/role-service'

// Types
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
  color: string
  isSystemRole: boolean
  isActive: boolean
  permissions: Permission[]
  userCount: number
  createdAt: string
  updatedAt: string
  organizationId?: string
  organizationName?: string
}

interface PermissionCategory {
  id: string
  name: string
  displayName: string
  description: string
  icon: React.ComponentType<any>
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
  permissions: []
}

const ROLE_COLORS: Record<string, string> = {
  'ADMIN': 'bg-red-100 text-red-800 border-red-200',
  'MANAGER': 'bg-purple-100 text-purple-800 border-purple-200',
  'CASHIER': 'bg-blue-100 text-blue-800 border-blue-200',
  'INVENTORY_MANAGER': 'bg-orange-100 text-orange-800 border-orange-200',
  'VIEWER': 'bg-gray-100 text-gray-800 border-gray-200',
  'DEFAULT': 'bg-slate-100 text-slate-800 border-slate-200'
}

export default function RoleManagement() {
  // State
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionCategories, setPermissionCategories] = useState<PermissionCategory[]>([])
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [currentOrganization, setCurrentOrganization] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [formData, setFormData] = useState<RoleFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('roles')
  const [isAdmin, setIsAdmin] = useState(false)

  const { toast } = useToast()

  // Helpers de mapeo entre API y UI
  const iconForCategory = (name: string) => {
    switch (name) {
      case 'users': return Users
      case 'products': return Package
      case 'sales': return ShoppingCart
      case 'reports': return BarChart3
      case 'settings': return Cog
      case 'system': return Database
      default: return Key
    }
  }

  const getRoleColor = (roleName: string) => {
    const normalized = roleName.toUpperCase()
    return ROLE_COLORS[normalized] || ROLE_COLORS['DEFAULT']
  }

  const mapPermission = (p: any): Permission => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    description: p.description || '',
    resource: p.resource,
    action: p.action,
    category: p.category,
    isSystemPermission: !!p.isSystem,
  })

  const mapRole = (r: any): Role => ({
    id: r.id,
    name: r.name,
    displayName: r.displayName,
    description: r.description || '',
    color: getRoleColor(r.name),
    isSystemRole: !!r.isSystem,
    isActive: !!r.isActive,
    permissions: Array.isArray(r.permissions) ? r.permissions.map(mapPermission) : [],
    userCount: r.userCount ?? 0,
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
  })

  const mapPermissionCategory = (c: any): PermissionCategory => ({
    id: c.id,
    name: c.name,
    displayName: c.displayName,
    description: c.description || '',
    icon: iconForCategory(c.name),
    permissions: Array.isArray(c.permissions) ? c.permissions.map(mapPermission) : [],
  })

  // Effects
  useEffect(() => {
    loadData()
    loadOrganizations()
    checkUserRole()
  }, [])

  useEffect(() => {
    // Expandir todas las categorías por defecto cuando se carguen
    if (permissionCategories.length > 0) {
      setExpandedCategories(permissionCategories.map(cat => cat.id))
    }
  }, [permissionCategories])

  // Computed values
  const filteredRoles = useMemo(() => {
    let filtered = roles
    
    // Filtrar por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(role => 
        role.displayName.toLowerCase().includes(searchLower) ||
        role.description.toLowerCase().includes(searchLower) ||
        role.name.toLowerCase().includes(searchLower)
      )
    }
    
    // Filtrar por organización (si está seleccionada y no es admin viendo todas)
    if (currentOrganization && currentOrganization !== 'all') {
      filtered = filtered.filter(role => 
        role.organizationId === currentOrganization || !role.organizationId // Incluir roles globales
      )
    }
    
    return filtered
  }, [searchTerm, roles, currentOrganization])

  const roleStats = useMemo(() => {
    const total = roles.length
    const active = roles.filter(r => r.isActive).length
    const inactive = roles.filter(r => !r.isActive).length
    const system = roles.filter(r => r.isSystemRole).length
    const custom = roles.filter(r => !r.isSystemRole).length
    return { total, active, inactive, system, custom }
  }, [roles])

  // Functions
  const checkUserRole = async () => {
    try {
      const response = await fetch('/api/auth/profile')
      const data = await response.json()
      if (data.success && data.data) {
        const userRole = data.data.role
        setIsAdmin(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
      }
    } catch (error) {
      console.error('Error checking user role:', error)
    }
  }

  const loadOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/organizations')
      const data = await response.json()
      if (data.success && data.organizations) {
        setOrganizations(data.organizations)
        if (data.organizations.length > 0 && !currentOrganization) {
          setCurrentOrganization(data.organizations[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading organizations:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [apiRoles, apiCategories] = await Promise.all([
        roleService.getRoles(true),
        roleService.getPermissionsByCategory(),
      ])

      const mappedRoles = apiRoles.map((r: any) => {
        const role = mapRole(r)
        // Agregar información de organización si está disponible
        const orgFilter = currentOrganization && currentOrganization !== 'all' ? currentOrganization : null
        if (orgFilter) {
          role.organizationId = orgFilter
          const org = organizations.find(o => o.id === orgFilter)
          if (org) {
            role.organizationName = org.name
          }
        }
        return role
      })
      const mappedCategories = apiCategories.map(mapPermissionCategory)
      const flatPermissions = mappedCategories.flatMap(c => c.permissions)

      setRoles(mappedRoles)
      setPermissionCategories(mappedCategories)
      setPermissions(flatPermissions)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
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
      permissions: role.permissions.map(p => p.id)
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      
      // Validaciones
      if (!formData.displayName.trim()) {
        toast({
          title: 'Error de validación',
          description: 'El nombre del rol es requerido',
          variant: 'destructive'
        })
        return
      }

      if (!formData.name.trim()) {
        // Auto-generar nombre técnico si no se proporciona
        setFormData(prev => ({ 
          ...prev, 
          name: prev.displayName.toUpperCase().replace(/\s+/g, '_') 
        }))
      }

      if (formData.permissions.length === 0) {
        toast({
          title: 'Error de validación',
          description: 'Debe asignar al menos un permiso',
          variant: 'destructive'
        })
        return
      }

      // Enviar datos a la API
      if (selectedRole) {
        await roleService.updateRole(selectedRole.id, {
          displayName: formData.displayName,
          description: formData.description,
          isActive: formData.isActive,
          permissions: formData.permissions,
        })
      } else {
        await roleService.createRole({
          name: formData.name || formData.displayName.toUpperCase().replace(/\s+/g, '_'),
          displayName: formData.displayName,
          description: formData.description,
          isActive: formData.isActive,
          permissions: formData.permissions,
          priority: 50,
        } as any)
      }

      toast({
        title: 'Éxito',
        description: selectedRole ? 'Rol actualizado correctamente' : 'Rol creado correctamente'
      })

      setIsCreateDialogOpen(false)
      setIsEditDialogOpen(false)
      setSelectedRole(null)
      setFormData(INITIAL_FORM_DATA)
      await loadData()

    } catch (error) {
      console.error('Error submitting form:', error)
      toast({
        title: 'Error',
        description: 'Error al procesar la solicitud',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (roleId: string) => {
    try {
      await roleService.deleteRole(roleId)
      toast({ title: 'Éxito', description: 'Rol eliminado correctamente' })
      await loadData()
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({
        title: 'Error',
        description: 'Error al eliminar rol',
        variant: 'destructive'
      })
    }
  }

  const handleToggleStatus = async (role: Role) => {
    try {
      await roleService.toggleRoleStatus(role.id, !role.isActive)
      toast({ 
        title: 'Éxito', 
        description: `Rol ${role.isActive ? 'desactivado' : 'activado'} correctamente` 
      })
      await loadData()
    } catch (error) {
      console.error('Error toggling role status:', error)
      toast({
        title: 'Error',
        description: 'Error al cambiar estado del rol',
        variant: 'destructive'
      })
    }
  }

  const handleCloneRoleApi = async (role: Role) => {
    try {
      const baseName = role.name.toUpperCase()
      const newName = `${baseName}_COPY`
      const newDisplayName = `${role.displayName} (Copia)`
      await roleService.cloneRole(role.id, newName, newDisplayName)
      toast({ title: 'Éxito', description: 'Rol duplicado correctamente' })
      await loadData()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Error al duplicar rol', variant: 'destructive' })
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ 
        ...prev, 
        permissions: [...prev.permissions, permissionId] 
      }))
    } else {
      setFormData(prev => ({ 
        ...prev, 
        permissions: prev.permissions.filter(id => id !== permissionId) 
      }))
    }
  }

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    const category = permissionCategories.find(cat => cat.id === categoryId)
    if (!category) return

    const categoryPermissionIds = category.permissions.map(p => p.id)
    
    if (checked) {
      // Agregar todos los permisos de la categoría
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissionIds])]
      }))
    } else {
      // Remover todos los permisos de la categoría
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => !categoryPermissionIds.includes(id))
      }))
    }
  }

  const getRoleColorClass = (color: string) => {
    // color is actually the CSS classes string from getRoleColor
    // which comes from ROLE_COLORS[name]
    // Since we are storing the full class string in role.color, we can just return it.
    // However, the original code logic was trying to find config in ROLE_COLORS array which is now an object.
    
    // If role.color is already a class string (e.g. 'bg-red-100...'), use it.
    if (color && color.includes('bg-')) return color
    
    // Fallback
    return ROLE_COLORS['DEFAULT']
  }

  const getPermissionIcon = (category: string) => {
    const categoryConfig = permissionCategories.find(cat => cat.id === category)
    return categoryConfig?.icon || Key
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando roles...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
            Gestión de Roles y Permisos
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra roles, permisos y controla el acceso al sistema
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          <Plus className="w-4 h-4" />
          Nuevo Rol
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Roles</p>
                <p className="text-2xl font-bold">{roleStats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{roleStats.active}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-green-700 shadow-lg shadow-green-500/25">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{roleStats.inactive}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 shadow-lg shadow-gray-500/25">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sistema</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{roleStats.system}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg shadow-purple-500/25">
                <Lock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Personalizados</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{roleStats.custom}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25">
                <Settings className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          {/* Search and Filters */}
          <Card className="glass-dark-card border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar roles por nombre o descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800/50 border-slate-700"
                    />
                  </div>
                </div>

                {/* Organization Filter - Solo visible para admins */}
                {isAdmin && organizations.length > 0 && (
                  <Select 
                    value={currentOrganization || 'all'} 
                    onValueChange={(value) => {
                      setCurrentOrganization(value === 'all' ? null : value)
                    }}
                  >
                    <SelectTrigger className="w-64 bg-slate-800/50 border-slate-700">
                      <Building2 className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Organización" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las organizaciones</SelectItem>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roles Table */}
          <Card className="glass-dark-card border-slate-700/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50">
                    <TableHead>Rol</TableHead>
                    {isAdmin && <TableHead>Organización</TableHead>}
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Última modificación</TableHead>
                    <TableHead className="w-12">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.id} className="border-slate-700/50 hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getRoleColorClass(role.color).replace('text-', 'bg-').replace('border-', '').replace('bg-', 'bg-')}`} />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {role.displayName}
                              {role.isSystemRole && (
                                <Badge variant="outline" className="text-xs border-slate-600 bg-slate-800/50">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Sistema
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {role.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {role.organizationName ? (
                            <Badge variant="outline" className="gap-1 border-slate-600 bg-slate-800/50">
                              <Building2 className="w-3 h-3" />
                              {role.organizationName}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-purple-600 bg-purple-900/30 text-purple-400">
                              <Shield className="w-3 h-3" />
                              Global
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{role.userCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{role.permissions.length}</span>
                          <span className="text-sm text-muted-foreground">permisos</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={role.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}>
                          {role.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactivo
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(role.updatedAt).toLocaleDateString('es-PY')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(role)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCloneRoleApi(role)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(role)}>
                              {role.isActive ? (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!role.isSystemRole && (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDelete(role.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card className="glass-dark-card border-slate-700/50">
            <CardHeader>
              <CardTitle>Permisos del Sistema</CardTitle>
              <CardDescription>
                Vista detallada de todos los permisos disponibles organizados por categoría
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {permissionCategories.map((category) => {
                const Icon = category.icon
                const isExpanded = expandedCategories.includes(category.id)
                
                return (
                  <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{category.displayName}</div>
                            <div className="text-sm text-muted-foreground">{category.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-600 bg-slate-800/50">{category.permissions.length} permisos</Badge>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {category.permissions.map((permission) => (
                          <Card key={permission.id} className="p-3 glass-dark-card border-slate-700/50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {permission.displayName}
                                  {permission.isSystemPermission && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Crítico
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {permission.description}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <code className="bg-slate-800/50 px-1 rounded">{permission.name}</code>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Role Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          setSelectedRole(null)
          setFormData(INITIAL_FORM_DATA)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
            </DialogTitle>
            <DialogDescription>
              {selectedRole 
                ? 'Modifica la información y permisos del rol seleccionado'
                : 'Define un nuevo rol con sus permisos correspondientes'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre del Rol *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Ej: Gerente de Ventas"
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre Técnico</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: SALES_MANAGER"
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe las responsabilidades y alcance de este rol..."
                  rows={3}
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label className="text-sm">
                    {formData.isActive ? 'Activo' : 'Inactivo'}
                  </Label>
                </div>
              </div>

              {/* Organization Scope Info */}
              {isAdmin && currentOrganization && currentOrganization !== 'all' && (
                <div className="col-span-2">
                  <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400">
                        Este rol se creará para la organización: <strong>{organizations.find(o => o.id === currentOrganization)?.name}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && (!currentOrganization || currentOrganization === 'all') && (
                <div className="col-span-2">
                  <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-400">
                        Este rol será <strong>global</strong> y estará disponible para todas las organizaciones
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Permissions */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Permisos</h3>
                <p className="text-sm text-muted-foreground">
                  Selecciona los permisos que tendrá este rol
                </p>
              </div>

              <ScrollArea className="h-96 border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                <div className="space-y-4">
                  {permissionCategories.map((category) => {
                    const Icon = category.icon
                    const categoryPermissions = category.permissions
                    const selectedCategoryPermissions = categoryPermissions.filter(p => formData.permissions.includes(p.id))
                    const isAllSelected = selectedCategoryPermissions.length === categoryPermissions.length
                    const isPartiallySelected = selectedCategoryPermissions.length > 0 && selectedCategoryPermissions.length < categoryPermissions.length

                    return (
                      <div key={category.id} className="space-y-3">
                        <div className="flex items-center space-x-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={(checked) => handleCategoryToggle(category.id, !!checked)}
                          />
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <Label className="font-medium flex-1">
                            {category.displayName}
                          </Label>
                          <Badge variant="outline" className="border-slate-600 bg-slate-800/50">
                            {selectedCategoryPermissions.length}/{categoryPermissions.length}
                          </Badge>
                        </div>

                        <div className="ml-6 space-y-2">
                          {categoryPermissions.map((permission) => (
                            <div key={permission.id} className="flex items-start space-x-2 p-2 rounded hover:bg-slate-800/30">
                              <Checkbox
                                checked={formData.permissions.includes(permission.id)}
                                onCheckedChange={(checked) => handlePermissionToggle(permission.id, !!checked)}
                              />
                              <div className="flex-1">
                                <Label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                                  {permission.displayName}
                                  {permission.isSystemPermission && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Crítico
                                    </Badge>
                                  )}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <div className="text-sm text-muted-foreground">
                Permisos seleccionados: {formData.permissions.length} de {permissions.length}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false)
                setIsEditDialogOpen(false)
                setSelectedRole(null)
                setFormData(INITIAL_FORM_DATA)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {selectedRole ? 'Actualizar' : 'Crear'} Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
