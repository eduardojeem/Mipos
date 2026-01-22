import { isMockAuthEnabled } from '@/lib/env'

// Tipos alineados con RoleService
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

// Datos iniciales (mocks amigables en desarrollo)
const now = () => new Date().toISOString()

export const permissions: Permission[] = [
  // Usuarios
  { id: 'users.read', name: 'users.read', displayName: 'Ver usuarios', resource: 'users', action: 'read', category: 'users', isSystem: false, createdAt: now() },
  { id: 'users.create', name: 'users.create', displayName: 'Crear usuarios', resource: 'users', action: 'create', category: 'users', isSystem: false, createdAt: now() },
  { id: 'users.update', name: 'users.update', displayName: 'Editar usuarios', resource: 'users', action: 'update', category: 'users', isSystem: false, createdAt: now() },
  { id: 'users.delete', name: 'users.delete', displayName: 'Eliminar usuarios', resource: 'users', action: 'delete', category: 'users', isSystem: false, createdAt: now() },
  // Productos
  { id: 'products.read', name: 'products.read', displayName: 'Ver productos', resource: 'products', action: 'read', category: 'products', isSystem: false, createdAt: now() },
  { id: 'products.create', name: 'products.create', displayName: 'Crear productos', resource: 'products', action: 'create', category: 'products', isSystem: false, createdAt: now() },
  { id: 'products.update', name: 'products.update', displayName: 'Editar productos', resource: 'products', action: 'update', category: 'products', isSystem: false, createdAt: now() },
  { id: 'products.delete', name: 'products.delete', displayName: 'Eliminar productos', resource: 'products', action: 'delete', category: 'products', isSystem: false, createdAt: now() },
  // Ventas
  { id: 'sales.read', name: 'sales.read', displayName: 'Ver ventas', resource: 'sales', action: 'read', category: 'sales', isSystem: false, createdAt: now() },
  { id: 'sales.create', name: 'sales.create', displayName: 'Procesar ventas', resource: 'sales', action: 'create', category: 'sales', isSystem: false, createdAt: now() },
  { id: 'sales.refund', name: 'sales.refund', displayName: 'Procesar reembolsos', resource: 'sales', action: 'refund', category: 'sales', isSystem: false, createdAt: now() },
  // Reportes
  { id: 'reports.read', name: 'reports.read', displayName: 'Ver reportes', resource: 'reports', action: 'read', category: 'reports', isSystem: false, createdAt: now() },
  { id: 'reports.export', name: 'reports.export', displayName: 'Exportar reportes', resource: 'reports', action: 'export', category: 'reports', isSystem: false, createdAt: now() },
  // Configuración
  { id: 'settings.read', name: 'settings.read', displayName: 'Ver configuración', resource: 'settings', action: 'read', category: 'settings', isSystem: false, createdAt: now() },
  { id: 'settings.update', name: 'settings.update', displayName: 'Editar configuración', resource: 'settings', action: 'update', category: 'settings', isSystem: true, createdAt: now() },
  // Sistema
  { id: 'system.admin', name: 'system.admin', displayName: 'Administración del sistema', resource: 'system', action: 'admin', category: 'system', isSystem: true, createdAt: now() },
]

export const permissionCategories: PermissionCategory[] = [
  { id: 'users', name: 'users', displayName: 'Gestión de Usuarios', description: 'Permisos relacionados con usuarios', permissions: permissions.filter(p => p.category === 'users'), icon: 'Users' },
  { id: 'products', name: 'products', displayName: 'Gestión de Productos', description: 'Permisos de catálogo e inventario', permissions: permissions.filter(p => p.category === 'products'), icon: 'Package' },
  { id: 'sales', name: 'sales', displayName: 'Gestión de Ventas', description: 'Permisos de ventas y reembolsos', permissions: permissions.filter(p => p.category === 'sales'), icon: 'ShoppingCart' },
  { id: 'reports', name: 'reports', displayName: 'Reportes y Análisis', description: 'Acceso a reportes', permissions: permissions.filter(p => p.category === 'reports'), icon: 'BarChart3' },
  { id: 'settings', name: 'settings', displayName: 'Configuración', description: 'Permisos de configuración', permissions: permissions.filter(p => p.category === 'settings'), icon: 'Cog' },
  { id: 'system', name: 'system', displayName: 'Administración del Sistema', description: 'Permisos críticos del sistema', permissions: permissions.filter(p => p.category === 'system'), icon: 'Database' },
]

export const roles: Role[] = [
  {
    id: 'admin',
    name: 'ADMIN',
    displayName: 'Administrador',
    description: 'Acceso completo al sistema',
    permissions: permissions,
    userCount: 2,
    isActive: true,
    isSystem: true,
    priority: 100,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'manager',
    name: 'MANAGER',
    displayName: 'Gerente',
    description: 'Gestión de ventas, productos y reportes',
    permissions: permissions.filter(p => !p.isSystem && p.category !== 'users'),
    userCount: 3,
    isActive: true,
    isSystem: false,
    priority: 70,
    parentRoleId: 'admin',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'cashier',
    name: 'CASHIER',
    displayName: 'Cajero',
    description: 'Operaciones de venta y consulta de productos',
    permissions: permissions.filter(p => ['products.read', 'sales.read', 'sales.create'].includes(p.id)),
    userCount: 8,
    isActive: true,
    isSystem: false,
    priority: 40,
    parentRoleId: 'manager',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'viewer',
    name: 'VIEWER',
    displayName: 'Visualizador',
    description: 'Solo lectura de productos y ventas',
    permissions: permissions.filter(p => p.action === 'read'),
    userCount: 1,
    isActive: false,
    isSystem: false,
    priority: 10,
    createdAt: now(),
    updatedAt: now(),
  }
]

export function findPermissionByName(name: string): Permission | null {
  return permissions.find(p => p.name === name) || null
}

export function getRoleById(id: string): Role | null {
  return roles.find(r => r.id === id) || null
}

export function createRole(input: { name: string; displayName: string; description?: string; permissions: string[]; isActive?: boolean; priority?: number }): Role {
  const id = input.name.toLowerCase()
  const existing = getRoleById(id)
  if (existing) {
    throw new Error('Ya existe un rol con ese nombre')
  }
  const perms = input.permissions.map(n => findPermissionByName(n)).filter(Boolean) as Permission[]
  const nowStr = now()
  const role: Role = {
    id,
    name: input.name.toUpperCase(),
    displayName: input.displayName,
    description: input.description || '',
    permissions: perms,
    userCount: 0,
    isActive: input.isActive !== false,
    isSystem: false,
    priority: input.priority ?? 50,
    createdAt: nowStr,
    updatedAt: nowStr,
  }
  roles.push(role)
  return role
}

export function updateRole(id: string, patch: Partial<{ displayName: string; description?: string; permissions: string[]; isActive: boolean; priority: number; parentRoleId?: string }>): Role {
  const role = getRoleById(id)
  if (!role) throw new Error('Rol no encontrado')
  if (patch.displayName !== undefined) role.displayName = patch.displayName
  if (patch.description !== undefined) role.description = patch.description
  if (patch.isActive !== undefined) role.isActive = patch.isActive
  if (patch.priority !== undefined) role.priority = patch.priority
  if (patch.parentRoleId !== undefined) role.parentRoleId = patch.parentRoleId || undefined
  if (patch.permissions) {
    role.permissions = patch.permissions.map(n => findPermissionByName(n)).filter(Boolean) as Permission[]
  }
  role.updatedAt = now()
  return role
}

export function deleteRole(id: string): void {
  const idx = roles.findIndex(r => r.id === id)
  if (idx === -1) throw new Error('Rol no encontrado')
  if (roles[idx].isSystem) throw new Error('No se pueden eliminar roles del sistema')
  if (roles[idx].userCount > 0) throw new Error('No se puede eliminar un rol con usuarios asignados')
  roles.splice(idx, 1)
}

export function toJSON<T>(data: T): T { return data }

// Helper de autorización admin para rutas
export async function ensureAdmin(request: Request): Promise<{ ok: true } | { ok: false; status: number; body: any }>{
  if (isMockAuthEnabled()) {
    const role = request.headers.get('x-user-role') || request.headers.get('X-User-Role')
    if (!role || !['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return { ok: false, status: 403, body: { error: 'Acceso denegado (mock)' } }
    }
    return { ok: true }
  }
  // En modo prod deberíamos verificar sesión y rol real. Simplificar: permitir mientras se integra Supabase.
  // Si deseas forzar admin en prod, ajusta aquí.
  return { ok: true }
}