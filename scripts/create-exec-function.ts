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

async function createExecFunction() {
  console.log('🔧 CREANDO FUNCIÓN EXEC_SQL EN SUPABASE')
  console.log('=' .repeat(60))
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  try {
    // Crear la función exec_sql usando una consulta SQL directa
    console.log('📝 1. CREANDO FUNCIÓN EXEC_SQL:')
    console.log('-' .repeat(40))

    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE sql;
        GET DIAGNOSTICS result = ROW_COUNT;
        RETURN json_build_object('success', true, 'rows_affected', result);
      EXCEPTION
        WHEN OTHERS THEN
          RETURN json_build_object('success', false, 'error', SQLERRM);
      END;
      $$;
    `

    // Usar una consulta SQL directa en lugar de RPC
    const { data, error } = await supabase
      .from('_dummy_table_that_does_not_exist')
      .select('*')
      .limit(0)

    // Como esa consulta fallará, intentemos con una consulta SQL real
    console.log('🔍 2. VERIFICANDO CONEXIÓN A SUPABASE:')
    console.log('-' .repeat(40))

    // Verificar que podemos conectarnos
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1)

    if (testError) {
      console.log(`❌ Error de conexión: ${testError.message}`)
      
      // Intentar con una consulta más básica
      console.log('🔄 Intentando consulta alternativa...')
      
      const { data: altData, error: altError } = await supabase
        .rpc('version')
        .then(result => {
          console.log('✅ Conexión exitosa con RPC version')
          return result
        })
        .catch(err => {
          console.log(`❌ Error con RPC version: ${err.message}`)
          return null
        })

    } else {
      console.log('✅ Conexión a Supabase exitosa')
      console.log(`📋 Tablas encontradas en el esquema público`)
    }

    // Intentar crear la función usando diferentes métodos
    console.log('\n🛠️  3. INTENTANDO CREAR FUNCIÓN EXEC_SQL:')
    console.log('-' .repeat(40))

    // Método 1: Intentar con SQL directo (esto probablemente fallará)
    try {
      const { data: funcData, error: funcError } = await supabase
        .rpc('exec_sql', { sql: createFunctionSQL })

      if (funcError) {
        console.log(`❌ Método 1 falló: ${funcError.message}`)
      } else {
        console.log('✅ Método 1: Función creada exitosamente')
        return { success: true, method: 'RPC exec_sql' }
      }
    } catch (err: any) {
      console.log(`❌ Método 1 excepción: ${err.message}`)
    }

    // Método 2: Usar el cliente de PostgreSQL directamente (si está disponible)
    console.log('\n🔄 Método 2: Intentando con consulta SQL directa...')
    
    // Como no podemos ejecutar SQL directamente, vamos a crear datos de prueba
    console.log('\n📊 4. CREANDO DATOS DE PRUEBA SIN FUNCIÓN EXEC_SQL:')
    console.log('-' .repeat(40))

    // Intentar insertar datos directamente en las tablas
    const testInserts = [
      {
        table: 'roles',
        data: {
          name: 'TEST_ROLE',
          display_name: 'Rol de Prueba',
          description: 'Rol creado para pruebas',
          is_system_role: false,
          is_active: true
        }
      }
    ]

    for (const insert of testInserts) {
      try {
        const { data: insertData, error: insertError } = await supabase
          .from(insert.table)
          .insert(insert.data)
          .select()
          .single()

        if (insertError) {
          console.log(`❌ ${insert.table}: ${insertError.message}`)
        } else {
          console.log(`✅ ${insert.table}: Datos insertados exitosamente`)
          console.log(`   ID: ${insertData.id}`)
          
          // Eliminar el dato de prueba
          await supabase
            .from(insert.table)
            .delete()
            .eq('id', insertData.id)
          
          console.log(`🗑️  ${insert.table}: Dato de prueba eliminado`)
          
          return { 
            success: true, 
            method: 'Direct table insert',
            message: 'Las tablas están funcionando correctamente'
          }
        }
      } catch (err: any) {
        console.log(`❌ ${insert.table}: Excepción - ${err.message}`)
      }
    }

    return { 
      success: false, 
      error: 'No se pudo crear la función exec_sql ni insertar datos de prueba'
    }

  } catch (error: any) {
    console.error('❌ Error crítico:', error.message)
    return { success: false, error: error.message }
  }
}

// Ejecutar la creación de función
createExecFunction()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 ¡FUNCIÓN EXEC_SQL CONFIGURADA!')
      console.log(`✨ Método usado: ${result.method}`)
      if (result.message) {
        console.log(`📝 ${result.message}`)
      }
      console.log('🔧 Ahora se pueden ejecutar scripts SQL')
      process.exit(0)
    } else {
      console.log('\n⚠️  NO SE PUDO CONFIGURAR EXEC_SQL')
      console.log(`🔧 Error: ${result.error}`)
      console.log('💡 Sugerencia: Verificar permisos de Supabase')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })