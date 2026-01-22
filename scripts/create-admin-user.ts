#!/usr/bin/env tsx

/**
 * Script para crear un usuario administrador en Supabase
 * 
 * Este script:
 * 1. Crea un usuario administrador en Supabase Auth
 * 2. Asigna el rol de ADMIN en la base de datos
 * 3. Configura todos los permisos necesarios
 * 4. Verifica que el usuario tenga acceso completo
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import bcrypt from 'bcryptjs'

// Cargar variables de entorno
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const prisma = new PrismaClient()

// Cliente de Supabase con permisos de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface AdminUserConfig {
  email: string
  password: string
  fullName: string
  confirmPassword?: boolean
}

class AdminUserCreator {
  private config: AdminUserConfig

  constructor(config: AdminUserConfig) {
    this.config = config
  }

  /**
   * Crear usuario administrador completo
   */
  async createAdminUser(): Promise<void> {
    try {
      console.log('🚀 Iniciando creacion de usuario administrador...')
      
      // Paso 1: Crear usuario en Supabase Auth
      const authUser = await this.createSupabaseAuthUser()
      console.log('✅ Usuario creado en Supabase Auth:', authUser.id)

      // Paso 2: Crear registro en la base de datos
      const dbUser = await this.createDatabaseUser(authUser.id)
      console.log('✅ Usuario creado en base de datos:', dbUser.id)

      // Paso 3: Asignar rol de administrador
      await this.assignAdminRole(dbUser.id)
      console.log('✅ Rol de administrador asignado')

      // Paso 4: Configurar permisos completos
      await this.setupAdminPermissions(dbUser.id)
      console.log('✅ Permisos de administrador configurados')

      // Paso 5: Verificar configuracion
      await this.verifyAdminSetup(dbUser.id)
      console.log('✅ Configuracion verificada exitosamente')

      console.log(`
🎉 Usuario administrador creado exitosamente!

📧 Email: ${this.config.email}
🔑 Password: ${this.config.password}
👤 Nombre: ${this.config.fullName}
🆔 ID: ${dbUser.id}

El usuario puede iniciar sesion inmediatamente con estas credenciales.
      `)

    } catch (error: unknown) {
      console.error('❌ Error creando usuario administrador:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Crear usuario en Supabase Auth
   */
  private async createSupabaseAuthUser() {
    console.log('📧 Creando usuario en Supabase Auth...')

    try {
      // Intentar crear el usuario
      const { data, error } = await supabase.auth.admin.createUser({
        email: this.config.email,
        password: this.config.password,
        email_confirm: !this.config.confirmPassword,
        user_metadata: {
          full_name: this.config.fullName,
          role: 'ADMIN'
        }
      })

      if (error) {
        // Si el usuario ya existe, intentar obtenerlo
        if (error.message.includes('User already registered') || 
            error.message.includes('already exists') ||
            error.message.includes('Database error creating new user')) {
          
          console.log('⚠️  Usuario ya existe, intentando obtener información...')
          
          // Buscar usuario por email
          const { data: users, error: listError } = await supabase.auth.admin.listUsers()
          
          if (listError) {
            throw new Error(`Error buscando usuarios existentes: ${listError.message}`)
          }

          const existingUser = users.users.find(u => u.email === this.config.email)
          
          if (existingUser) {
            console.log('✅ Usuario existente encontrado')
            return existingUser
          } else {
            throw new Error(`Usuario con email ${this.config.email} no encontrado`)
          }
        }
        
        throw new Error(`Error creando usuario en Supabase Auth: ${error.message}`)
      }

      if (!data.user) {
        throw new Error('No se pudo crear el usuario en Supabase Auth')
      }

      console.log('✅ Usuario creado en Supabase Auth')
      return data.user

    } catch (error: unknown) {
      console.error('❌ Error en createSupabaseAuthUser:', error)
      throw error
    }
  }

  /**
   * Crear o actualizar usuario en la base de datos
   */
  private async createDatabaseUser(supabaseUserId: string) {
    console.log('🗄️  Creando/actualizando usuario en base de datos...')

    try {
      // Verificar si el usuario ya existe
      const existingUser = await prisma.user.findUnique({
        where: { id: supabaseUserId }
      })

      if (existingUser) {
        console.log('⚠️  Usuario ya existe en BD, actualizando información...')
        
        // Actualizar usuario existente
        const updatedUser = await prisma.user.update({
          where: { id: supabaseUserId },
          data: {
            email: this.config.email,
            fullName: this.config.fullName,
            role: 'ADMIN',
            updatedAt: new Date()
          }
        })
        
        console.log('✅ Usuario actualizado en base de datos')
        return updatedUser
      } else {
        // Crear nuevo usuario
        const newUser = await prisma.user.create({
          data: {
            id: supabaseUserId,
            email: this.config.email,
            fullName: this.config.fullName,
            role: 'ADMIN'
          }
        })
        
        console.log('✅ Usuario creado en base de datos')
        return newUser
      }

    } catch (error: unknown) {
      console.error('❌ Error en createDatabaseUser:', error)
      throw new Error(`Error creando usuario en base de datos: ${error}`)
    }
  }

  /**
   * Asignar rol de administrador usando el nuevo sistema de roles
   */
  private async assignAdminRole(userId: string) {
    // Buscar o crear el rol de administrador
    let adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    })

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          displayName: 'Administrador',
          description: 'Acceso completo al sistema',
          isSystemRole: true,
          isActive: true
        }
      })
    }

    // Verificar si ya tiene el rol asignado
    const existingUserRole = await prisma.userRole_New.findUnique({
      where: {
        userId_roleId: {
          userId: userId,
          roleId: adminRole.id
        }
      }
    })

    if (!existingUserRole) {
      await prisma.userRole_New.create({
        data: {
          userId: userId,
          roleId: adminRole.id,
          assignedBy: userId, // Auto-asignado
          isActive: true
        }
      })
    }
  }

  /**
   * Configurar todos los permisos de administrador
   */
  private async setupAdminPermissions(userId: string) {
    // Definir todos los permisos de administrador
    const adminPermissions = [
      // Usuarios
      { resource: 'users', action: 'create', displayName: 'Crear Usuarios' },
      { resource: 'users', action: 'read', displayName: 'Ver Usuarios' },
      { resource: 'users', action: 'update', displayName: 'Actualizar Usuarios' },
      { resource: 'users', action: 'delete', displayName: 'Eliminar Usuarios' },
      
      // Productos
      { resource: 'products', action: 'create', displayName: 'Crear Productos' },
      { resource: 'products', action: 'read', displayName: 'Ver Productos' },
      { resource: 'products', action: 'update', displayName: 'Actualizar Productos' },
      { resource: 'products', action: 'delete', displayName: 'Eliminar Productos' },
      
      // Inventario
      { resource: 'inventory', action: 'create', displayName: 'Crear Inventario' },
      { resource: 'inventory', action: 'read', displayName: 'Ver Inventario' },
      { resource: 'inventory', action: 'update', displayName: 'Actualizar Inventario' },
      { resource: 'inventory', action: 'delete', displayName: 'Eliminar Inventario' },
      
      // Ventas
      { resource: 'sales', action: 'create', displayName: 'Crear Ventas' },
      { resource: 'sales', action: 'read', displayName: 'Ver Ventas' },
      { resource: 'sales', action: 'update', displayName: 'Actualizar Ventas' },
      { resource: 'sales', action: 'delete', displayName: 'Eliminar Ventas' },
      
      // Compras
      { resource: 'purchases', action: 'create', displayName: 'Crear Compras' },
      { resource: 'purchases', action: 'read', displayName: 'Ver Compras' },
      { resource: 'purchases', action: 'update', displayName: 'Actualizar Compras' },
      { resource: 'purchases', action: 'delete', displayName: 'Eliminar Compras' },
      
      // Reportes
      { resource: 'reports', action: 'read', displayName: 'Ver Reportes' },
      { resource: 'reports', action: 'export', displayName: 'Exportar Reportes' },
      
      // Configuracion
      { resource: 'settings', action: 'read', displayName: 'Ver Configuracion' },
      { resource: 'settings', action: 'update', displayName: 'Actualizar Configuracion' },
      
      // Roles y Permisos
      { resource: 'roles', action: 'create', displayName: 'Crear Roles' },
      { resource: 'roles', action: 'read', displayName: 'Ver Roles' },
      { resource: 'roles', action: 'update', displayName: 'Actualizar Roles' },
      { resource: 'roles', action: 'delete', displayName: 'Eliminar Roles' },
      
      // Auditoria
      { resource: 'audit', action: 'read', displayName: 'Ver Auditoria' }
    ]

    // Obtener el rol de administrador
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    })

    if (!adminRole) {
      throw new Error('Rol de administrador no encontrado')
    }

    // Crear o actualizar permisos
    for (const permData of adminPermissions) {
      // Buscar o crear el permiso
      let permission = await prisma.permission.findUnique({
        where: {
          resource_action: {
            resource: permData.resource,
            action: permData.action
          }
        }
      })

      if (!permission) {
        permission = await prisma.permission.create({
          data: {
            name: `${permData.resource}:${permData.action}`,
            displayName: permData.displayName,
            description: `Permiso para ${permData.displayName.toLowerCase()}`,
            resource: permData.resource,
            action: permData.action,
            isActive: true
          }
        })
      }

      // Asignar permiso al rol de administrador
      const existingRolePermission = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        }
      })

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
            grantedBy: userId
          }
        })
      }
    }
  }

  /**
   * Verificar que el usuario administrador este configurado correctamente
   */
  private async verifyAdminSetup(userId: string) {
    // Verificar usuario en base de datos
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
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
        }
      }
    })

    if (!user) {
      throw new Error('Usuario no encontrado en la base de datos')
    }

    if (user.role !== 'ADMIN') {
      throw new Error('Usuario no tiene rol de ADMIN')
    }

    // Verificar que tenga el rol en el nuevo sistema
    const hasAdminRole = user.userRoles.some(ur => ur.role.name === 'ADMIN')
    if (!hasAdminRole) {
      throw new Error('Usuario no tiene rol de ADMIN en el nuevo sistema de roles')
    }

    // Contar permisos
    const totalPermissions = user.userRoles.reduce((total, ur) => {
      return total + ur.role.permissions.length
    }, 0)

    console.log(`✅ Usuario verificado: ${totalPermissions} permisos asignados`)

    // Verificar usuario en Supabase Auth
    const { data: authUser, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !authUser.user) {
      throw new Error('Usuario no encontrado en Supabase Auth')
    }

    console.log('✅ Usuario verificado en Supabase Auth')
  }
}

/**
 * Funcion principal para ejecutar el script
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    console.log(`
Uso: npm run create-admin <email> <password> <fullName>

Ejemplo:
npm run create-admin admin@empresa.com MiPassword123 "Administrador Principal"
    `)
    process.exit(1)
  }

  const [email, password, fullName] = args

  // Validaciones basicas
  if (!email.includes('@')) {
    console.error('❌ Email invalido')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('❌ La contraseña debe tener al menos 8 caracteres')
    process.exit(1)
  }

  if (!fullName || fullName.length < 2) {
    console.error('❌ Nombre completo requerido')
    process.exit(1)
  }

  const creator = new AdminUserCreator({
    email,
    password,
    fullName,
    confirmPassword: false
  })

  try {
    await creator.createAdminUser()
  } catch (error: unknown) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
}

export { AdminUserCreator }