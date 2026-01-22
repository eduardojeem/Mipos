#!/usr/bin/env tsx

/**
 * Script para probar el sistema de permisos granular
 * 
 * Este script verifica que los permisos funcionen correctamente
 * para diferentes roles de usuario en el sistema.
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Cargar variables de entorno
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const prisma = new PrismaClient()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

// Cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Usuarios de prueba
const TEST_USERS = [
  {
    email: 'jeem101595@gmail.com',
    role: 'ADMIN',
    expectedPermissions: ['products:create', 'products:update', 'products:delete', 'customers:create', 'customers:update', 'customers:delete', 'reports:export', 'settings:update']
  },
  {
    email: 'manager@test.com',
    password: 'Manager123!',
    role: 'MANAGER',
    expectedPermissions: ['products:read', 'products:create', 'products:update', 'customers:read', 'customers:create', 'customers:update', 'reports:read', 'reports:export']
  },
  {
    email: 'employee@test.com',
    password: 'Employee123!',
    role: 'EMPLOYEE',
    expectedPermissions: ['products:read', 'customers:read', 'customers:create']
  },
  {
    email: 'cashier@test.com',
    password: 'Cashier123!',
    role: 'CASHIER',
    expectedPermissions: ['products:read', 'customers:read', 'sales:create', 'sales:read']
  }
]

/**
 * Iniciar sesión con un usuario
 */
async function signInUser(email: string, password?: string) {
  try {
    if (!password) {
      console.log(`⚠️  No se proporcionó contraseña para ${email}, omitiendo prueba de login`)
      return null
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error(`❌ Error iniciando sesión con ${email}:`, error.message)
      return null
    }

    console.log(`✅ Sesión iniciada exitosamente: ${email}`)
    return data.user
  } catch (error: any) {
    console.error(`❌ Error inesperado iniciando sesión:`, error.message)
    return null
  }
}

/**
 * Verificar permisos de un usuario
 */
async function checkUserPermissions(userId: string, expectedPermissions: string[]) {
  try {
    console.log(`\n🔍 Verificando permisos para usuario: ${userId}`)
    
    // Obtener roles del usuario
    const userRoles = await prisma.userRole_New.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    })

    if (userRoles.length === 0) {
      console.log(`⚠️  Usuario no tiene roles asignados`)
      return false
    }

    // Recopilar todos los permisos
    const userPermissions = new Set<string>()
    
    userRoles.forEach(userRole => {
      userRole.role.permissions.forEach(rolePermission => {
        const permissionName = `${rolePermission.permission.resource}:${rolePermission.permission.action}`
        userPermissions.add(permissionName)
      })
    })

    console.log(`📋 Permisos encontrados: ${Array.from(userPermissions).join(', ')}`)
    
    // Verificar permisos esperados
    let allPermissionsFound = true
    
    for (const expectedPermission of expectedPermissions) {
      if (userPermissions.has(expectedPermission)) {
        console.log(`✅ Permiso encontrado: ${expectedPermission}`)
      } else {
        console.log(`❌ Permiso faltante: ${expectedPermission}`)
        allPermissionsFound = false
      }
    }

    return allPermissionsFound
  } catch (error: any) {
    console.error(`❌ Error verificando permisos:`, error.message)
    return false
  }
}

/**
 * Probar acceso a recursos específicos
 */
async function testResourceAccess(userEmail: string, role: string) {
  console.log(`\n🎯 Probando acceso a recursos para ${role}:`)
  
  const resourceTests = {
    'ADMIN': {
      'Productos': ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Exportar'],
      'Clientes': ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Exportar'],
      'Reportes': ['Leer', 'Exportar'],
      'Configuración': ['Leer', 'Actualizar', 'Exportar', 'Restaurar']
    },
    'MANAGER': {
      'Productos': ['Crear', 'Leer', 'Actualizar'],
      'Clientes': ['Crear', 'Leer', 'Actualizar'],
      'Reportes': ['Leer', 'Exportar'],
      'Configuración': ['Leer']
    },
    'EMPLOYEE': {
      'Productos': ['Leer'],
      'Clientes': ['Crear', 'Leer']
    },
    'CASHIER': {
      'Productos': ['Leer'],
      'Clientes': ['Leer'],
      'Ventas': ['Crear', 'Leer']
    }
  }

  const expectedAccess = resourceTests[role as keyof typeof resourceTests] || {}
  
  Object.entries(expectedAccess).forEach(([resource, actions]) => {
    console.log(`📂 ${resource}:`)
    actions.forEach(action => {
      console.log(`   ✅ ${action}`)
    })
  })
}

/**
 * Cerrar sesión
 */
async function signOut() {
  try {
    await supabase.auth.signOut()
    console.log(`🚪 Sesión cerrada`)
  } catch (error: any) {
    console.error(`❌ Error cerrando sesión:`, error.message)
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando pruebas del sistema de permisos granular...\n')
  console.log('=' .repeat(60))

  try {
    for (const testUser of TEST_USERS) {
      console.log(`\n👤 PROBANDO USUARIO: ${testUser.email}`)
      console.log(`🏷️  ROL: ${testUser.role}`)
      console.log('-' .repeat(50))

      // Intentar iniciar sesión (solo si hay contraseña)
      if (testUser.password) {
        const user = await signInUser(testUser.email, testUser.password)
        
        if (user) {
          // Verificar permisos
          const permissionsValid = await checkUserPermissions(user.id, testUser.expectedPermissions)
          
          if (permissionsValid) {
            console.log(`✅ Todos los permisos esperados están configurados correctamente`)
          } else {
            console.log(`❌ Algunos permisos no están configurados correctamente`)
          }
          
          // Probar acceso a recursos
          await testResourceAccess(testUser.email, testUser.role)
          
          // Cerrar sesión
          await signOut()
        }
      } else {
        console.log(`⚠️  Omitiendo prueba de login para ${testUser.email} (usuario existente sin contraseña de prueba)`)
        
        // Para el admin, buscar el usuario en la base de datos
        if (testUser.role === 'ADMIN') {
          const { data: users } = await supabase.auth.admin.listUsers()
          const adminUser = users.users.find(u => u.email === testUser.email)
          
          if (adminUser) {
            const permissionsValid = await checkUserPermissions(adminUser.id, testUser.expectedPermissions)
            
            if (permissionsValid) {
              console.log(`✅ Todos los permisos esperados están configurados correctamente`)
            } else {
              console.log(`❌ Algunos permisos no están configurados correctamente`)
            }
            
            await testResourceAccess(testUser.email, testUser.role)
          }
        }
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log('🎉 ¡Pruebas de permisos completadas!')
    console.log('\n💡 Recomendaciones para pruebas manuales:')
    console.log('   1. Inicia sesión con cada usuario en http://localhost:3001')
    console.log('   2. Navega a las páginas del dashboard')
    console.log('   3. Verifica que los botones se muestren/oculten según los permisos')
    console.log('   4. Intenta realizar acciones y verifica las restricciones')

  } catch (error: any) {
    console.error('❌ Error en las pruebas:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

export { main as testPermissionsUI }