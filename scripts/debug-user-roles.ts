#!/usr/bin/env tsx

/**
 * Script de debug para verificar usuarios y roles en la base de datos
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const prisma = new PrismaClient()

async function debugUsersAndRoles() {
  console.log('🔍 Verificando estado de usuarios y roles...\n')

  try {
    // 1. Verificar usuarios de prueba
    console.log('1️⃣ Usuarios de prueba en base de datos local:')
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['manager@test.com', 'employee@test.com', 'cashier@test.com']
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true
      }
    })

    if (testUsers.length === 0) {
      console.log('❌ No se encontraron usuarios de prueba en la base de datos local')
    } else {
      testUsers.forEach(user => {
        console.log(`   ✅ ${user.email} (ID: ${user.id})`)
      })
    }

    // 2. Verificar roles disponibles
    console.log('\n2️⃣ Roles disponibles en base de datos:')
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        isActive: true
      }
    })

    if (roles.length === 0) {
      console.log('❌ No se encontraron roles en la base de datos')
    } else {
      roles.forEach(role => {
        console.log(`   ✅ ${role.name} (${role.displayName}) - ID: ${role.id} - Activo: ${role.isActive}`)
      })
    }

    // 3. Verificar asignaciones de roles existentes
    console.log('\n3️⃣ Asignaciones de roles existentes:')
    const userRoles = await prisma.userRole_New.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        },
        role: {
          select: {
            name: true,
            displayName: true
          }
        }
      }
    })

    if (userRoles.length === 0) {
      console.log('❌ No se encontraron asignaciones de roles')
    } else {
      userRoles.forEach(assignment => {
        console.log(`   ✅ ${assignment.user.email} -> ${assignment.role.name} (${assignment.role.displayName})`)
        console.log(`      Asignado: ${assignment.assignedAt} - Activo: ${assignment.isActive}`)
      })
    }

    // 4. Verificar estructura de tabla UserRole_New
    console.log('\n4️⃣ Verificando estructura de tabla UserRole_New...')
    const userRoleCount = await prisma.userRole_New.count()
    console.log(`   Total de registros en UserRole_New: ${userRoleCount}`)

    // 5. Verificar si hay usuarios admin existentes
    console.log('\n5️⃣ Verificando usuarios admin existentes:')
    const adminUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['jeem101595@gmail.com', 'admin@test.com']
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true
      }
    })

    if (adminUsers.length > 0) {
      adminUsers.forEach(user => {
        console.log(`   ✅ Admin: ${user.email} (ID: ${user.id})`)
      })
    } else {
      console.log('❌ No se encontraron usuarios admin')
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  debugUsersAndRoles().catch(console.error)
}

export { debugUsersAndRoles }