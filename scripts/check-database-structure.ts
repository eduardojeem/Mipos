#!/usr/bin/env tsx

/**
 * Script para verificar la estructura real de la base de datos
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const prisma = new PrismaClient()

async function checkDatabaseStructure() {
  console.log('🔍 Verificando estructura de la base de datos...\n')

  try {
    // Verificar si estamos usando PostgreSQL o SQLite
    console.log('1️⃣ Información de la base de datos:')
    const dbUrl = process.env.DATABASE_URL
    console.log(`   URL: ${dbUrl?.substring(0, 20)}...`)
    
    const isPostgreSQL = dbUrl?.startsWith('postgresql://') || dbUrl?.startsWith('postgres://')
    const isSQLite = dbUrl?.startsWith('file:') || dbUrl?.includes('.db')
    
    console.log(`   Tipo: ${isPostgreSQL ? 'PostgreSQL' : isSQLite ? 'SQLite' : 'Desconocido'}`)

    // Verificar tablas existentes
    console.log('\n2️⃣ Verificando tablas existentes:')
    
    if (isPostgreSQL) {
      // Para PostgreSQL
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'roles', 'user_roles', 'permissions', 'role_permissions')
        ORDER BY table_name
      `
      console.log('   Tablas encontradas:', tables)
      
      // Verificar estructura de user_roles
      console.log('\n3️⃣ Estructura de tabla user_roles:')
      try {
        const userRolesStructure = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'user_roles' 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `
        console.log('   Columnas:', userRolesStructure)
      } catch (error) {
        console.log('   ❌ Error obteniendo estructura de user_roles:', error)
      }
      
    } else if (isSQLite) {
      // Para SQLite
      try {
        const userRolesStructure = await prisma.$queryRaw`PRAGMA table_info(user_roles)`
        console.log('   Estructura de user_roles:', userRolesStructure)
      } catch (error) {
        console.log('   ❌ Error obteniendo estructura de user_roles:', error)
      }
    }

    // Verificar datos existentes
    console.log('\n4️⃣ Verificando datos existentes:')
    
    try {
      const userCount = await prisma.user.count()
      console.log(`   Usuarios: ${userCount}`)
    } catch (error) {
      console.log('   ❌ Error contando usuarios:', error)
    }

    try {
      const roleCount = await prisma.role.count()
      console.log(`   Roles: ${roleCount}`)
    } catch (error) {
      console.log('   ❌ Error contando roles:', error)
    }

    try {
      const userRoleCount = await prisma.userRole_New.count()
      console.log(`   Asignaciones de roles: ${userRoleCount}`)
    } catch (error) {
      console.log('   ❌ Error contando asignaciones de roles:', error)
    }

    // Verificar usuarios de prueba específicos
    console.log('\n5️⃣ Verificando usuarios de prueba:')
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
  checkDatabaseStructure().catch(console.error)
}

export { checkDatabaseStructure }