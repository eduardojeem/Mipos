#!/usr/bin/env tsx

/**
 * Script simplificado para crear usuario administrador
 * 
 * Este script crea un usuario administrador directamente en la base de datos
 * sin depender de Supabase Auth, útil para configuración inicial.
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import bcrypt from 'bcryptjs'

// Cargar variables de entorno
config()

const prisma = new PrismaClient()

interface SimpleAdminConfig {
  email: string
  password: string
  fullName: string
}

class SimpleAdminCreator {
  private config: SimpleAdminConfig

  constructor(config: SimpleAdminConfig) {
    this.config = config
  }

  /**
   * Crear usuario administrador
   */
  async createAdmin(): Promise<void> {
    console.log('🚀 Creando usuario administrador...')
    console.log(`📧 Email: ${this.config.email}`)
    console.log(`👤 Nombre: ${this.config.fullName}`)

    try {
      // Generar ID único
      const userId = `admin_${Date.now()}`
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(this.config.password, 12)

      // Verificar si el usuario ya existe por email
      const existingUser = await prisma.user.findFirst({
        where: { email: this.config.email }
      })

      if (existingUser) {
        console.log('⚠️  Usuario ya existe, actualizando...')
        
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            fullName: this.config.fullName,
            role: 'ADMIN',
            updatedAt: new Date()
          }
        })
        
        console.log('✅ Usuario administrador actualizado exitosamente')
        console.log(`🆔 ID: ${existingUser.id}`)
        
      } else {
        // Crear nuevo usuario
        const newUser = await prisma.user.create({
          data: {
            id: userId,
            email: this.config.email,
            fullName: this.config.fullName,
            role: 'ADMIN'
          }
        })

        console.log('✅ Usuario administrador creado exitosamente')
        console.log(`🆔 ID: ${newUser.id}`)
      }

      // Configurar roles y permisos
      await this.setupRolesAndPermissions(existingUser?.id || userId)

      console.log('\n🎉 ¡Usuario administrador configurado completamente!')
      console.log('\n📋 Información de acceso:')
      console.log(`   Email: ${this.config.email}`)
      console.log(`   Contraseña: ${this.config.password}`)
      console.log(`   Rol: ADMIN`)

    } catch (error: unknown) {
      console.error('❌ Error creando usuario administrador:', error)
      throw error
    }
  }

  /**
   * Configurar roles y permisos
   */
  private async setupRolesAndPermissions(userId: string): Promise<void> {
    console.log('🔑 Configurando roles y permisos...')

    try {
      // Buscar o crear rol ADMIN
      let adminRole = await prisma.role.findFirst({
        where: { name: 'ADMIN' }
      })

      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            name: 'ADMIN',
            displayName: 'Administrador',
            description: 'Administrador del sistema con acceso completo'
          }
        })
        console.log('✅ Rol ADMIN creado')
      }

      // Verificar si ya tiene el rol asignado
      const existingUserRole = await prisma.userRole_New.findFirst({
        where: {
          userId: userId,
          roleId: adminRole.id
        }
      })

      if (!existingUserRole) {
        // Asignar rol al usuario
        await prisma.userRole_New.create({
          data: {
            userId: userId,
            roleId: adminRole.id
          }
        })
        console.log('✅ Rol ADMIN asignado al usuario')
      } else {
        console.log('ℹ️  Usuario ya tiene rol ADMIN asignado')
      }

      // Crear permisos básicos si no existen
      await this.createBasicPermissions(adminRole.id)

    } catch (error: unknown) {
      console.error('❌ Error configurando roles:', error)
      throw error
    }
  }

  /**
   * Crear permisos básicos
   */
  private async createBasicPermissions(roleId: string): Promise<void> {
    const basicPermissions = [
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      { resource: 'products', action: 'create' },
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'update' },
      { resource: 'products', action: 'delete' },
      { resource: 'sales', action: 'create' },
      { resource: 'sales', action: 'read' },
      { resource: 'sales', action: 'update' },
      { resource: 'reports', action: 'read' },
      { resource: 'settings', action: 'update' }
    ]

    for (const permData of basicPermissions) {
      try {
        // Buscar o crear permiso
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
              description: `${permData.action} ${permData.resource}`
            }
          })
        }

        // Verificar si el rol ya tiene este permiso
        const existingRolePermission = await prisma.rolePermission.findFirst({
          where: {
            roleId: roleId,
            permissionId: permission.id
          }
        })

        if (!existingRolePermission) {
          await prisma.rolePermission.create({
            data: {
              roleId: roleId,
              permissionId: permission.id
            }
          })
        }

      } catch (error: unknown) {
        // Continuar con otros permisos si uno falla
        console.warn(`⚠️  Error creando permiso ${permData.resource}:${permData.action}:`, error)
      }
    }

    console.log('✅ Permisos básicos configurados')
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    console.log(`
Uso: npm run simple-admin <email> <password> <fullName>

Ejemplo:
npm run simple-admin admin@empresa.com MiPassword123 "Administrador Principal"
    `)
    process.exit(1)
  }

  const [email, password, fullName] = args

  const creator = new SimpleAdminCreator({ email, password, fullName })

  try {
    await creator.createAdmin()
    console.log('\n✨ ¡Proceso completado exitosamente!')
  } catch (error: unknown) {
    console.error('❌ Error en el proceso:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
}

export { SimpleAdminCreator }