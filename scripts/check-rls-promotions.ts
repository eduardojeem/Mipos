import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkRLS() {
  console.log('🔒 Verificando políticas RLS en tabla promotions\n')
  console.log('=' .repeat(60))

  // Test with ANON key
  console.log('\n1️⃣ Probando con ANON KEY (usuario no autenticado)...')
  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data: anonData, error: anonError, count: anonCount } = await anonClient
    .from('promotions')
    .select('*', { count: 'exact' })
  
  if (anonError) {
    console.error('❌ Error con ANON key:', anonError.message)
  } else {
    console.log(`✅ ANON key puede leer: ${anonCount} promociones`)
    if (anonCount === 0) {
      console.log('⚠️  RLS está bloqueando el acceso para usuarios no autenticados')
    }
  }

  // Test with SERVICE ROLE key if available
  if (supabaseServiceKey) {
    console.log('\n2️⃣ Probando con SERVICE ROLE KEY (bypass RLS)...')
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: serviceData, error: serviceError, count: serviceCount } = await serviceClient
      .from('promotions')
      .select('*', { count: 'exact' })
    
    if (serviceError) {
      console.error('❌ Error con SERVICE ROLE key:', serviceError.message)
    } else {
      console.log(`✅ SERVICE ROLE key puede leer: ${serviceCount} promociones`)
      if (serviceCount && serviceCount > 0) {
        console.log('\n📋 Primeras 3 promociones (con SERVICE ROLE):')
        serviceData?.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`  ${i + 1}. ${p.name} (${p.is_active ? 'Activa' : 'Inactiva'})`)
        })
      }
    }

    // Compare results
    console.log('\n3️⃣ Comparación:')
    console.log(`   ANON key: ${anonCount} promociones`)
    console.log(`   SERVICE ROLE key: ${serviceCount} promociones`)
    
    if (serviceCount && serviceCount > 0 && anonCount === 0) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO:')
      console.log('   Las promociones existen en la base de datos,')
      console.log('   pero RLS está bloqueando el acceso público.')
      console.log('\n💡 SOLUCIÓN:')
      console.log('   Necesitas crear una política RLS que permita lectura pública:')
      console.log('\n   CREATE POLICY "Allow public read access"')
      console.log('   ON promotions FOR SELECT')
      console.log('   TO public')
      console.log('   USING (true);')
    }
  } else {
    console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY no está configurada')
    console.log('   No se puede verificar si las promociones existen en la DB')
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✨ Verificación completada\n')
}

checkRLS().catch(console.error)
