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

async function populateTestData() {
  console.log('🌱 Poblando base de datos con datos de prueba...\n')

  try {
    // 1. Crear categorías de prueba
    console.log('1. Creando categorías de prueba...')
    const categories = [
      { name: 'Electrónicos', description: 'Dispositivos electrónicos y accesorios' },
      { name: 'Ropa', description: 'Prendas de vestir y accesorios' },
      { name: 'Hogar', description: 'Artículos para el hogar' },
      { name: 'Deportes', description: 'Equipos y accesorios deportivos' },
      { name: 'Libros', description: 'Libros y material educativo' }
    ]

    const { data: createdCategories, error: categoriesError } = await supabase
      .from('categories')
      .insert(categories)
      .select()

    if (categoriesError) {
      console.error('❌ Error creando categorías:', categoriesError.message)
      return
    }
    console.log(`✅ ${createdCategories?.length || 0} categorías creadas`)

    // 2. Crear productos de prueba
    console.log('\n2. Creando productos de prueba...')
    const products = [
      {
        name: 'Smartphone Samsung Galaxy',
        description: 'Teléfono inteligente con pantalla AMOLED',
        price: 599.99,
        cost: 400.00,
        sku: 'PHONE-001',
        category_id: createdCategories?.[0]?.id,
        stock_quantity: 25,
        min_stock_level: 5,
        is_active: true
      },
      {
        name: 'Laptop Dell Inspiron',
        description: 'Laptop para uso profesional y personal',
        price: 899.99,
        cost: 650.00,
        sku: 'LAPTOP-001',
        category_id: createdCategories?.[0]?.id,
        stock_quantity: 15,
        min_stock_level: 3,
        is_active: true
      },
      {
        name: 'Camiseta Polo',
        description: 'Camiseta polo de algodón premium',
        price: 29.99,
        cost: 15.00,
        sku: 'SHIRT-001',
        category_id: createdCategories?.[1]?.id,
        stock_quantity: 50,
        min_stock_level: 10,
        is_active: true
      },
      {
        name: 'Zapatillas Running',
        description: 'Zapatillas deportivas para correr',
        price: 89.99,
        cost: 45.00,
        sku: 'SHOES-001',
        category_id: createdCategories?.[3]?.id,
        stock_quantity: 30,
        min_stock_level: 8,
        is_active: true
      },
      {
        name: 'Libro de Programación',
        description: 'Guía completa de desarrollo web',
        price: 39.99,
        cost: 20.00,
        sku: 'BOOK-001',
        category_id: createdCategories?.[4]?.id,
        stock_quantity: 20,
        min_stock_level: 5,
        is_active: true
      }
    ]

    const { data: createdProducts, error: productsError } = await supabase
      .from('products')
      .insert(products)
      .select()

    if (productsError) {
      console.error('❌ Error creando productos:', productsError.message)
      return
    }
    console.log(`✅ ${createdProducts?.length || 0} productos creados`)

    // 3. Crear usuario de prueba
    console.log('\n3. Creando usuario de prueba...')
    const testUser = {
      email: 'admin@test.com',
      full_name: 'Administrador de Prueba',
      role: 'admin',
      is_active: true
    }

    const { data: createdUser, error: userError } = await supabase
      .from('users')
      .insert([testUser])
      .select()

    if (userError) {
      console.error('❌ Error creando usuario:', userError.message)
    } else {
      console.log(`✅ Usuario de prueba creado: ${createdUser?.[0]?.email}`)
    }

    // 4. Crear roles de usuario
    console.log('\n4. Creando roles de usuario...')
    if (createdUser && createdUser.length > 0) {
      const userRole = {
        user_id: createdUser[0].id,
        role: 'admin'
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([userRole])

      if (roleError) {
        console.error('❌ Error asignando rol:', roleError.message)
      } else {
        console.log('✅ Rol de administrador asignado')
      }
    }

    // 5. Crear inventario inicial
    console.log('\n5. Creando registros de inventario...')
    if (createdProducts && createdProducts.length > 0) {
      const inventoryRecords = createdProducts.map(product => ({
        product_id: product.id,
        quantity: product.stock_quantity,
        movement_type: 'initial_stock',
        notes: 'Stock inicial del sistema'
      }))

      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert(inventoryRecords)

      if (inventoryError) {
        console.error('❌ Error creando inventario:', inventoryError.message)
      } else {
        console.log(`✅ ${inventoryRecords.length} registros de inventario creados`)
      }
    }

    // 6. Validar integridad de datos
    console.log('\n6. Validando integridad de datos...')
    
    // Verificar relaciones entre tablas
    const { data: productsWithCategories } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)

    const { data: usersWithRoles } = await supabase
      .from('users')
      .select(`
        *,
        user_roles (
          role
        )
      `)

    console.log('✅ Validaciones de integridad:')
    console.log(`   - Productos con categorías: ${productsWithCategories?.length || 0}`)
    console.log(`   - Usuarios con roles: ${usersWithRoles?.length || 0}`)

    // 7. Resumen final
    console.log('\n📊 RESUMEN DE DATOS CREADOS:')
    console.log('=' .repeat(50))
    
    const { data: finalCounts } = await Promise.all([
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('user_roles').select('*', { count: 'exact', head: true }),
      supabase.from('inventory').select('*', { count: 'exact', head: true })
    ])

    console.log(`📋 Categorías: ${finalCounts[0]?.count || 0}`)
    console.log(`📦 Productos: ${finalCounts[1]?.count || 0}`)
    console.log(`👥 Usuarios: ${finalCounts[2]?.count || 0}`)
    console.log(`🔐 Roles: ${finalCounts[3]?.count || 0}`)
    console.log(`📊 Inventario: ${finalCounts[4]?.count || 0}`)

    console.log('\n🎉 Base de datos poblada exitosamente con datos de prueba')
    console.log('💡 Ahora puedes probar todas las funcionalidades del sistema')

  } catch (error: any) {
    console.error('❌ Error durante la población de datos:', error.message)
  }
}

// Ejecutar población de datos
populateTestData()