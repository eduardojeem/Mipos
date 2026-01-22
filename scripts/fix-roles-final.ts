#!/usr/bin/env tsx

/**
 * Script final para asignar roles usando el modelo UserRole_New
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const prisma = new PrismaClient()

async function fixRolesFinal() {
  console.log('🔧 Asignando roles usando UserRole_New...\n')

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
    
    console.log('   Usuarios encontrados:', testUsers.length)
    testUsers.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`)
    })

    // 2. Obtener roles disponibles
    console.log('\n2️⃣ Obteniendo roles disponibles:')
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        displayName: true
      }
    })
    
    console.log('   Roles encontrados:', roles.length)
    roles.forEach(role => {
      console.log(`   - ${role.name} (${role.displayName}) - ID: ${role.id}`)
    })

    // 3. Limpiar asignaciones existentes de usuarios de prueba
    console.log('\n3️⃣ Limpiando asignaciones existentes:')
    const testUserIds = testUsers.map(u => u.id)
    
    const deletedCount = await prisma.userRole_New.deleteMany({
      where: {
        userId: {
          in: testUserIds
        }
      }
    })
    
    console.log(`   Eliminadas ${deletedCount.count} asignaciones previas`)

    // 4. Mapear usuarios a roles y crear asignaciones
    const userRoleMapping = [
      { email: 'manager@test.com', roleName: 'MANAGER' },
      { email: 'employee@test.com', roleName: 'EMPLOYEE' },
      { email: 'cashier@test.com', roleName: 'CASHIER' }
    ]

    console.log('\n4️⃣ Creando nuevas asignaciones:')
    
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

        // Crear asignación usando UserRole_New
        const assignment = await prisma.userRole_New.create({
          data: {
            userId: user.id,
            roleId: role.id,
            assignedBy: 'admin-user-id',
            isActive: true
          }
        })
        
        console.log(`   ✅ ${user.email} -> ${role.displayName} (ID: ${assignment.id})`)
        
      } catch (error) {
        console.log(`   ❌ Error asignando rol a ${mapping.email}:`, error)
      }
    }

    // 5. Verificar asignaciones finales
    console.log('\n5️⃣ Verificando asignaciones finales:')
    try {
      const assignments = await prisma.userRole_New.findMany({
        where: {
          userId: {
            in: testUserIds
          },
          isActive: true
        },
        include: {
          user: {
            select: {
              email: true,
              fullName: true
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
      
      console.log(`   Total asignaciones activas: ${assignments.length}`)
      assignments.forEach(assignment => {
        console.log(`   - ${assignment.user.email} -> ${assignment.role.displayName}`)
      })
      
    } catch (error) {
      console.log('   ❌ Error verificando asignaciones:', error)
    }

    // 6. Verificar que el admin también tenga su rol
    console.log('\n6️⃣ Verificando rol de admin:')
    try {
      const adminUser = await prisma.user.findUnique({
        where: { email: 'jeem101595@gmail.com' }
      })
      
      if (adminUser) {
        const adminRole = roles.find(r => r.name === 'ADMIN')
        if (adminRole) {
          const existingAdminAssignment = await prisma.userRole_New.findFirst({
            where: {
              userId: adminUser.id,
              roleId: adminRole.id,
              isActive: true
            }
          })
          
          if (!existingAdminAssignment) {
            const adminAssignment = await prisma.userRole_New.create({
              data: {
                userId: adminUser.id,
                roleId: adminRole.id,
                assignedBy: adminUser.id,
                isActive: true
              }
            })
            console.log(`   ✅ Asignado rol ADMIN a ${adminUser.email}`)
          } else {
            console.log(`   ✅ Admin ya tiene rol asignado`)
          }
        }
      }
    } catch (error) {
      console.log('   ❌ Error verificando admin:', error)
    }

    console.log('\n🎉 ¡Asignación de roles completada!')

  } catch (error) {
    console.error('❌ Error general:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  fixRolesFinal().catch(console.error)
}

export { fixRolesFinal }