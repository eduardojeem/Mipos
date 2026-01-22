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

async function populateDatabase() {
  console.log('🌱 POBLANDO BASE DE DATOS CON DATOS DE PRUEBA')
  console.log('=' .repeat(60))
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  const results = {
    success: 0,
    errors: 0,
    details: [] as string[]
  }

  try {
    // 1. Poblar roles
    console.log('👥 1. CREANDO ROLES:')
    console.log('-' .repeat(40))

    const roles = [
      { id: '1', name: 'admin', description: 'Administrador del sistema' },
      { id: '2', name: 'manager', description: 'Gerente de tienda' },
      { id: '3', name: 'cashier', description: 'Cajero' },
      { id: '4', name: 'inventory', description: 'Encargado de inventario' }
    ]

    for (const role of roles) {
      try {
        const { data, error } = await supabase
          .from('roles')
          .insert(role)
          .select()

        if (error) {
          console.log(`❌ Rol ${role.name}: ${error.message}`)
          results.errors++
          results.details.push(`Error en rol ${role.name}: ${error.message}`)
        } else {
          console.log(`✅ Rol ${role.name}: Creado`)
          results.success++
        }
      } catch (err: any) {
        console.log(`❌ Rol ${role.name}: Excepción - ${err.message}`)
        results.errors++
      }
    }

    // 2. Poblar permisos
    console.log('\n🔐 2. CREANDO PERMISOS:')
    console.log('-' .repeat(40))

    const permissions = [
      { id: '1', name: 'create_product', description: 'Crear productos' },
      { id: '2', name: 'edit_product', description: 'Editar productos' },
      { id: '3', name: 'delete_product', description: 'Eliminar productos' },
      { id: '4', name: 'view_reports', description: 'Ver reportes' },
      { id: '5', name: 'manage_users', description: 'Gestionar usuarios' },
      { id: '6', name: 'process_sale', description: 'Procesar ventas' },
      { id: '7', name: 'manage_inventory', description: 'Gestionar inventario' }
    ]

    for (const permission of permissions) {
      try {
        const { data, error } = await supabase
          .from('permissions')
          .insert(permission)
          .select()

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

    // 3. Poblar categorías
    console.log('\n📂 3. CREANDO CATEGORÍAS:')
    console.log('-' .repeat(40))

    const categories = [
      { id: '1', name: 'Electrónicos', description: 'Dispositivos electrónicos' },
      { id: '2', name: 'Ropa', description: 'Prendas de vestir' },
      { id: '3', name: 'Hogar', description: 'Artículos para el hogar' },
      { id: '4', name: 'Deportes', description: 'Artículos deportivos' },
      { id: '5', name: 'Libros', description: 'Libros y material de lectura' }
    ]

    for (const category of categories) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert(category)
          .select()

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

    // 4. Poblar proveedores
    console.log('\n🏢 4. CREANDO PROVEEDORES:')
    console.log('-' .repeat(40))

    const suppliers = [
      {
        id: '1',
        name: 'TechCorp',
        contact_name: 'Juan Pérez',
        email: 'juan@techcorp.com',
        phone: '+1234567890',
        address: 'Av. Tecnología 123'
      },
      {
        id: '2',
        name: 'Fashion World',
        contact_name: 'María García',
        email: 'maria@fashionworld.com',
        phone: '+1234567891',
        address: 'Calle Moda 456'
      },
      {
        id: '3',
        name: 'Home & Garden',
        contact_name: 'Carlos López',
        email: 'carlos@homeandgarden.com',
        phone: '+1234567892',
        address: 'Av. Hogar 789'
      }
    ]

    for (const supplier of suppliers) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .insert(supplier)
          .select()

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

    // 5. Poblar productos
    console.log('\n📦 5. CREANDO PRODUCTOS:')
    console.log('-' .repeat(40))

    const products = [
      {
        id: '1',
        name: 'Smartphone Samsung Galaxy',
        description: 'Teléfono inteligente de última generación',
        price: 599.99,
        cost: 400.00,
        sku: 'PHONE-001',
        barcode: '1234567890123',
        category_id: '1',
        supplier_id: '1',
        stock_quantity: 50,
        min_stock: 10,
        max_stock: 100
      },
      {
        id: '2',
        name: 'Camiseta Polo',
        description: 'Camiseta polo de algodón',
        price: 29.99,
        cost: 15.00,
        sku: 'SHIRT-001',
        barcode: '1234567890124',
        category_id: '2',
        supplier_id: '2',
        stock_quantity: 100,
        min_stock: 20,
        max_stock: 200
      },
      {
        id: '3',
        name: 'Lámpara de Mesa',
        description: 'Lámpara LED para escritorio',
        price: 45.99,
        cost: 25.00,
        sku: 'LAMP-001',
        barcode: '1234567890125',
        category_id: '3',
        supplier_id: '3',
        stock_quantity: 30,
        min_stock: 5,
        max_stock: 50
      },
      {
        id: '4',
        name: 'Pelota de Fútbol',
        description: 'Pelota oficial de fútbol',
        price: 24.99,
        cost: 12.00,
        sku: 'BALL-001',
        barcode: '1234567890126',
        category_id: '4',
        supplier_id: '1',
        stock_quantity: 75,
        min_stock: 15,
        max_stock: 150
      },
      {
        id: '5',
        name: 'Libro de Programación',
        description: 'Guía completa de JavaScript',
        price: 39.99,
        cost: 20.00,
        sku: 'BOOK-001',
        barcode: '1234567890127',
        category_id: '5',
        supplier_id: '2',
        stock_quantity: 25,
        min_stock: 5,
        max_stock: 100
      }
    ]

    for (const product of products) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert(product)
          .select()

        if (error) {
          console.log(`❌ Producto ${product.name}: ${error.message}`)
          results.errors++
        } else {
          console.log(`✅ Producto ${product.name}: Creado`)
          results.success++
        }
      } catch (err: any) {
        console.log(`❌ Producto ${product.name}: Excepción - ${err.message}`)
        results.errors++
      }
    }

    // 6. Crear usuario administrador
    console.log('\n👤 6. CREANDO USUARIO ADMINISTRADOR:')
    console.log('-' .repeat(40))

    try {
      const adminUser = {
        id: '1',
        email: 'admin@pos.com',
        full_name: 'Administrador del Sistema',
        role: 'admin' as const,
        is_active: true
      }

      const { data, error } = await supabase
        .from('users')
        .insert(adminUser)
        .select()

      if (error) {
        console.log(`❌ Usuario admin: ${error.message}`)
        results.errors++
      } else {
        console.log(`✅ Usuario admin: Creado`)
        results.success++

        // Asignar rol al usuario
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .insert({
            id: '1',
            user_id: '1',
            role_id: '1'
          })

        if (roleError) {
          console.log(`❌ Asignación de rol admin: ${roleError.message}`)
          results.errors++
        } else {
          console.log(`✅ Rol admin asignado al usuario`)
          results.success++
        }
      }
    } catch (err: any) {
      console.log(`❌ Usuario admin: Excepción - ${err.message}`)
      results.errors++
    }

    // 7. Crear clientes de ejemplo
    console.log('\n👥 7. CREANDO CLIENTES:')
    console.log('-' .repeat(40))

    const customers = [
      {
        id: '1',
        name: 'Cliente General',
        email: 'general@cliente.com',
        phone: '+1234567893',
        address: 'Dirección General 123'
      },
      {
        id: '2',
        name: 'Ana Rodríguez',
        email: 'ana@email.com',
        phone: '+1234567894',
        address: 'Calle Principal 456'
      },
      {
        id: '3',
        name: 'Pedro Martínez',
        email: 'pedro@email.com',
        phone: '+1234567895',
        address: 'Av. Central 789'
      }
    ]

    for (const customer of customers) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .insert(customer)
          .select()

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
    console.log('\n📊 RESUMEN DE POBLACIÓN:')
    console.log('=' .repeat(60))
    console.log(`✅ Registros creados exitosamente: ${results.success}`)
    console.log(`❌ Errores encontrados: ${results.errors}`)
    console.log(`📈 Tasa de éxito: ${Math.round((results.success / (results.success + results.errors)) * 100)}%`)

    if (results.errors > 0) {
      console.log('\n🔍 ERRORES DETALLADOS:')
      console.log('-' .repeat(40))
      results.details.slice(0, 10).forEach((detail, index) => {
        console.log(`${index + 1}. ${detail}`)
      })
    }

    // Verificar datos creados
    console.log('\n🔍 VERIFICANDO DATOS CREADOS:')
    console.log('-' .repeat(40))

    const tables = ['roles', 'permissions', 'categories', 'suppliers', 'products', 'users', 'customers']
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ ${table}: Error al verificar`)
        } else {
          console.log(`✅ ${table}: ${count || 0} registros`)
        }
      } catch (err) {
        console.log(`❌ ${table}: Error de verificación`)
      }
    }

    if (results.errors === 0) {
      console.log('\n🎉 ¡BASE DE DATOS POBLADA EXITOSAMENTE!')
      console.log('✨ Todos los datos de prueba han sido creados')
      console.log('🔧 El sistema está listo para usar')
      return { success: true, created: results.success, errors: results.errors }
    } else {
      console.log('\n⚠️  BASE DE DATOS POBLADA PARCIALMENTE')
      console.log('🔧 Algunos datos no se pudieron crear')
      return { success: false, created: results.success, errors: results.errors }
    }

  } catch (error: any) {
    console.error('❌ Error crítico durante la población:', error.message)
    return { success: false, error: error.message }
  }
}

// Ejecutar la población
populateDatabase()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Población completada exitosamente')
      process.exit(0)
    } else {
      console.log('\n❌ Población completada con errores')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })