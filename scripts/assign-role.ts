#!/usr/bin/env node

/**
 * Script para asignar roles específicos a usuarios
 * 
 * Este script permite:
 * - Asignar un rol específico a un usuario por email
 * - Actualizar roles existentes
 * - Validar que el rol existe en el sistema
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

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

// Definición de roles del sistema
const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    name: 'SUPER_ADMIN',
    displayName: 'Super Administrador',
    description: 'Acceso completo al sistema',
    permissions: [
      'users:create', 'users:read', 'users:update', 'users:delete',
      'products:create', 'products:read', 'products:update', 'products:delete',
      'categories:create', 'categories:read', 'categories:update', 'categories:delete',
      'suppliers:create', 'suppliers:read', 'suppliers:update', 'suppliers:delete',
      'sales:create', 'sales:read', 'sales:update', 'sales:delete',
      'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete',
      'reports:read', 'reports:export',
      'settings:read', 'settings:update',
      'roles:assign', 'roles:revoke'
    ]
  },
  ADMIN: {
    name: 'ADMIN',
    displayName: 'Administrador',
    description: 'Administrador del sistema con permisos elevados',
    permissions: [
      'users:read', 'users:update',
      'products:create', 'products:read', 'products:update', 'products:delete',
      'categories:create', 'categories:read', 'categories:update', 'categories:delete',
      'suppliers:create', 'suppliers:read', 'suppliers:update', 'suppliers:delete',
      'sales:create', 'sales:read', 'sales:update',
      'inventory:create', 'inventory:read', 'inventory:update',
      'reports:read', 'reports:export',
      'settings:read'
    ]
  },
  MANAGER: {
    name: 'MANAGER',
    displayName: 'Gerente',
    description: 'Gerente con acceso a operaciones y reportes',
    permissions: [
      'products:read', 'products:update',
      'categories:read',
      'suppliers:read',
      'sales:create', 'sales:read', 'sales:update',
      'inventory:read', 'inventory:update',
      'reports:read'
    ]
  },
  CASHIER: {
    name: 'CASHIER',
    displayName: 'Cajero',
    description: 'Cajero con acceso a ventas y consultas básicas',
    permissions: [
      'products:read',
      'categories:read',
      'sales:create', 'sales:read',
      'inventory:read'
    ]
  },
  INVENTORY_MANAGER: {
    name: 'INVENTORY_MANAGER',
    displayName: 'Encargado de Inventario',
    description: 'Encargado de gestión de inventario y productos',
    permissions: [
      'products:create', 'products:read', 'products:update',
      'categories:create', 'categories:read', 'categories:update',
      'suppliers:create', 'suppliers:read', 'suppliers:update',
      'inventory:create', 'inventory:read', 'inventory:update',
      'reports:read'
    ]
  }
}

interface AssignRoleOptions {
  email: string
  role: string
  force: boolean
  dryRun: boolean
  verbose: boolean
}

/**
 * Asigna un rol a un usuario específico
 */
async function assignRoleToUser(options: AssignRoleOptions): Promise<void> {
  const { email, role, force, dryRun, verbose } = options

  console.log(`🎯 Asignando rol "${role}" al usuario: ${email}`)
  
  if (dryRun) {
    console.log('🔍 Modo dry-run activado - No se realizarán cambios reales\n')
  }

  // Validar que el rol existe
  if (!SYSTEM_ROLES[role as keyof typeof SYSTEM_ROLES]) {
    console.error(`❌ Error: El rol "${role}" no existe en el sistema`)
    console.error('   Roles disponibles:', Object.keys(SYSTEM_ROLES).join(', '))
    process.exit(1)
  }

  const roleConfig = SYSTEM_ROLES[role as keyof typeof SYSTEM_ROLES]

  try {
    // Buscar el usuario por email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Error obteniendo usuarios: ${listError.message}`)
    }

    const user = users?.users?.find((u: any) => u.email === email)
    
    if (!user) {
      console.error(`❌ Error: No se encontró un usuario con email: ${email}`)
      process.exit(1)
    }

    console.log(`✅ Usuario encontrado: ${user.email}`)
    console.log(`   🆔 ID: ${user.id}`)

    // Verificar rol actual
    const currentRole = user.user_metadata?.role
    if (currentRole) {
      console.log(`   👑 Rol actual: ${currentRole}`)
      
      if (currentRole === role && !force) {
        console.log(`ℹ️  El usuario ya tiene el rol "${role}" asignado`)
        console.log('   Usa --force para actualizar de todas formas')
        return
      }
    } else {
      console.log(`   ⚠️  Sin rol asignado actualmente`)
    }

    if (verbose) {
      console.log(`\n📋 Detalles del rol "${role}":`)
      console.log(`   📝 Nombre: ${roleConfig.displayName}`)
      console.log(`   📄 Descripción: ${roleConfig.description}`)
      console.log(`   🔑 Permisos (${roleConfig.permissions.length}):`)
      roleConfig.permissions.forEach(permission => {
        console.log(`      - ${permission}`)
      })
    }

    if (dryRun) {
      console.log(`\n🔍 [DRY RUN] Se asignaría el rol "${role}" al usuario ${email}`)
      return
    }

    // Actualizar metadatos del usuario
    const updatedMetadata = {
      ...user.user_metadata,
      role: roleConfig.name,
      role_display_name: roleConfig.displayName,
      role_description: roleConfig.description,
      permissions: roleConfig.permissions,
      role_assigned_at: new Date().toISOString(),
      role_assigned_by: 'admin-script'
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: updatedMetadata
      }
    )

    if (updateError) {
      throw new Error(`Error actualizando usuario: ${updateError.message}`)
    }

    console.log(`\n🎉 ¡Rol asignado exitosamente!`)
    console.log(`   👤 Usuario: ${email}`)
    console.log(`   👑 Nuevo rol: ${roleConfig.displayName} (${roleConfig.name})`)
    console.log(`   🔑 Permisos: ${roleConfig.permissions.length}`)
    console.log(`   ⏰ Asignado: ${new Date().toLocaleString()}`)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('❌ Error asignando rol:', errorMessage)
    process.exit(1)
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    return
  }

  const emailArg = args.find(arg => arg.startsWith('--email='))?.split('=')[1]
  const roleArg = args.find(arg => arg.startsWith('--role='))?.split('=')[1]

  if (!emailArg || !roleArg) {
    console.error('❌ Error: Se requieren --email y --role')
    console.error('   Usa --help para ver la ayuda completa')
    console.error(`   Argumentos recibidos: ${args.join(' ')}`)
    process.exit(1)
  }

  const options: AssignRoleOptions = {
    email: emailArg,
    role: roleArg.toUpperCase(),
    force: args.includes('--force') || args.includes('-f'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v')
  }

  await assignRoleToUser(options)
}

/**
 * Muestra la ayuda del script
 */
function printHelp(): void {
  console.log(`
🎯 Script de Asignación de Roles

Uso: npx tsx scripts/assign-role.ts --email=EMAIL --role=ROLE [opciones]

Parámetros requeridos:
  --email=EMAIL          Email del usuario al que asignar el rol
  --role=ROLE            Rol a asignar (ver roles disponibles abajo)

Opciones:
  --force, -f            Forzar actualización aunque el rol ya esté asignado
  --dry-run              Simular la asignación sin realizar cambios
  --verbose, -v          Mostrar información detallada
  --help, -h             Mostrar esta ayuda

Roles disponibles:
  SUPER_ADMIN           Super Administrador (acceso completo)
  ADMIN                 Administrador (permisos elevados)
  MANAGER               Gerente (operaciones y reportes)
  CASHIER               Cajero (ventas y consultas básicas)
  INVENTORY_MANAGER     Encargado de Inventario (productos e inventario)

Ejemplos:
  # Asignar rol de administrador
  npx tsx scripts/assign-role.ts --email=admin@empresa.com --role=ADMIN

  # Asignar rol de cajero con información detallada
  npx tsx scripts/assign-role.ts --email=cajero@empresa.com --role=CASHIER --verbose

  # Simular asignación de gerente
  npx tsx scripts/assign-role.ts --email=gerente@empresa.com --role=MANAGER --dry-run

  # Forzar actualización de rol existente
  npx tsx scripts/assign-role.ts --email=usuario@empresa.com --role=ADMIN --force
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

export { assignRoleToUser }