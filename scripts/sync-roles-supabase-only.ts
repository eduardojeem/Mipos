#!/usr/bin/env node

/**
 * Script de Sincronización de Roles - Solo Supabase
 * 
 * Este script maneja roles y permisos usando únicamente Supabase Auth
 * sin depender de la base de datos PostgreSQL local.
 * 
 * Funcionalidades:
 * - Gestión de roles en metadatos de usuario de Supabase
 * - Asignación automática de roles basada en email o configuración
 * - Validación de permisos usando metadatos
 * - Sincronización de usuarios existentes
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

const envCandidates = ['.env.local', 'apps/frontend/.env.local', '.env']
for (const p of envCandidates) {
  try {
    dotenv.config({ path: p })
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      break
    }
  } catch {}
}

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  console.error('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Definición de roles y permisos del sistema
const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    name: 'SUPER_ADMIN',
    displayName: 'Super Administrador',
    description: 'Acceso completo al sistema',
    permissions: [
      'users:*', 'roles:*', 'products:*', 'sales:*', 
      'inventory:*', 'reports:*', 'settings:*', 'audit:*'
    ]
  },
  ADMIN: {
    name: 'ADMIN',
    displayName: 'Administrador',
    description: 'Administrador del sistema',
    permissions: [
      'users:create', 'users:read', 'users:update',
      'products:*', 'sales:*', 'inventory:*', 'reports:*'
    ]
  },
  MANAGER: {
    name: 'MANAGER',
    displayName: 'Gerente',
    description: 'Gerente con permisos de supervisión',
    permissions: [
      'users:read', 'products:read', 'sales:*', 
      'inventory:read', 'reports:read'
    ]
  },
  CASHIER: {
    name: 'CASHIER',
    displayName: 'Cajero',
    description: 'Cajero con permisos básicos',
    permissions: [
      'products:read', 'sales:create', 'sales:read'
    ]
  },
  INVENTORY_MANAGER: {
    name: 'INVENTORY_MANAGER',
    displayName: 'Encargado de Inventario',
    description: 'Encargado de inventario',
    permissions: [
      'products:*', 'inventory:*', 'reports:read'
    ]
  }
}

// Configuración de administradores por email
const ADMIN_EMAILS = [
  'jeem101595@gmail.com', // Email del administrador principal
  // Agregar más emails de administradores aquí
]

interface SyncOptions {
  dryRun: boolean
  verbose: boolean
  assignRoles: boolean
  updateExisting: boolean
}

interface SyncStats {
  usersProcessed: number
  rolesAssigned: number
  rolesUpdated: number
  errors: string[]
}

class SupabaseRoleManager {
  private options: SyncOptions
  private stats: SyncStats

  constructor(options: SyncOptions) {
    this.options = options
    this.stats = {
      usersProcessed: 0,
      rolesAssigned: 0,
      rolesUpdated: 0,
      errors: []
    }
  }

  /**
   * Ejecuta la sincronización completa
   */
  async sync(): Promise<void> {
    console.log('🚀 Iniciando sincronización de roles en Supabase...')
    
    if (this.options.dryRun) {
      console.log('📝 [MODO DRY-RUN] - No se realizarán cambios reales')
    }

    try {
      await this.processUsers()
      await this.validateRoles()
      
      this.printSummary()
      
      if (this.stats.errors.length === 0) {
        console.log('🎉 ¡Sincronización completada exitosamente!')
      } else {
        console.log('⚠️  Sincronización completada con errores')
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error fatal en la sincronización:', errorMessage)
      process.exit(1)
    }
  }

  /**
   * Procesa todos los usuarios de Supabase
   */
  private async processUsers(): Promise<void> {
    console.log('👤 Procesando usuarios de Supabase...')

    try {
      const { data: users, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        throw new Error(`Error obteniendo usuarios: ${error.message}`)
      }

      console.log(`📊 Usuarios encontrados: ${users.users.length}`)

      for (const user of users.users) {
        try {
          await this.processUser(user)
          this.stats.usersProcessed++
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
          const errorMsg = `Error procesando usuario ${user.email}: ${errorMessage}`
          this.stats.errors.push(errorMsg)
          console.error(`   ❌ ${errorMsg}`)
        }
      }

      console.log(`✅ Usuarios procesados: ${this.stats.usersProcessed}`)

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      throw new Error(`Error en procesamiento de usuarios: ${errorMessage}`)
    }
  }

  /**
   * Procesa un usuario individual
   */
  private async processUser(user: any): Promise<void> {
    const currentRole = user.user_metadata?.role
    const currentPermissions = user.user_metadata?.permissions || []
    
    // Determinar el rol apropiado
    const newRole = this.determineUserRole(user)
    const newPermissions = SYSTEM_ROLES[newRole]?.permissions || []

    if (this.options.verbose) {
      console.log(`   👤 Usuario: ${user.email}`)
      console.log(`      Rol actual: ${currentRole || 'ninguno'}`)
      console.log(`      Rol nuevo: ${newRole}`)
    }

    // Verificar si necesita actualización
    const needsUpdate = !currentRole || 
                       currentRole !== newRole || 
                       this.options.updateExisting ||
                       !this.arraysEqual(currentPermissions, newPermissions)

    if (!needsUpdate) {
      if (this.options.verbose) {
        console.log(`      ✓ Usuario ya tiene el rol correcto`)
      }
      return
    }

    if (this.options.assignRoles) {
      if (this.options.dryRun) {
        console.log(`   📝 [DRY RUN] Asignaría rol ${newRole} a ${user.email}`)
        this.stats.rolesAssigned++
      } else {
        await this.assignRoleToUser(user.id, newRole, newPermissions)
        
        if (currentRole) {
          this.stats.rolesUpdated++
          if (this.options.verbose) {
            console.log(`      ✓ Rol actualizado: ${currentRole} → ${newRole}`)
          }
        } else {
          this.stats.rolesAssigned++
          if (this.options.verbose) {
            console.log(`      ✓ Rol asignado: ${newRole}`)
          }
        }
      }
    }
  }

  /**
   * Determina el rol apropiado para un usuario
   */
  private determineUserRole(user: any): string {
    // Si ya tiene un rol válido y no estamos forzando actualización
    const currentRole = user.user_metadata?.role
    if (currentRole && SYSTEM_ROLES[currentRole] && !this.options.updateExisting) {
      return currentRole
    }

    // Verificar si es administrador por email
    if (ADMIN_EMAILS.includes(user.email)) {
      return 'SUPER_ADMIN'
    }

    // Verificar por dominio de email (opcional)
    const emailDomain = user.email.split('@')[1]
    if (emailDomain === 'admin.company.com') {
      return 'ADMIN'
    }
    
    // Rol por defecto si no coincide con reglas
    return 'CASHIER'
  }

  /**
   * Asigna rol a un usuario en Supabase
   */
  private async assignRoleToUser(userId: string, role: string, permissions: string[]): Promise<void> {
    try {
      if (this.options.dryRun) {
        console.log(`[DRY RUN] Asignaría rol ${role} al usuario ${userId}`)
        return
      }

      const metadataUpdate = {
        role,
        role_display_name: SYSTEM_ROLES[role]?.displayName || role,
        role_description: SYSTEM_ROLES[role]?.description || '',
        permissions,
        role_assigned_at: new Date().toISOString(),
        role_assigned_by: 'sync-roles-script'
      }

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: metadataUpdate
      })

      if (error) throw new Error(error.message)

      if (this.options.verbose) {
        console.log(`      ✓ Metadatos actualizados para usuario ${userId}`)
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error(`      ❌ Error asignando rol: ${errorMessage}`)
      this.stats.errors.push(`Error asignando rol a ${userId}: ${errorMessage}`)
    }
  }

  /**
   * Valida consistencia de roles (opcional, puede agregar reglas adicionales)
   */
  private async validateRoles(): Promise<void> {
    if (!this.options.verbose) return
    console.log('🔎 Validando roles y permisos asignados...')

    const { data: users, error } = await supabase.auth.admin.listUsers()
    if (error) {
      console.error('   ❌ Error obteniendo usuarios para validación:', error.message)
      return
    }

    for (const user of users.users) {
      const role = user.user_metadata?.role
      const permissions = user.user_metadata?.permissions || []
      if (role && SYSTEM_ROLES[role] && !this.arraysEqual(permissions, SYSTEM_ROLES[role].permissions)) {
        console.log(`   ⚠️ Usuario ${user.email} tiene permisos desactualizados para rol ${role}`)
      }
    }
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false
    const sa = [...a].sort(); const sb = [...b].sort()
    return sa.every((v, i) => v === sb[i])
  }

  private printSummary(): void {
    console.log('\n📈 Resumen de sincronización:')
    console.log(`   👥 Usuarios procesados: ${this.stats.usersProcessed}`)
    console.log(`   ✅ Roles asignados: ${this.stats.rolesAssigned}`)
    console.log(`   🔄 Roles actualizados: ${this.stats.rolesUpdated}`)
    if (this.stats.errors.length) {
      console.log(`   ❌ Errores (${this.stats.errors.length}):`)
      this.stats.errors.forEach(e => console.log(`      - ${e}`))
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const options: SyncOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    assignRoles: !args.includes('--no-assign'),
    updateExisting: args.includes('--update-existing')
  }

  const manager = new SupabaseRoleManager(options)
  await manager.sync()
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error fatal:', err)
    process.exit(1)
  })
}