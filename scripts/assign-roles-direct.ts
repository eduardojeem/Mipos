#!/usr/bin/env tsx

/**
 * Script para asignar roles directamente usando la estructura real de user_roles
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const prisma = new PrismaClient()

async function assignRolesDirect() {
  console.log('🔧 Asignando roles directamente...\n')

  try {
    // 1. Obtener usuarios de prueba
    console.log('1️⃣ Obteniendo usuarios de prueba:')
    const testUsers = await prisma.user.findMany({
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
    
    console.log('   Usuarios encontrados:', testUsers)

    // 2. Obtener roles disponibles
    console.log('\n2️⃣ Obteniendo roles disponibles:')
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        displayName: true
      }
    })
    
    console.log('   Roles encontrados:', roles)

    // 3. Mapear usuarios a roles
    const userRoleMapping = [
      { email: 'manager@test.com', roleName: 'MANAGER' },
      { email: 'employee@test.com', roleName: 'EMPLOYEE' },
      { email: 'cashier@test.com', roleName: 'CASHIER' }
    ]

    console.log('\n3️⃣ Asignando roles:')
    
    for (const mapping of userRoleMapping) {
      try {
        // Encontrar usuario
        const user = testUsers.find(u => u.email === mapping.email)
        if (!user) {
          console.log(`   ❌ Usuario ${mapping.email} no encontrado`)
          continue
        }

        // Encontrar rol
        const role = roles.find(r => r.name === mapping.roleName)
        if (!role) {
          console.log(`   ❌ Rol ${mapping.roleName} no encontrado`)
          continue
        }

        // Verificar si ya existe la asignación
        const existingAssignment = await prisma.$queryRaw`
          SELECT * FROM user_roles 
          WHERE userId = ${user.id} AND roleId = ${role.id}
        `
        
        if (Array.isArray(existingAssignment) && existingAssignment.length > 0) {
          console.log(`   ⚠️  ${user.email} ya tiene asignado el rol ${role.displayName}`)
          continue
        }

        // Insertar asignación directamente
        await prisma.$executeRaw`
          INSERT INTO user_roles (userId, roleId, assignedAt, assignedBy, isActive)
          VALUES (${user.id}, ${role.id}, datetime('now'), 'admin-user-id', true)
        `
        
        console.log(`   ✅ ${user.email} -> ${role.displayName} (${role.name})`)
        
      } catch (error) {
        console.log(`   ❌ Error asignando rol a ${mapping.email}:`, error)
      }
    }

    // 4. Verificar asignaciones
    console.log('\n4️⃣ Verificando asignaciones finales:')
    try {
      const assignments = await prisma.$queryRaw`
        SELECT 
          ur.userId,
          ur.roleId,
          ur.assignedAt,
          ur.isActive,
          u.email,
          u.fullName,
          r.name as roleName,
          r.displayName as roleDisplayName
        FROM user_roles ur
        JOIN users u ON ur.userId = u.id
        JOIN roles r ON ur.roleId = r.id
        WHERE ur.isActive = true
      `
      
      console.log('   Asignaciones activas:', assignments)
      
    } catch (error) {
      console.log('   ❌ Error verificando asignaciones:', error)
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  assignRolesDirect().catch(console.error)
}

export { assignRolesDirect }