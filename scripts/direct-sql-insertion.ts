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

async function insertDataWithSQL() {
  console.log('🌱 INSERTANDO DATOS CON SQL DIRECTO')
  console.log('=' .repeat(60))
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  const results = {
    success: 0,
    errors: 0,
    details: [] as string[]
  }

  // Función para ejecutar SQL directo
  async function executeSQL(sql: string, description: string) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql })
      
      if (error) {
        console.log(`❌ ${description}: ${error.message}`)
        results.errors++
        results.details.push(`${description}: ${error.message}`)
        return false
      } else {
        console.log(`✅ ${description}: Ejecutado`)
        results.success++
        return true
      }
    } catch (err: any) {
      console.log(`❌ ${description}: Excepción - ${err.message}`)
      results.errors++
      results.details.push(`${description}: ${err.message}`)
      return false
    }
  }

  try {
    // 1. Verificar si las tablas existen
    console.log('🔍 1. VERIFICANDO EXISTENCIA DE TABLAS:')
    console.log('-' .repeat(40))

    const checkTablesSQL = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('roles', 'permissions', 'categories', 'suppliers', 'customers', 'products')
      ORDER BY table_name;
    `

    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', { sql: checkTablesSQL })
    
    if (tablesError) {
      console.log(`❌ Error verificando tablas: ${tablesError.message}`)
    } else {
      console.log(`✅ Verificación de tablas completada`)
    }

    // 2. Insertar roles usando SQL directo
    console.log('\n👥 2. INSERTANDO ROLES CON SQL:')
    console.log('-' .repeat(40))

    const rolesSQL = `
      INSERT INTO roles (name, display_name, description, is_system_role, is_active)
      VALUES 
        ('ADMIN', 'Administrador', 'Administrador del sistema con permisos completos', true, true),
        ('MANAGER', 'Gerente', 'Gerente con permisos de supervisión', true, true),
        ('CASHIER', 'Cajero', 'Operador de caja con permisos básicos', true, true)
      ON CONFLICT (name) DO NOTHING;
    `

    await executeSQL(rolesSQL, 'Inserción de roles')

    // 3. Insertar permisos usando SQL directo
    console.log('\n🔐 3. INSERTANDO PERMISOS CON SQL:')
    console.log('-' .repeat(40))

    const permissionsSQL = `
      INSERT INTO permissions (name, display_name, description, resource, action)
      VALUES 
        ('products.read', 'Ver Productos', 'Consultar información de productos', 'products', 'read'),
        ('products.create', 'Crear Productos', 'Agregar nuevos productos', 'products', 'create'),
        ('products.update', 'Actualizar Productos', 'Modificar productos existentes', 'products', 'update'),
        ('products.delete', 'Eliminar Productos', 'Eliminar productos', 'products', 'delete'),
        ('sales.read', 'Ver Ventas', 'Consultar historial de ventas', 'sales', 'read'),
        ('sales.create', 'Realizar Ventas', 'Procesar transacciones de venta', 'sales', 'create'),
        ('inventory.read', 'Ver Inventario', 'Consultar inventario', 'inventory', 'read'),
        ('inventory.update', 'Actualizar Inventario', 'Modificar inventario', 'inventory', 'update')
      ON CONFLICT (name) DO NOTHING;
    `

    await executeSQL(permissionsSQL, 'Inserción de permisos')

    // 4. Insertar categorías usando SQL directo
    console.log('\n📂 4. INSERTANDO CATEGORÍAS CON SQL:')
    console.log('-' .repeat(40))

    const categoriesSQL = `
      INSERT INTO categories (name, description, is_active)
      VALUES 
        ('Electrónicos', 'Dispositivos electrónicos y tecnología', true),
        ('Ropa', 'Prendas de vestir y accesorios', true),
        ('Hogar', 'Artículos para el hogar', true),
        ('Alimentación', 'Productos alimenticios', true),
        ('Deportes', 'Artículos deportivos y fitness', true)
      ON CONFLICT (name) DO NOTHING;
    `

    await executeSQL(categoriesSQL, 'Inserción de categorías')

    // 5. Insertar proveedores usando SQL directo
    console.log('\n🏢 5. INSERTANDO PROVEEDORES CON SQL:')
    console.log('-' .repeat(40))

    const suppliersSQL = `
      INSERT INTO suppliers (name, contact_name, email, phone, address, is_active)
      VALUES 
        ('Proveedor General', 'Contacto General', 'contacto@proveedor.com', '+1234567890', 'Dirección del Proveedor', true),
        ('TechSupply Corp', 'Juan Pérez', 'juan@techsupply.com', '+1234567891', 'Av. Tecnología 123', true),
        ('Fashion World', 'María García', 'maria@fashionworld.com', '+1234567892', 'Calle Moda 456', true)
      ON CONFLICT (name) DO NOTHING;
    `

    await executeSQL(suppliersSQL, 'Inserción de proveedores')

    // 6. Insertar clientes usando SQL directo
    console.log('\n👥 6. INSERTANDO CLIENTES CON SQL:')
    console.log('-' .repeat(40))

    const customersSQL = `
      INSERT INTO customers (name, email, phone, address, is_active)
      VALUES 
        ('Cliente General', 'cliente@general.com', '+1234567891', 'Dirección del Cliente', true),
        ('Ana López', 'ana@email.com', '+1234567892', 'Calle Principal 789', true),
        ('Carlos Rodríguez', 'carlos@email.com', '+1234567893', 'Av. Central 321', true)
      ON CONFLICT (email) DO NOTHING;
    `

    await executeSQL(customersSQL, 'Inserción de clientes')

    // 7. Insertar productos de ejemplo
    console.log('\n📦 7. INSERTANDO PRODUCTOS CON SQL:')
    console.log('-' .repeat(40))

    const productsSQL = `
      INSERT INTO products (name, description, sku, barcode, price, cost, category_id, supplier_id, stock_quantity, min_stock_level, is_active)
      SELECT 
        'Producto Ejemplo 1', 
        'Descripción del producto ejemplo', 
        'SKU001', 
        '1234567890123', 
        29.99, 
        15.00, 
        c.id, 
        s.id, 
        100, 
        10, 
        true
      FROM categories c, suppliers s 
      WHERE c.name = 'Electrónicos' AND s.name = 'TechSupply Corp'
      LIMIT 1
      ON CONFLICT (sku) DO NOTHING;
    `

    await executeSQL(productsSQL, 'Inserción de productos')

    // Resumen final
    console.log('\n📊 RESUMEN DE INSERCIÓN:')
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

    // Verificar datos insertados con SQL directo
    console.log('\n🔍 VERIFICANDO DATOS INSERTADOS:')
    console.log('-' .repeat(40))

    const verificationQueries = [
      { table: 'roles', query: 'SELECT COUNT(*) as count FROM roles;' },
      { table: 'permissions', query: 'SELECT COUNT(*) as count FROM permissions;' },
      { table: 'categories', query: 'SELECT COUNT(*) as count FROM categories;' },
      { table: 'suppliers', query: 'SELECT COUNT(*) as count FROM suppliers;' },
      { table: 'customers', query: 'SELECT COUNT(*) as count FROM customers;' },
      { table: 'products', query: 'SELECT COUNT(*) as count FROM products;' }
    ]

    for (const { table, query } of verificationQueries) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query })
        
        if (error) {
          console.log(`❌ ${table}: Error al verificar - ${error.message}`)
        } else {
          console.log(`✅ ${table}: Verificado`)
        }
      } catch (err: any) {
        console.log(`❌ ${table}: Error de verificación - ${err.message}`)
      }
    }

    if (results.success > 0) {
      console.log('\n🎉 ¡DATOS INSERTADOS CON SQL DIRECTO!')
      console.log('✨ Se han creado los datos iniciales usando SQL')
      console.log('🔧 El sistema tiene datos básicos para funcionar')
      return { success: true, created: results.success, errors: results.errors }
    } else {
      console.log('\n⚠️  NO SE PUDIERON INSERTAR DATOS')
      console.log('🔧 Revisar la configuración de Supabase')
      return { success: false, created: results.success, errors: results.errors }
    }

  } catch (error: any) {
    console.error('❌ Error crítico durante la inserción:', error.message)
    return { success: false, error: error.message }
  }
}

// Ejecutar la inserción
insertDataWithSQL()
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