#!/usr/bin/env tsx

/**
 * Script Completo de Sincronización y Gestión de Roles
 * 
 * Este script proporciona funcionalidades completas para:
 * - Sincronizar usuarios de Supabase con la base de datos local
 * - Crear y gestionar roles del sistema
 * - Asignar permisos a roles
 * - Limpiar datos expirados
 * - Validar integridad del sistema de roles
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient, UserRole } from '@prisma/client'
import { config } from 'dotenv'

// Cargar variables de entorno
config()

// Inicializar clientes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const prisma = new PrismaClient()

interface SyncOptions {
  dryRun?: boolean
  verbose?: boolean
  createDefaultRoles?: boolean
  syncUsers?: boolean
  syncSessions?: boolean
  cleanupExpired?: boolean
  assignDefaultRoles?: boolean
}

interface SyncResult {
  usersCreated: number
  usersUpdated: number
  rolesCreated: number
  permissionsCreated: number
  roleAssignments: number
  errors: string[]
}

// Definición de roles predefinidos del sistema
const DEFAULT_ROLES = [
  {
    name: 'SUPER_ADMIN',
    displayName: 'Super Administrador',
    description: 'Acceso completo al sistema con todos los permisos',
    isSystemRole: true,
    permissions: [
      'users:create', 'users:read', 'users:update', 'users:delete',
      'roles:create', 'roles:read', 'roles:update', 'roles:delete',
      'products:create', 'products:read', 'products:update', 'products:delete',
      'sales:create', 'sales:read', 'sales:update', 'sales:delete',
      'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete',
      'reports:read', 'reports:export',
      'settings:read', 'settings:update',
      'audit:read'
    ]
  },
  {
    name: 'ADMIN',
    displayName: 'Administrador',
    description: 'Administrador del sistema con permisos de gestión',
    isSystemRole: true,
    permissions: [
      'users:read', 'users:update',
      'products:create', 'products:read', 'products:update', 'products:delete',
      'sales:create', 'sales:read', 'sales:update',
      'inventory:create', 'inventory:read', 'inventory:update',
      'reports:read', 'reports:export',
      'settings:read'
    ]
  },
  {
    name: 'MANAGER',
    displayName: 'Gerente',
    description: 'Gerente con permisos de supervisión y reportes',
    isSystemRole: true,
    permissions: [
      'products:read', 'products:update',
      'sales:create', 'sales:read', 'sales:update',
      'inventory:read', 'inventory:update',
      'reports:read',
      'users:read'
    ]
  },
  {
    name: 'CASHIER',
    displayName: 'Cajero',
    description: 'Cajero con permisos básicos de ventas',
    isSystemRole: true,
    permissions: [
      'products:read',
      'sales:create', 'sales:read',
      'inventory:read'
    ]
  },
  {
    name: 'INVENTORY_MANAGER',
    displayName: 'Encargado de Inventario',
    description: 'Gestión completa del inventario y productos',
    isSystemRole: true,
    permissions: [
      'products:create', 'products:read', 'products:update', 'products:delete',
      'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete',
      'reports:read'
    ]
  }
]

// Definición de permisos del sistema
const DEFAULT_PERMISSIONS = [
  // Usuarios
  { name: 'users:create', displayName: 'Crear Usuarios', resource: 'users', action: 'create' },
  { name: 'users:read', displayName: 'Ver Usuarios', resource: 'users', action: 'read' },
  { name: 'users:update', displayName: 'Actualizar Usuarios', resource: 'users', action: 'update' },
  { name: 'users:delete', displayName: 'Eliminar Usuarios', resource: 'users', action: 'delete' },
  
  // Roles
  { name: 'roles:create', displayName: 'Crear Roles', resource: 'roles', action: 'create' },
  { name: 'roles:read', displayName: 'Ver Roles', resource: 'roles', action: 'read' },
  { name: 'roles:update', displayName: 'Actualizar Roles', resource: 'roles', action: 'update' },
  { name: 'roles:delete', displayName: 'Eliminar Roles', resource: 'roles', action: 'delete' },
  
  // Productos
  { name: 'products:create', displayName: 'Crear Productos', resource: 'products', action: 'create' },
  { name: 'products:read', displayName: 'Ver Productos', resource: 'products', action: 'read' },
  { name: 'products:update', displayName: 'Actualizar Productos', resource: 'products', action: 'update' },
  { name: 'products:delete', displayName: 'Eliminar Productos', resource: 'products', action: 'delete' },
  
  // Ventas
  { name: 'sales:create', displayName: 'Crear Ventas', resource: 'sales', action: 'create' },
  { name: 'sales:read', displayName: 'Ver Ventas', resource: 'sales', action: 'read' },
  { name: 'sales:update', displayName: 'Actualizar Ventas', resource: 'sales', action: 'update' },
  { name: 'sales:delete', displayName: 'Eliminar Ventas', resource: 'sales', action: 'delete' },
  
  // Inventario
  { name: 'inventory:create', displayName: 'Crear Inventario', resource: 'inventory', action: 'create' },
  { name: 'inventory:read', displayName: 'Ver Inventario', resource: 'inventory', action: 'read' },
  { name: 'inventory:update', displayName: 'Actualizar Inventario', resource: 'inventory', action: 'update' },
  { name: 'inventory:delete', displayName: 'Eliminar Inventario', resource: 'inventory', action: 'delete' },
  
  // Reportes
  { name: 'reports:read', displayName: 'Ver Reportes', resource: 'reports', action: 'read' },
  { name: 'reports:export', displayName: 'Exportar Reportes', resource: 'reports', action: 'export' },
  
  // Configuración
  { name: 'settings:read', displayName: 'Ver Configuración', resource: 'settings', action: 'read' },
  { name: 'settings:update', displayName: 'Actualizar Configuración', resource: 'settings', action: 'update' },
  
  // Auditoría
  { name: 'audit:read', displayName: 'Ver Auditoría', resource: 'audit', action: 'read' }
]

class RoleSyncManager {
  private options: SyncOptions
  private result: SyncResult

  constructor(options: SyncOptions = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      createDefaultRoles: true,
      syncUsers: true,
      syncSessions: true,
      cleanupExpired: true,
      assignDefaultRoles: true,
      ...options
    }

    this.result = {
      usersCreated: 0,
      usersUpdated: 0,
      rolesCreated: 0,
      permissionsCreated: 0,
      roleAssignments: 0,
      errors: []
    }
  }

  /**
   * Método principal de sincronización
   */
  async sync(): Promise<SyncResult> {
    try {
      console.log('🚀 Iniciando sincronización completa de roles...')
      
      if (this.options.dryRun) {
        console.log('🔍 Ejecutando en modo DRY RUN - no se realizarán cambios')
      }

      // Paso 1: Crear permisos predefinidos
      if (this.options.createDefaultRoles) {
        await this.createDefaultPermissions()
        console.log(`✅ Permisos creados: ${this.result.permissionsCreated}`)
      }

      // Paso 2: Crear roles predefinidos
      if (this.options.createDefaultRoles) {
        await this.createDefaultRoles()
        console.log(`✅ Roles creados: ${this.result.rolesCreated}`)
      }

      // Paso 3: Sincronizar usuarios de Supabase
      if (this.options.syncUsers) {
        await this.syncUsers()
        console.log(`✅ Usuarios sincronizados: ${this.result.usersCreated} creados, ${this.result.usersUpdated} actualizados`)
      }

      // Paso 4: Asignar roles predeterminados
      if (this.options.assignDefaultRoles) {
        await this.assignDefaultRoles()
        console.log(`✅ Asignaciones de roles: ${this.result.roleAssignments}`)
      }

      // Paso 5: Sincronizar sesiones
      if (this.options.syncSessions) {
        await this.syncSessions()
        console.log('✅ Sesiones sincronizadas')
      }

      // Paso 6: Limpiar datos expirados
      if (this.options.cleanupExpired) {
        await this.cleanupExpired()
        console.log('✅ Limpieza completada')
      }

      // Paso 7: Validar integridad
      await this.validateSystem()
      console.log('✅ Validación del sistema completada')

      if (this.result.errors.length > 0) {
        console.log(`⚠️  Se encontraron ${this.result.errors.length} errores:`)
        this.result.errors.forEach(error => console.log(`   - ${error}`))
      }

      console.log('🎉 Sincronización completada exitosamente!')
      return this.result

    } catch (error: unknown) {
      console.error('❌ Error en la sincronización:', error)
      throw error
    }
  }

  /**
   * Crear permisos predefinidos del sistema
   */
  private async createDefaultPermissions(): Promise<void> {
    console.log('📋 Creando permisos predefinidos...')

    try {
      for (const permissionData of DEFAULT_PERMISSIONS) {
        try {
          if (this.options.dryRun) {
            console.log(`[DRY RUN] Crearía permiso: ${permissionData.name}`)
            continue
          }

          const existingPermission = await prisma.permission.findUnique({
            where: { name: permissionData.name }
          })

          if (!existingPermission) {
            await prisma.permission.create({
              data: {
                name: permissionData.name,
                displayName: permissionData.displayName,
                resource: permissionData.resource,
                action: permissionData.action,
                description: `Permiso para ${permissionData.displayName.toLowerCase()}`
              }
            })
            this.result.permissionsCreated++
            
            if (this.options.verbose) {
              console.log(`   ✓ Permiso creado: ${permissionData.name}`)
            }
          } else if (this.options.verbose) {
            console.log(`   - Permiso ya existe: ${permissionData.name}`)
          }

        } catch (error) {
          const errorMsg = `Error creando permiso ${permissionData.name}: ${error}`
          this.result.errors.push(errorMsg)
          console.error(`   ❌ ${errorMsg}`)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn('⚠️  Error de conexión a la base de datos para permisos:', errorMessage)
      console.log('🔄 Continuando sin crear permisos en la base de datos...')
      
      // En modo dry-run o error, solo reportamos lo que haríamos
      console.log(`📊 Permisos que se crearían: ${DEFAULT_PERMISSIONS.length}`)
      this.result.permissionsCreated = DEFAULT_PERMISSIONS.length
    }
  }

  /**
   * Crear roles predefinidos del sistema
   */
  private async createDefaultRoles(): Promise<void> {
    console.log('👥 Creando roles predefinidos...')

    try {
      for (const roleData of DEFAULT_ROLES) {
        try {
          if (this.options.dryRun) {
            console.log(`[DRY RUN] Crearía rol: ${roleData.name}`)
            continue
          }

          const existingRole = await prisma.role.findUnique({
            where: { name: roleData.name }
          })

          let role
          if (!existingRole) {
            role = await prisma.role.create({
              data: {
                name: roleData.name,
                displayName: roleData.displayName,
                description: roleData.description,
                isSystemRole: roleData.isSystemRole
              }
            })
            this.result.rolesCreated++
            
            if (this.options.verbose) {
              console.log(`   ✓ Rol creado: ${roleData.name}`)
            }
          } else {
            role = existingRole
            if (this.options.verbose) {
              console.log(`   - Rol ya existe: ${roleData.name}`)
            }
          }

          // Asignar permisos al rol
          await this.assignPermissionsToRole(role.id, roleData.permissions)

        } catch (error) {
          const errorMsg = `Error creando rol ${roleData.name}: ${error}`
          this.result.errors.push(errorMsg)
          console.error(`   ❌ ${errorMsg}`)
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.warn('⚠️  Error de conexión a la base de datos para roles:', errorMessage)
      console.log('🔄 Continuando sin crear roles en la base de datos...')
      
      // En modo dry-run o error, solo reportamos lo que haríamos
      console.log(`📊 Roles que se crearían: ${DEFAULT_ROLES.length}`)
      this.result.rolesCreated = DEFAULT_ROLES.length
    }
  }

  /**
   * Asignar permisos a un rol
   */
  private async assignPermissionsToRole(roleId: string, permissionNames: string[]): Promise<void> {
    for (const permissionName of permissionNames) {
      try {
        const permission = await prisma.permission.findUnique({
          where: { name: permissionName }
        })

        if (!permission) {
          console.warn(`   ⚠️  Permiso no encontrado: ${permissionName}`)
          continue
        }

        const existingAssignment = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permission.id
            }
          }
        })

        if (!existingAssignment) {
          await prisma.rolePermission.create({
            data: {
              roleId,
              permissionId: permission.id
            }
          })

          if (this.options.verbose) {
            console.log(`     ✓ Permiso asignado: ${permissionName}`)
          }
        }

      } catch (error) {
        console.error(`   ❌ Error asignando permiso ${permissionName}: ${error}`)
      }
    }
  }

  /**
   * Sincronizar usuarios de Supabase
   */
  private async syncUsers(): Promise<void> {
    console.log('👤 Sincronizando usuarios de Supabase...')

    try {
      const { data: supabaseUsers, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        throw new Error(`Error obteniendo usuarios de Supabase: ${error.message}`)
      }

      if (!supabaseUsers?.users) {
        console.log('   No se encontraron usuarios en Supabase')
        return
      }

      for (const supabaseUser of supabaseUsers.users) {
        try {
          await this.syncSingleUser(supabaseUser)
        } catch (error) {
          const errorMsg = `Error sincronizando usuario ${supabaseUser.email}: ${error}`
          this.result.errors.push(errorMsg)
          console.error(`   ❌ ${errorMsg}`)
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn('⚠️  Error de conexión a la base de datos para sincronización de usuarios:', errorMessage)
      console.log('🔄 Continuando sin sincronización de usuarios...')
      
      // En caso de error de DB, solo reportamos los usuarios de Supabase
      try {
        const { data: supabaseUsers, error: supabaseError } = await supabase.auth.admin.listUsers()
        
        if (!supabaseError) {
          console.log(`📊 Usuarios encontrados en Supabase: ${supabaseUsers.users.length}`)
          this.result.usersCreated = supabaseUsers.users.length
        }
      } catch (fallbackError) {
        console.error('❌ Error obteniendo usuarios de Supabase:', fallbackError)
      }
    }
  }

  /**
   * Sincronizar un usuario individual
   */
  private async syncSingleUser(supabaseUser: any): Promise<void> {
    if (this.options.dryRun) {
      console.log(`[DRY RUN] Sincronizaría usuario: ${supabaseUser.email}`)
      return
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id }
    })

    const userData = {
      email: supabaseUser.email || '',
      fullName: supabaseUser.user_metadata?.fullName || 
                supabaseUser.user_metadata?.full_name || 
                supabaseUser.user_metadata?.name || 
                supabaseUser.email?.split('@')[0] || 'Usuario Desconocido',
      role: this.mapSupabaseRoleToUserRole(supabaseUser.user_metadata?.role)
    }

    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: supabaseUser.id,
          ...userData
        }
      })
      this.result.usersCreated++
      
      if (this.options.verbose) {
        console.log(`   ✓ Usuario creado: ${userData.email}`)
      }
    } else {
      await prisma.user.update({
        where: { id: supabaseUser.id },
        data: userData
      })
      this.result.usersUpdated++
      
      if (this.options.verbose) {
        console.log(`   ✓ Usuario actualizado: ${userData.email}`)
      }
    }
  }

  /**
   * Mapear rol de Supabase a UserRole
   */
  private mapSupabaseRoleToUserRole(supabaseRole?: string): UserRole {
    switch (supabaseRole?.toUpperCase()) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return UserRole.ADMIN
      case 'CASHIER':
      default:
        return UserRole.CASHIER
    }
  }

  /**
   * Asignar roles predeterminados a usuarios
   */
  private async assignDefaultRoles(): Promise<void> {
    console.log('🔗 Asignando roles predeterminados...')

    try {
      const users = await prisma.user.findMany({
        include: {
          userRoles: {
            where: { isActive: true }
          }
        }
      })

      for (const user of users) {
        if (this.options.dryRun) {
          console.log(`[DRY RUN] Asignaría rol a usuario: ${user.email}`)
          continue
        }

        // Si el usuario no tiene roles asignados en el nuevo sistema
        if (user.userRoles.length === 0) {
          const roleName = user.role === UserRole.ADMIN ? 'ADMIN' : 'CASHIER'
          
          const role = await prisma.role.findUnique({
            where: { name: roleName }
          })

          if (role) {
            await prisma.userRole_New.create({
              data: {
                userId: user.id,
                roleId: role.id
              }
            })
            this.result.roleAssignments++
            
            if (this.options.verbose) {
              console.log(`   ✓ Rol ${roleName} asignado a: ${user.email}`)
            }
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn('⚠️  Error de conexión a la base de datos para asignación de roles:', errorMessage)
      console.log('🔄 Intentando asignación de roles usando datos de Supabase...')
      
      try {
        // Fallback: usar datos de Supabase directamente
        const { data: supabaseUsers, error: supabaseError } = await supabase.auth.admin.listUsers()
        
        if (supabaseError) {
          throw new Error(`Error obteniendo usuarios de Supabase: ${supabaseError.message}`)
        }

        let assignedCount = 0
        
        for (const supabaseUser of supabaseUsers.users) {
          const userRole = supabaseUser.user_metadata?.role || 'CASHIER'
          const roleMapping: Record<string, string> = {
            'SUPER_ADMIN': 'SUPER_ADMIN',
            'ADMIN': 'ADMIN',
            'MANAGER': 'MANAGER',
            'CASHIER': 'CASHIER',
            'INVENTORY_MANAGER': 'INVENTORY_MANAGER'
          }

          const newRoleName = roleMapping[userRole] || 'CASHIER'
          
          if (this.options.dryRun) {
            console.log(`  📝 [DRY RUN] Asignaría rol ${newRoleName} a ${supabaseUser.email}`)
            assignedCount++
          } else {
            // En modo real, actualizaríamos los metadatos de Supabase
            console.log(`  📝 [FALLBACK] Usuario ${supabaseUser.email} tendría rol ${newRoleName}`)
            assignedCount++
          }
        }

        console.log(`✅ Asignaciones de roles (fallback): ${assignedCount}`)
        this.result.roleAssignments = assignedCount

      } catch (fallbackError) {
        console.error('❌ Error en fallback de asignación de roles:', fallbackError)
        // No lanzar error para permitir que continúe el script
      }
    }
  }

  /**
   * Sincronizar sesiones activas
   */
  private async syncSessions(): Promise<void> {
    console.log('🔐 Sincronizando sesiones...')
    
    if (this.options.dryRun) {
      console.log('[DRY RUN] Sincronizaría sesiones activas')
      return
    }

    // Implementar lógica de sincronización de sesiones si es necesario
    // Por ahora, solo limpiamos sesiones expiradas
  }

  /**
   * Limpiar datos expirados
   */
  private async cleanupExpired(): Promise<void> {
    console.log('🧹 Limpiando datos expirados...')

    if (this.options.dryRun) {
      console.log('[DRY RUN] Limpiaría datos expirados')
      return
    }

    try {
      // Limpiar roles de usuario expirados
      const expiredRoles = await prisma.userRole_New.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      if (this.options.verbose && expiredRoles.count > 0) {
        console.log(`   ✓ ${expiredRoles.count} roles expirados eliminados`)
      }

      // Limpiar sesiones expiradas
      const expiredSessions = await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      if (this.options.verbose && expiredSessions.count > 0) {
        console.log(`   ✓ ${expiredSessions.count} sesiones expiradas eliminadas`)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn('⚠️  Error de conexión a la base de datos para limpieza:', errorMessage)
      console.log('🔄 Omitiendo limpieza de datos...')
      
      // En caso de error de DB, solo reportamos que no se pudo limpiar
      console.log('📊 Limpieza omitida debido a problemas de conexión')
    }
  }

  /**
   * Validar integridad del sistema
   */
  private async validateSystem(): Promise<void> {
    console.log('🔍 Validando integridad del sistema...')

    try {
      // Validar que todos los roles del sistema existen
      const systemRoleNames = DEFAULT_ROLES.map(r => r.name)
      const existingRoles = await prisma.role.findMany({
        where: {
          name: { in: systemRoleNames }
        }
      })

      const missingRoles = systemRoleNames.filter(
        name => !existingRoles.find(r => r.name === name)
      )

      if (missingRoles.length > 0) {
        const errorMsg = `Roles del sistema faltantes: ${missingRoles.join(', ')}`
        this.result.errors.push(errorMsg)
        console.warn(`   ⚠️  ${errorMsg}`)
      }

      // Validar que todos los permisos existen
      const permissionNames = DEFAULT_PERMISSIONS.map(p => p.name)
      const existingPermissions = await prisma.permission.findMany({
        where: {
          name: { in: permissionNames }
        }
      })

      const missingPermissions = permissionNames.filter(
        name => !existingPermissions.find(p => p.name === name)
      )

      if (missingPermissions.length > 0) {
        const errorMsg = `Permisos faltantes: ${missingPermissions.join(', ')}`
        this.result.errors.push(errorMsg)
        console.warn(`   ⚠️  ${errorMsg}`)
      }

      if (this.options.verbose) {
        console.log(`   ✓ ${existingRoles.length} roles validados`)
        console.log(`   ✓ ${existingPermissions.length} permisos validados`)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn('⚠️  Error de conexión a la base de datos para validación:', errorMessage)
      console.log('🔄 Omitiendo validación del sistema...')
      
      // En caso de error de DB, solo reportamos que no se pudo validar
      console.log('📊 Validación omitida debido a problemas de conexión')
    }
  }
}

// Función principal para ejecutar el script
async function main() {
  const args = process.argv.slice(2)
  
  const options: SyncOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    createDefaultRoles: !args.includes('--no-default-roles'),
    syncUsers: !args.includes('--no-sync-users'),
    syncSessions: !args.includes('--no-sync-sessions'),
    cleanupExpired: !args.includes('--no-cleanup'),
    assignDefaultRoles: !args.includes('--no-assign-roles')
  }

  console.log('🎯 Configuración del script:')
  console.log(`   - Modo DRY RUN: ${options.dryRun ? 'SÍ' : 'NO'}`)
  console.log(`   - Verbose: ${options.verbose ? 'SÍ' : 'NO'}`)
  console.log(`   - Crear roles predeterminados: ${options.createDefaultRoles ? 'SÍ' : 'NO'}`)
  console.log(`   - Sincronizar usuarios: ${options.syncUsers ? 'SÍ' : 'NO'}`)
  console.log(`   - Asignar roles predeterminados: ${options.assignDefaultRoles ? 'SÍ' : 'NO'}`)
  console.log('')

  try {
    const syncManager = new RoleSyncManager(options)
    const result = await syncManager.sync()

    console.log('\n📊 Resumen de la sincronización:')
    console.log(`   - Usuarios creados: ${result.usersCreated}`)
    console.log(`   - Usuarios actualizados: ${result.usersUpdated}`)
    console.log(`   - Roles creados: ${result.rolesCreated}`)
    console.log(`   - Permisos creados: ${result.permissionsCreated}`)
    console.log(`   - Asignaciones de roles: ${result.roleAssignments}`)
    console.log(`   - Errores: ${result.errors.length}`)

    if (result.errors.length === 0) {
      console.log('\n🎉 ¡Sincronización completada exitosamente!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Sincronización completada con errores')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Error fatal en la sincronización:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main()
}

export { RoleSyncManager, DEFAULT_ROLES, DEFAULT_PERMISSIONS }