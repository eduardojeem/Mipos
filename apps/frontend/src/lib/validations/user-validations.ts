import { z } from 'zod'

// Esquemas de validación para usuarios
export const userSchema = z.object({
  firstName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios'),
  
  lastName: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El apellido solo puede contener letras y espacios'),
  
  email: z.string()
    .email('Formato de email inválido')
    .min(5, 'El email debe tener al menos 5 caracteres')
    .max(100, 'El email no puede exceder 100 caracteres')
    .toLowerCase(),
  
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\+]?[1-9][\d]{0,15}$/.test(val), {
      message: 'Formato de teléfono inválido'
    }),
  
  role: z.string()
    .min(1, 'Debe seleccionar un rol'),
  
  department: z.string()
    .optional(),
  
  isActive: z.boolean().default(true),
  
  permissions: z.array(z.string()).optional()
})

export const passwordSchema = z.object({
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'La contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial'),
  
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
})

export const userUpdateSchema = userSchema.partial().extend({
  id: z.string().min(1, 'ID de usuario requerido')
})

export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un usuario'),
  action: z.enum(['activate', 'deactivate', 'delete', 'assign_role']),
  roleId: z.string().optional()
}).refine((data) => {
  if (data.action === 'assign_role' && !data.roleId) {
    return false
  }
  return true
}, {
  message: 'Debe seleccionar un rol para la acción de asignación',
  path: ['roleId']
})

// Esquemas de validación para roles
export const roleSchema = z.object({
  name: z.string()
    .min(2, 'El nombre del rol debe tener al menos 2 caracteres')
    .max(50, 'El nombre del rol no puede exceder 50 caracteres')
    .regex(/^[A-Z_]+$/, 'El nombre del rol debe estar en mayúsculas y puede contener guiones bajos')
    .transform((val) => val.toUpperCase()),
  
  displayName: z.string()
    .min(2, 'El nombre para mostrar debe tener al menos 2 caracteres')
    .max(100, 'El nombre para mostrar no puede exceder 100 caracteres'),
  
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  
  permissions: z.array(z.string())
    .min(1, 'Debe asignar al menos un permiso al rol'),
  
  isActive: z.boolean().default(true),
  
  priority: z.number()
    .min(1, 'La prioridad debe ser mayor a 0')
    .max(100, 'La prioridad no puede exceder 100')
    .default(50)
})

export const roleUpdateSchema = roleSchema.partial().extend({
  id: z.string().min(1, 'ID de rol requerido'),
  name: z.string().optional() // No permitir cambiar el nombre en actualizaciones
})

// Esquemas de validación para permisos
export const permissionSchema = z.object({
  name: z.string()
    .min(3, 'El nombre del permiso debe tener al menos 3 caracteres')
    .max(100, 'El nombre del permiso no puede exceder 100 caracteres')
    .regex(/^[a-z_\.]+$/, 'El nombre del permiso debe estar en minúsculas y puede contener puntos y guiones bajos'),
  
  displayName: z.string()
    .min(3, 'El nombre para mostrar debe tener al menos 3 caracteres')
    .max(100, 'El nombre para mostrar no puede exceder 100 caracteres'),
  
  resource: z.string()
    .min(2, 'El recurso debe tener al menos 2 caracteres')
    .max(50, 'El recurso no puede exceder 50 caracteres'),
  
  action: z.enum(['create', 'read', 'update', 'delete', 'manage', 'view', 'export', 'import']),
  
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  
  category: z.string()
    .min(2, 'La categoría debe tener al menos 2 caracteres')
    .max(50, 'La categoría no puede exceder 50 caracteres')
    .optional()
})

// Validaciones de negocio
export const validateUniqueEmail = async (email: string, excludeUserId?: string): Promise<boolean> => {
  // En producción, esto haría una consulta a la API
  // Por ahora simulamos la validación
  const existingUsers = [
    { id: '1', email: 'admin@pos.com' },
    { id: '2', email: 'manager@pos.com' },
    { id: '3', email: 'cashier@pos.com' }
  ]
  
  const exists = existingUsers.some(user => 
    user.email.toLowerCase() === email.toLowerCase() && 
    user.id !== excludeUserId
  )
  
  return !exists
}

export const validateUniqueRoleName = async (name: string, excludeRoleId?: string): Promise<boolean> => {
  try {
    const params = new URLSearchParams({ name })
    if (excludeRoleId) {
      params.append('excludeId', excludeRoleId)
    }

    const response = await fetch(`/api/roles/validate-name?${params}`)
    if (!response.ok) {
      console.error('Error validating role name:', response.statusText)
      return false
    }

    const { isUnique } = await response.json()
    return isUnique
  } catch (error) {
    console.error('Error validating role name:', error)
    return false
  }
}

export const validateRolePermissions = async (permissions: string[]): Promise<boolean> => {
  try {
    const response = await fetch('/api/permissions')
    if (!response.ok) {
      console.error('Error fetching permissions:', response.statusText)
      return false
    }

    const validPermissions = await response.json()
    const validPermissionIds = validPermissions.map((p: any) => p.id)
    
    return permissions.every(permission => validPermissionIds.includes(permission))
  } catch (error) {
    console.error('Error validating permissions:', error)
    return false
  }
}

export const validateUserRoleAssignment = (userId: string, roleIds: string[]): boolean => {
  // Validar que no se asignen roles conflictivos
  const conflictingRoles = [
    ['ADMIN', 'CASHIER'], // Un admin no puede ser cajero
    ['MANAGER', 'CASHIER'] // Un manager no puede ser cajero
  ]
  
  // En producción, obtendríamos los nombres de los roles desde la API
  const roleNames = roleIds.map(id => {
    const roleMap: Record<string, string> = {
      '1': 'ADMIN',
      '2': 'MANAGER', 
      '3': 'CASHIER'
    }
    return roleMap[id]
  }).filter(Boolean)
  
  return !conflictingRoles.some(conflict => 
    conflict.every(role => roleNames.includes(role))
  )
}

// Tipos derivados de los esquemas
export type UserFormData = z.infer<typeof userSchema>
export type UserUpdateData = z.infer<typeof userUpdateSchema>
export type PasswordFormData = z.infer<typeof passwordSchema>
export type RoleFormData = z.infer<typeof roleSchema>
export type RoleUpdateData = z.infer<typeof roleUpdateSchema>
export type PermissionFormData = z.infer<typeof permissionSchema>
export type BulkUserActionData = z.infer<typeof bulkUserActionSchema>

// Funciones de validación personalizadas
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } => {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }
    return { success: false, errors: { general: 'Error de validación desconocido' } }
  }
}

export const validateAsync = async <T>(
  schema: z.ZodSchema<T>, 
  data: unknown,
  customValidations?: Array<() => Promise<boolean>>
): Promise<{ success: boolean; data?: T; errors?: Record<string, string> }> => {
  // Primero validar el esquema
  const schemaResult = validateForm(schema, data)
  if (!schemaResult.success) {
    return schemaResult
  }
  
  // Luego ejecutar validaciones personalizadas
  if (customValidations) {
    try {
      const results = await Promise.all(customValidations.map(fn => fn()))
      if (results.some(result => !result)) {
        return { 
          success: false, 
          errors: { general: 'Falló la validación personalizada' } 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        errors: { general: 'Error en validación personalizada' } 
      }
    }
  }
  
  return schemaResult
}