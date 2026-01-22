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

async function validateDatabase() {
  console.log('🔍 Validación directa de la base de datos Supabase...\n')
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  try {
    // Lista de tablas a verificar
    const tablesToCheck = [
      'users',
      'products', 
      'categories',
      'sales',
      'sale_items',
      'inventory',
      'user_roles'
    ]

    console.log('📋 Verificando existencia y acceso a tablas...\n')

    const results = []

    for (const tableName of tablesToCheck) {
      try {
        console.log(`🔍 Verificando tabla: ${tableName}`)
        
        // Intentar obtener el conteo de registros
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`   ❌ Error: ${error.message}`)
          results.push({
            table: tableName,
            status: 'error',
            message: error.message,
            count: 0
          })
        } else {
          console.log(`   ✅ Accesible - ${count || 0} registros`)
          results.push({
            table: tableName,
            status: 'success',
            count: count || 0
          })
        }
      } catch (err: any) {
        console.log(`   ❌ Excepción: ${err.message}`)
        results.push({
          table: tableName,
          status: 'exception',
          message: err.message,
          count: 0
        })
      }
    }

    // Resumen de resultados
    console.log('\n📊 RESUMEN DE VALIDACIÓN:')
    console.log('=' .repeat(50))

    const successful = results.filter(r => r.status === 'success')
    const failed = results.filter(r => r.status !== 'success')

    console.log(`✅ Tablas accesibles: ${successful.length}/${results.length}`)
    if (successful.length > 0) {
      successful.forEach(r => {
        console.log(`   - ${r.table}: ${r.count} registros`)
      })
    }

    if (failed.length > 0) {
      console.log(`\n❌ Tablas con problemas: ${failed.length}`)
      failed.forEach(r => {
        console.log(`   - ${r.table}: ${r.message}`)
      })
    }

    // Verificar datos de muestra en tablas exitosas
    if (successful.length > 0) {
      console.log('\n🔬 ANÁLISIS DE ESTRUCTURA DE DATOS:')
      console.log('=' .repeat(50))

      for (const result of successful.slice(0, 3)) { // Solo las primeras 3 tablas
        if (result.count > 0) {
          try {
            const { data: sample } = await supabase
              .from(result.table)
              .select('*')
              .limit(1)

            if (sample && sample.length > 0) {
              console.log(`\n📋 Estructura de ${result.table}:`)
              const columns = Object.keys(sample[0])
              columns.forEach(col => {
                const value = sample[0][col]
                const type = typeof value
                console.log(`   - ${col}: ${type} ${value !== null ? `(ej: ${String(value).substring(0, 20)}...)` : '(null)'}`)
              })
            }
          } catch (err) {
            console.log(`   ⚠️  No se pudo analizar estructura de ${result.table}`)
          }
        }
      }
    }

    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:')
    console.log('=' .repeat(50))

    if (failed.length === 0) {
      console.log('🎉 ¡Excelente! Todas las tablas están accesibles')
      console.log('✨ La base de datos está correctamente configurada')
      
      const totalRecords = successful.reduce((sum, r) => sum + r.count, 0)
      console.log(`📈 Total de registros en el sistema: ${totalRecords}`)
      
      if (totalRecords > 0) {
        console.log('🔧 Considerar optimizaciones de rendimiento')
        console.log('📊 Revisar índices de base de datos')
      } else {
        console.log('📝 Considerar poblar la base de datos con datos de prueba')
      }
    } else {
      console.log('🔧 Acciones requeridas:')
      
      if (failed.some(f => f.message.includes('does not exist'))) {
        console.log('   - Ejecutar migraciones de base de datos')
        console.log('   - Crear tablas faltantes')
      }
      
      if (failed.some(f => f.message.includes('permission'))) {
        console.log('   - Revisar políticas RLS (Row Level Security)')
        console.log('   - Verificar permisos del service role')
      }
      
      console.log('   - Verificar configuración de Supabase')
      console.log('   - Revisar variables de entorno')
    }

    console.log('\n✅ Validación completada')

  } catch (error: any) {
    console.error('❌ Error crítico durante la validación:', error.message)
    console.log('\n🔧 Verificar:')
    console.log('   - Credenciales de Supabase')
    console.log('   - Conectividad de red')
    console.log('   - Variables de entorno')
  }
}

// Ejecutar validación
validateDatabase()