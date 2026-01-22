#!/usr/bin/env tsx

/**
 * Script para crear usuarios de prueba en la base de datos local
 * Estos usuarios deben existir localmente antes de poder asignar roles
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const prisma = new PrismaClient()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const TEST_USERS = [
  {
    email: 'manager@test.com',
    fullName: 'Test Manager',
    role: 'MANAGER'
  },
  {
    email: 'employee@test.com',
    fullName: 'Test Employee',
    role: 'EMPLOYEE'
  },
  {
    email: 'cashier@test.com',
    fullName: 'Test Cashier',
    role: 'CASHIER'
  }
]

async function getSupabaseUserId(email: string): Promise<string | null> {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error(`❌ Error obteniendo usuarios de Supabase:`, error.message)
      return null
    }

    const user = users.find(u => u.email === email)
    return user?.id || null
  } catch (error) {
    console.error(`❌ Error conectando con Supabase:`, error)
    return null
  }
}

async function createLocalUser(email: string, fullName: string, role: string) {
  try {
    // Verificar si el usuario ya existe localmente
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log(`⚠️  Usuario ${email} ya existe localmente (ID: ${existingUser.id})`)
      return existingUser.id
    }

    // Obtener el ID del usuario de Supabase
    const supabaseUserId = await getSupabaseUserId(email)
    
    if (!supabaseUserId) {
      console.error(`❌ No se encontró el usuario ${email} en Supabase Auth`)
      return null
    }

    // Crear el usuario en la base de datos local
    const newUser = await prisma.user.create({
      data: {
        id: supabaseUserId, // Usar el mismo ID de Supabase
        email,
        fullName,
        role // Campo legacy para compatibilidad
      }
    })

    console.log(`✅ Usuario ${email} creado localmente (ID: ${newUser.id})`)
    return newUser.id

  } catch (error) {
    console.error(`❌ Error creando usuario ${email}:`, error)
    return null
  }
}

async function assignRoleToUser(userId: string, roleName: string, userEmail: string) {
  try {
    // Buscar el rol
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    })

    if (!role) {
      console.error(`❌ Rol ${roleName} no encontrado`)
      return false
    }

    // Verificar si ya tiene el rol asignado
    const existingAssignment = await prisma.userRole_New.findUnique({
      where: {
        userId_roleId: {
          userId: userId,
          roleId: role.id
        }
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
        assignedBy: 'create-local-users-script',
        assignedAt: new Date(),
        isActive: true
      }
    })

    console.log(`✅ Rol ${roleName} asignado exitosamente al usuario ${userEmail}`)
    return true

  } catch (error) {
    console.error(`❌ Error asignando rol ${roleName} al usuario ${userEmail}:`, error)
    return false
  }
}

async function main() {
  console.log('🚀 Creando usuarios de prueba en base de datos local...\n')

  try {
    for (const testUser of TEST_USERS) {
      console.log(`\n📝 Procesando usuario: ${testUser.email}`)
      
      // Crear usuario local
      const userId = await createLocalUser(testUser.email, testUser.fullName, testUser.role)
      
      if (userId) {
        // Asignar rol
        await assignRoleToUser(userId, testUser.role, testUser.email)
      }
    }

    console.log('\n🎉 Proceso completado!')
    console.log('\n📋 Resumen de usuarios de prueba creados:')
    
    // Verificar usuarios creados
    const createdUsers = await prisma.user.findMany({
      where: {
        email: {
          in: TEST_USERS.map(u => u.email)
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    createdUsers.forEach(user => {
      const roles = user.userRoles.map(ur => ur.role.name).join(', ')
      console.log(`   ✅ ${user.email} - Roles: ${roles || 'Sin roles'}`)
    })

  } catch (error) {
    console.error('❌ Error durante la creación de usuarios:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

export { main as createLocalTestUsers }