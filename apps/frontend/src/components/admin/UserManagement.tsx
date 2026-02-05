'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { 
  Users, Plus, Download, MoreHorizontal,
  Edit, Trash2, UserCheck, UserX,
  AlertTriangle, CheckCircle, Clock, User as UserIcon,
  RefreshCw, Search, Mail, Phone, Shield, Eye, Key, History,
  Building2, Filter
} from 'lucide-react'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
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
import { userService, getUserRoleDisplayName } from '@/lib/services/user-service'
import type { User as ServiceUser } from '@/lib/services/user-service'
import { AdminApiService } from '@/lib/services/admin-api'
const UserDetailsDialog = dynamic(() => import('./UserDetailsDialog'), { ssr: false })
const ResetPasswordDialog = dynamic(() => import('./ResetPasswordDialog'), { ssr: false })
const UserActivityDialog = dynamic(() => import('./UserActivityDialog'), { ssr: false })





// Types
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatar?: string
  phone?: string
  roles: Role[]
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'
  lastLogin?: string
  createdAt: string
  updatedAt: string
  loginAttempts: number
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  permissions: Permission[]
  organizationId?: string
  organizationName?: string
}

interface Role {
  id: string
  name: string
  displayName: string
  description?: string
  color: string
  permissions: Permission[]
}

interface Permission {
  id: string
  name: string
  displayName: string
  resource: string
  action: string
  description?: string
}

interface UserFilters {
  search: string
  role: string
  status: string
  dateRange: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  organizationId?: string
}

interface UserFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  roles: string[]
  status: string
  sendWelcomeEmail: boolean
  requirePasswordChange: boolean
  password?: string
  confirmPassword?: string
}

const INITIAL_FILTERS: UserFilters = {
  search: '',
  role: 'all',
  status: 'all',
  dateRange: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc'
}

const INITIAL_FORM_DATA: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  roles: [],
  status: 'ACTIVE',
  sendWelcomeEmail: true,
  requirePasswordChange: true,
  password: '',
  confirmPassword: ''
}

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 border-gray-200',
  SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

const ROLE_COLORS = {
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  CASHIER: 'bg-green-100 text-green-800 border-green-200',
  VIEWER: 'bg-gray-100 text-gray-800 border-gray-200'
}


// Mapea usuario del servicio a usuario de la UI
const toUIUser = (u: ServiceUser): User => {
  const fullName = u.full_name || `${u.firstName || ''} ${u.lastName || ''}`.trim()
  const roleName = u.role || 'VIEWER'
  const status = (u.status as User['status']) || (u.isActive ? 'ACTIVE' : 'INACTIVE')
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    fullName,
    avatar: u.avatar,
    phone: u.phone,
    roles: roleName ? [{
      id: roleName.toLowerCase(),
      name: roleName,
      displayName: getUserRoleDisplayName(roleName),
      color: 'gray',
      permissions: []
    }] : [],
    status,
    lastLogin: u.last_login,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    loginAttempts: u.loginCount || 0,
    isEmailVerified: false,
    twoFactorEnabled: false,
    permissions: []
  }
}

export default function UserManagement() {
  // State
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [currentOrganization, setCurrentOrganization] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<UserFilters>(INITIAL_FILTERS)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const { toast } = useToast()

  // Mock data - En producción esto vendría de la API
  const mockUsers: User[] = [
    {
      id: '1',
      email: 'admin@pos.com',
      firstName: 'Juan',
      lastName: 'Administrador',
      fullName: 'Juan Administrador',
      phone: '+595 21 123456',
      roles: [
        { 
          id: 'admin', 
          name: 'ADMIN', 
          displayName: 'Administrador', 
          color: 'purple',
          permissions: []
        }
      ],
      status: 'ACTIVE',
      lastLogin: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-20T10:30:00Z',
      loginAttempts: 0,
      isEmailVerified: true,
      twoFactorEnabled: true,
      permissions: []
    },
    {
      id: '2',
      email: 'maria.gonzalez@pos.com',
      firstName: 'María',
      lastName: 'González',
      fullName: 'María González',
      phone: '+595 21 654321',
      roles: [
        { 
          id: 'cashier', 
          name: 'CASHIER', 
          displayName: 'Cajero', 
          color: 'green',
          permissions: []
        }
      ],
      status: 'ACTIVE',
      lastLogin: '2024-01-20T09:15:00Z',
      createdAt: '2024-01-16T00:00:00Z',
      updatedAt: '2024-01-20T09:15:00Z',
      loginAttempts: 0,
      isEmailVerified: true,
      twoFactorEnabled: false,
      permissions: []
    }
  ]

  const mockRoles: Role[] = [
    {
      id: 'admin',
      name: 'ADMIN',
      displayName: 'Administrador',
      description: 'Acceso completo al sistema',
      color: 'purple',
      permissions: []
    },
    {
      id: 'manager',
      name: 'MANAGER',
      displayName: 'Gerente',
      description: 'Gestión de ventas y reportes',
      color: 'blue',
      permissions: []
    },
    {
      id: 'cashier',
      name: 'CASHIER',
      displayName: 'Cajero',
      description: 'Operaciones de venta',
      color: 'green',
      permissions: []
    }
  ]

  // Effects
  useEffect(() => {
    loadData()
    loadOrganizations()
    checkUserRole()
  }, [])

  useEffect(() => {
    // Simular filtrado en tiempo real
    const timeoutId = setTimeout(() => {
      // En producción, esto haría una llamada a la API con los filtros
      console.log('Aplicando filtros:', filters)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters])

  // Computed values
  const filteredUsers = useMemo(() => {
    let filtered = [...users]

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(user => 
        user.fullName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.phone || '').toLowerCase().includes(searchLower)
      )
    }

    // Filtro de rol
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => 
        user.roles.some(role => role.name === filters.role)
      )
    }

    // Filtro de estado
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === filters.status)
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof User] as string
      const bValue = b[filters.sortBy as keyof User] as string
      
      if (filters.sortOrder === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

    return filtered
  }, [filters, users])

  const userStats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.status === 'ACTIVE').length
    const inactive = users.filter(u => u.status === 'INACTIVE').length
    const suspended = users.filter(u => u.status === 'SUSPENDED').length
    const pending = users.filter(u => u.status === 'PENDING').length

    return { total, active, inactive, suspended, pending }
  }, [users])

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
        // Si hay organizaciones, seleccionar la primera por defecto
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
      const orgFilter = filters.organizationId || currentOrganization
      const { users: resultUsers } = await userService.getUsers(1, 25, {
        search: filters.search || undefined,
        role: filters.role !== 'all' ? filters.role : undefined,
        status: filters.status !== 'all' ? (filters.status as any) : undefined
      })
      
      // Mapear usuarios y agregar información de organización
      const mappedUsers = resultUsers.map(u => {
        const uiUser = toUIUser(u)
        // Agregar información de organización si está disponible
        if (orgFilter) {
          uiUser.organizationId = orgFilter
          const org = organizations.find(o => o.id === orgFilter)
          if (org) {
            uiUser.organizationName = org.name
          }
        }
        return uiUser
      })
      
      setUsers(mappedUsers)
      // Fallback de roles si aún no están cargados
      setRoles(prev => prev.length ? prev : [
        { id: 'admin', name: 'ADMIN', displayName: 'Administrador', color: 'purple', permissions: [] },
        { id: 'manager', name: 'MANAGER', displayName: 'Gerente', color: 'blue', permissions: [] },
        { id: 'cashier', name: 'CASHIER', displayName: 'Cajero', color: 'green', permissions: [] },
        { id: 'viewer', name: 'VIEWER', displayName: 'Visor', color: 'gray', permissions: [] }
      ])
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

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id))
    }
  }

  const openCreateDialog = () => {
    setFormData(INITIAL_FORM_DATA)
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      roles: user.roles.map(role => role.id),
      status: user.status,
      sendWelcomeEmail: false,
      requirePasswordChange: false
    })
    setIsEditDialogOpen(true)
  }

  const openDetailsDialog = (user: User) => {
    setSelectedUser(user)
    setIsDetailsDialogOpen(true)
  }

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user)
    setIsResetPasswordDialogOpen(true)
  }

  const openActivityDialog = (user: User) => {
    setSelectedUser(user)
    setIsActivityDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      
      // Validaciones
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        toast({
          title: 'Error de validación',
          description: 'Nombre, apellido y email son requeridos',
          variant: 'destructive'
        })
        return
      }

      if (formData.roles.length === 0) {
        toast({
          title: 'Error de validación',
          description: 'Debe asignar al menos un rol',
          variant: 'destructive'
        })
        return
      }

      const selectedRoleId = formData.roles[0]
      const selectedRole = mockRoles.find(r => r.id === selectedRoleId)?.name || 'VIEWER'
      const fullName = `${formData.firstName} ${formData.lastName}`.trim()

      if (!editingUser) {
        // Validaciones de contraseña para creación
        const pwd = (formData.password || '').trim()
        const confirm = (formData.confirmPassword || '').trim()
        if (!pwd || !confirm) {
          toast({ title: 'Error de validación', description: 'Contraseña y confirmación son requeridas', variant: 'destructive' })
          return
        }
        if (pwd.length < 8) {
          toast({ title: 'Contraseña muy corta', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
          return
        }
        if (pwd !== confirm) {
          toast({ title: 'No coinciden', description: 'Las contraseñas no coinciden', variant: 'destructive' })
          return
        }

        // Crear usuario vía API Admin
        try {
          await AdminApiService.createUser({
            email: formData.email.trim(),
            password: pwd,
            name: fullName,
            role: selectedRole
          })
          toast({ title: 'Éxito', description: 'Usuario creado correctamente' })
        } catch (err: any) {
          const msg = err?.response?.data?.error || err?.message || 'Error al crear usuario'
          toast({ title: 'Error', description: msg, variant: 'destructive' })
          return
        }
      } else if (editingUser) {
        // Actualización básica de usuario vía API Admin
        try {
          await AdminApiService.updateUser(editingUser.id, {
            name: fullName,
            email: formData.email.trim(),
            role: selectedRole
          })
          toast({ title: 'Éxito', description: 'Usuario actualizado correctamente' })
        } catch (err: any) {
          const msg = err?.response?.data?.error || err?.message || 'Error al actualizar usuario'
          toast({ title: 'Error', description: msg, variant: 'destructive' })
          return
        }
      }

      setIsCreateDialogOpen(false)
      setIsEditDialogOpen(false)
      setEditingUser(null)
      setFormData(INITIAL_FORM_DATA)
      loadData()

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

  const handleDelete = async (userId: string) => {
    try {
      await userService.deleteUser(userId)
      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente'
      })
      loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: 'Error al eliminar usuario',
        variant: 'destructive'
      })
    }
  }

  const handleStatusChange = async (userId: string, newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    try {
      if (newStatus === 'SUSPENDED') {
        await userService.suspendUser(userId)
      } else {
        await userService.updateUserStatus(userId, newStatus)
      }
      const statusLabels = {
        ACTIVE: 'activado',
        INACTIVE: 'desactivado',
        SUSPENDED: 'suspendido'
      }
      toast({
        title: 'Éxito',
        description: `Usuario ${statusLabels[newStatus]} correctamente`
      })
      loadData()
    } catch (error) {
      console.error('Error changing user status:', error)
      toast({
        title: 'Error',
        description: 'Error al cambiar el estado del usuario',
        variant: 'destructive'
      })
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Advertencia',
        description: 'Selecciona al menos un usuario',
        variant: 'destructive'
      })
      return
    }

    try {
      if (action === 'activate' || action === 'deactivate') {
        await userService.bulkAction({ userIds: selectedUsers, action: action as 'activate' | 'deactivate' })
      } else if (action === 'suspend') {
        for (const id of selectedUsers) {
          await userService.suspendUser(id)
        }
      } else if (action === 'delete') {
        await userService.bulkAction({ userIds: selectedUsers, action: 'delete' })
      }
      toast({
        title: 'Éxito',
        description: `Acción "${action}" aplicada a ${selectedUsers.length} usuarios`
      })
      setSelectedUsers([])
      loadData()
    } catch (error) {
      console.error('Error in bulk action:', error)
      toast({
        title: 'Error',
        description: 'Error al ejecutar la acción',
        variant: 'destructive'
      })
    }
  }

  const exportUsers = async () => {
    try {
      const blob = await userService.exportUsers({
        search: filters.search || undefined,
        role: filters.role !== 'all' ? filters.role : undefined,
        status: filters.status !== 'all' ? (filters.status as any) : undefined
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'usuarios.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast({
        title: 'Exportación iniciada',
        description: 'El archivo se descargó correctamente'
      })
    } catch (error) {
      console.error('Error exporting users:', error)
      toast({
        title: 'Error',
        description: 'No se pudo exportar usuarios',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { label: 'Activo', icon: CheckCircle },
      INACTIVE: { label: 'Inactivo', icon: UserX },
      SUSPENDED: { label: 'Suspendido', icon: AlertTriangle },
      PENDING: { label: 'Pendiente', icon: Clock }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    const Icon = config?.icon || UserIcon

    return (
      <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
        <Icon className="w-3 h-3 mr-1" />
        {config?.label || status}
      </Badge>
    )
  }

  const getRoleBadges = (roles: Role[]) => {
    return roles.map(role => (
      <Badge 
        key={role.id} 
        className={ROLE_COLORS[role.name as keyof typeof ROLE_COLORS]}
      >
        {role.displayName}
      </Badge>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando usuarios...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportUsers} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button onClick={openCreateDialog} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{userStats.active}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-green-700 shadow-lg shadow-green-500/25">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{userStats.inactive}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 shadow-lg shadow-gray-500/25">
                <UserX className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspendidos</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{userStats.suspended}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-lg shadow-red-500/25">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark-card border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{userStats.pending}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-700 shadow-lg shadow-yellow-500/25">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="glass-dark-card border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {/* Organization Filter - Solo visible para admins */}
              {isAdmin && organizations.length > 0 && (
                <Select 
                  value={currentOrganization || 'all'} 
                  onValueChange={(value) => {
                    setCurrentOrganization(value === 'all' ? null : value)
                    handleFilterChange('organizationId', value === 'all' ? '' : value)
                  }}
                >
                  <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700">
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

              <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {mockRoles.map(role => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullName">Nombre</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="createdAt">Fecha creación</SelectItem>
                  <SelectItem value="lastLogin">Último acceso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  {selectedUsers.length} usuario(s) seleccionado(s)
                </span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleBulkAction('activate')}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Activar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleBulkAction('deactivate')}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Desactivar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleBulkAction('suspend')}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Suspender
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-dark-card border-slate-700/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Usuario</TableHead>
                {isAdmin && <TableHead>Organización</TableHead>}
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Seguridad</TableHead>
                <TableHead className="w-12">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-slate-700/50 hover:bg-slate-800/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="border-2 border-slate-700">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {user.organizationName ? (
                        <Badge variant="outline" className="gap-1 border-slate-600 bg-slate-800/50">
                          <Building2 className="w-3 h-3" />
                          {user.organizationName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin organización</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getRoleBadges(user.roles)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.status)}
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? (
                      <div className="text-sm">
                        {new Date(user.lastLogin).toLocaleDateString('es-PY')}
                        <div className="text-xs text-muted-foreground">
                          {new Date(user.lastLogin).toLocaleTimeString('es-PY')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Nunca</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isEmailVerified ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Sin verificar
                        </Badge>
                      )}
                      {user.twoFactorEnabled && (
                        <Badge variant="outline" className="text-blue-600">
                          <Shield className="w-3 h-3 mr-1" />
                          2FA
                        </Badge>
                      )}
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
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDetailsDialog(user)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openResetPasswordDialog(user)}>
                          <Key className="w-4 h-4 mr-2" />
                          Restablecer contraseña
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openActivityDialog(user)}>
                          <History className="w-4 h-4 mr-2" />
                          Ver actividad
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === 'ACTIVE' && (
                          <>
                            <DropdownMenuItem 
                              className="text-orange-600"
                              onClick={() => handleStatusChange(user.id, 'INACTIVE')}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Desactivar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          </>
                        )}
                        {user.status === 'INACTIVE' && (
                          <DropdownMenuItem 
                            className="text-green-600"
                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activar
                          </DropdownMenuItem>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <DropdownMenuItem 
                            className="text-green-600"
                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Reactivar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          setEditingUser(null)
          setFormData(INITIAL_FORM_DATA)
        }
      }}>
        <DialogContent className="max-w-2xl" aria-labelledby="user-management-title">
          <DialogHeader>
            <DialogTitle id="user-management-title">
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Modifica la información del usuario seleccionado'
                : 'Completa los datos para crear un nuevo usuario'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Ingresa el nombre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Ingresa el apellido"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+595 21 123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Roles *</Label>
              <div className="space-y-2">
                {mockRoles.map(role => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={role.id}
                      checked={formData.roles.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({ ...prev, roles: [...prev.roles, role.id] }))
                        } else {
                          setFormData(prev => ({ ...prev, roles: prev.roles.filter(r => r !== role.id) }))
                        }
                      }}
                    />
                    <Label htmlFor={role.id} className="text-sm">
                      {role.displayName}
                      <span className="text-muted-foreground ml-1">({role.description})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!editingUser && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendWelcomeEmail"
                  checked={formData.sendWelcomeEmail}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendWelcomeEmail: !!checked }))}
                />
                <Label htmlFor="sendWelcomeEmail" className="text-sm">
                  Enviar email de bienvenida
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requirePasswordChange"
                  checked={formData.requirePasswordChange}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requirePasswordChange: !!checked }))}
                />
                <Label htmlFor="requirePasswordChange" className="text-sm">
                  Requerir cambio de contraseña en el primer acceso
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false)
                setIsEditDialogOpen(false)
                setEditingUser(null)
                setFormData(INITIAL_FORM_DATA)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? 'Actualizar' : 'Crear'} Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <UserDetailsDialog
        user={selectedUser}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        user={selectedUser}
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        onSuccess={loadData}
      />

      {/* User Activity Dialog */}
      <UserActivityDialog
        user={selectedUser}
        open={isActivityDialogOpen}
        onOpenChange={setIsActivityDialogOpen}
      />
    </div>
  )
}
