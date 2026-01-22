import { 
  RoleFormData, 
  RoleUpdateData,
  validateUniqueRoleName,
  validateRolePermissions 
} from '@/lib/validations/user-validations'
import { getEnvMode } from '@/lib/env'

export interface Permission {
  id: string
  name: string
  displayName: string
  resource: string
  action: string
  description?: string
  category: string
  isSystem: boolean
  createdAt: string
}

export interface Role {
  id: string
  name: string
  displayName: string
  description?: string
  permissions: Permission[]
  userCount: number
  isActive: boolean
  isSystem: boolean
  priority: number
  parentRoleId?: string
  createdAt: string
  updatedAt: string
}

export interface PermissionCategory {
  id: string
  name: string
  displayName: string
  description?: string
  permissions: Permission[]
  icon?: string
}

export interface RoleHierarchy {
  role: Role
  children: RoleHierarchy[]
  level: number
}

export interface RoleStats {
  total: number
  active: number
  inactive: number
  systemRoles: number
  customRoles: number
  totalPermissions: number
  mostUsedRole: string
  leastUsedRole: string
}

class RoleService {
  private baseUrl = '/api/roles'
  private permissionsUrl = '/api/permissions'
  private getHeaders(contentTypeJson: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {}
    if (contentTypeJson) {
      headers['Content-Type'] = 'application/json'
    }
    const mode = getEnvMode()
    if (mode === 'mock') {
      headers['x-env-mode'] = 'mock'
      headers['x-user-role'] = 'admin'
    }
    return headers
  }

  // ========== GESTIÓN DE ROLES ==========

  // Obtener todos los roles
  async getRoles(includeInactive: boolean = false): Promise<Role[]> {
    try {
      const params = new URLSearchParams({
        includeInactive: includeInactive.toString()
      })

      const response = await fetch(`${this.baseUrl}?${params}`, { headers: this.getHeaders() })
      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.message) errorMessage += ` - ${errorData.message}`;
        } catch (e) {
            // ignore json parse error
        }
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching roles:', error)
      // Re-throw the error to be handled by the component
      throw error
    }
  }

  // Obtener rol por ID
  async getRoleById(id: string): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Rol no encontrado')
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching role:', error)
      throw error
    }
  }

  // Crear nuevo rol
  async createRole(roleData: RoleFormData): Promise<Role> {
    try {
      // Validar nombre único
      const isNameUnique = await validateUniqueRoleName(roleData.name)
      if (!isNameUnique) {
        throw new Error('Ya existe un rol con ese nombre')
      }

      // Validar permisos
      const arePermissionsValid = await validateRolePermissions(roleData.permissions)
      if (!arePermissionsValid) {
        throw new Error('Algunos permisos no son válidos')
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(roleData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al crear rol')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating role:', error)
      throw error
    }
  }

  // Actualizar rol
  async updateRole(id: string, roleData: Partial<RoleUpdateData>): Promise<Role> {
    try {
      // Validar permisos si se están actualizando
      if (roleData.permissions) {
        const arePermissionsValid = await validateRolePermissions(roleData.permissions)
        if (!arePermissionsValid) {
          throw new Error('Algunos permisos no son válidos')
        }
      }

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(roleData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al actualizar rol')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating role:', error)
      throw error
    }
  }

  // Eliminar rol
  async deleteRole(id: string): Promise<void> {
    try {
      const role = await this.getRoleById(id)
      
      // No permitir eliminar roles del sistema
      if (role.isSystem) {
        throw new Error('No se pueden eliminar roles del sistema')
      }

      // No permitir eliminar roles con usuarios asignados
      if (role.userCount > 0) {
        throw new Error('No se puede eliminar un rol que tiene usuarios asignados')
      }

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al eliminar rol')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      throw error
    }
  }

  // Cambiar estado de rol
  async toggleRoleStatus(id: string, isActive: boolean): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(true),
        body: JSON.stringify({ isActive })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al cambiar estado del rol')
      }

      return await response.json()
    } catch (error) {
      console.error('Error toggling role status:', error)
      throw error
    }
  }

  // Clonar rol
  async cloneRole(id: string, newName: string, newDisplayName: string): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/clone`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ 
          name: newName, 
          displayName: newDisplayName 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al clonar rol')
      }

      return await response.json()
    } catch (error) {
      console.error('Error cloning role:', error)
      throw error
    }
  }

  // ========== GESTIÓN DE PERMISOS ==========

  // Obtener todos los permisos
  async getPermissions(): Promise<Permission[]> {
    try {
      const response = await fetch(this.permissionsUrl, { headers: this.getHeaders() })
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching permissions:', error)
      throw new Error('No se pudieron cargar los permisos')
    }
  }

  // Obtener permisos agrupados por categoría
  async getPermissionsByCategory(): Promise<PermissionCategory[]> {
    try {
      const response = await fetch(`${this.permissionsUrl}/categories`, { headers: this.getHeaders() })
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching permission categories:', error)
      throw new Error('No se pudieron cargar las categorías de permisos')
    }
  }

  // Asignar permisos a rol
  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissionIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al asignar permisos')
      }

      return await response.json()
    } catch (error) {
      console.error('Error assigning permissions:', error)
      throw error
    }
  }

  // Remover permisos de rol
  async removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/${roleId}/permissions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissionIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al remover permisos')
      }

      return await response.json()
    } catch (error) {
      console.error('Error removing permissions:', error)
      throw error
    }
  }

  // ========== JERARQUÍA DE ROLES ==========

  // Obtener jerarquía de roles
  async getRoleHierarchy(): Promise<RoleHierarchy[]> {
    try {
      const response = await fetch(`${this.baseUrl}/hierarchy`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching role hierarchy:', error)
      throw new Error('No se pudo cargar la jerarquía de roles')
    }
  }

  // Establecer rol padre
  async setParentRole(roleId: string, parentRoleId: string | null): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/${roleId}/parent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parentRoleId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al establecer rol padre')
      }

      return await response.json()
    } catch (error) {
      console.error('Error setting parent role:', error)
      throw error
    }
  }

  // ========== ESTADÍSTICAS Y REPORTES ==========

  // Obtener estadísticas de roles
  async getRoleStats(): Promise<RoleStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching role stats:', error)
      throw new Error('No se pudieron cargar las estadísticas')
    }
  }

  // Obtener usuarios por rol
  async getUsersByRole(roleId: string): Promise<Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    isActive: boolean
    lastLogin?: string
    assignedAt?: string
    createdAt?: string
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/${roleId}/users`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching users by role:', error)
      throw new Error('No se pudieron cargar los usuarios del rol')
    }
  }

  // Validar permisos de rol
  async validateRolePermissions(roleId: string, permissions: string[]): Promise<Record<string, boolean>> {
    try {
      const response = await fetch(`${this.baseUrl}/${roleId}/validate-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions })
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error validating role permissions:', error)
      throw new Error('Error al validar permisos del rol')
    }
  }

  // Exportar configuración de roles
  async exportRoles(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export?format=${format}`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Error exporting roles:', error)
      throw new Error('Error al exportar roles')
    }
  }

  // Importar configuración de roles
  async importRoles(file: File): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${this.baseUrl}/import`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al importar roles')
      }

      return await response.json()
    } catch (error) {
      console.error('Error importing roles:', error)
      throw error
    }
  }
}

// Instancia singleton del servicio
export const roleService = new RoleService()

// Funciones de utilidad
export const hasPermission = (role: Role, permission: string): boolean => {
  return role.permissions.some(p => p.name === permission)
}

export const getRoleLevel = (role: Role, allRoles: Role[]): number => {
  let level = 0
  let currentRole = role
  
  while (currentRole.parentRoleId) {
    level++
    const parentRole = allRoles.find(r => r.id === currentRole.parentRoleId)
    if (!parentRole) break
    currentRole = parentRole
  }
  
  return level
}

export const canRoleInheritFrom = (childRole: Role, parentRole: Role): boolean => {
  // Un rol no puede heredar de sí mismo
  if (childRole.id === parentRole.id) return false
  
  // Un rol no puede heredar de un rol de menor prioridad
  if (childRole.priority >= parentRole.priority) return false
  
  return true
}

export const getEffectivePermissions = (role: Role, allRoles: Role[]): Permission[] => {
  const permissions = new Map<string, Permission>()
  
  // Agregar permisos propios
  role.permissions.forEach(p => permissions.set(p.id, p))
  
  // Agregar permisos heredados
  let currentRole = role
  while (currentRole.parentRoleId) {
    const parentRole = allRoles.find(r => r.id === currentRole.parentRoleId)
    if (!parentRole) break
    
    parentRole.permissions.forEach(p => {
      if (!permissions.has(p.id)) {
        permissions.set(p.id, p)
      }
    })
    
    currentRole = parentRole
  }
  
  return Array.from(permissions.values())
}

export const sortRolesByPriority = (roles: Role[]): Role[] => {
  return [...roles].sort((a, b) => b.priority - a.priority)
}

export const filterRolesByCategory = (roles: Role[], category: string): Role[] => {
  return roles.filter(role => 
    role.permissions.some(p => p.category === category)
  )
}
