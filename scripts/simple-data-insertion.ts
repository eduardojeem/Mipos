import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function insertSimpleData() {
  console.log('🌱 INSERTANDO DATOS BÁSICOS EN SUPABASE')
  console.log('=' .repeat(60))
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  const results = {
    success: 0,
    errors: 0,
    details: [] as string[]
  }

  try {
    // 1. Insertar roles básicos
    console.log('👥 1. INSERTANDO ROLES BÁSICOS:')
    console.log('-' .repeat(40))

    const roles = [
      {
        name: 'ADMIN',
        display_name: 'Administrador',
        description: 'Administrador del sistema con permisos completos',
        is_system_role: true,
        is_active: true
      },
      {
        name: 'MANAGER',
        display_name: 'Gerente',
        description: 'Gerente con permisos de supervisión',
        is_system_role: true,
        is_active: true
      },
      {
        name: 'CASHIER',
        display_name: 'Cajero',
        description: 'Operador de caja con permisos básicos',
        is_system_role: true,
        is_active: true
      }
    ]

    for (const role of roles) {
      try {
        const { data, error } = await supabase
          .from('roles')
          .insert(role)
          .select()
          .single()

        if (error) {
          console.log(`❌ Rol ${role.name}: ${error.message}`)
          results.errors++
          results.details.push(`Error en rol ${role.name}: ${error.message}`)
        } else {
          console.log(`✅ Rol ${role.name}: Creado con ID ${data.id}`)
          results.success++
        }
      } catch (err: any) {
        console.log(`❌ Rol ${role.name}: Excepción - ${err.message}`)
        results.errors++
        results.details.push(`Excepción en rol ${role.name}: ${err.message}`)
      }
    }

    // 2. Insertar permisos básicos
    console.log('\n🔐 2. INSERTANDO PERMISOS BÁSICOS:')
    console.log('-' .repeat(40))

    const permissions = [
      {
        name: 'products.read',
        display_name: 'Ver Productos',
        description: 'Consultar información de productos',
        resource: 'products',
        action: 'read'
      },
      {
        name: 'products.create',
        display_name: 'Crear Productos',
        description: 'Agregar nuevos productos',
        resource: 'products',
        action: 'create'
      },
      {
        name: 'sales.create',
        display_name: 'Realizar Ventas',
        description: 'Procesar transacciones de venta',
        resource: 'sales',
        action: 'create'
      },
      {
        name: 'sales.read',
        display_name: 'Ver Ventas',
        description: 'Consultar historial de ventas',
        resource: 'sales',
        action: 'read'
      }
    ]

    for (const permission of permissions) {
      try {
        const { data, error } = await supabase
          .from('permissions')
          .insert(permission)
          .select()
          .single()

        if (error) {
          console.log(`❌ Permiso ${permission.name}: ${error.message}`)
          results.errors++
        } else {
          console.log(`✅ Permiso ${permission.name}: Creado`)
          results.success++
        }
      } catch (err: any) {
        console.log(`❌ Permiso ${permission.name}: Excepción - ${err.message}`)
        results.errors++
      }
    }

    // 3. Insertar categorías básicas
    console.log('\n📂 3. INSERTANDO CATEGORÍAS:')
    console.log('-' .repeat(40))

    const categories = [
      {
        name: 'Electrónicos',
        description: 'Dispositivos electrónicos y tecnología',
        is_active: true
      },
      {
        name: 'Ropa',
        description: 'Prendas de vestir y accesorios',
        is_active: true
      },
      {
        name: 'Hogar',
        description: 'Artículos para el hogar',
        is_active: true
      }
    ]

    for (const category of categories) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert(category)
          .select()
          .single()

        if (error) {
          console.log(`❌ Categoría ${category.name}: ${error.message}`)
          results.errors++
        } else {
          console.log(`✅ Categoría ${category.name}: Creada`)
          results.success++
        }
      } catch (err: any) {
        console.log(`❌ Categoría ${category.name}: Excepción - ${err.message}`)
        results.errors++
      }
    }

    // 4. Insertar proveedores básicos
    console.log('\n🏢 4. INSERTANDO PROVEEDORES:')
    console.log('-' .repeat(40))

    const suppliers = [
      {
        name: 'Proveedor General',
        contact_name: 'Contacto General',
        email: 'contacto@proveedor.com',
        phone: '+1234567890',
        address: 'Dirección del Proveedor',
        is_active: true
      }
    ]

    for (const supplier of suppliers) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .insert(supplier)
          .select()
          .single()

        if (error) {
          console.log(`❌ Proveedor ${supplier.name}: ${error.message}`)
          results.errors++
        } else {
          console.log(`✅ Proveedor ${supplier.name}: Creado`)
          results.success++
        }
      } catch (err: any) {
        console.log(`❌ Proveedor ${supplier.name}: Excepción - ${err.message}`)
        results.errors++
      }
    }

    // 5. Insertar clientes básicos
    console.log('\n👥 5. INSERTANDO CLIENTES:')
    console.log('-' .repeat(40))

    const customers = [
      {
        name: 'Cliente General',
        email: 'cliente@general.com',
        phone: '+1234567891',
        address: 'Dirección del Cliente',
        is_active: true
      }
    ]

    for (const customer of customers) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .insert(customer)
          .select()
          .single()

        if (error) {
          console.log(`❌ Cliente ${customer.name}: ${error.message}`)
          results.errors++
        } else {
          console.log(`✅ Cliente ${customer.name}: Creado`)
          results.success++
        }
      } catch (err: any) {
        console.log(`❌ Cliente ${customer.name}: Excepción - ${err.message}`)
        results.errors++
      }
    }

    // Resumen final
    console.log('\n📊 RESUMEN DE INSERCIÓN:')
    console.log('=' .repeat(60))
    console.log(`✅ Registros creados exitosamente: ${results.success}`)
    console.log(`❌ Errores encontrados: ${results.errors}`)
    
    if (results.success + results.errors > 0) {
      console.log(`📈 Tasa de éxito: ${Math.round((results.success / (results.success + results.errors)) * 100)}%`)
    }

    if (results.errors > 0 && results.details.length > 0) {
      console.log('\n🔍 ERRORES DETALLADOS:')
      console.log('-' .repeat(40))
      results.details.slice(0, 5).forEach((detail, index) => {
        console.log(`${index + 1}. ${detail}`)
      })
    }

    // Verificar datos insertados
    console.log('\n🔍 VERIFICANDO DATOS INSERTADOS:')
    console.log('-' .repeat(40))

    const tables = ['roles', 'permissions', 'categories', 'suppliers', 'customers']
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ ${table}: Error al verificar - ${error.message}`)
        } else {
          console.log(`✅ ${table}: ${count || 0} registros`)
        }
      } catch (err: any) {
        console.log(`❌ ${table}: Error de verificación - ${err.message}`)
      }
    }

    if (results.success > 0) {
      console.log('\n🎉 ¡DATOS BÁSICOS INSERTADOS!')
      console.log('✨ Se han creado los datos iniciales básicos')
      console.log('🔧 El sistema tiene datos mínimos para funcionar')
      return { success: true, created: results.success, errors: results.errors }
    } else {
      console.log('\n⚠️  NO SE PUDIERON INSERTAR DATOS')
      console.log('🔧 Revisar la configuración de la base de datos')
      return { success: false, created: results.success, errors: results.errors }
    }

  } catch (error: any) {
    console.error('❌ Error crítico durante la inserción:', error.message)
    return { success: false, error: error.message }
  }
}

// Ejecutar la inserción
insertSimpleData()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Inserción completada exitosamente')
      process.exit(0)
    } else {
      console.log('\n❌ Inserción completada con errores')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })