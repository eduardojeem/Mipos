#!/usr/bin/env tsx

/**
 * Script simplificado para asignar roles usando SQL directo
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const prisma = new PrismaClient()

async function assignRolesDirectly() {
  console.log('🔧 Asignando roles usando SQL directo...\n')

  try {
    // 1. Verificar usuarios existentes
    console.log('1️⃣ Verificando usuarios existentes:')
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['manager@test.com', 'employee@test.com', 'cashier@test.com']
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true
      }
    })

    if (users.length === 0) {
      console.log('❌ No se encontraron usuarios de prueba')
      return
    }

    users.forEach(user => {
      console.log(`   ✅ ${user.email} (ID: ${user.id})`)
    })

    // 2. Verificar roles existentes
    console.log('\n2️⃣ Verificando roles existentes:')
    const roles = await prisma.role.findMany({
      where: {
        name: {
          in: ['MANAGER', 'EMPLOYEE', 'CASHIER']
        }
      },
      select: {
        id: true,
        name: true,
        displayName: true
      }
    })

    if (roles.length === 0) {
      console.log('❌ No se encontraron roles necesarios')
      return
    }

    roles.forEach(role => {
      console.log(`   ✅ ${role.name} (ID: ${role.id})`)
    })

    // 3. Mapeo de usuarios a roles
    const userRoleMapping = [
      { email: 'manager@test.com', roleName: 'MANAGER' },
      { email: 'employee@test.com', roleName: 'EMPLOYEE' },
      { email: 'cashier@test.com', roleName: 'CASHIER' }
    ]

    console.log('\n3️⃣ Asignando roles:')

    for (const mapping of userRoleMapping) {
      const user = users.find(u => u.email === mapping.email)
      const role = roles.find(r => r.name === mapping.roleName)

      if (!user || !role) {
        console.log(`❌ No se pudo mapear ${mapping.email} -> ${mapping.roleName}`)
        continue
      }

      try {
        // Verificar si ya existe la asignación
        const existing = await prisma.userRole_New.findFirst({
          where: {
            userId: user.id,
            roleId: role.id
          }
        })

        if (existing) {
          console.log(`⚠️  ${user.email} ya tiene el rol ${role.name}`)
          continue
        }

        // Usar SQL directo para insertar
        await prisma.$executeRaw`
          INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by, is_active)
          VALUES (${user.id}, ${role.id}, NOW(), 'simple-role-assignment', true)
        `

        console.log(`✅ ${user.email} -> ${role.name}`)

      } catch (error) {
        console.error(`❌ Error asignando ${mapping.email} -> ${mapping.roleName}:`, error)
      }
    }

    // 4. Verificar asignaciones
    console.log('\n4️⃣ Verificando asignaciones finales:')
    const assignments = await prisma.userRole_New.findMany({
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

    if (assignments.length === 0) {
      console.log('❌ No se encontraron asignaciones de roles')
    } else {
      assignments.forEach(assignment => {
        console.log(`   ✅ ${assignment.user.email} -> ${assignment.role.name}`)
      })
    }

  } catch (error) {
    console.error('❌ Error durante la asignación de roles:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  assignRolesDirectly().catch(console.error)
}

export { assignRolesDirectly }