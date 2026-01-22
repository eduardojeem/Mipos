#!/usr/bin/env tsx

/**
 * Script para verificar la estructura de SQLite
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const prisma = new PrismaClient()

async function checkSQLiteStructure() {
  console.log('🔍 Verificando estructura de SQLite...\n')

  try {
    // 1. Verificar tablas existentes
    console.log('1️⃣ Verificando tablas existentes:')
    try {
      const tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
      console.log('   Tablas encontradas:', tables)
    } catch (error) {
      console.log('   ❌ Error obteniendo tablas:', error)
    }

    // 2. Verificar estructura de user_roles
    console.log('\n2️⃣ Estructura de tabla user_roles:')
    try {
      const userRolesStructure = await prisma.$queryRaw`PRAGMA table_info(user_roles)`
      console.log('   Columnas:', userRolesStructure)
    } catch (error) {
      console.log('   ❌ Error obteniendo estructura de user_roles:', error)
    }

    // 3. Verificar estructura de users
    console.log('\n3️⃣ Estructura de tabla users:')
    try {
      const usersStructure = await prisma.$queryRaw`PRAGMA table_info(users)`
      console.log('   Columnas:', usersStructure)
    } catch (error) {
      console.log('   ❌ Error obteniendo estructura de users:', error)
    }

    // 4. Verificar estructura de roles
    console.log('\n4️⃣ Estructura de tabla roles:')
    try {
      const rolesStructure = await prisma.$queryRaw`PRAGMA table_info(roles)`
      console.log('   Columnas:', rolesStructure)
    } catch (error) {
      console.log('   ❌ Error obteniendo estructura de roles:', error)
    }

    // 5. Verificar datos existentes
    console.log('\n5️⃣ Verificando datos existentes:')
    
    try {
      const userCount = await prisma.user.count()
      console.log(`   Usuarios: ${userCount}`)
      
      if (userCount > 0) {
        const sampleUsers = await prisma.user.findMany({
          take: 3,
          select: {
            id: true,
            email: true,
            fullName: true
          }
        })
        console.log('   Usuarios de muestra:', sampleUsers)
      }
    } catch (error) {
      console.log('   ❌ Error con usuarios:', error)
    }

    try {
      const roleCount = await prisma.role.count()
      console.log(`   Roles: ${roleCount}`)
      
      if (roleCount > 0) {
        const sampleRoles = await prisma.role.findMany({
          take: 5,
          select: {
            id: true,
            name: true,
            displayName: true
          }
        })
        console.log('   Roles de muestra:', sampleRoles)
      }
    } catch (error) {
      console.log('   ❌ Error con roles:', error)
    }

    // 6. Intentar consulta directa a user_roles
    console.log('\n6️⃣ Verificando contenido de user_roles:')
    try {
      const userRolesData = await prisma.$queryRaw`SELECT * FROM user_roles LIMIT 5`
      console.log('   Datos en user_roles:', userRolesData)
    } catch (error) {
      console.log('   ❌ Error consultando user_roles:', error)
    }

    // 7. Verificar usuarios de prueba específicos
    console.log('\n7️⃣ Verificando usuarios de prueba:')
    const testEmails = ['manager@test.com', 'employee@test.com', 'cashier@test.com']
    
    for (const email of testEmails) {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            fullName: true
          }
        })
        
        if (user) {
          console.log(`   ✅ ${email} (ID: ${user.id})`)
        } else {
          console.log(`   ❌ ${email} no encontrado`)
        }
      } catch (error) {
        console.log(`   ❌ Error verificando ${email}:`, error)
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  checkSQLiteStructure().catch(console.error)
}

export { checkSQLiteStructure }