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

async function executeInitialData() {
  console.log('🌱 EJECUTANDO DATOS INICIALES DE SUPABASE')
  console.log('=' .repeat(60))
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  try {
    // Leer el archivo de datos iniciales
    console.log('📖 Leyendo archivo de datos iniciales...')
    const initialDataContent = readFileSync('scripts/supabase-initial-data.sql', 'utf8')
    
    // Dividir en bloques ejecutables (por INSERT statements)
    const insertBlocks = initialDataContent
      .split(/(?=INSERT INTO)/g)
      .map(block => block.trim())
      .filter(block => block.length > 0 && block.startsWith('INSERT INTO'))

    console.log(`📋 Encontrados ${insertBlocks.length} bloques de inserción\n`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Ejecutar cada bloque de inserción
    for (let i = 0; i < insertBlocks.length; i++) {
      const block = insertBlocks[i]
      
      try {
        console.log(`⚙️  Ejecutando bloque ${i + 1}/${insertBlocks.length}...`)
        
        // Extraer el nombre de la tabla del bloque
        const tableMatch = block.match(/INSERT INTO\s+(?:public\.)?(\w+)/)
        const tableName = tableMatch ? tableMatch[1] : 'desconocida'
        
        // Ejecutar el bloque completo
        const { error } = await supabase.rpc('exec_sql', { sql: block })
        
        if (error) {
          console.log(`   ❌ Error en tabla ${tableName}: ${error.message}`)
          errors.push(`Tabla ${tableName}: ${error.message}`)
          errorCount++
        } else {
          console.log(`   ✅ Tabla ${tableName}: Datos insertados`)
          successCount++
        }
        
        // Pausa pequeña para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (err: any) {
        console.log(`   ❌ Excepción en bloque ${i + 1}: ${err.message}`)
        errors.push(`Bloque ${i + 1}: ${err.message}`)
        errorCount++
      }
    }

    // Resumen de ejecución
    console.log('\n📊 RESUMEN DE INSERCIÓN:')
    console.log('=' .repeat(50))
    console.log(`✅ Bloques exitosos: ${successCount}`)
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

    // Verificar datos insertados
    console.log('\n🔍 VERIFICANDO DATOS INSERTADOS:')
    console.log('=' .repeat(50))

    const tablesToCheck = [
      'roles', 'permissions', 'role_permissions', 'categories', 
      'suppliers', 'customers', 'products'
    ]

    const dataResults = []

    for (const tableName of tablesToCheck) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`)
          dataResults.push({ table: tableName, count: 0, error: error.message })
        } else {
          const recordCount = count || 0
          console.log(`✅ ${tableName}: ${recordCount} registros`)
          dataResults.push({ table: tableName, count: recordCount })
        }
      } catch (err: any) {
        console.log(`❌ ${tableName}: Error de verificación`)
        dataResults.push({ table: tableName, count: 0, error: 'Error de verificación' })
      }
    }

    // Verificar algunos datos específicos
    console.log('\n🔍 VERIFICACIÓN ESPECÍFICA:')
    console.log('-' .repeat(50))

    try {
      // Verificar roles del sistema
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('name, display_name')
        .limit(5)

      if (rolesError) {
        console.log(`❌ Roles: ${rolesError.message}`)
      } else if (rolesData && rolesData.length > 0) {
        console.log(`✅ Roles encontrados: ${rolesData.map(r => r.name).join(', ')}`)
      } else {
        console.log(`⚠️  No se encontraron roles`)
      }

      // Verificar permisos
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('resource, action')
        .limit(5)

      if (permissionsError) {
        console.log(`❌ Permisos: ${permissionsError.message}`)
      } else if (permissionsData && permissionsData.length > 0) {
        console.log(`✅ Permisos encontrados: ${permissionsData.length} permisos`)
      } else {
        console.log(`⚠️  No se encontraron permisos`)
      }

    } catch (err: any) {
      console.log(`❌ Error en verificación específica: ${err.message}`)
    }

    // Estadísticas finales
    const totalRecords = dataResults.reduce((sum, result) => sum + result.count, 0)
    const tablesWithData = dataResults.filter(r => r.count > 0).length

    console.log('\n🎯 ESTADÍSTICAS FINALES:')
    console.log('=' .repeat(50))
    console.log(`📋 Tablas con datos: ${tablesWithData}/${tablesToCheck.length}`)
    console.log(`📊 Total de registros: ${totalRecords}`)
    console.log(`📈 Porcentaje de éxito: ${Math.round((successCount / (successCount + errorCount)) * 100)}%`)

    if (successCount > errorCount && totalRecords > 0) {
      console.log('\n🎉 ¡DATOS INICIALES EJECUTADOS EXITOSAMENTE!')
      console.log('✨ La base de datos ha sido poblada con datos iniciales')
      console.log('🔧 El sistema está listo para usar')
      return {
        success: true,
        successCount,
        errorCount,
        totalRecords,
        tablesWithData
      }
    } else {
      console.log('\n⚠️  DATOS INICIALES PARCIALMENTE EJECUTADOS')
      console.log('🔧 Algunos datos no se pudieron insertar')
      return {
        success: false,
        successCount,
        errorCount,
        totalRecords,
        tablesWithData
      }
    }

  } catch (error: any) {
    console.error('❌ Error crítico durante la ejecución:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Ejecutar los datos iniciales
executeInitialData()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Ejecución completada exitosamente')
      process.exit(0)
    } else {
      console.log('\n❌ Ejecución completada con errores')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })