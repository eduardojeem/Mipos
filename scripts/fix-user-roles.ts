#!/usr/bin/env tsx

/**
 * Script para corregir asignación de roles a usuarios de prueba
 * 
 * Este script asigna correctamente los roles a los usuarios
 * creados para las pruebas del sistema de permisos.
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Cargar variables de entorno
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const prisma = new PrismaClient()

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

// Cliente de Supabase con permisos de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Mapeo de usuarios y roles
const USER_ROLE_MAPPING = [
  {
    email: 'manager@test.com',
    roleName: 'MANAGER'
  },
  {
    email: 'employee@test.com',
    roleName: 'EMPLOYEE'
  },
  {
    email: 'cashier@test.com',
    roleName: 'CASHIER'
  }
]

/**
 * Obtener usuario de Supabase por email
 */
async function getSupabaseUserByEmail(email: string) {
  try {
    const { data: users } = await supabase.auth.admin.listUsers()
    return users.users.find(user => user.email === email)
  } catch (error: any) {
    console.error(`❌ Error obteniendo usuario ${email}:`, error.message)
    return null
  }
}

/**
 * Asignar rol a usuario en la base de datos
 */
async function assignRoleToUser(userId: string, roleName: string, userEmail: string) {
  try {
    console.log(`🔄 Asignando rol ${roleName} al usuario ${userEmail}...`)

    // Buscar o crear el rol
    let role = await prisma.role.findUnique({
      where: { name: roleName }
    })

    if (!role) {
      // Crear el rol si no existe
      const roleData = getRoleData(roleName)
      role = await prisma.role.create({
        data: roleData
      })
      console.log(`✅ Rol ${roleName} creado`)
    }

    // Verificar si ya tiene el rol asignado
    const existingAssignment = await prisma.userRole_New.findFirst({
      where: {
        userId: userId,
        roleId: role.id,
        isActive: true
      }
    })

    if (existingAssignment) {
      console.log(`⚠️  Rol ${roleName} ya asignado al usuario ${userEmail}`)
      return true
    }

    // Asignar el rol
    await prisma.userRole_New.create({
      data: {
        userId: userId,
        roleId: role.id,
        assignedBy: 'fix-roles-script',
        assignedAt: new Date(),
        isActive: true
      }
    })

    console.log(`✅ Rol ${roleName} asignado exitosamente al usuario ${userEmail}`)
    return true

  } catch (error: any) {
    console.error(`❌ Error asignando rol ${roleName} al usuario ${userEmail}:`, error.message)
    return false
  }
}

/**
 * Obtener datos del rol según el nombre
 */
function getRoleData(roleName: string) {
  const roleConfigs = {
    MANAGER: {
      name: 'MANAGER',
      displayName: 'Manager',
      description: 'Manager con permisos limitados',
      isSystemRole: true,
      isActive: true
    },
    EMPLOYEE: {
      name: 'EMPLOYEE',
      displayName: 'Empleado',
      description: 'Empleado con permisos básicos',
      isSystemRole: true,
      isActive: true
    },
    CASHIER: {
      name: 'CASHIER',
      displayName: 'Cajero',
      description: 'Cajero con permisos de venta',
      isSystemRole: true,
      isActive: true
    }
  }

  return roleConfigs[roleName as keyof typeof roleConfigs] || {
    name: roleName,
    displayName: roleName,
    description: `Rol ${roleName}`,
    isSystemRole: false,
    isActive: true
  }
}

/**
 * Verificar asignaciones de roles
 */
async function verifyRoleAssignments() {
  console.log('\n🔍 Verificando asignaciones de roles...')
  
  for (const mapping of USER_ROLE_MAPPING) {
    try {
      const user = await getSupabaseUserByEmail(mapping.email)
      
      if (!user) {
        console.log(`❌ Usuario ${mapping.email} no encontrado`)
        continue
      }

      const userRoles = await prisma.userRole_New.findMany({
        where: {
          userId: user.id,
          isActive: true
        },
        include: {
          role: true
        }
      })

      if (userRoles.length === 0) {
        console.log(`❌ Usuario ${mapping.email} no tiene roles asignados`)
      } else {
        const roleNames = userRoles.map(ur => ur.role.name).join(', ')
        console.log(`✅ Usuario ${mapping.email} tiene roles: ${roleNames}`)
      }

    } catch (error: any) {
      console.error(`❌ Error verificando usuario ${mapping.email}:`, error.message)
    }
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🔧 Corrigiendo asignación de roles a usuarios de prueba...\n')

  try {
    // Verificar estado actual
    await verifyRoleAssignments()

    console.log('\n🔄 Asignando roles faltantes...')

    // Asignar roles a cada usuario
    for (const mapping of USER_ROLE_MAPPING) {
      const user = await getSupabaseUserByEmail(mapping.email)
      
      if (user) {
        await assignRoleToUser(user.id, mapping.roleName, mapping.email)
      } else {
        console.log(`❌ Usuario ${mapping.email} no encontrado en Supabase`)
      }
    }

    // Verificar estado final
    console.log('\n🔍 Verificación final...')
    await verifyRoleAssignments()

    console.log('\n🎉 ¡Corrección de roles completada!')
    console.log('\n💡 Ahora puedes ejecutar las pruebas de permisos nuevamente:')
    console.log('   npx tsx scripts/test-permissions-ui.ts')

  } catch (error: any) {
    console.error('❌ Error en el proceso:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

export { main as fixUserRoles }