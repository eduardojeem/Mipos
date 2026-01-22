#!/usr/bin/env node

/**
 * Script para verificar y mostrar los roles de usuarios en Supabase
 * 
 * Este script permite:
 * - Ver todos los usuarios y sus roles actuales
 * - Verificar permisos asignados
 * - Mostrar información detallada de metadatos
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Cargar variables de entorno desde .env.local, con fallback a apps/frontend/.env.local y .env
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

interface CheckOptions {
  verbose: boolean
  showPermissions: boolean
  filterRole?: string
}

/**
 * Función principal para verificar roles
 */
async function checkUserRoles(options: CheckOptions): Promise<void> {
  console.log('🔍 Verificando roles de usuarios en Supabase...\n')

  try {
    const { data: users, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      throw new Error(`Error obteniendo usuarios: ${error.message}`)
    }

    console.log(`📊 Total de usuarios encontrados: ${users.users.length}\n`)

    let filteredUsers = users.users
    if (options.filterRole) {
      filteredUsers = users.users.filter((user: any) => 
        user.user_metadata?.role === options.filterRole
      )
      console.log(`🔽 Filtrando por rol: ${options.filterRole}`)
      console.log(`📊 Usuarios con rol ${options.filterRole}: ${filteredUsers.length}\n`)
    }

    if (filteredUsers.length === 0) {
      console.log('ℹ️  No se encontraron usuarios que coincidan con los criterios')
      return
    }

    // Mostrar información de cada usuario
    filteredUsers.forEach((user: any, index: number) => {
      console.log(`👤 Usuario ${index + 1}:`)
      console.log(`   📧 Email: ${user.email}`)
      console.log(`   🆔 ID: ${user.id}`)
      console.log(`   📅 Creado: ${new Date(user.created_at).toLocaleString()}`)
      console.log(`   🔐 Último login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Nunca'}`)
      
      const role = user.user_metadata?.role
      const roleDisplayName = user.user_metadata?.role_display_name
      const roleDescription = user.user_metadata?.role_description
      const permissions = user.user_metadata?.permissions || []
      const roleAssignedAt = user.user_metadata?.role_assigned_at
      const roleAssignedBy = user.user_metadata?.role_assigned_by

      if (role) {
        console.log(`   👑 Rol: ${role}`)
        if (roleDisplayName) {
          console.log(`   📝 Nombre del rol: ${roleDisplayName}`)
        }
        if (roleDescription) {
          console.log(`   📄 Descripción: ${roleDescription}`)
        }
        if (roleAssignedAt) {
          console.log(`   ⏰ Asignado el: ${new Date(roleAssignedAt).toLocaleString()}`)
        }
        if (roleAssignedBy) {
          console.log(`   👨‍💼 Asignado por: ${roleAssignedBy}`)
        }
      } else {
        console.log(`   ⚠️  Sin rol asignado`)
      }

      if (options.showPermissions && permissions.length > 0) {
        console.log(`   🔑 Permisos (${permissions.length}):`)
        permissions.forEach((permission: string) => {
          console.log(`      - ${permission}`)
        })
      } else if (options.showPermissions) {
        console.log(`   🔑 Sin permisos específicos`)
      }

      if (options.verbose) {
        console.log(`   📋 Metadatos completos:`)
        console.log(`      ${JSON.stringify(user.user_metadata, null, 6)}`)
      }

      console.log('') // Línea en blanco entre usuarios
    })

    // Resumen por roles
    console.log('📊 Resumen por roles:')
    const roleCount: Record<string, number> = {}
    let usersWithoutRole = 0

    users.users.forEach((user: any) => {
      const role = user.user_metadata?.role
      if (role) {
        roleCount[role] = (roleCount[role] || 0) + 1
      } else {
        usersWithoutRole++
      }
    })

    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} usuario(s)`)
    })

    if (usersWithoutRole > 0) {
      console.log(`   Sin rol: ${usersWithoutRole} usuario(s)`)
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('❌ Error verificando roles:', errorMessage)
    process.exit(1)
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  
  const options: CheckOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    showPermissions: args.includes('--show-permissions') || args.includes('-p'),
    filterRole: args.find(arg => arg.startsWith('--role='))?.split('=')[1]
  }

  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    return
  }

  await checkUserRoles(options)
}

/**
 * Muestra la ayuda del script
 */
function printHelp(): void {
  console.log(`
🔍 Script de Verificación de Roles de Usuario

Uso: npx tsx scripts/check-user-roles.ts [opciones]

Opciones:
  --verbose, -v          Muestra metadatos completos de usuario
  --show-permissions, -p Muestra permisos detallados
  --role=ROLE_NAME       Filtra usuarios por rol específico
  --help, -h             Muestra esta ayuda

Ejemplos:
  # Ver todos los usuarios y sus roles
  npx tsx scripts/check-user-roles.ts

  # Ver información detallada con permisos
  npx tsx scripts/check-user-roles.ts --verbose --show-permissions

  # Ver solo usuarios con rol ADMIN
  npx tsx scripts/check-user-roles.ts --role=ADMIN

  # Ver usuarios CASHIER con permisos
  npx tsx scripts/check-user-roles.ts --role=CASHIER --show-permissions

Roles disponibles:
  - SUPER_ADMIN
  - ADMIN
  - MANAGER
  - CASHIER
  - INVENTORY_MANAGER
`)
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('❌ Error fatal:', errorMessage)
    process.exit(1)
  })
}

export { checkUserRoles }