import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function validateSupabaseDatabase() {
  console.log('🔍 Validando base de datos de Supabase...\n')

  try {
    // 1. Verificar conexión básica
    console.log('1. Verificando conexión básica...')
    const { data: authTest, error: authError } = await supabase.auth.getUser()
    
    if (authError && !authError.message.includes('JWT')) {
      console.error('❌ Error de conexión:', authError.message)
      return
    }
    console.log('✅ Conexión a Supabase establecida\n')

    // 2. Verificar tablas principales
    console.log('2. Verificando tablas principales...')
    const tablesToCheck = [
      'users',
      'products', 
      'categories',
      'sales',
      'sale_items',
      'inventory'
    ]

    const tableResults = []

    for (const tableName of tablesToCheck) {
      try {
        console.log(`   Verificando tabla: ${tableName}`)
        
        // Intentar hacer una consulta simple para verificar si la tabla existe
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`   ❌ ${tableName}: ${error.message}`)
          tableResults.push({ table: tableName, exists: false, error: error.message })
        } else {
          console.log(`   ✅ ${tableName}: ${count || 0} registros`)
          tableResults.push({ table: tableName, exists: true, count: count || 0 })
        }
      } catch (err) {
        console.log(`   ❌ ${tableName}: Error inesperado`)
        tableResults.push({ table: tableName, exists: false, error: 'Error inesperado' })
      }
    }

    // 3. Resumen de tablas
    console.log('\n3. Resumen de tablas:')
    const existingTables = tableResults.filter(t => t.exists)
    const missingTables = tableResults.filter(t => !t.exists)

    console.log(`   ✅ Tablas existentes: ${existingTables.length}`)
    existingTables.forEach(t => {
      console.log(`      - ${t.table}: ${t.count} registros`)
    })

    if (missingTables.length > 0) {
      console.log(`   ❌ Tablas faltantes: ${missingTables.length}`)
      missingTables.forEach(t => {
        console.log(`      - ${t.table}: ${t.error}`)
      })
    }

    // 4. Verificar datos de muestra en tablas existentes
    if (existingTables.length > 0) {
      console.log('\n4. Verificando datos de muestra...')
      
      for (const tableInfo of existingTables) {
        if (tableInfo.count && tableInfo.count > 0) {
          try {
            const { data: sampleData } = await supabase
              .from(tableInfo.table)
              .select('*')
              .limit(1)

            if (sampleData && sampleData.length > 0) {
              console.log(`   📊 ${tableInfo.table} - Estructura de datos:`)
              const columns = Object.keys(sampleData[0])
              console.log(`      Columnas: ${columns.join(', ')}`)
            }
          } catch (err) {
            console.log(`   ⚠️  No se pudo obtener muestra de ${tableInfo.table}`)
          }
        }
      }
    }

    // 5. Verificar configuración de autenticación
    console.log('\n5. Verificando configuración de autenticación...')
    try {
      const { data: session } = await supabase.auth.getSession()
      console.log('   ✅ Sistema de autenticación configurado')
    } catch (err) {
      console.log('   ⚠️  Sistema de autenticación no disponible')
    }

    // 6. Recomendaciones
    console.log('\n6. Recomendaciones:')
    
    if (missingTables.length > 0) {
      console.log('   🔧 Acciones requeridas:')
      console.log('      - Ejecutar migraciones de base de datos')
      console.log('      - Verificar configuración de Supabase')
      console.log('      - Revisar permisos de acceso a tablas')
    }

    if (existingTables.length === tablesToCheck.length) {
      console.log('   🎉 Base de datos completamente configurada')
      console.log('   💡 Considerar optimizaciones de rendimiento')
    }

    console.log('\n✅ Validación completada')

  } catch (error) {
    console.error('❌ Error durante la validación:', error)
  }
}

// Ejecutar la validación
validateSupabaseDatabase()