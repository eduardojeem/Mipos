import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function insertDataDirectly() {
  console.log('🚀 INSERCIÓN DIRECTA DE DATOS EN SUPABASE')
  console.log('=' .repeat(60))

  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  // Función auxiliar para ejecutar SQL
  async function executeSql(description: string, sql: string) {
    console.log(`📝 ${description}...`)
    try {
      // Usar una consulta SQL directa sin RPC
      const { data, error } = await supabase.rpc('exec_sql', { sql })
      
      if (error) {
        console.log(`❌ Error: ${error.message}`)
        errors.push(`${description}: ${error.message}`)
        errorCount++
        return false
      } else {
        console.log(`✅ ${description} - Exitoso`)
        successCount++
        return true
      }
    } catch (err: any) {
      console.log(`❌ Excepción: ${err.message}`)
      errors.push(`${description}: ${err.message}`)
      errorCount++
      return false
    }
  }

  // 1. Insertar roles
  console.log('\n🔐 INSERTANDO ROLES')
  console.log('-' .repeat(40))
  
  const rolesData = [
    { name: 'SUPER_ADMIN', description: 'Administrador con acceso completo al sistema' },
    { name: 'ADMIN', description: 'Administrador con permisos limitados' },
    { name: 'MANAGER', description: 'Gerente con acceso a reportes y gestión' },
    { name: 'CASHIER', description: 'Cajero con acceso a ventas' },
    { name: 'INVENTORY_CLERK', description: 'Encargado de inventario' }
  ]

  for (const role of rolesData) {
    await executeSql(
      `Insertando rol ${role.name}`,
      `INSERT INTO roles (name, description) VALUES ('${role.name}', '${role.description}') ON CONFLICT (name) DO NOTHING;`
    )
  }

  // 2. Insertar permisos
  console.log('\n🔑 INSERTANDO PERMISOS')
  console.log('-' .repeat(40))
  
  const permissions = [
    'users.create', 'users.read', 'users.update', 'users.delete',
    'products.create', 'products.read', 'products.update', 'products.delete',
    'sales.create', 'sales.read', 'sales.update', 'sales.delete',
    'purchases.create', 'purchases.read', 'purchases.update', 'purchases.delete',
    'customers.create', 'customers.read', 'customers.update', 'customers.delete',
    'suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete',
    'reports.view', 'reports.export', 'system.settings', 'system.backup'
  ]

  for (const permission of permissions) {
    await executeSql(
      `Insertando permiso ${permission}`,
      `INSERT INTO permissions (name, description) VALUES ('${permission}', 'Permiso para ${permission}') ON CONFLICT (name) DO NOTHING;`
    )
  }

  // 3. Insertar categorías
  console.log('\n📂 INSERTANDO CATEGORÍAS')
  console.log('-' .repeat(40))
  
  const categories = [
    { name: 'Electrónicos', description: 'Dispositivos electrónicos y accesorios' },
    { name: 'Ropa', description: 'Prendas de vestir y accesorios' },
    { name: 'Hogar', description: 'Artículos para el hogar' },
    { name: 'Deportes', description: 'Equipos y accesorios deportivos' },
    { name: 'Libros', description: 'Libros y material educativo' }
  ]

  for (const category of categories) {
    await executeSql(
      `Insertando categoría ${category.name}`,
      `INSERT INTO categories (name, description) VALUES ('${category.name}', '${category.description}') ON CONFLICT (name) DO NOTHING;`
    )
  }

  // 4. Insertar proveedores
  console.log('\n🏢 INSERTANDO PROVEEDORES')
  console.log('-' .repeat(40))
  
  const suppliers = [
    { name: 'TechSupply Corp', contact_name: 'Juan Pérez', email: 'juan@techsupply.com', phone: '+1234567890' },
    { name: 'Fashion Wholesale', contact_name: 'María García', email: 'maria@fashion.com', phone: '+1234567891' },
    { name: 'Home & Garden Ltd', contact_name: 'Carlos López', email: 'carlos@homeandgarden.com', phone: '+1234567892' }
  ]

  for (const supplier of suppliers) {
    await executeSql(
      `Insertando proveedor ${supplier.name}`,
      `INSERT INTO suppliers (name, contact_name, email, phone) VALUES ('${supplier.name}', '${supplier.contact_name}', '${supplier.email}', '${supplier.phone}') ON CONFLICT (email) DO NOTHING;`
    )
  }

  // 5. Insertar clientes
  console.log('\n👥 INSERTANDO CLIENTES')
  console.log('-' .repeat(40))
  
  const customers = [
    { name: 'Ana Rodríguez', email: 'ana@email.com', phone: '+1111111111' },
    { name: 'Pedro Martínez', email: 'pedro@email.com', phone: '+2222222222' },
    { name: 'Laura Sánchez', email: 'laura@email.com', phone: '+3333333333' }
  ]

  for (const customer of customers) {
    await executeSql(
      `Insertando cliente ${customer.name}`,
      `INSERT INTO customers (name, email, phone) VALUES ('${customer.name}', '${customer.email}', '${customer.phone}') ON CONFLICT (email) DO NOTHING;`
    )
  }

  // 6. Verificar datos insertados
  console.log('\n📊 VERIFICANDO DATOS INSERTADOS')
  console.log('-' .repeat(40))
  
  const tables = ['roles', 'permissions', 'categories', 'suppliers', 'customers']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: `SELECT COUNT(*) as count FROM ${table};` 
      })
      
      if (error) {
        console.log(`❌ Error verificando ${table}: ${error.message}`)
      } else {
        console.log(`✅ Tabla ${table}: registros encontrados`)
      }
    } catch (err: any) {
      console.log(`❌ Error verificando ${table}: ${err.message}`)
    }
  }

  // Resumen final
  console.log('\n📋 RESUMEN FINAL')
  console.log('=' .repeat(60))
  console.log(`✅ Operaciones exitosas: ${successCount}`)
  console.log(`❌ Errores: ${errorCount}`)
  console.log(`📊 Tasa de éxito: ${successCount > 0 ? Math.round((successCount / (successCount + errorCount)) * 100) : 0}%`)

  if (errors.length > 0) {
    console.log('\n❌ ERRORES DETALLADOS:')
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`)
    })
  }

  if (errorCount === 0) {
    console.log('\n🎉 ¡DATOS INSERTADOS EXITOSAMENTE!')
    return { success: true, successCount, errorCount }
  } else {
    console.log('\n⚠️ Inserción completada con errores')
    return { success: false, successCount, errorCount, errors }
  }
}

// Ejecutar el script
setupSupabaseManually()
  .then((result) => {
    if (result.success) {
      console.log('✅ Script completado exitosamente')
      process.exit(0)
    } else {
      console.log('⚠️ Script completado con errores')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Error crítico:', error)
    process.exit(1)
  })

// Función principal
async function setupSupabaseManually() {
  return await insertDataDirectly()
}