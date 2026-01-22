import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

async function testDatabaseUrl() {
  console.log('🔍 PROBANDO URL DE BASE DE DATOS')
  console.log('=' .repeat(60))

  const databaseUrl = process.env.DATABASE_URL
  const directDatabaseUrl = process.env.DIRECT_DATABASE_URL

  console.log('📋 Variables de entorno encontradas:')
  console.log(`DATABASE_URL: ${databaseUrl ? '✅ Configurada' : '❌ No configurada'}`)
  console.log(`DIRECT_DATABASE_URL: ${directDatabaseUrl ? '✅ Configurada' : '❌ No configurada'}`)

  if (databaseUrl) {
    console.log('\n🔗 DATABASE_URL:')
    console.log(`Longitud: ${databaseUrl.length} caracteres`)
    console.log(`Comienza con: ${databaseUrl.substring(0, 20)}...`)
    
    // Verificar formato básico
    if (databaseUrl.startsWith('postgresql://')) {
      console.log('✅ Formato PostgreSQL válido')
    } else {
      console.log('❌ Formato PostgreSQL inválido')
    }
  }

  if (directDatabaseUrl) {
    console.log('\n🔗 DIRECT_DATABASE_URL:')
    console.log(`Longitud: ${directDatabaseUrl.length} caracteres`)
    console.log(`Comienza con: ${directDatabaseUrl.substring(0, 20)}...`)
    
    // Verificar formato básico
    if (directDatabaseUrl.startsWith('postgresql://')) {
      console.log('✅ Formato PostgreSQL válido')
    } else {
      console.log('❌ Formato PostgreSQL inválido')
    }
  }

  // Intentar parsear la URL manualmente
  if (directDatabaseUrl) {
    console.log('\n🔧 PARSEANDO URL MANUALMENTE:')
    try {
      const url = new URL(directDatabaseUrl)
      console.log(`✅ Protocolo: ${url.protocol}`)
      console.log(`✅ Host: ${url.hostname}`)
      console.log(`✅ Puerto: ${url.port}`)
      console.log(`✅ Base de datos: ${url.pathname}`)
      console.log(`✅ Usuario: ${url.username}`)
      console.log(`✅ Contraseña: ${url.password ? '[CONFIGURADA]' : '[NO CONFIGURADA]'}`)
      
      // Extraer parámetros de consulta
      const params = new URLSearchParams(url.search)
      console.log(`✅ Parámetros: ${Array.from(params.entries()).length}`)
      
      for (const [key, value] of params.entries()) {
        console.log(`   - ${key}: ${value}`)
      }
      
    } catch (err: any) {
      console.log(`❌ Error parseando URL: ${err.message}`)
    }
  }

  // Probar con Supabase client
  console.log('\n🧪 PROBANDO CONEXIÓN CON SUPABASE CLIENT:')
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Probar una consulta simple
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1)

    if (error) {
      console.log(`❌ Error con Supabase: ${error.message}`)
    } else {
      console.log('✅ Conexión con Supabase exitosa')
    }

  } catch (err: any) {
    console.log(`❌ Error probando Supabase: ${err.message}`)
  }

  console.log('\n📊 RESUMEN:')
  console.log('=' .repeat(60))
  console.log('Para resolver problemas de conexión:')
  console.log('1. Verificar que las URLs estén correctamente formateadas')
  console.log('2. Comprobar que no haya caracteres especiales sin codificar')
  console.log('3. Usar el cliente de Supabase en lugar de pg directo')
  console.log('4. Verificar permisos en el dashboard de Supabase')
}

testDatabaseUrl()
  .then(() => {
    console.log('\n✅ Prueba completada')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error en la prueba:', error)
    process.exit(1)
  })