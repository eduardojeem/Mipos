import { Client } from 'pg'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const databaseUrl = process.env.DIRECT_DATABASE_URL!

async function setupSupabaseManually() {
  console.log('🔧 CONFIGURACIÓN MANUAL DE SUPABASE')
  console.log('=' .repeat(60))
  console.log(`📍 Conectando directamente a PostgreSQL...`)
  console.log(`🔗 URL: ${databaseUrl ? 'Configurada' : 'No configurada'}`)

  if (!databaseUrl) {
    console.error('❌ DIRECT_DATABASE_URL no está configurada')
    return { success: false, error: 'Variable de entorno faltante' }
  }

  // Configuración más robusta del cliente
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    statement_timeout: 30000
  })

  const results = {
    success: 0,
    errors: 0,
    details: [] as string[]
  }

  try {
    await client.connect()
    console.log('✅ Conexión directa a PostgreSQL establecida')

    // 1. Verificar tablas existentes
    console.log('\n🔍 1. VERIFICANDO TABLAS EXISTENTES:')
    console.log('-' .repeat(40))

    const tablesQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `

    const tablesResult = await client.query(tablesQuery)
    console.log(`📋 Tablas encontradas: ${tablesResult.rows.length}`)
    
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })

    // 2. Insertar datos básicos en roles
    console.log('\n👥 2. INSERTANDO ROLES BÁSICOS:')
    console.log('-' .repeat(40))

    const rolesData = [
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

    for (const role of rolesData) {
      try {
        const insertRoleQuery = `
          INSERT INTO roles (name, display_name, description, is_system_role, is_active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, name;
        `

        const roleResult = await client.query(insertRoleQuery, [
          role.name,
          role.display_name,
          role.description,
          role.is_system_role,
          role.is_active
        ])

        console.log(`✅ Rol ${role.name}: ID ${roleResult.rows[0].id}`)
        results.success++
      } catch (err: any) {
        console.log(`❌ Rol ${role.name}: ${err.message}`)
        results.errors++
        results.details.push(`Rol ${role.name}: ${err.message}`)
      }
    }

    // 3. Insertar permisos básicos
    console.log('\n🔐 3. INSERTANDO PERMISOS BÁSICOS:')
    console.log('-' .repeat(40))

    const permissionsData = [
      { name: 'products.read', display_name: 'Ver Productos', description: 'Consultar información de productos', resource: 'products', action: 'read' },
      { name: 'products.create', display_name: 'Crear Productos', description: 'Agregar nuevos productos', resource: 'products', action: 'create' },
      { name: 'products.update', display_name: 'Actualizar Productos', description: 'Modificar productos existentes', resource: 'products', action: 'update' },
      { name: 'products.delete', display_name: 'Eliminar Productos', description: 'Eliminar productos', resource: 'products', action: 'delete' },
      { name: 'sales.read', display_name: 'Ver Ventas', description: 'Consultar historial de ventas', resource: 'sales', action: 'read' },
      { name: 'sales.create', display_name: 'Realizar Ventas', description: 'Procesar transacciones de venta', resource: 'sales', action: 'create' },
      { name: 'inventory.read', display_name: 'Ver Inventario', description: 'Consultar inventario', resource: 'inventory', action: 'read' },
      { name: 'inventory.update', display_name: 'Actualizar Inventario', description: 'Modificar inventario', resource: 'inventory', action: 'update' }
    ]

    for (const permission of permissionsData) {
      try {
        const insertPermissionQuery = `
          INSERT INTO permissions (name, display_name, description, resource, action)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, name;
        `

        const permissionResult = await client.query(insertPermissionQuery, [
          permission.name,
          permission.display_name,
          permission.description,
          permission.resource,
          permission.action
        ])

        console.log(`✅ Permiso ${permission.name}: ID ${permissionResult.rows[0].id}`)
        results.success++
      } catch (err: any) {
        console.log(`❌ Permiso ${permission.name}: ${err.message}`)
        results.errors++
        results.details.push(`Permiso ${permission.name}: ${err.message}`)
      }
    }

    // 4. Insertar categorías básicas
    console.log('\n📂 4. INSERTANDO CATEGORÍAS:')
    console.log('-' .repeat(40))

    const categoriesData = [
      { name: 'Electrónicos', description: 'Dispositivos electrónicos y tecnología', is_active: true },
      { name: 'Ropa', description: 'Prendas de vestir y accesorios', is_active: true },
      { name: 'Hogar', description: 'Artículos para el hogar', is_active: true },
      { name: 'Alimentación', description: 'Productos alimenticios', is_active: true },
      { name: 'Deportes', description: 'Artículos deportivos y fitness', is_active: true }
    ]

    for (const category of categoriesData) {
      try {
        const insertCategoryQuery = `
          INSERT INTO categories (name, description, is_active)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
          RETURNING id, name;
        `

        const categoryResult = await client.query(insertCategoryQuery, [
          category.name,
          category.description,
          category.is_active
        ])

        console.log(`✅ Categoría ${category.name}: ID ${categoryResult.rows[0].id}`)
        results.success++
      } catch (err: any) {
        console.log(`❌ Categoría ${category.name}: ${err.message}`)
        results.errors++
        results.details.push(`Categoría ${category.name}: ${err.message}`)
      }
    }

    // 5. Insertar proveedores básicos
    console.log('\n🏢 5. INSERTANDO PROVEEDORES:')
    console.log('-' .repeat(40))

    const suppliersData = [
      { name: 'Proveedor General', contact_name: 'Contacto General', email: 'contacto@proveedor.com', phone: '+1234567890', address: 'Dirección del Proveedor', is_active: true },
      { name: 'TechSupply Corp', contact_name: 'Juan Pérez', email: 'juan@techsupply.com', phone: '+1234567891', address: 'Av. Tecnología 123', is_active: true },
      { name: 'Fashion World', contact_name: 'María García', email: 'maria@fashionworld.com', phone: '+1234567892', address: 'Calle Moda 456', is_active: true }
    ]

    for (const supplier of suppliersData) {
      try {
        const insertSupplierQuery = `
          INSERT INTO suppliers (name, contact_name, email, phone, address, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (name) DO UPDATE SET
            contact_name = EXCLUDED.contact_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
          RETURNING id, name;
        `

        const supplierResult = await client.query(insertSupplierQuery, [
          supplier.name,
          supplier.contact_name,
          supplier.email,
          supplier.phone,
          supplier.address,
          supplier.is_active
        ])

        console.log(`✅ Proveedor ${supplier.name}: ID ${supplierResult.rows[0].id}`)
        results.success++
      } catch (err: any) {
        console.log(`❌ Proveedor ${supplier.name}: ${err.message}`)
        results.errors++
        results.details.push(`Proveedor ${supplier.name}: ${err.message}`)
      }
    }

    // 6. Insertar clientes básicos
    console.log('\n👥 6. INSERTANDO CLIENTES:')
    console.log('-' .repeat(40))

    const customersData = [
      { name: 'Cliente General', email: 'cliente@general.com', phone: '+1234567891', address: 'Dirección del Cliente', is_active: true },
      { name: 'Ana López', email: 'ana@email.com', phone: '+1234567892', address: 'Calle Principal 789', is_active: true },
      { name: 'Carlos Rodríguez', email: 'carlos@email.com', phone: '+1234567893', address: 'Av. Central 321', is_active: true }
    ]

    for (const customer of customersData) {
      try {
        const insertCustomerQuery = `
          INSERT INTO customers (name, email, phone, address, is_active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
          RETURNING id, name;
        `

        const customerResult = await client.query(insertCustomerQuery, [
          customer.name,
          customer.email,
          customer.phone,
          customer.address,
          customer.is_active
        ])

        console.log(`✅ Cliente ${customer.name}: ID ${customerResult.rows[0].id}`)
        results.success++
      } catch (err: any) {
        console.log(`❌ Cliente ${customer.name}: ${err.message}`)
        results.errors++
        results.details.push(`Cliente ${customer.name}: ${err.message}`)
      }
    }

    // 7. Verificar datos insertados
    console.log('\n🔍 7. VERIFICANDO DATOS INSERTADOS:')
    console.log('-' .repeat(40))

    const verificationTables = ['roles', 'permissions', 'categories', 'suppliers', 'customers']
    
    for (const table of verificationTables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${table};`
        const countResult = await client.query(countQuery)
        console.log(`✅ ${table}: ${countResult.rows[0].count} registros`)
      } catch (err: any) {
        console.log(`❌ ${table}: Error al verificar - ${err.message}`)
      }
    }

    // Resumen final
    console.log('\n📊 RESUMEN DE CONFIGURACIÓN:')
    console.log('=' .repeat(60))
    console.log(`✅ Operaciones exitosas: ${results.success}`)
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

    if (results.success > 0) {
      console.log('\n🎉 ¡CONFIGURACIÓN MANUAL COMPLETADA!')
      console.log('✨ Se han insertado los datos básicos usando PostgreSQL directo')
      console.log('🔧 El sistema tiene datos iniciales para funcionar')
      return { success: true, created: results.success, errors: results.errors }
    } else {
      console.log('\n⚠️  NO SE PUDIERON INSERTAR DATOS')
      console.log('🔧 Revisar la configuración de la base de datos')
      return { success: false, created: results.success, errors: results.errors }
    }

  } catch (error: any) {
    console.error('❌ Error crítico durante la configuración:', error.message)
    return { success: false, error: error.message }
  } finally {
    await client.end()
    console.log('🔌 Conexión cerrada')
  }
}

// Ejecutar la configuración manual
setupSupabaseManually()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Configuración completada exitosamente')
      process.exit(0)
    } else {
      console.log('\n❌ Configuración completada con errores')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })