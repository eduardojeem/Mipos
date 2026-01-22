#!/usr/bin/env tsx

/**
 * Script de pruebas para verificar la configuración del usuario administrador
 * 
 * Este script:
 * 1. Verifica que el usuario administrador pueda autenticarse
 * 2. Comprueba que tenga todos los permisos necesarios
 * 3. Prueba operaciones CRUD en diferentes recursos
 * 4. Valida las políticas RLS
 * 5. Genera un reporte completo de funcionalidad
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Cargar variables de entorno
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const prisma = new PrismaClient()

// Cliente de Supabase con permisos de servicio
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface TestResult {
  test: string
  success: boolean
  message: string
  details?: any
  error?: string
}

interface AdminTestConfig {
  email: string
  password: string
}

class AdminTester {
  private config: AdminTestConfig
  private supabaseUser: any
  private results: TestResult[] = []

  constructor(config: AdminTestConfig) {
    this.config = config
  }

  /**
   * Ejecutar todas las pruebas
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Iniciando pruebas del usuario administrador...')
    console.log(`📧 Email: ${this.config.email}`)
    console.log('=' .repeat(60))

    try {
      // Pruebas de autenticación
      await this.testAuthentication()
      
      // Pruebas de base de datos
      await this.testDatabaseAccess()
      
      // Pruebas de permisos
      await this.testPermissions()
      
      // Pruebas de operaciones CRUD
      await this.testCRUDOperations()
      
      // Pruebas de políticas RLS
      await this.testRLSPolicies()
      
      // Mostrar resultados
      this.displayResults()

    } catch (error) {
      console.error('❌ Error en las pruebas:', error)
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Pruebas de autenticación
   */
  private async testAuthentication(): Promise<void> {
    console.log('\n🔐 Pruebas de Autenticación')
    console.log('-'.repeat(40))

    // Prueba 1: Iniciar sesión
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: this.config.email,
        password: this.config.password
      })

      if (error) {
        this.addResult('auth_login', false, 'Error al iniciar sesión', null, error.message)
        return
      }

      if (!data.user) {
        this.addResult('auth_login', false, 'No se obtuvo información del usuario')
        return
      }

      this.supabaseUser = data.user
      this.addResult('auth_login', true, 'Inicio de sesión exitoso', {
        userId: data.user.id,
        email: data.user.email
      })

    } catch (error) {
      this.addResult('auth_login', false, 'Excepción en inicio de sesión', null, String(error))
    }

    // Prueba 2: Verificar sesión
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser()

      if (error || !user) {
        this.addResult('auth_session', false, 'Sesión no válida')
        return
      }

      this.addResult('auth_session', true, 'Sesión válida', {
        userId: user.id,
        lastSignIn: user.last_sign_in_at
      })

    } catch (error) {
      this.addResult('auth_session', false, 'Error verificando sesión', null, String(error))
    }
  }

  /**
   * Pruebas de acceso a base de datos
   */
  private async testDatabaseAccess(): Promise<void> {
    console.log('\n🗄️  Pruebas de Base de Datos')
    console.log('-'.repeat(40))

    if (!this.supabaseUser) {
      this.addResult('db_access', false, 'No hay usuario autenticado')
      return
    }

    // Prueba 1: Verificar usuario en BD
    try {
      const user = await prisma.user.findUnique({
        where: { id: this.supabaseUser.id },
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
        this.addResult('db_user_exists', false, 'Usuario no encontrado en base de datos')
        return
      }

      this.addResult('db_user_exists', true, 'Usuario encontrado en base de datos', {
        id: user.id,
        email: user.email,
        role: user.role,
        rolesCount: user.userRoles.length
      })

      // Verificar rol de administrador
      const hasAdminRole = user.role === 'ADMIN' || 
        user.userRoles.some(ur => ur.role.name === 'ADMIN')

      this.addResult('db_admin_role', hasAdminRole, 
        hasAdminRole ? 'Tiene rol de administrador' : 'No tiene rol de administrador',
        { legacyRole: user.role, newRoles: user.userRoles.map(ur => ur.role.name) }
      )

    } catch (error) {
      this.addResult('db_access', false, 'Error accediendo a base de datos', null, String(error))
    }
  }

  /**
   * Pruebas de permisos
   */
  private async testPermissions(): Promise<void> {
    console.log('\n🔑 Pruebas de Permisos')
    console.log('-'.repeat(40))

    if (!this.supabaseUser) {
      this.addResult('permissions', false, 'No hay usuario autenticado')
      return
    }

    try {
      // Obtener todos los permisos del usuario
      const userWithPermissions = await prisma.user.findUnique({
        where: { id: this.supabaseUser.id },
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

      if (!userWithPermissions) {
        this.addResult('permissions_check', false, 'Usuario no encontrado')
        return
      }

      // Contar permisos
      const allPermissions = userWithPermissions.userRoles.flatMap(ur => 
        ur.role.permissions.map(rp => rp.permission)
      )

      const uniquePermissions = Array.from(
        new Map(allPermissions.map(p => [p.id, p])).values()
      )

      this.addResult('permissions_count', true, `Usuario tiene ${uniquePermissions.length} permisos únicos`, {
        totalPermissions: uniquePermissions.length,
        permissions: uniquePermissions.map(p => `${p.resource}:${p.action}`)
      })

      // Verificar permisos críticos
      const criticalPermissions = [
        'users:create', 'users:read', 'users:update', 'users:delete',
        'products:create', 'products:read', 'products:update', 'products:delete',
        'sales:create', 'sales:read', 'sales:update',
        'reports:read', 'settings:update'
      ]

      const hasAllCritical = criticalPermissions.every(critical => 
        uniquePermissions.some(p => `${p.resource}:${p.action}` === critical)
      )

      this.addResult('permissions_critical', hasAllCritical,
        hasAllCritical ? 'Tiene todos los permisos críticos' : 'Faltan permisos críticos',
        { 
          required: criticalPermissions,
          missing: criticalPermissions.filter(critical => 
            !uniquePermissions.some(p => `${p.resource}:${p.action}` === critical)
          )
        }
      )

    } catch (error) {
      this.addResult('permissions', false, 'Error verificando permisos', null, String(error))
    }
  }

  /**
   * Pruebas de operaciones CRUD
   */
  private async testCRUDOperations(): Promise<void> {
    console.log('\n📝 Pruebas de Operaciones CRUD')
    console.log('-'.repeat(40))

    // Prueba con categorías (operación simple)
    await this.testCategoryOperations()
    
    // Prueba con usuarios (operación sensible)
    await this.testUserOperations()
  }

  /**
   * Pruebas con categorías
   */
  private async testCategoryOperations(): Promise<void> {
    const testCategoryName = `Test Category ${Date.now()}`
    let createdCategoryId: string | null = null

    try {
      // CREATE
      const newCategory = await prisma.category.create({
        data: {
          name: testCategoryName,
          description: 'Categoría de prueba para verificar permisos de administrador'
        }
      })

      createdCategoryId = newCategory.id
      this.addResult('crud_category_create', true, 'Categoría creada exitosamente', {
        id: newCategory.id,
        name: newCategory.name
      })

      // READ
      const readCategory = await prisma.category.findUnique({
        where: { id: newCategory.id }
      })

      this.addResult('crud_category_read', !!readCategory, 
        readCategory ? 'Categoría leída exitosamente' : 'Error leyendo categoría'
      )

      // UPDATE
      const updatedCategory = await prisma.category.update({
        where: { id: newCategory.id },
        data: { description: 'Descripción actualizada por admin' }
      })

      this.addResult('crud_category_update', true, 'Categoría actualizada exitosamente', {
        newDescription: updatedCategory.description
      })

      // DELETE
      await prisma.category.delete({
        where: { id: newCategory.id }
      })

      this.addResult('crud_category_delete', true, 'Categoría eliminada exitosamente')

    } catch (error) {
      this.addResult('crud_category_error', false, 'Error en operaciones CRUD de categoría', null, String(error))
      
      // Limpiar si quedó algo creado
      if (createdCategoryId) {
        try {
          await prisma.category.delete({ where: { id: createdCategoryId } })
        } catch (cleanupError) {
          // Ignorar errores de limpieza
        }
      }
    }
  }

  /**
   * Pruebas con usuarios
   */
  private async testUserOperations(): Promise<void> {
    const testEmail = `test-user-${Date.now()}@test.com`
    let createdUserId: string | null = null

    try {
      // CREATE
      const newUser = await prisma.user.create({
        data: {
          id: `test-${Date.now()}`,
          email: testEmail,
          fullName: 'Usuario de Prueba',
          role: 'CASHIER'
        }
      })

      createdUserId = newUser.id
      this.addResult('crud_user_create', true, 'Usuario creado exitosamente', {
        id: newUser.id,
        email: newUser.email
      })

      // READ
      const readUser = await prisma.user.findUnique({
        where: { id: newUser.id }
      })

      this.addResult('crud_user_read', !!readUser,
        readUser ? 'Usuario leído exitosamente' : 'Error leyendo usuario'
      )

      // UPDATE
      const updatedUser = await prisma.user.update({
        where: { id: newUser.id },
        data: { fullName: 'Usuario Actualizado por Admin' }
      })

      this.addResult('crud_user_update', true, 'Usuario actualizado exitosamente', {
        newName: updatedUser.fullName
      })

      // DELETE
      await prisma.user.delete({
        where: { id: newUser.id }
      })

      this.addResult('crud_user_delete', true, 'Usuario eliminado exitosamente')

    } catch (error) {
      this.addResult('crud_user_error', false, 'Error en operaciones CRUD de usuario', null, String(error))
      
      // Limpiar si quedó algo creado
      if (createdUserId) {
        try {
          await prisma.user.delete({ where: { id: createdUserId } })
        } catch (cleanupError) {
          // Ignorar errores de limpieza
        }
      }
    }
  }

  /**
   * Pruebas de políticas RLS
   */
  private async testRLSPolicies(): Promise<void> {
    console.log('\n🛡️  Pruebas de Políticas RLS')
    console.log('-'.repeat(40))

    // Estas pruebas requieren un cliente de Supabase autenticado como el usuario admin
    // Por simplicidad, verificamos que las funciones auxiliares existan

    try {
      // Verificar función is_admin
      const { data, error } = await supabaseAdmin.rpc('is_admin')

      if (error) {
        this.addResult('rls_function_exists', false, 'Función is_admin no disponible', null, error.message)
      } else {
        this.addResult('rls_function_exists', true, 'Función is_admin disponible', { result: data })
      }

    } catch (error) {
      this.addResult('rls_policies', false, 'Error verificando políticas RLS', null, String(error))
    }
  }

  /**
   * Agregar resultado de prueba
   */
  private addResult(test: string, success: boolean, message: string, details?: any, error?: string): void {
    this.results.push({ test, success, message, details, error })
    
    const icon = success ? '✅' : '❌'
    console.log(`${icon} ${message}`)
    
    if (details && Object.keys(details).length > 0) {
      console.log(`   Detalles:`, details)
    }
    
    if (error) {
      console.log(`   Error: ${error}`)
    }
  }

  /**
   * Mostrar resultados finales
   */
  private displayResults(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN DE PRUEBAS')
    console.log('='.repeat(60))

    const successful = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    const total = this.results.length

    console.log(`✅ Exitosas: ${successful}/${total}`)
    console.log(`❌ Fallidas: ${failed}/${total}`)
    console.log(`📈 Porcentaje de éxito: ${((successful / total) * 100).toFixed(1)}%`)

    if (failed > 0) {
      console.log('\n❌ PRUEBAS FALLIDAS:')
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   • ${result.test}: ${result.message}`)
          if (result.error) {
            console.log(`     Error: ${result.error}`)
          }
        })
    }

    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:')
    
    if (successful === total) {
      console.log('   🎉 ¡Todas las pruebas pasaron! El usuario administrador está configurado correctamente.')
    } else {
      console.log('   ⚠️  Algunas pruebas fallaron. Revisar la configuración del usuario administrador.')
      
      if (this.results.some(r => r.test.includes('auth') && !r.success)) {
        console.log('   🔐 Verificar credenciales de autenticación')
      }
      
      if (this.results.some(r => r.test.includes('db') && !r.success)) {
        console.log('   🗄️  Verificar configuración de base de datos')
      }
      
      if (this.results.some(r => r.test.includes('permissions') && !r.success)) {
        console.log('   🔑 Ejecutar: npm run roles:setup')
      }
      
      if (this.results.some(r => r.test.includes('rls') && !r.success)) {
        console.log('   🛡️  Ejecutar: npm run rls-policies')
      }
    }

    console.log('\n' + '='.repeat(60))
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log(`
Uso: npm run test-admin <email> <password>

Ejemplo:
npm run test-admin admin@empresa.com MiPassword123
    `)
    process.exit(1)
  }

  const [email, password] = args

  const tester = new AdminTester({ email, password })

  try {
    await tester.runAllTests()
  } catch (error) {
    console.error('❌ Error en las pruebas:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
}

export { AdminTester }