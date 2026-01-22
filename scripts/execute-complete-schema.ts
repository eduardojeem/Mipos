import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
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

async function executeCompleteSchema() {
  console.log('🚀 Ejecutando esquema completo de base de datos...\n')
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  try {
    // Leer el archivo de esquema
    console.log('📖 Leyendo archivo de esquema...')
    const schemaContent = readFileSync('scripts/complete-database-schema.sql', 'utf8')
    
    // Dividir en bloques ejecutables
    const blocks = schemaContent
      .split(/(?=-- -+\s*\n-- Tabla:|-- ====+|CREATE TABLE|CREATE TYPE|CREATE EXTENSION)/g)
      .map(block => block.trim())
      .filter(block => block.length > 0 && !block.startsWith('--'))

    console.log(`📋 Encontrados ${blocks.length} bloques de código SQL\n`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Ejecutar cada bloque
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      
      // Saltar bloques que son solo comentarios
      if (block.startsWith('--') || block.length < 20) {
        continue
      }

      try {
        console.log(`⚙️  Ejecutando bloque ${i + 1}/${blocks.length}...`)
        
        // Dividir el bloque en declaraciones individuales
        const statements = block
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))

        for (const statement of statements) {
          if (statement.length < 10) continue

          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            console.log(`   ❌ Error: ${error.message}`)
            errors.push(`Bloque ${i + 1}: ${error.message}`)
            errorCount++
          } else {
            successCount++
          }
        }

        console.log(`   ✅ Bloque ${i + 1} completado`)
        
        // Pausa pequeña para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (err: any) {
        console.log(`   ❌ Excepción en bloque ${i + 1}: ${err.message}`)
        errors.push(`Bloque ${i + 1}: ${err.message}`)
        errorCount++
      }
    }

    // Resumen de ejecución
    console.log('\n📊 RESUMEN DE EJECUCIÓN:')
    console.log('=' .repeat(50))
    console.log(`✅ Declaraciones exitosas: ${successCount}`)
    console.log(`❌ Errores encontrados: ${errorCount}`)

    if (errors.length > 0) {
      console.log('\n🔍 ERRORES DETALLADOS:')
      errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
      
      if (errors.length > 10) {
        console.log(`... y ${errors.length - 10} errores más`)
      }
    }

    // Verificar tablas creadas
    console.log('\n🔍 VERIFICANDO TABLAS CREADAS:')
    console.log('=' .repeat(50))

    const expectedTables = [
      'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
      'categories', 'products', 'suppliers', 'customers', 'sales', 
      'sale_items', 'purchases', 'purchase_items', 'inventory_movements',
      'returns', 'return_items', 'user_sessions', 'role_audit_logs'
    ]

    const tableResults = []

    for (const tableName of expectedTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`)
          tableResults.push({ table: tableName, exists: false, error: error.message })
        } else {
          console.log(`✅ ${tableName}: Tabla creada (${count || 0} registros)`)
          tableResults.push({ table: tableName, exists: true, count: count || 0 })
        }
      } catch (err: any) {
        console.log(`❌ ${tableName}: Error de verificación`)
        tableResults.push({ table: tableName, exists: false, error: 'Error de verificación' })
      }
    }

    // Estadísticas finales
    const createdTables = tableResults.filter(t => t.exists).length
    const totalTables = expectedTables.length

    console.log('\n🎯 ESTADÍSTICAS FINALES:')
    console.log('=' .repeat(50))
    console.log(`📋 Tablas creadas: ${createdTables}/${totalTables}`)
    console.log(`📈 Porcentaje de éxito: ${Math.round((createdTables / totalTables) * 100)}%`)

    if (createdTables === totalTables) {
      console.log('\n🎉 ¡ESQUEMA EJECUTADO EXITOSAMENTE!')
      console.log('✨ Todas las tablas han sido creadas correctamente')
      console.log('🔧 La base de datos está lista para usar')
    } else {
      console.log('\n⚠️  ESQUEMA PARCIALMENTE EJECUTADO')
      console.log('🔧 Algunas tablas no se pudieron crear')
      console.log('💡 Revisar errores y ejecutar manualmente si es necesario')
    }

    return {
      success: createdTables === totalTables,
      createdTables,
      totalTables,
      successCount,
      errorCount,
      errors
    }

  } catch (error: any) {
    console.error('❌ Error crítico durante la ejecución:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Ejecutar el esquema
executeCompleteSchema()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Proceso completado exitosamente')
      process.exit(0)
    } else {
      console.log('\n❌ Proceso completado con errores')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })