import { 
  UserFormData, 
  UserUpdateData, 
  BulkUserActionData,
  validateUniqueEmail,
  validateUserRoleAssignment 
} from '@/lib/validations/user-validations'
import { createClient } from '@/lib/supabase'
import { AdminApiService } from '@/lib/services/admin-api'
import { api } from '@/lib/api'

// Interfaz actualizada para coincidir con la estructura de Supabase
export interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  role: string
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  department?: string
  job_position?: string
  employee_id?: string
  supervisor_id?: string
  work_location?: string
  start_date?: string
  work_phone?: string
  work_email?: string
  skills?: string[]
  certifications?: string[]
  professional_bio?: string
  user_location?: string
  bio?: string
  avatar?: string
  location?: string
  last_login?: string
  created_at: string
  updated_at: string
  createdAt?: string
  updatedAt?: string
  // Campos calculados para compatibilidad
  firstName?: string
  lastName?: string
  isActive?: boolean
  permissions?: string[]
  loginCount?: number
  profileImage?: string
}

export interface UserFilters {
  search?: string
  role?: string
  department?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'all'
  dateRange?: {
    from: string
    to: string
  }
}

export interface UserStats {
  total: number
  active: number
  inactive: number
  byRole: Record<string, number>
  byDepartment: Record<string, number>
  recentLogins: number
}

export interface PaginatedUsers {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Extender datos de actualización para incluir campos profesionales opcionales
type ExtendedUpdateData = Partial<UserUpdateData> & {
  jobPosition?: string
  employeeId?: string
  workLocation?: string
  startDate?: string
  workPhone?: string
  workEmail?: string
  skills?: string[]
  certifications?: string[]
  professionalBio?: string
}

// Extender datos de creación para incluir campos profesionales opcionales
type ExtendedCreateData = UserFormData & {
  jobPosition?: string
  employeeId?: string
  workLocation?: string
  startDate?: string
  workPhone?: string
  workEmail?: string
  skills?: string[]
  certifications?: string[]
  professionalBio?: string
}

class UserService {
  private supabase = createClient()

  // Mapea permisos básicos por rol para compatibilidad en el cliente
  private getRolePermissions(role?: string): string[] {
    const map: Record<string, string[]> = {
      ADMIN: [
        'users:read', 'users:write',
        'products:read', 'products:write',
        'sales:read', 'sales:write',
        'inventory:read', 'inventory:write',
        'reports:read', 'reports:export',
        'settings:read'
      ],
      MANAGER: [
        'users:read',
        'products:read', 'products:write',
        'sales:read', 'sales:write',
        'inventory:read', 'inventory:write',
        'reports:read', 'reports:export',
        'settings:read'
      ],
      EMPLOYEE: [
        'products:read',
        'sales:read', 'sales:write',
        'inventory:read'
      ],
      CASHIER: [
        'products:read',
        'sales:read', 'sales:write'
      ],
      VIEWER: [
        'products:read', 'sales:read', 'inventory:read'
      ]
    }
    const key = (role || 'VIEWER').toUpperCase()
    return map[key] || []
  }

  // Función auxiliar para transformar datos de Supabase al formato esperado
  private transformUser(supabaseUser: any): User {
    const nameParts = supabaseUser.full_name?.split(' ') || supabaseUser.name?.split(' ') || ['', '']
    return {
      ...supabaseUser,
      full_name: supabaseUser.full_name ?? supabaseUser.name ?? '',
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      isActive: (supabaseUser.status ?? (supabaseUser.is_active ? 'ACTIVE' : 'INACTIVE')) === 'ACTIVE',
      permissions: this.getRolePermissions(supabaseUser.role),
      loginCount: 0,
      profileImage: supabaseUser.avatar,
      created_at: supabaseUser.created_at ?? supabaseUser.createdAt,
      updated_at: supabaseUser.updated_at ?? supabaseUser.updatedAt,
      createdAt: supabaseUser.created_at ?? supabaseUser.createdAt,
      updatedAt: supabaseUser.updated_at ?? supabaseUser.updatedAt
    }
  }

  // Transformar usuario proveniente del API (/api/users)
  private transformApiUser(apiUser: any): User {
    const name = apiUser.name || ''
    const nameParts = name.split(' ')
    const statusText = apiUser.status === 'suspended'
      ? 'SUSPENDED'
      : (apiUser.status === 'active' ? 'ACTIVE' : 'INACTIVE')
    return {
      id: apiUser.id,
      full_name: name,
      email: apiUser.email,
      phone: apiUser.phone,
      role: apiUser.role || 'VIEWER',
      status: statusText,
      department: undefined,
      job_position: undefined,
      employee_id: undefined,
      supervisor_id: undefined,
      work_location: undefined,
      start_date: undefined,
      work_phone: undefined,
      work_email: undefined,
      skills: [],
      certifications: [],
      professional_bio: undefined,
      user_location: undefined,
      bio: undefined,
      avatar: undefined,
      location: undefined,
      last_login: apiUser.lastLogin,
      created_at: apiUser.createdAt,
      updated_at: apiUser.lastLogin || apiUser.createdAt,
      // Campos calculados
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      isActive: statusText === 'ACTIVE',
      permissions: this.getRolePermissions(apiUser.role || 'VIEWER'),
      loginCount: 0,
      profileImage: undefined,
      createdAt: apiUser.createdAt,
      updatedAt: apiUser.lastLogin || apiUser.createdAt
    }
  }

  // Obtener usuarios con paginación y filtros
  async getUsers(
    page: number = 1, 
    limit: number = 10, 
    filters?: UserFilters
  ): Promise<PaginatedUsers> {
    // Si supabase no está disponible (modo mock), usar API del servidor
    const canUseSupabase = typeof (this.supabase as any)?.from === 'function'
    const preferApiList = true

    const tryApiFallback = async (): Promise<PaginatedUsers> => {
      const { users: apiUsers, total } = await AdminApiService.getUsers({
        page,
        limit,
        search: filters?.search,
        role: filters?.role && filters.role !== 'all' ? filters.role : undefined,
        source: 'auth',
      })
      const users = (apiUsers || []).map(u => this.transformApiUser(u))
      const totalPages = Math.ceil((total || users.length) / limit)
      return { users, total: total || users.length, page, limit, totalPages }
    }

    if (preferApiList || !canUseSupabase) {
      try {
        return await tryApiFallback()
      } catch (error) {
        console.error('Error via API fallback:', error)
        throw new Error('No se pudieron cargar los usuarios')
      }
    }

    if (!canUseSupabase) {
      try {
        return await tryApiFallback()
      } catch (error) {
        console.error('Error via API fallback:', error)
        throw new Error('No se pudieron cargar los usuarios')
      }
    }

    try {
      let query = (this.supabase as any)
        .from('users')
        .select('*', { count: 'exact' })

      // Aplicar filtros de forma compatible con distintos esquemas
      if (filters?.search) {
        // Intentar buscar por full_name; si falla, fallback a name
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      if (filters?.role && filters.role !== 'all') {
        // Algunos esquemas guardan rol en tabla aparte; evitar fallo
        query = query.eq('role', filters.role)
      }

      if (filters?.department) {
        query = query.eq('department', filters.department)
      }

      if (filters?.status && filters.status !== 'all') {
        // Soportar status texto y boolean is_active
        const statusVal = filters.status
        if (statusVal === 'ACTIVE' || statusVal === 'INACTIVE' || statusVal === 'SUSPENDED') {
          query = query.eq('status', statusVal)
        }
      }

      // Aplicar paginación
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.warn('Supabase error, usando fallback API /api/users:', error?.message || error)
        // Fallback al API del servidor si consulta directa falla por RLS/columnas
        return await tryApiFallback()
      }

      const users = (data || []).map((user: any) => this.transformUser(user))
      const total = count || users.length || 0
      const totalPages = Math.ceil(total / limit)

      return {
        users,
        total,
        page,
        limit,
        totalPages
      }
    } catch (error) {
      console.error('Error fetching users (Supabase + fallback):', error)
      try {
        return await tryApiFallback()
      } catch (err) {
        console.error('Error fetching users via API after Supabase failure:', err)
        throw new Error('No se pudieron cargar los usuarios')
      }
    }
  }

  // Obtener usuario por ID
  async getUserById(id: string): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Usuario no encontrado')
        }
        throw new Error('Error al cargar usuario')
      }

      return this.transformUser(data)
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  }

  // Crear nuevo usuario
  async createUser(userData: ExtendedCreateData): Promise<User> {
    try {
      // Validar email único
      const isEmailUnique = await validateUniqueEmail(userData.email)
      if (!isEmailUnique) {
        throw new Error('El email ya está en uso')
      }

      // Transformar datos del formulario al formato de Supabase
      const supabaseData = {
        full_name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        department: userData.department,
        job_position: userData.jobPosition,
        employee_id: userData.employeeId,
        work_location: userData.workLocation,
        start_date: userData.startDate,
        work_phone: userData.workPhone,
        work_email: userData.workEmail,
        skills: userData.skills,
        certifications: userData.certifications,
        professional_bio: userData.professionalBio
      }

      const { data, error } = await this.supabase
        .from('users')
        .insert([supabaseData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error('Error al crear usuario')
      }

      return this.transformUser(data)
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  // Actualizar usuario
  async updateUser(id: string, userData: ExtendedUpdateData): Promise<User> {
    try {
      // Validar email único si se está actualizando
      if (userData.email) {
        const isEmailUnique = await validateUniqueEmail(userData.email, id)
        if (!isEmailUnique) {
          throw new Error('El email ya está en uso')
        }
      }

      // Transformar datos del formulario al formato de Supabase
      const supabaseData: any = {}
      if (userData.firstName || userData.lastName) {
        supabaseData.full_name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      }
      if (userData.email) supabaseData.email = userData.email
      if (userData.phone) supabaseData.phone = userData.phone
      if (userData.role) supabaseData.role = userData.role
      if (userData.department) supabaseData.department = userData.department
      if (userData.jobPosition) supabaseData.job_position = userData.jobPosition
      if (userData.employeeId) supabaseData.employee_id = userData.employeeId
      if (userData.workLocation) supabaseData.work_location = userData.workLocation
      if (userData.startDate) supabaseData.start_date = userData.startDate
      if (userData.workPhone) supabaseData.work_phone = userData.workPhone
      if (userData.workEmail) supabaseData.work_email = userData.workEmail
      if (userData.skills) supabaseData.skills = userData.skills
      if (userData.certifications) supabaseData.certifications = userData.certifications
      if (userData.professionalBio) supabaseData.professional_bio = userData.professionalBio

      const { data, error } = await this.supabase
        .from('users')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error('Error al actualizar usuario')
      }

      return this.transformUser(data)
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  // Eliminar usuario (cambiar rol a INACTIVE)
  async deleteUser(id: string): Promise<void> {
    try {
      await AdminApiService.deleteUser(id)
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  // Cambiar estado de usuario (activar/desactivar)
  async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
    try {
      const updated = isActive 
        ? await this.activateUser(id)
        : await this.deactivateUser(id)
      return updated
    } catch (error) {
      console.error('Error toggling user status:', error)
      throw error
    }
  }

  // Asignar rol a usuario
  async assignRole(userId: string, role: string): Promise<User> {
    try {
      // Validar asignación de rol
      const isValidAssignment = validateUserRoleAssignment(userId, [role])
      if (!isValidAssignment) {
        throw new Error('Asignación de rol no válida')
      }

      // Usar AdminApiService para mantener consistencia con rutas existentes
      // La API de update requiere nombre y email; intentamos obtenerlos primero.
      let current: User | null = null
      try {
        current = await this.getUserById(userId)
      } catch {
        current = null
      }

      const updated = await AdminApiService.updateUser(userId, {
        name: current?.full_name || `${current?.firstName || ''} ${current?.lastName || ''}`.trim() || 'Usuario',
        email: current?.email || 'usuario@sistema.com',
        role,
      })
      return this.transformApiUser(updated)
    } catch (error) {
      console.error('Error assigning role:', error)
      throw error
    }
  }

  // Operaciones en lote
  async bulkAction(actionData: BulkUserActionData): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const results = { success: 0, failed: 0, errors: [] as string[] }

      for (const userId of actionData.userIds) {
        try {
          switch (actionData.action) {
            case 'activate':
              await this.activateUser(userId)
              break
            case 'deactivate':
              await this.deactivateUser(userId)
              break
            case 'delete':
              await this.deleteUser(userId)
              break
            case 'assign_role':
              if (actionData.roleId) {
                await this.assignRole(userId, actionData.roleId)
              }
              break
          }
          results.success++
        } catch (error) {
          results.failed++
          results.errors.push(`Usuario ${userId}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
      }

      return results
    } catch (error) {
      console.error('Error in bulk action:', error)
      throw error
    }
  }

  // Obtener estadísticas de usuarios
  async getUserStats(): Promise<UserStats> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('role, department, created_at, status')

      if (error) {
        console.error('Supabase error:', error)
        throw new Error('Error al cargar estadísticas')
      }

      const users: Array<{ role: string; department?: string; created_at: string; status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }> = data || []
      const total = users.length
      const active = users.filter((u) => u.status !== 'INACTIVE').length
      const inactive = total - active

      // Contar por rol
      const byRole: Record<string, number> = {}
      users.forEach((user) => {
        byRole[user.role] = (byRole[user.role] || 0) + 1
      })

      // Contar por departamento
      const byDepartment: Record<string, number> = {}
      users.forEach((user) => {
        if (user.department) {
          byDepartment[user.department] = (byDepartment[user.department] || 0) + 1
        }
      })

      // Logins recientes (últimos 7 días) - simulado por ahora
      const recentLogins = Math.floor(active * 0.7)

      return {
        total,
        active,
        inactive,
        byRole,
        byDepartment,
        recentLogins
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      throw new Error('No se pudieron cargar las estadísticas')
    }
  }

  // Buscar usuarios con autocompletado
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('status', 'INACTIVE')
        .limit(limit)

      if (error) {
        console.error('Supabase error:', error)
        throw new Error('Error en la búsqueda')
      }

      return (data || []).map((user: any) => this.transformUser(user))
    } catch (error) {
      console.error('Error searching users:', error)
      throw new Error('Error en la búsqueda de usuarios')
    }
  }

  // Exportar usuarios (simplificado)
  async exportUsers(filters?: UserFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    try {
      // Obtener todos los usuarios con filtros
      const { users } = await this.getUsers(1, 1000, filters)
      
      // Convertir a CSV
      const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Departamento', 'Fecha Creación']
      const csvContent = [
        headers.join(','),
        ...users.map(user => [
          user.id,
          user.full_name,
          user.email,
          user.phone || '',
          user.role,
          user.department || '',
          user.created_at
        ].join(','))
      ].join('\n')

      return new Blob([csvContent], { type: 'text/csv' })
    } catch (error) {
      console.error('Error exporting users:', error)
      throw new Error('Error al exportar usuarios')
    }
  }

  // Importar usuarios desde archivo (simplificado)
  async importUsers(file: File): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      // Por ahora, retornamos un resultado simulado
      // En una implementación completa, se procesaría el archivo CSV/Excel
      return {
        success: 0,
        failed: 0,
        errors: ['Función de importación no implementada aún']
      }
    } catch (error) {
      console.error('Error importing users:', error)
      throw error
    }
  }

  // Resetear contraseña (simplificado)
  async resetPassword(userId: string): Promise<{ temporaryPassword: string }> {
    try {
      // Verificar que el usuario existe
      const { data: user, error } = await this.supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .single()

      if (error || !user) {
        throw new Error('Usuario no encontrado')
      }

      // Por ahora, generamos una contraseña temporal simulada
      const temporaryPassword = Math.random().toString(36).slice(-8)
      
      return { temporaryPassword }
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  // Obtener historial de actividad del usuario (simplificado)
  async getUserActivity(userId: string, page: number = 1, limit: number = 20): Promise<{
    activities: Array<{
      id: string
      action: string
      description: string
      timestamp: string
      ipAddress?: string
      userAgent?: string
    }>
    total: number
    page: number
    totalPages: number
  }> {
    try {
      // Verificar que el usuario existe
      const { data: user, error } = await this.supabase
        .from('users')
        .select('id, full_name')
        .eq('id', userId)
        .single()

      if (error || !user) {
        throw new Error('Usuario no encontrado')
      }

      // Por ahora, retornamos actividades simuladas
      const activities = [
        {
          id: '1',
          action: 'login',
          description: 'Inicio de sesión',
          timestamp: new Date().toISOString(),
          ipAddress: '192.168.1.1'
        }
      ]

      return {
        activities,
        total: activities.length,
        page,
        totalPages: 1
      }
    } catch (error) {
      console.error('Error fetching user activity:', error)
      throw new Error('No se pudo cargar el historial de actividad')
    }
  }

  // Cambiar estado del usuario
  async updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<User> {
    try {
      const { data } = await api.put(`/users/${userId}/status`, { status })
      const { user } = data || {}
      return this.transformApiUser(user)
    } catch (error) {
      console.error('Error updating user status:', error)
      throw error
    }
  }

  // Activar usuario
  async activateUser(userId: string): Promise<User> {
    try {
      const { data } = await api.put(`/users/${userId}/status`, { status: 'ACTIVE' })
      const { user } = data || {}
      return this.transformApiUser(user)
    } catch (error) {
      console.error('Error activating user:', error)
      throw error
    }
  }

  // Desactivar usuario
  async deactivateUser(userId: string): Promise<User> {
    try {
      const { data } = await api.put(`/users/${userId}/status`, { status: 'INACTIVE' })
      const { user } = data || {}
      return this.transformApiUser(user)
    } catch (error) {
      console.error('Error deactivating user:', error)
      throw error
    }
  }

  // Suspender usuario
  async suspendUser(userId: string): Promise<User> {
    try {
      const { data } = await api.put(`/users/${userId}/status`, { status: 'SUSPENDED' })
      const { user } = data || {}
      return this.transformApiUser(user)
    } catch (error) {
      console.error('Error suspending user:', error)
      throw error
    }
  }

  // Validar permisos de usuario
  async validateUserPermissions(userId: string, permissions: string[]): Promise<Record<string, boolean>> {
    try {
      const user = await this.getUserById(userId)
      if (!user) {
        throw new Error('Usuario no encontrado')
      }

      const userPermissions = user.permissions || []
      const result: Record<string, boolean> = {}
      
      permissions.forEach(permission => {
        result[permission] = userPermissions.includes(permission)
      })

      return result
    } catch (error) {
      console.error('Error validating permissions:', error)
      throw new Error('Error al validar permisos')
    }
  }
}

// Instancia singleton del servicio
export const userService = new UserService()

// Exportar también la clase para compatibilidad
export { UserService }

// Funciones de utilidad
export const formatUserName = (user: User): string => {
  return user.full_name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
}

export const getUserInitials = (user: User): string => {
  if (user.full_name) {
    const names = user.full_name.split(' ')
    return names.length >= 2 
      ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
      : names[0].charAt(0).toUpperCase()
  }
  return `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`.toUpperCase()
}

export const isUserActive = (user: User): boolean => {
  return user.status === 'ACTIVE' || user.isActive === true
}

export const getUserRoleDisplayName = (roleId: string): string => {
  const roleMap: Record<string, string> = {
    'ADMIN': 'Administrador',
    'MANAGER': 'Gerente',
    'CASHIER': 'Cajero',
    'EMPLOYEE': 'Empleado'
  }
  return roleMap[roleId] || roleId
}

export const canUserPerformAction = (user: User, permission: string): boolean => {
  return (user.permissions?.includes(permission) ?? false) || user.role === 'ADMIN'
}
