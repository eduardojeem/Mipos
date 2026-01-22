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

async function validateTablesSimple() {
  console.log('🔍 VALIDACIÓN SIMPLE DE TABLAS')
  console.log('=' .repeat(50))
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  const mainTables = [
    'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
    'categories', 'products', 'suppliers', 'customers', 'sales', 
    'sale_items', 'purchases', 'purchase_items', 'inventory_movements',
    'returns', 'return_items', 'user_sessions'
  ]

  console.log('📋 VERIFICANDO ACCESO A TABLAS:')
  console.log('-' .repeat(50))

  const results = {
    accessible: [] as string[],
    inaccessible: [] as string[],
    withData: [] as string[],
    empty: [] as string[]
  }

  for (const tableName of mainTables) {
    try {
      // Intentar acceder a la tabla y contar registros
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`)
        results.inaccessible.push(tableName)
      } else {
        const recordCount = count || 0
        console.log(`✅ ${tableName}: Accesible (${recordCount} registros)`)
        results.accessible.push(tableName)
        
        if (recordCount > 0) {
          results.withData.push(tableName)
        } else {
          results.empty.push(tableName)
        }
      }
    } catch (err: any) {
      console.log(`❌ ${tableName}: Excepción - ${err.message}`)
      results.inaccessible.push(tableName)
    }
  }

  // Verificar algunas tablas críticas con más detalle
  console.log('\n🔍 VERIFICACIÓN DETALLADA DE TABLAS CRÍTICAS:')
  console.log('-' .repeat(50))

  const criticalTables = ['users', 'products', 'categories', 'sales']
  
  for (const tableName of criticalTables) {
    if (results.accessible.includes(tableName)) {
      try {
        // Intentar obtener una muestra de datos
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          console.log(`❌ ${tableName}: Error al obtener muestra - ${error.message}`)
        } else {
          console.log(`✅ ${tableName}: Estructura accesible`)
          
          if (data && data.length > 0) {
            const columns = Object.keys(data[0])
            console.log(`   📊 Columnas detectadas: ${columns.length}`)
            console.log(`   🔑 Columnas: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`)
          } else {
            console.log(`   📊 Tabla vacía pero estructura válida`)
          }
        }
      } catch (err: any) {
        console.log(`❌ ${tableName}: Error en verificación detallada - ${err.message}`)
      }
    }
  }

  // Verificar autenticación
  console.log('\n🔐 VERIFICANDO SISTEMA DE AUTENTICACIÓN:')
  console.log('-' .repeat(50))

  try {
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.log(`⚠️  Auth: ${authError.message}`)
    } else {
      console.log('✅ Sistema de autenticación: Configurado')
    }

    // Verificar si podemos crear un usuario de prueba (sin realmente crearlo)
    const testEmail = 'test@example.com'
    const { data: existingUser, error: checkError } = await supabase.auth.getUser()
    
    if (checkError) {
      console.log(`⚠️  Verificación de usuario: ${checkError.message}`)
    } else {
      console.log('✅ Verificación de usuario: Funcional')
    }

  } catch (err: any) {
    console.log(`❌ Error en verificación de auth: ${err.message}`)
  }

  // Resumen final
  console.log('\n📊 RESUMEN DE VALIDACIÓN:')
  console.log('=' .repeat(50))
  console.log(`✅ Tablas accesibles: ${results.accessible.length}/${mainTables.length}`)
  console.log(`❌ Tablas inaccesibles: ${results.inaccessible.length}/${mainTables.length}`)
  console.log(`📊 Tablas con datos: ${results.withData.length}`)
  console.log(`📋 Tablas vacías: ${results.empty.length}`)

  const successRate = Math.round((results.accessible.length / mainTables.length) * 100)
  console.log(`📈 Tasa de éxito: ${successRate}%`)

  if (results.accessible.length === mainTables.length) {
    console.log('\n🎉 ¡VALIDACIÓN EXITOSA!')
    console.log('✨ Todas las tablas son accesibles')
    console.log('🔧 La base de datos está lista para usar')
    
    if (results.empty.length === results.accessible.length) {
      console.log('💡 Recomendación: Poblar con datos de prueba')
    }
    
    return { success: true, accessible: results.accessible.length, total: mainTables.length }
  } else {
    console.log('\n⚠️  VALIDACIÓN PARCIAL')
    console.log('🔧 Algunas tablas no son accesibles')
    
    if (results.inaccessible.length > 0) {
      console.log(`❌ Tablas problemáticas: ${results.inaccessible.join(', ')}`)
    }
    
    return { success: false, accessible: results.accessible.length, total: mainTables.length }
  }
}

// Ejecutar la validación
validateTablesSimple()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Validación completada exitosamente')
      process.exit(0)
    } else {
      console.log('\n❌ Validación completada con errores')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })