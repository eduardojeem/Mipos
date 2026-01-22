#!/usr/bin/env tsx

/**
 * Script para crear usuarios de prueba con diferentes roles
 * 
 * Este script crea usuarios con roles específicos para probar
 * el sistema de permisos granular implementado.
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

// Usuarios de prueba con diferentes roles
const TEST_USERS = [
  {
    email: 'manager@test.com',
    password: 'Manager123!',
    fullName: 'Manager de Prueba',
    role: 'MANAGER'
  },
  {
    email: 'employee@test.com',
    password: 'Employee123!',
    fullName: 'Empleado de Prueba',
    role: 'EMPLOYEE'
  },
  {
    email: 'cashier@test.com',
    password: 'Cashier123!',
    fullName: 'Cajero de Prueba',
    role: 'CASHIER'
  }
]

/**
 * Crear usuario en Supabase Auth
 */
async function createSupabaseUser(userData: typeof TEST_USERS[0]) {
  console.log(`📧 Creando usuario: ${userData.email}`)

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.fullName,
        role: userData.role
      }
    })

    if (error) {
      if (error.message.includes('User already registered')) {
        console.log(`⚠️  Usuario ${userData.email} ya existe`)
        
        // Buscar usuario existente
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users.users.find(u => u.email === userData.email)
        
        if (existingUser) {
          // Actualizar metadatos
          await supabase.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              full_name: userData.fullName,
              role: userData.role
            }
          })
          console.log(`✅ Metadatos actualizados para ${userData.email}`)
          return existingUser
        }
      } else {
        throw error
      }
    }

    console.log(`✅ Usuario creado en Supabase: ${userData.email}`)
    return data.user
  } catch (error: any) {
    console.error(`❌ Error creando usuario ${userData.email}:`, error.message)
    return null
  }
}

/**
 * Asignar rol en la base de datos
 */
async function assignRoleInDatabase(userId: string, roleName: string) {
  try {
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
    const existingAssignment = await prisma.userRole.findFirst({
      where: {
        userId: userId,
        roleId: role.id
      }
    })

    if (existingAssignment) {
      console.log(`⚠️  Rol ${roleName} ya asignado al usuario`)
      return
    }

    // Asignar el rol
    await prisma.userRole.create({
      data: {
        userId: userId,
        roleId: role.id,
        assignedBy: 'test-script',
        assignedAt: new Date()
      }
    })

    console.log(`✅ Rol ${roleName} asignado al usuario`)
  } catch (error: any) {
    console.error(`❌ Error asignando rol ${roleName}:`, error.message)
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
 * Configurar permisos básicos para los roles
 */
async function setupRolePermissions() {
  console.log('\n🔐 Configurando permisos básicos para roles...')

  const rolePermissions = {
    MANAGER: [
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'create' },
      { resource: 'products', action: 'update' },
      { resource: 'customers', action: 'read' },
      { resource: 'customers', action: 'create' },
      { resource: 'customers', action: 'update' },
      { resource: 'reports', action: 'read' },
      { resource: 'reports', action: 'export' },
      { resource: 'settings', action: 'read' }
    ],
    EMPLOYEE: [
      { resource: 'products', action: 'read' },
      { resource: 'customers', action: 'read' },
      { resource: 'customers', action: 'create' }
    ],
    CASHIER: [
      { resource: 'products', action: 'read' },
      { resource: 'customers', action: 'read' },
      { resource: 'sales', action: 'create' },
      { resource: 'sales', action: 'read' }
    ]
  }

  for (const [roleName, permissions] of Object.entries(rolePermissions)) {
    try {
      const role = await prisma.role.findUnique({
        where: { name: roleName }
      })

      if (!role) continue

      for (const permData of permissions) {
        // Buscar o crear el permiso
        let permission = await prisma.permission.findFirst({
          where: {
            name: `${permData.resource}:${permData.action}`
          }
        })

        if (!permission) {
          permission = await prisma.permission.create({
            data: {
              name: `${permData.resource}:${permData.action}`,
              displayName: `${permData.action.charAt(0).toUpperCase() + permData.action.slice(1)} ${permData.resource}`,
              resource: permData.resource,
              action: permData.action,
              description: `Permiso para ${permData.action} ${permData.resource}`
            }
          })
        }

        // Verificar si ya existe la relación
        const existingRelation = await prisma.rolePermission.findFirst({
          where: {
            roleId: role.id,
            permissionId: permission.id
          }
        })

        if (!existingRelation) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id
            }
          })
        }
      }

      console.log(`✅ Permisos configurados para rol ${roleName}`)
    } catch (error: any) {
      console.error(`❌ Error configurando permisos para ${roleName}:`, error.message)
    }
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Creando usuarios de prueba para sistema de permisos...\n')

  try {
    // Crear usuarios de prueba
    for (const userData of TEST_USERS) {
      console.log(`\n👤 Procesando usuario: ${userData.email}`)
      
      const user = await createSupabaseUser(userData)
      
      if (user) {
        await assignRoleInDatabase(user.id, userData.role)
      }
    }

    // Configurar permisos básicos
    await setupRolePermissions()

    console.log('\n🎉 ¡Usuarios de prueba creados exitosamente!')
    console.log('\n📋 Usuarios disponibles para pruebas:')
    console.log('=' .repeat(50))
    
    TEST_USERS.forEach(user => {
      console.log(`📧 ${user.email}`)
      console.log(`🔑 ${user.password}`)
      console.log(`👤 ${user.fullName} (${user.role})`)
      console.log('-' .repeat(30))
    })

    console.log('\n💡 Puedes usar estos usuarios para probar el sistema de permisos')
    console.log('   en diferentes páginas del dashboard.')

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

export { main as createTestUsers }